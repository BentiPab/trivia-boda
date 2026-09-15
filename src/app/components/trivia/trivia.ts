import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Guest, Question } from '../../models';
import { DatabaseService } from '../../services/database';

type GameState =
  | 'loading'
  | 'invalid_token'
  | 'already_played'
  | 'ready'
  | 'playing'
  | 'next_question_loading'
  | 'submitting'
  | 'gameover';

@Component({
  selector: 'app-trivia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trivia.html',
})
export class TriviaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private database = inject(DatabaseService);

  gameState = signal<GameState>('loading');
  guest = signal<Guest | null>(null);
  questions = signal<Question[]>([]);
  currentIndex = signal(0);
  isResuming = signal(false);

  private isProcessingAnswer = false;
  private sessionStartTime = 0;
  private previouslyAccumulatedTime = 0;

  selectedOptionIndex = signal<number | null>(null);

  currentQuestion = computed(() => this.questions()[this.currentIndex()]);
  progressPercent = computed(() => {
    if (!this.questions().length) return 0;
    return Math.round(((this.currentIndex() + 1) / this.questions().length) * 100);
  });

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('t');
    if (!token) {
      this.gameState.set('invalid_token');
      return;
    }

    const guestData = await this.database.getGuestByToken(token.trim());
    if (!guestData) {
      this.gameState.set('invalid_token');
      return;
    }

    this.guest.set(guestData);

    if (guestData.has_played) {
      this.gameState.set('already_played');
      return;
    }

    const loadedQuestions = await this.database.getQuestions();
    this.questions.set(loadedQuestions);

    if (guestData.current_question_index > 0) {
      this.isResuming.set(true);
      this.currentIndex.set(guestData.current_question_index);

      this.previouslyAccumulatedTime = Number(guestData.accumulated_time_seconds) || 0;
    }

    this.gameState.set('ready');
  }

  async startGame() {
    this.gameState.set('next_question_loading');
    // Precargar la primera pregunta antes de arrancar
    await this.preloadQuestionImages(this.currentIndex());
    this.sessionStartTime = performance.now();
    this.gameState.set('playing');
  }

  async selectOption(index: number) {
    if (this.isProcessingAnswer || this.gameState() !== 'playing') return;
    this.isProcessingAnswer = true;
    this.selectedOptionIndex.set(index);

    const q = this.currentQuestion();
    const sessionElapsed = (performance.now() - this.sessionStartTime) / 1000;
    const currentTotalTime = parseFloat(
      (this.previouslyAccumulatedTime + sessionElapsed).toFixed(2),
    );
    const nextIndex = this.currentIndex() + 1;
    const guestId = this.guest()!.id;

    // Mostramos el botón presionado 250ms antes de cambiar de vista
    setTimeout(async () => {
      this.selectedOptionIndex.set(null);
      this.isProcessingAnswer = false;

      // 1. Ponemos la cortina de carga
      this.gameState.set('next_question_loading');

      const isLastQuestion = nextIndex >= this.questions().length;

      // 2. Ejecutamos la validación RPC en Supabase y precargamos la siguiente en paralelo
      const tasks: Promise<any>[] = [
        this.database.submitAnswer(guestId, q.id, index, nextIndex, currentTotalTime),
        new Promise((res) => setTimeout(res, 800)), // Pausa visual mínima
      ];

      if (!isLastQuestion) {
        tasks.push(this.preloadQuestionImages(nextIndex));
      }

      await Promise.all(tasks);

      // 3. Avanzar a la siguiente pregunta o finalizar
      if (!isLastQuestion) {
        this.currentIndex.set(nextIndex);
        this.gameState.set('playing');
      } else {
        await this.finishGame(currentTotalTime);
      }
    }, 250);
  }

  // Precarga de imágenes mediante promesas de Image()
  private preloadQuestionImages(index: number): Promise<void[]> {
    const nextQ = this.questions()[index];
    if (!nextQ) return Promise.resolve([]);

    const urls: string[] = [];
    if (nextQ.image_url) urls.push(nextQ.image_url);
    if (nextQ.options) {
      nextQ.options.forEach((opt) => {
        if (opt.image_url) urls.push(opt.image_url);
      });
    }

    const loadPromises = urls.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Si falla alguna, no bloqueamos el juego
      });
    });

    return Promise.all(loadPromises);
  }

  async finishGame(totalTime: number) {
    this.gameState.set('submitting');
    const currentGuest = this.guest();

    if (currentGuest) {
      // Obtenemos el registro fresco de la DB con el score total acumulado por el RPC
      const updatedGuest = await this.database.getGuestByToken(currentGuest.token);
      const finalScore = updatedGuest?.accumulated_score ?? 0;

      await this.database.submitFinalScore(
        currentGuest.id,
        currentGuest.name,
        finalScore,
        totalTime,
      );
    }

    this.gameState.set('gameover');
  }
}
