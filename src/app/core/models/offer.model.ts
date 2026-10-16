export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountPercentage?: number;
  discountAmount?: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  expiresAt: string;
  isActive: boolean;
  badge?: string;
}

export interface GiftCard {
  id: string;
  title: string;
  description: string;
  amount: number;
  imageUrl: string;
  theme: string;
  terms: string;
  isActive: boolean;
}

export interface GiftCardPurchase {
  id: string;
  giftCardId: string;
  userId: string;
  recipientName: string;
  recipientEmail: string;
  title: string;
  amount: number;
  balance: number;
  imageUrl: string;
  giftCode: string;
  status: 'active' | 'redeemed' | 'expired';
  purchasedAt: string;
  expiresAt: string;
  payment?: { label: string; status: 'paid' | 'pending' | 'failed'; transactionReference?: string };
}
