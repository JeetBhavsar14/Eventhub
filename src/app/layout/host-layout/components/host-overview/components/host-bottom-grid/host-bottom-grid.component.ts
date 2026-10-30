import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostEventItem, HostPendingAction, HostRecentActivity, HostDashboardView } from '@core/models';
import { IconComponent, PaginationBarComponent } from '@shared/components';

@Component({
  selector: 'app-host-bottom-grid',
  standalone: true,
  imports: [CommonModule, IconComponent, PaginationBarComponent],
  templateUrl: './host-bottom-grid.component.html',
  styleUrl: './host-bottom-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostBottomGridComponent {
  @Input({ required: true }) upcomingEvents: HostEventItem[] = [];
  @Input({ required: true }) pendingActions: HostPendingAction[] = [];
  @Input({ required: true }) recentActivities: HostRecentActivity[] = [];

  @Output() createEvent = new EventEmitter<void>();
  @Output() openDetails = new EventEmitter<{ event: HostEventItem, editMode?: boolean }>();
  @Output() filterAction = new EventEmitter<'all' | 'published' | 'pending' | 'draft' | 'action_required'>();
  @Output() navigateView = new EventEmitter<HostDashboardView>();
  @Output() toast = new EventEmitter<string>();

  // Upcoming Events Pagination
  readonly upcomingPage = signal(1);
  readonly upcomingPageSize = signal(3);

  readonly upcomingTotalPages = computed(() => {
    const total = this.upcomingEvents.length;
    return Math.max(1, Math.ceil(total / this.upcomingPageSize()));
  });

  readonly paginatedUpcomingEvents = computed(() => {
    const list = this.upcomingEvents;
    const size = this.upcomingPageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(this.upcomingPage(), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  readonly upcomingPaginationInfo = computed(() => {
    const total = this.upcomingEvents.length;
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const size = this.upcomingPageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.upcomingPage(), maxPage);
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  readonly upcomingPageNumbers = computed(() => {
    const total = this.upcomingTotalPages();
    const current = this.upcomingPage();
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
        pages.push(i);
      }
    }
    return pages;
  });

  setUpcomingPage(page: number) {
    if (page >= 1 && page <= this.upcomingTotalPages()) {
      this.upcomingPage.set(page);
    }
  }

  handleFilterAction(filter: 'all' | 'published' | 'pending' | 'draft' | 'action_required') {
    this.filterAction.emit(filter);
    const el = document.getElementById('host-recent-events-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

