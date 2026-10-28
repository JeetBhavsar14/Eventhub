import { Component, ElementRef, QueryList, ViewChildren, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth';
import { ApiClient } from '@core/api';
import { ButtonComponent, IconComponent, InputComponent } from '@shared/components';

export type ForgotStep = 'email' | 'otp' | 'password' | 'success';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, InputComponent, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private apiClient = inject(ApiClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChildren('otp0, otp1, otp2, otp3') otpBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  // Main Login State
  email = '';
  password = '';
  errorMessage = signal('');
  isLoading = this.authService.isLoading;

  // Forgot Password Modal State
  isForgotModalOpen = signal(false);
  forgotStep = signal<ForgotStep>('email');
  forgotEmail = '';
  otpDigits = ['', '', '', ''];
  newPassword = '';
  confirmPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;
  
  targetUserId = '';
  targetUser: any = null;
  forgotError = signal('');
  forgotNotice = signal('');
  isForgotLoading = signal(false);

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
  // Forgot Password Modal Methods
  // ----------------------------------------------------
  openForgotPassword() {
    this.forgotEmail = this.email?.trim() || '';
    this.forgotError.set('');
    this.forgotNotice.set('');
    this.otpDigits = ['', '', '', ''];
    this.newPassword = '';
    this.confirmPassword = '';
    this.targetUserId = '';
    this.targetUser = null;
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

  // Step 1: Verify Email
  async verifyEmail() {
    this.forgotError.set('');
    this.forgotNotice.set('');

    const trimmedEmail = this.forgotEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      this.forgotError.set('Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      this.forgotError.set('Please enter a valid email address.');
      return;
    }

    this.isForgotLoading.set(true);
    try {
      const res = await this.apiClient.get<any[]>(`/users?email=${encodeURIComponent(trimmedEmail)}`);
      if (res.data && res.data.length > 0) {
        this.targetUser = res.data[0];
        this.targetUserId = this.targetUser.id;
        this.forgotStep.set('otp');
        this.forgotNotice.set(`A 4-digit code was sent to ${trimmedEmail}. Any 4 digits are accepted!`);
        setTimeout(() => this.focusOtpBox(0), 100);
      } else {
        this.forgotError.set('No registered account was found with this email address.');
      }
    } catch (err) {
      console.error(err);
      this.forgotError.set('Unable to verify email at this moment. Please try again.');
    } finally {
      this.isForgotLoading.set(false);
    }
  }

  // Step 2: OTP Input Handlers (Fixed: Prevents double-input & handles full backspace)
  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const rawVal = input.value;

    if (!rawVal) {
      this.otpDigits[index] = '';
      input.value = '';
      return;
    }

    // Take only the single character entered
    const char = rawVal.slice(-1);
    this.otpDigits[index] = char;
    input.value = char;

    this.forgotError.set('');

    // Advance focus using setTimeout to prevent key repeating/multiple inputs
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
      event.preventDefault(); // Complete control over backspace

      if (input.value || this.otpDigits[index]) {
        // Clear current box immediately in both state and DOM
        input.value = '';
        this.otpDigits[index] = '';
      } else if (index > 0) {
        // Move to previous box and clear it completely
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

  focusOtpBox(index: number) {
    const el = this.getOtpEl(index);
    if (el) {
      el.focus();
      el.select();
    }
  }

  resendOtp() {
    this.otpDigits = ['', '', '', ''];
    for (let i = 0; i < 4; i++) {
      const el = this.getOtpEl(i);
      if (el) el.value = '';
    }
    this.forgotError.set('');
    this.forgotNotice.set('A new 4-digit code has been sent! Enter any 4 digits to proceed.');
    setTimeout(() => {
      this.focusOtpBox(0);
    }, 50);
  }

  verifyOtp() {
    this.forgotError.set('');
    const code = this.otpDigits.join('').trim();

    if (code.length < 4) {
      this.forgotError.set('Please enter all 4 digits in the boxes.');
      return;
    }

    // Any 4 digits are acceptable as requested
    this.forgotStep.set('password');
    this.forgotNotice.set('');
  }

  // Step 3: Change Password in DB
  async updatePasswordInDb() {
    this.forgotError.set('');

    if (!this.newPassword || this.newPassword.length < 6) {
      this.forgotError.set('New password must be at least 6 characters long.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.forgotError.set('Passwords do not match. Please re-enter.');
      return;
    }

    if (!this.targetUserId) {
      this.forgotError.set('Session expired. Please restart the forgot password process.');
      this.forgotStep.set('email');
      return;
    }

    this.isForgotLoading.set(true);
    try {
      // Update password directly in json-server DB
      const res = await this.apiClient.patch(`/users/${this.targetUserId}`, {
        password: this.newPassword.trim()
      });

      if (res.error) {
        this.forgotError.set(res.error.message || 'Failed to update password in database.');
        return;
      }

      // Success! Auto-fill login fields for immediate smooth login
      this.email = this.forgotEmail.trim();
      this.password = this.newPassword.trim();
      this.forgotStep.set('success');
    } catch (err) {
      console.error(err);
      this.forgotError.set('Failed to update password in database. Please try again.');
    } finally {
      this.isForgotLoading.set(false);
    }
  }

  finishAndLogin() {
    this.closeForgotPassword();
  }
}

