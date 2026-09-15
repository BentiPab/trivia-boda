import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment.development';
import { Guest, Question, LeaderboardEntry } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private database: SupabaseClient;

  constructor() {
    this.database = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // 1. Obtener invitado por token de URL
  async getGuestByToken(token: string): Promise<Guest | null> {
    const { data, error } = await this.database
      .from('trivia_guests')
      .select(
        'id, name, token, has_played,current_question_index,  accumulated_score,  accumulated_time_seconds',
      )
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.log(error);
      console.error('Error obteniendo invitado:', error.message);
      return null;
    }
    return data;
  }

  // 2. Obtener preguntas ordenadas
  async getQuestions(): Promise<Question[]> {
    const { data, error } = await this.database
      .from('trivia_questions_public')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async submitAnswer(
    guestId: string,
    questionId: number,
    selectedIndex: number,
    nextIndex: number,
    elapsedTime: number,
  ): Promise<boolean> {
    const { data, error } = await this.database.rpc('submit_question_answer', {
      p_guest_id: guestId,
      p_question_id: questionId,
      p_selected_index: selectedIndex,
      p_next_index: nextIndex,
      p_elapsed_time: elapsedTime,
    });

    if (error) {
      console.error('Error validando respuesta:', error);
      return false;
    }

    return data as boolean;
  }

  // Finalizar la trivia: inserta en scores y marca has_played
  async submitFinalScore(
    guestId: string,
    playerName: string,
    score: number,
    totalTime: number,
  ): Promise<boolean> {
    const { error: scoreError } = await this.database.from('trivia_scores').insert([
      {
        guest_id: guestId,
        player_name: playerName,
        score: score,
        total_time_seconds: totalTime,
      },
    ]);

    if (scoreError) {
      console.error('Error guardando score final:', scoreError.message);
      return false;
    }

    const { error: updateError } = await this.database
      .from('trivia_guests')
      .update({
        has_played: true,
        current_question_index: 0,
      })
      .eq('id', guestId);

    if (updateError) {
      console.error('Error finalizando estado del invitado:', updateError.message);
    }

    return true;
  }

  // 4. Podio / Leaderboard

  async getAdminLeaderboard(pin: string): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.database.rpc('get_admin_leaderboard', {
      admin_pin: pin,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }
}
