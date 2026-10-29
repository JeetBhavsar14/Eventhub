import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputComponent } from '@shared/components';
import * as QRCode from 'qrcode';

export type PaymentMethod = 'card' | 'upi' | 'qr';
export interface PaymentSelection {
  method: PaymentMethod;
  label: string;
  cardLast4?: string;
  upiId?: string;
}

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent],
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentFormComponent implements OnChanges {
  @Input() amount = 0;
  @Output() paymentValid = new EventEmitter<{ valid: boolean; data: PaymentSelection }>();

  activeMethod = signal<PaymentMethod>('card');
  qrCodeUrl = signal<string>('');
  
  cardForm: FormGroup;
  upiForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.cardForm = this.fb.group({
      nameOnCard: ['', [Validators.required, Validators.minLength(2)]],
      cardNumber: ['', [Validators.required, Validators.pattern('^[0-9]{16}$')]],
      expiry: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\\/([0-9]{2})$')]],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]],
    });

    this.upiForm = this.fb.group({
      upiId: ['', [Validators.required, Validators.pattern('^[\\w.-]+@[\\w.-]+$')]]
    });

    this.cardForm.valueChanges.subscribe(() => this.emitValidity());
    this.upiForm.valueChanges.subscribe(() => this.emitValidity());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['amount']) this.createPaymentQr();
  }

  private async createPaymentQr() {
    const amount = Number(this.amount || 0).toFixed(2);
    try {
      this.qrCodeUrl.set(await QRCode.toDataURL(`upi://pay?pa=eventhub@bank&pn=EventHub&am=${amount}&cu=INR`, { width: 180, margin: 1 }));
    } catch {
      this.qrCodeUrl.set('');
    }
  }

  setMethod(method: PaymentMethod) {
    this.activeMethod.set(method);
    this.emitValidity();
  }

  private emitValidity() {
    const method = this.activeMethod();
    if (method === 'card') {
      this.paymentValid.emit({ valid: this.cardForm.valid, data: { method: 'card', label: 'Credit / Debit Card', cardLast4: this.cardForm.value.cardNumber?.slice(-4) } });
    } else if (method === 'upi') {
      this.paymentValid.emit({ valid: this.upiForm.valid, data: { method: 'upi', label: 'UPI', upiId: this.upiForm.value.upiId } });
    } else if (method === 'qr') {
      // QR is always "valid" to proceed, user scans from phone
      this.paymentValid.emit({ valid: true, data: { method: 'qr', label: 'UPI QR' } });
    }
  }

  // Force validation check from parent when submitting
  public validate(): boolean {
    const method = this.activeMethod();
    if (method === 'card') {
      this.cardForm.markAllAsTouched();
      return this.cardForm.valid;
    }
    if (method === 'upi') {
      this.upiForm.markAllAsTouched();
      return this.upiForm.valid;
    }
    return true; // QR
  }

  /** Returns safe metadata only; card number and CVV never leave this component. */
  public getPaymentSelection(): PaymentSelection {
    const method = this.activeMethod();
    if (method === 'card') return { method, label: 'Credit / Debit Card', cardLast4: this.cardForm.value.cardNumber?.slice(-4) };
    if (method === 'upi') return { method, label: 'UPI', upiId: this.upiForm.value.upiId };
    return { method, label: 'UPI QR' };
  }
}
