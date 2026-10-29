import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { User, UserProfileUpdate } from '@core/models';
import { ButtonComponent, InputComponent } from '@shared/components';

@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileFormComponent implements OnChanges {
  @Input() user: User | null = null;
  @Input() isSaving = false;
  @Output() submitted = new EventEmitter<UserProfileUpdate>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    phone: [''],
    bio: [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      this.form.patchValue({
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        phone: this.user.phone ?? '',
        bio: this.user.bio ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, phone, bio } = this.form.getRawValue();
    this.submitted.emit({
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      phone: phone ?? '',
      bio: bio ?? '',
    });
  }
}
