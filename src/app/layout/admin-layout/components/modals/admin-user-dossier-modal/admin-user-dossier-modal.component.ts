import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components';
import { AdminUser } from '@core/state';

@Component({
  selector: 'app-admin-user-dossier-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './admin-user-dossier-modal.component.html',
  styleUrls: ['../admin-modal-shared.css', './admin-user-dossier-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUserDossierModalComponent {
  @Input() user: AdminUser | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() changeRole = new EventEmitter<{ user: AdminUser; newRole: AdminUser['role'] }>();
  @Output() toggleSuspension = new EventEmitter<AdminUser>();

  onClose() {
    this.close.emit();
  }

  onRoleChange(newRole: AdminUser['role']) {
    if (this.user) {
      this.changeRole.emit({ user: this.user, newRole });
    }
  }

  onToggleSuspension() {
    if (this.user) {
      this.toggleSuspension.emit(this.user);
    }
  }
}

