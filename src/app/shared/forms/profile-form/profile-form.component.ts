import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { User, UserProfileUpdate } from '@core/models';
import { ButtonComponent, IconComponent } from '@shared/components';

export interface VerificationRequestEvent {
  type: 'email' | 'phone';
  targetValue: string;
  pendingChanges: UserProfileUpdate;
  secondaryVerification?: {
    type: 'phone';
    targetValue: string;
  };
}

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileFormComponent implements OnInit, OnChanges {
  @Input() user: User | null = null;
  @Input() isSaving = false;
  @Output() submitted = new EventEmitter<UserProfileUpdate>();
  @Output() requestVerification = new EventEmitter<VerificationRequestEvent>();

  private readonly fb = inject(FormBuilder);

  originalEmail = '';
  originalPhone = '';

  readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    bio: [''],
  });

  ngOnInit(): void {
    if (this.user) {
      this.populate(this.user);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.user) {
      this.populate(this.user);
    }
  }

  private populate(user: User): void {
    this.originalEmail = (user.email || '').trim().toLowerCase();
    this.originalPhone = (user.phone || '').trim();
    this.form.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      bio: user.bio ?? '',
    });
  }

  isEmailChanged(): boolean {
    const current = (this.form.get('email')?.value || '').trim().toLowerCase();
    return current !== this.originalEmail && current.length > 0;
  }

  isPhoneChanged(): boolean {
    const current = (this.form.get('phone')?.value || '').trim();
    return current !== this.originalPhone && current.length > 0;
  }

  isEmailVerified(): boolean {
    return this.user?.isEmailVerified ?? false;
  }

  isPhoneVerified(): boolean {
    return this.user?.isPhoneVerified ?? false;
  }

  onVerifyClick(type: 'email' | 'phone'): void {
    const { firstName, lastName, email, phone, bio } = this.form.getRawValue();
    const currentEmail = (email ?? this.user?.email ?? '').trim();
    const currentPhone = (phone ?? this.user?.phone ?? '').trim();
    const targetValue = type === 'email' ? currentEmail : currentPhone;

    if (!targetValue) return;

    this.requestVerification.emit({
      type,
      targetValue,
      pendingChanges: {
        firstName: (firstName ?? '').trim(),
        lastName: (lastName ?? '').trim(),
        email: currentEmail,
        phone: currentPhone,
        bio: (bio ?? '').trim(),
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, phone, bio } = this.form.getRawValue();
    const cleanFirstName = (firstName ?? '').trim();
    const cleanLastName = (lastName ?? '').trim();
    const cleanEmail = (email ?? '').trim();
    const cleanPhone = (phone ?? '').trim();
    const cleanBio = (bio ?? '').trim();

    const pendingChanges: UserProfileUpdate = {
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: cleanEmail,
      phone: cleanPhone,
      bio: cleanBio,
    };

    const emailChanged = this.isEmailChanged();
    const phoneChanged = this.isPhoneChanged();

    if (emailChanged) {
      this.requestVerification.emit({
        type: 'email',
        targetValue: cleanEmail,
        pendingChanges,
        secondaryVerification: phoneChanged ? {
          type: 'phone',
          targetValue: cleanPhone
        } : undefined
      });
      return;
    }

    if (phoneChanged) {
      this.requestVerification.emit({
        type: 'phone',
        targetValue: cleanPhone,
        pendingChanges
      });
      return;
    }

    this.submitted.emit(pendingChanges);
  }
}
