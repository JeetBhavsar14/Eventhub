import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileFormComponent } from '@shared/forms';
import { AuthService } from '@core/auth';
import { HostApplicationService } from '@core/state';
import { UserProfileUpdate } from '@core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ProfileFormComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  activeTab = signal<'personal' | 'preferences' | 'payments' | 'favorites'>('personal');
  
  private authService = inject(AuthService);
  private hostAppService = inject(HostApplicationService);

  readonly currentUser = this.authService.currentUser;
  readonly hostStatus = this.hostAppService.status;
  readonly applicationData = this.hostAppService.applicationData;

  readonly isApprovedHost = computed(() => {
    return this.hostStatus() === 'approved' || this.currentUser()?.isHost === true;
  });

  readonly isHostApplied = computed(() => {
    return this.hostStatus() !== 'guest' && this.hostStatus() !== 'not_applied';
  });

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
