import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { GiftCardPurchase } from '@core/models';
import { ButtonComponent } from '@shared/components';

@Component({ selector: 'app-my-gift-cards', standalone: true, imports: [CommonModule, RouterLink, ButtonComponent], templateUrl: './my-gift-cards.component.html', styleUrl: './my-gift-cards.component.css' })
export class MyGiftCardsComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  giftCards = signal<GiftCardPurchase[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  copiedCode = signal<string | null>(null);

  async ngOnInit() { await this.loadGiftCards(); }
  async loadGiftCards() {
    const user = this.authService.currentUser();
    if (!user) return;
    this.isLoading.set(true); this.error.set(null);
    const result = await this.apiClient.get<GiftCardPurchase[]>('/giftCardPurchases', { userId: user.id });
    if (result.data) this.giftCards.set([...result.data].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)));
    else this.error.set('We could not load your gift cards. Please try again.');
    this.isLoading.set(false);
  }
  async copyCode(code: string) { try { await navigator.clipboard.writeText(code); } catch { /* Clipboard may be unavailable over local HTTP. */ } this.copiedCode.set(code); setTimeout(() => this.copiedCode.set(null), 1800); }
}
