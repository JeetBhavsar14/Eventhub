import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiClient } from '@core/api';
import { GiftCard } from '@core/models';
import { AuthService } from '@core/auth';
import { ButtonComponent } from '@shared/components';

@Component({ selector: 'app-gift-cards', standalone: true, imports: [CommonModule, ButtonComponent], templateUrl: './gift-cards.component.html', styleUrl: './gift-cards.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GiftCardsComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  giftCards = signal<GiftCard[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  selectedCard = signal<GiftCard | null>(null);
  async ngOnInit() { await this.loadGiftCards(); }
  async loadGiftCards() { this.isLoading.set(true); this.error.set(null); const result = await this.apiClient.get<GiftCard[]>('/giftCards'); if (result.data) this.giftCards.set(result.data.filter((card) => card.isActive)); else this.error.set(result.error?.userMessage || 'Gift cards are unavailable right now. Please try again shortly.'); this.isLoading.set(false); }
  selectCard(card: GiftCard) { this.selectedCard.set(card); }
  closeModal() { this.selectedCard.set(null); }
  purchase() {
    const card = this.selectedCard();
    if (!card) return;
    if (!this.authService.currentUser()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.router.navigate(['/gift-card-checkout', card.id]);
  }
}
