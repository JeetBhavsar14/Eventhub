import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
      // Instantly log them in and take them to the home page
      this.router.navigate(['/']); 
    } else {
      this.errorMessage.set(result.message);
    }
  }
}
