import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth';
import { ButtonComponent, InputComponent } from '@shared/components';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, InputComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  errorMessage = signal('');

  // Access the auth service's loading signal
  isLoading = this.authService.isLoading;

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
}
