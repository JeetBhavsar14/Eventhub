import { Component, ElementRef, QueryList, ViewChildren, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth';
import { ButtonComponent, IconComponent, InputComponent } from '@shared/components';
import { environment } from '@env/environment';

export type ForgotStep = 'email' | 'otp' | 'password' | 'success';

export interface DemoAccount {
  role: string;
  email: string;
  badge: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, InputComponent, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChildren('otp0, otp1, otp2, otp3') otpBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  // Main Login State
  email = '';
  password = '';
  errorMessage = signal('');
  isLoading = this.authService.isLoading;

  // Forgot Password Simulation State
  isForgotModalOpen = signal(false);
  forgotStep = signal<ForgotStep>('email');
  forgotEmail = '';
  otpDigits = ['', '', '', ''];
  newPassword = '';
  confirmPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;

  forgotError = signal('');
  forgotNotice = signal('');
  isForgotLoading = signal(false);

  // Environment-based Demo Auth Flag
  readonly isDemoAuth = environment.demoAuth;

  // Pre-configured demonstration OTP code (avoids accepting arbitrary OTPs)
  readonly DEMO_OTP = '1234';

  // Demo account identifiers only — passwords are kept out of client bundles
  readonly demoAccounts: DemoAccount[] = [
    { role: 'Super Admin', email: 'admin@eventhub.com', badge: 'admin' },
    { role: 'Host / Organizer', email: 'host@eventhub.com', badge: 'host' },
    { role: 'Management & Operations', email: 'management@eventhub.com', badge: 'management' },
    { role: 'Event Staff', email: 'staff@eventhub.com', badge: 'staff' },
    { role: 'Standard Attendee', email: 'jeet@eventhub.com', badge: 'user' }
  ];

  async onSubmit() {
    this.errorMessage.set('');
    
    if (!this.email || !this.password) {
      this.errorMessage.set('Please fill in both fields.');
      return;
    }

    const result = await this.authService.login(this.email, this.password);
    
    if (result.success) {
      const explicitReturnUrl = this.route.snapshot.queryParams['returnUrl'];
      if (explicitReturnUrl && explicitReturnUrl !== '/') {
        this.router.navigateByUrl(explicitReturnUrl);
        return;
      }

      // Dynamic Role-Based Landing Redirect
      const user = this.authService.currentUser();
      const role = user?.platformRole;

      if (role === 'admin') {
        this.router.navigate(['/admin']);
      } else if (role === 'host' || user?.isHost) {
        this.router.navigate(['/host/dashboard']);
      } else if (role === 'management') {
        this.router.navigate(['/management']);
      } else if (role === 'staff') {
        this.router.navigate(['/staff']);
      } else {
        this.router.navigate(['/discover']);
      }
    } else {
      this.errorMessage.set(result.message);
    }
  }

  // ----------------------------------------------------
  // Interactive Demonstration Walkthrough Modal Methods
  // ----------------------------------------------------
  openForgotPassword() {
    this.forgotEmail = this.email?.trim() || '';
    this.forgotError.set('');
    this.forgotNotice.set('');
    this.otpDigits = ['', '', '', ''];
    this.newPassword = '';
    this.confirmPassword = '';
    this.forgotStep.set('email');
    this.isForgotModalOpen.set(true);
  }

  closeForgotPassword() {
    this.isForgotModalOpen.set(false);
    this.forgotError.set('');
    this.forgotNotice.set('');
    this.isForgotLoading.set(false);
  }

  getOtpEl(index: number): HTMLInputElement | null {
    const list = this.otpBoxes?.toArray();
    return list && list[index] ? list[index].nativeElement : null;
  }

  focusOtpBox(index: number) {
    const el = this.getOtpEl(index);
    if (el) {
      el.focus();
      el.select();
    }
  }

  // Step 1: Simulate Email Verification
  verifyEmail() {
    this.forgotError.set('');
    this.forgotNotice.set('');

    if (!this.isDemoAuth) {
      this.forgotError.set('Self-service password reset is disabled in production. Please contact support@eventhub.com.');
      return;
    }

    const trimmedEmail = this.forgotEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      this.forgotError.set('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      this.forgotError.set('Please enter a valid email address.');
      return;
    }

    this.isForgotLoading.set(true);

    // Simulate network dispatch with demonstration notice
    setTimeout(() => {
      this.isForgotLoading.set(false);
      this.forgotStep.set('otp');
      this.forgotNotice.set(`Demonstration Mode: Test code [1 2 3 4] issued for ${trimmedEmail}.`);
      setTimeout(() => this.focusOtpBox(0), 100);
    }, 350);
  }

  // Step 2: OTP Input Handling
  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const rawVal = input.value;

    if (!rawVal) {
      this.otpDigits[index] = '';
      input.value = '';
      return;
    }

    const char = rawVal.slice(-1);
    this.otpDigits[index] = char;
    input.value = char;
    this.forgotError.set('');

    if (char && index < 3) {
      setTimeout(() => {
        const nextEl = this.getOtpEl(index + 1);
        if (nextEl) {
          nextEl.focus();
          nextEl.select();
        }
      }, 30);
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (input.value || this.otpDigits[index]) {
        input.value = '';
        this.otpDigits[index] = '';
      } else if (index > 0) {
        const prevEl = this.getOtpEl(index - 1);
        this.otpDigits[index - 1] = '';
        if (prevEl) {
          prevEl.value = '';
          prevEl.focus();
          prevEl.select();
        }
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      const prevEl = this.getOtpEl(index - 1);
      if (prevEl) {
        prevEl.focus();
        prevEl.select();
      }
      return;
    }

    if (event.key === 'ArrowRight' && index < 3) {
      event.preventDefault();
      const nextEl = this.getOtpEl(index + 1);
      if (nextEl) {
        nextEl.focus();
        nextEl.select();
      }
      return;
    }
  }

  onOtpFocus(index: number) {
    const el = this.getOtpEl(index);
    if (el) {
      setTimeout(() => el.select(), 10);
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const cleanChars = pastedData.trim().slice(0, 4).split('');

    if (cleanChars.length > 0) {
      for (let i = 0; i < 4; i++) {
        const ch = cleanChars[i] || '';
        this.otpDigits[i] = ch;
        const el = this.getOtpEl(i);
        if (el) el.value = ch;
      }
      const nextIndex = Math.min(cleanChars.length, 3);
      setTimeout(() => {
        const el = this.getOtpEl(nextIndex);
        if (el) {
          el.focus();
          el.select();
        }
      }, 30);
    }
  }

  resendOtp() {
    this.otpDigits = ['', '', '', ''];
    for (let i = 0; i < 4; i++) {
      const el = this.getOtpEl(i);
      if (el) el.value = '';
    }
    this.forgotError.set('');
    this.forgotNotice.set('Demonstration code re-issued! Enter 1 2 3 4 to proceed with the walkthrough.');
    setTimeout(() => this.focusOtpBox(0), 50);
  }

  // Enforces strictly the DEMO_OTP ('1234') — rejects arbitrary OTP codes
  verifyOtp() {
    this.forgotError.set('');

    if (!this.isDemoAuth) {
      this.forgotError.set('Demo authentication is disabled in this environment.');
      return;
    }

    const code = this.otpDigits.join('').trim();

    if (code.length < 4) {
      this.forgotError.set('Please enter all 4 digits.');
      return;
    }

    if (code !== this.DEMO_OTP) {
      this.forgotError.set('Invalid code. For this demonstration walkthrough, please enter 1 2 3 4.');
      return;
    }

    this.forgotStep.set('password');
    this.forgotNotice.set('');
  }

  // Step 3: Non-destructive Password Change Simulation (Zero DB Mutations)
  submitDemoPassword() {
    this.forgotError.set('');

    if (!this.newPassword || this.newPassword.length < 6) {
      this.forgotError.set('New password must be at least 6 characters long.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.forgotError.set('Passwords do not match. Please re-enter.');
      return;
    }

    this.isForgotLoading.set(true);

    // Simulate completion with zero backend mutation to preserve shared accounts
    setTimeout(() => {
      this.isForgotLoading.set(false);
      this.forgotStep.set('success');
    }, 400);
  }

  finishWalkthrough() {
    this.closeForgotPassword();
  }

  selectDemoAccount(account: DemoAccount) {
    this.email = account.email;
    this.password = '';
    this.errorMessage.set('');
    this.closeForgotPassword();
  }
}
