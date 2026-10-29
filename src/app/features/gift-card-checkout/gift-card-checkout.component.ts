import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { GiftCard, GiftCardPurchase } from '@core/models';
import { ButtonComponent } from '@shared/components';
import { PaymentFormComponent } from '@shared/forms';

@Component({ selector: 'app-gift-card-checkout', standalone: true, imports: [CommonModule, ButtonComponent, PaymentFormComponent], templateUrl: './gift-card-checkout.component.html', styleUrl: './gift-card-checkout.component.css' })
export class GiftCardCheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute); private router = inject(Router); private apiClient = inject(ApiClient); private authService = inject(AuthService);
  @ViewChild(PaymentFormComponent) paymentForm!: PaymentFormComponent;
  giftCard = signal<GiftCard | null>(null); isLoading = signal(true); isProcessing = signal(false); error = signal<string | null>(null);
  purchaseSuccess = signal(false); giftCode = signal('');
  async ngOnInit() { const id = this.route.snapshot.paramMap.get('id'); if (!id) { this.router.navigate(['/gift-cards']); return; } const result = await this.apiClient.get<GiftCard>(`/giftCards/${id}`); if (result.data?.isActive) this.giftCard.set(result.data); else this.error.set(result.error?.message || 'This gift card is no longer available.'); this.isLoading.set(false); }
  async pay() {
    const card = this.giftCard(); const user = this.authService.currentUser();
    if (!card || !user || !this.paymentForm.validate()) { this.error.set('Please complete valid payment details to continue.'); return; }
    this.isProcessing.set(true); this.error.set(null);
    const now = new Date(); const expiresAt = new Date(now); expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const payment = this.paymentForm.getPaymentSelection();
    const purchase: Omit<GiftCardPurchase, 'id'> = { giftCardId: card.id, userId: user.id, recipientName: `${user.firstName} ${user.lastName}`.trim(), recipientEmail: user.email, title: card.title, amount: card.amount, balance: card.amount, imageUrl: card.imageUrl, giftCode: `EHGC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`, status: 'active', purchasedAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
    const result = await this.apiClient.post<GiftCardPurchase>('/giftCardPurchases', { ...purchase, payment: { ...payment, status: 'paid', transactionReference: `TXN-${Date.now().toString(36).toUpperCase()}` } });
    this.isProcessing.set(false);
    if (result.data) {
      this.giftCode.set(purchase.giftCode);
      this.purchaseSuccess.set(true);

      // Dispatch gift card notification
      try {
        await this.apiClient.post('/notifications', {
          id: `notif-${Date.now()}`,
          userId: user.id,
          userEmail: user.email,
          type: 'booking',
          title: 'Gift Card Purchased! 🎁',
          message: `Your ${card.title} (₹${card.amount.toLocaleString()}) has been activated. Gift Code: ${purchase.giftCode}`,
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'normal',
          icon: 'ticket',
          action: {
            label: 'View Gift Cards',
            actionType: 'navigate',
            route: '/my-gift-cards',
            primary: true
          }
        });
      } catch (e) {
        console.warn('Could not post gift card notification:', e);
      }
    } else {
      this.error.set('We could not confirm your payment. Please try again.');
    }
  }

  goToMyGiftCards() {
    this.router.navigate(['/my-gift-cards']);
  }
}
