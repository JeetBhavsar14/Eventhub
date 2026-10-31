import { Component, Input, Output, EventEmitter, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HostDashboardView, HostWorkspaceInfo } from '@core/models';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-host-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './host-sidebar.component.html',
  styleUrl: './host-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostSidebarComponent {
  @Input({ required: true }) currentView: HostDashboardView = 'overview';
  @Input({ required: true }) eventsCount: number = 0;
  @Input({ required: true }) totalBookingsCount: number = 0;
  @Input({ required: true }) teamMembersCount: number = 0;
  @Input({ required: true }) unreadCount: number = 0;
  @Input({ required: true }) hostInfo!: HostWorkspaceInfo;
  @Input({ required: true }) isMobileSidebarOpen: boolean = false;

  @Output() switchView = new EventEmitter<HostDashboardView>();
  @Output() openCreateWizard = new EventEmitter<void>();
  @Output() openHelp = new EventEmitter<void>();
  @Output() signOut = new EventEmitter<void>();
  @Output() closeMobileSidebar = new EventEmitter<void>();

  showSidebarUserMenu = signal(false);

  toggleSidebarUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showSidebarUserMenu.update(v => !v);
  }

  getInitials(): string {
    const name = this.hostInfo?.name;
    if (!name) return 'JB';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  onViewClick(view: HostDashboardView): void {
    this.switchView.emit(view);
    this.showSidebarUserMenu.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar-user-card') && !target.closest('.host-sidebar-dropdown-box')) {
      this.showSidebarUserMenu.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showSidebarUserMenu.set(false);
  }
}

