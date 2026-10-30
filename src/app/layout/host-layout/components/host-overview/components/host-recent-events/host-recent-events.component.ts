import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostEventItem, HostEventStatus, HostDashboardView } from '@core/models';
import { IconComponent, PaginationBarComponent } from '@shared/components';

@Component({
  selector: 'app-host-recent-events',
  standalone: true,
  imports: [CommonModule, IconComponent, PaginationBarComponent],
  templateUrl: './host-recent-events.component.html',
  styleUrl: './host-recent-events.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostRecentEventsComponent {
  @Input({ required: true }) events: HostEventItem[] = [];
  @Input() selectedStatusFilter = signal<'all' | 'published' | 'pending' | 'draft' | 'action_required'>('all');

  @Output() createEvent = new EventEmitter<void>();
  @Output() viewAllEvents = new EventEmitter<void>();
  @Output() openDetails = new EventEmitter<{ event: HostEventItem, editMode?: boolean }>();
  @Output() submitForReview = new EventEmitter<string>();
  @Output() publishEvent = new EventEmitter<string>();
  @Output() reviewFeedback = new EventEmitter<HostEventItem>();
  @Output() deleteDraft = new EventEmitter<string>();
  @Output() navigateView = new EventEmitter<HostDashboardView>();

  // Three-dot Action Menu
  readonly activeActionMenuId = signal<string | null>(null);

  // Status Filter computeds
  readonly filteredEvents = computed(() => {
    const list = this.events;
    const filter = this.selectedStatusFilter();
    if (filter === 'all') return list;
    return list.filter(e => {
      if (filter === 'action_required') return e.status === 'changes_requested';
      return e.status === filter;
    });
  });

  // Table Pagination
  readonly overviewPage = signal(1);
  readonly overviewPageSize = signal(5);

  readonly overviewTotalPages = computed(() => {
    const total = this.filteredEvents().length;
    return Math.max(1, Math.ceil(total / this.overviewPageSize()));
  });

  readonly paginatedOverviewEvents = computed(() => {
    const list = this.filteredEvents();
    const size = this.overviewPageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(this.overviewPage(), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  readonly overviewPaginationInfo = computed(() => {
    const total = this.filteredEvents().length;
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const size = this.overviewPageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.overviewPage(), maxPage);
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  readonly overviewPageNumbers = computed(() => {
    const total = this.overviewTotalPages();
    const current = this.overviewPage();
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
        pages.push(i);
      }
    }
    return pages;
  });

  setOverviewPage(page: number) {
    if (page >= 1 && page <= this.overviewTotalPages()) {
      this.overviewPage.set(page);
    }
  }

  setFilterStatus(filter: 'all' | 'published' | 'pending' | 'draft' | 'action_required') {
    this.selectedStatusFilter.set(filter);
    this.overviewPage.set(1);
  }

  toggleActionMenu(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.activeActionMenuId.update(curr => (curr === id ? null : id));
  }

  closeActionMenu() {
    this.activeActionMenuId.set(null);
  }

  getStatusBadgeClass(status: HostEventStatus): string {
    switch (status) {
      case 'published': return 'badge-published';
      case 'pending_review': return 'badge-pending';
      case 'changes_requested': return 'badge-changes';
      case 'approved': return 'badge-approved';
      case 'draft': return 'badge-draft';
      case 'rejected': return 'badge-rejected';
      default: return 'badge-draft';
    }
  }

  getStatusLabel(status: HostEventStatus): string {
    switch (status) {
      case 'published': return 'Published';
      case 'pending_review': return 'Pending Review';
      case 'changes_requested': return 'Changes Requested';
      case 'approved': return 'Approved';
      case 'draft': return 'Draft';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  }
}

