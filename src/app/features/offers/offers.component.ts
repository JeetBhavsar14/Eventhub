import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiClient } from '@core/api';
import { Offer } from '@core/models';
import { ButtonComponent } from '@shared/components';

@Component({ selector: 'app-offers', standalone: true, imports: [CommonModule, ButtonComponent], templateUrl: './offers.component.html', styleUrl: './offers.component.css' })
export class OffersComponent implements OnInit {
  private apiClient = inject(ApiClient);
  offers = signal<Offer[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  copiedCode = signal<string | null>(null);

  async ngOnInit() { await this.loadOffers(); }
  async loadOffers() {
    this.isLoading.set(true); this.error.set(null);
    const result = await this.apiClient.get<Offer[]>('/offers');
    if (result.data) this.offers.set(result.data.filter((offer) => offer.isActive && new Date(offer.expiresAt) >= new Date()));
    else this.error.set('Offers are unavailable right now. Please try again shortly.');
    this.isLoading.set(false);
  }
  async copyCode(code: string) {
    try { await navigator.clipboard.writeText(code); } catch { /* Clipboard may be unavailable in local HTTP. */ }
    this.copiedCode.set(code);
    setTimeout(() => this.copiedCode.set(null), 1800);
  }
  discountLabel(offer: Offer) { return offer.discountPercentage ? `${offer.discountPercentage}% OFF` : `₹${offer.discountAmount} OFF`; }
}
