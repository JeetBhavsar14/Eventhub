import { Component, Output, EventEmitter, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser } from '@core/state';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './admin-users.component.html',
  styleUrls: ['../../admin-shared.css', './admin-users.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsersComponent {
  private readonly adminService = inject(AdminService);

  readonly userRoleFilter = signal<string>('all');
  readonly userStatusFilter = signal<'all' | 'active' | 'suspended'>('all');
  readonly userSearch = signal('');
  readonly users = this.adminService.users;

  readonly filteredUsers = computed(() => {
    let list = this.users();
    const role = this.userRoleFilter();
    const status = this.userStatusFilter();
    const search = this.userSearch().toLowerCase().trim();

    if (role !== 'all') {
      list = list.filter(u => u.role === role);
    }
    if (status !== 'all') {
      list = list.filter(u => u.status === status);
    }
    if (search) {
      list = list.filter(u =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.role.toLowerCase().includes(search)
      );
    }
    return list;
  });

  @Output() inspectUser = new EventEmitter<AdminUser>();
  @Output() toggleSuspension = new EventEmitter<AdminUser>();

  setRoleFilter(role: string) {
    this.userRoleFilter.set(role);
  }

  setStatusFilter(status: 'all' | 'active' | 'suspended') {
    this.userStatusFilter.set(status);
  }

  onInspect(user: AdminUser) {
    this.inspectUser.emit(user);
  }

  onToggleSuspension(user: AdminUser) {
    this.toggleSuspension.emit(user);
  }
}

