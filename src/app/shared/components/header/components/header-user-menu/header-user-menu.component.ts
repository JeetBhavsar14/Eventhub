import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { User } from '@core/models';

@Component({
  selector: 'app-header-user-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header-user-menu.component.html',
  styleUrl: './header-user-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderUserMenuComponent {
  @Input() isOpen = false;
  @Input() user: User | null = null;
  @Input() isApprovedHost = false;
  @Input() isAdmin = false;
  @Input() isManagement = false;
  @Input() isStaff = false;
  @Input() hostStatus = 'guest';

  @Output() toggleMenu = new EventEmitter<void>();
  @Output() closeMenu = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  getInitials(): string {
    if (!this.user) return '?';
    return `${this.user.firstName?.[0] ?? ''}${this.user.lastName?.[0] ?? ''}`.toUpperCase();
  }

  onToggle(event: MouseEvent) {
    event.stopPropagation();
    this.toggleMenu.emit();
  }

  onItemClick() {
    this.closeMenu.emit();
  }

  onLogout() {
    this.closeMenu.emit();
    this.logout.emit();
  }
}

