import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileFormComponent } from '@shared/forms';
import { AuthService } from '@core/auth';
import { UserProfileUpdate } from '@core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ProfileFormComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  activeTab = signal<'personal' | 'preferences' | 'payments' | 'favorites'>('personal');
  
  private authService = inject(AuthService);
  readonly currentUser = this.authService.currentUser;
  readonly isSaving = signal(false);
  readonly saveMessage = signal('');
  readonly saveError = signal(false);

  setTab(tab: 'personal' | 'preferences' | 'payments' | 'favorites') {
    this.activeTab.set(tab);
  }

  async saveProfile(changes: UserProfileUpdate): Promise<void> {
    this.isSaving.set(true);
    this.saveMessage.set('');
    const result = await this.authService.updateProfile(changes);
    this.saveError.set(!result.success);
    this.saveMessage.set(result.message);
    this.isSaving.set(false);
  }
}
