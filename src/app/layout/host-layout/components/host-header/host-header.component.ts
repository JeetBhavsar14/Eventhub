import { Component, Input, Output, EventEmitter, signal, computed, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  HostDashboardView,
  HostWorkspaceInfo,
  HostEventItem,
  HostEventStatus,
  HostNotificationItem
} from '@core/models';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-host-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  templateUrl: './host-header.component.html',
  styleUrl: './host-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostHeaderComponent {
  @Input({ required: true }) currentView: HostDashboardView = 'overview';
  @Input({ required: true }) events: HostEventItem[] = [];
  @Input({ required: true }) notifications: HostNotificationItem[] = [];
  @Input({ required: true }) unreadCount: number = 0;
  @Input({ required: true }) hostInfo!: HostWorkspaceInfo;

  @Output() toggleMobileSidebar = new EventEmitter<void>();
  @Output() switchView = new EventEmitter<HostDashboardView>();
  @Output() openHelp = new EventEmitter<void>();
  @Output() selectEvent = new EventEmitter<HostEventItem>();
  @Output() markNotificationRead = new EventEmitter<string>();
  @Output() markAllNotificationsRead = new EventEmitter<void>();
  @Output() signOut = new EventEmitter<void>();

  eventSearchTerm = signal('');
  showSearchDropdown = signal(false);
  showNotificationsDropdown = signal(false);
  showTopUserMenu = signal(false);

  topMatchingResults = computed(() => {
    const term = this.eventSearchTerm().toLowerCase().trim();
    if (!term) return [];
    return this.events.filter(e =>
      e.title.toLowerCase().includes(term) ||
      e.category.toLowerCase().includes(term) ||
      e.venue.toLowerCase().includes(term) ||
      e.city.toLowerCase().includes(term)
    ).slice(0, 3);
  });

  totalMatchesCount = computed(() => {
    const term = this.eventSearchTerm().toLowerCase().trim();
    if (!term) return 0;
    return this.events.filter(e =>
      e.title.toLowerCase().includes(term) ||
      e.category.toLowerCase().includes(term) ||
      e.venue.toLowerCase().includes(term) ||
      e.city.toLowerCase().includes(term)
    ).length;
  });

  onSearchFocus(): void {
    if (this.eventSearchTerm().trim()) {
      this.showSearchDropdown.set(true);
    }
  }

  onEventSearchChange(term: string): void {
    this.eventSearchTerm.set(term);
    this.showSearchDropdown.set(term.trim().length > 0);
  }

  clearSearch(): void {
    this.eventSearchTerm.set('');
    this.showSearchDropdown.set(false);
  }

  selectSearchResult(item: HostEventItem): void {
    this.showSearchDropdown.set(false);
    this.selectEvent.emit(item);
  }

  seeAllSearchResults(): void {
    this.showSearchDropdown.set(false);
    this.switchView.emit('my_events');
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.showNotificationsDropdown.update(v => !v);
    this.showTopUserMenu.set(false);
  }

  toggleTopUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showTopUserMenu.update(v => !v);
    this.showNotificationsDropdown.set(false);
  }

  onNotificationClick(notif: HostNotificationItem): void {
    this.markNotificationRead.emit(notif.id);
  }

  onViewClick(view: HostDashboardView): void {
    this.switchView.emit(view);
    this.showTopUserMenu.set(false);
    this.showNotificationsDropdown.set(false);
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

  getStatusBadgeClass(status: HostEventStatus): string {
    switch (status) {
      case 'published':
        return 'badge-published';
      case 'pending_review':
        return 'badge-pending';
      case 'changes_requested':
        return 'badge-changes';
      case 'approved':
        return 'badge-approved';
      case 'draft':
        return 'badge-draft';
      case 'rejected':
        return 'badge-rejected';
      default:
        return 'badge-draft';
    }
  }

  getStatusLabel(status: HostEventStatus): string {
    switch (status) {
      case 'published':
        return 'Published';
      case 'pending_review':
        return 'Pending Review';
      case 'changes_requested':
        return 'Changes Requested';
      case 'approved':
        return 'Approved';
      case 'draft':
        return 'Draft';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-search-box')) {
      this.showSearchDropdown.set(false);
    }
    if (!target.closest('.dropdown-trigger') && !target.closest('.dropdown-menu-box')) {
      this.showTopUserMenu.set(false);
    }
    if (!target.closest('.relative-dropdown-container')) {
      this.showNotificationsDropdown.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showSearchDropdown.set(false);
    this.showTopUserMenu.set(false);
    this.showNotificationsDropdown.set(false);
  }
}

