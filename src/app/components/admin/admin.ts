import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatabaseService } from '../../services/database';
import { LeaderboardEntry } from '../../models';

type AdminTab = 'leaderboard' | 'stats';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.html',
})
export class AdminComponent {
  private database = inject(DatabaseService);

  pin = signal('');
  isAuthenticated = signal(false);
  errorMessage = signal('');
  isLoading = signal(false);

  currentTab = signal<AdminTab>('leaderboard');

  leaderboard = signal<LeaderboardEntry[]>([]);
  stats = signal<any[]>([]);

  async authenticate() {
    if (!this.pin().trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Cargamos ambos conjuntos de datos en paralelo
      const [lbData, statsData] = await Promise.all([
        this.database.getAdminLeaderboard(this.pin().trim()),
        this.database.getQuestionStats(),
      ]);

      this.leaderboard.set(lbData);
      this.stats.set(statsData);
      this.isAuthenticated.set(true);
    } catch (err: any) {
      this.errorMessage.set('PIN incorrecto o acceso denegado.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshData() {
    if (!this.isAuthenticated()) return;
    this.isLoading.set(true);
    try {
      const [lbData, statsData] = await Promise.all([
        this.database.getAdminLeaderboard(this.pin().trim()),
        this.database.getQuestionStats(),
      ]);
      this.leaderboard.set(lbData);
      this.stats.set(statsData);
    } catch (err) {
      console.error('Error al actualizar datos:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  setTab(tab: AdminTab) {
    this.currentTab.set(tab);
  }

  // Helpers para estadísticas
  getVotesForOption(votesByOption: any, index: number): number {
    return Number(votesByOption?.[index.toString()] || 0);
  }

  getOptionPercentage(votesByOption: any, total: number, index: number): number {
    if (!total || total === 0) return 0;
    const votes = this.getVotesForOption(votesByOption, index);
    return Math.round((votes / total) * 100);
  }

  getOptionSymbol(index: number): string {
    const symbols = ['▲', '◆', '●', '■'];
    return symbols[index % symbols.length];
  }
}
