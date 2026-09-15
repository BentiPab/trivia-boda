import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
})
export class HomeComponent {
  private router = inject(Router);
  private database = inject(DatabaseService);

  code = signal('');
  errorMessage = signal('');
  isLoading = signal(false);

  async submitCode() {
    const rawCode = this.code().trim();
    if (!rawCode) {
      this.errorMessage.set('Por favor, ingresá tu código.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const guest = await this.database.getGuestByToken(rawCode);

      if (!guest) {
        this.errorMessage.set('Código no encontrado. Revisá tu tarjeta.');
        return;
      }

      // Si es válido, lo mandamos a la trivia con su token en la query
      this.router.navigate(['/trivia'], {
        queryParams: { t: guest.token },
      });
    } catch (error) {
      this.errorMessage.set('Ocurrió un error al conectar. Probá de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
