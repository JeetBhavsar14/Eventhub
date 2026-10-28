import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth';
import { ButtonComponent, InputComponent } from '@shared/components';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, InputComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  
  errorMessage = signal('');

  isLoading = this.authService.isLoading;

  async onSubmit() {
    this.errorMessage.set('');
    
    // Basic validation
    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    const result = await this.authService.register(
      this.email,
      this.password,
      this.firstName,
      this.lastName,
      this.phone
    );
    
    if (result.success) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/discover';
      this.router.navigateByUrl(returnUrl);
    } else {
      this.errorMessage.set(result.message);
    }
  }
}
