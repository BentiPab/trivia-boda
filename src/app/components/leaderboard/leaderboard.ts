import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaderboardEntry } from '../../models';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard.html',
})
export class LeaderboardComponent {
  private database = inject(DatabaseService);

  pin = signal('');
  isAuthenticated = signal(false);
  errorMessage = signal('');
  isLoading = signal(false);

  leaderboard = signal<LeaderboardEntry[]>([]);

  async authenticate() {
    if (!this.pin().trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const data = await this.database.getAdminLeaderboard(this.pin().trim());
      this.leaderboard.set(data);
      this.isAuthenticated.set(true);
    } catch (err: any) {
      this.errorMessage.set('PIN incorrecto o acceso denegado.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async refresh() {
    if (!this.isAuthenticated()) return;
    this.isLoading.set(true);
    try {
      const data = await this.database.getAdminLeaderboard(this.pin().trim());
      this.leaderboard.set(data);
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
