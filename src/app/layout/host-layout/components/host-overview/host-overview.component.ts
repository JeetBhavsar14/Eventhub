import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  HostWorkspaceInfo, 
  HostDashboardStats, 
  HostEventItem, 
  HostPendingAction, 
  HostRecentActivity,
  HostEventStatus,
  HostDashboardView
} from '@core/models';
import { IconComponent, PaginationBarComponent } from '@shared/components';

@Component({
  selector: 'app-host-overview',
  standalone: true,
  imports: [CommonModule, IconComponent, PaginationBarComponent],
  templateUrl: './host-overview.component.html',
  styleUrl: './host-overview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostOverviewComponent {
  @Input({ required: true }) hostInfo!: HostWorkspaceInfo;
  @Input({ required: true }) stats!: HostDashboardStats;
  @Input({ required: true }) selectedPeriod: '7d' | '30d' | '90d' = '30d';
  @Input({ required: true }) chartData!: any;
  @Input({ required: true }) events: HostEventItem[] = [];
  @Input({ required: true }) upcomingEvents: HostEventItem[] = [];
  @Input({ required: true }) pendingActions: HostPendingAction[] = [];
  @Input({ required: true }) recentActivities: HostRecentActivity[] = [];

  @Output() createEvent = new EventEmitter<void>();
  @Output() periodChange = new EventEmitter<'7d' | '30d' | '90d'>();
  @Output() viewAllEvents = new EventEmitter<void>();
  @Output() openDetails = new EventEmitter<{ event: HostEventItem, editMode?: boolean }>();
  @Output() submitForReview = new EventEmitter<string>();
  @Output() publishEvent = new EventEmitter<string>();
  @Output() reviewFeedback = new EventEmitter<HostEventItem>();
  @Output() deleteDraft = new EventEmitter<string>();
  @Output() navigateView = new EventEmitter<HostDashboardView>();
  @Output() toast = new EventEmitter<string>();

  // Interactive Chart Tooltip
  hoveredChartPoint = signal<any | null>(null);

  // Status Filter for Recent Events
  selectedStatusFilter = signal<'all' | 'published' | 'pending' | 'draft' | 'action_required'>('all');

  // Three-dot Action Menu
  activeActionMenuId = signal<string | null>(null);

  filteredEvents = computed(() => {
    const list = this.events;
    const filter = this.selectedStatusFilter();
    if (filter === 'all') return list;
    return list.filter(e => {
      if (filter === 'action_required') return e.status === 'changes_requested';
      return e.status === filter;
    });
  });

  // Overview Table Pagination
  overviewPage = signal(1);
  overviewPageSize = signal(5);

  overviewTotalPages = computed(() => {
    const total = this.filteredEvents().length;
    return Math.max(1, Math.ceil(total / this.overviewPageSize()));
  });

  paginatedOverviewEvents = computed(() => {
    const list = this.filteredEvents();
    const size = this.overviewPageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(this.overviewPage(), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  overviewPaginationInfo = computed(() => {
    const total = this.filteredEvents().length;
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const size = this.overviewPageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.overviewPage(), maxPage);
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  overviewPageNumbers = computed(() => {
    const total = this.overviewTotalPages();
    const current = this.overviewPage();
    const pages: number[] = [];
    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(total, startPage + 4);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  });

  setOverviewPage(p: number) {
    if (p >= 1 && p <= this.overviewTotalPages()) {
      this.overviewPage.set(p);
      this.scrollToSection('host-recent-events-section');
    }
  }

  setFilterStatus(status: 'all' | 'published' | 'pending' | 'draft' | 'action_required') {
    this.selectedStatusFilter.set(status);
    this.overviewPage.set(1);
  }

  // Upcoming Events Pagination
  upcomingPage = signal(1);
  upcomingPageSize = signal(3);

  upcomingTotalPages = computed(() => {
    const total = this.upcomingEvents.length;
    return Math.max(1, Math.ceil(total / this.upcomingPageSize()));
  });

  paginatedUpcomingEvents = computed(() => {
    const list = this.upcomingEvents;
    const size = this.upcomingPageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(this.upcomingPage(), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  upcomingPaginationInfo = computed(() => {
    const total = this.upcomingEvents.length;
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const size = this.upcomingPageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.upcomingPage(), maxPage);
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  upcomingPageNumbers = computed(() => {
    const total = this.upcomingTotalPages();
    const current = this.upcomingPage();
    const pages: number[] = [];
    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(total, startPage + 4);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  });

  setUpcomingPage(p: number) {
    if (p >= 1 && p <= this.upcomingTotalPages()) {
      this.upcomingPage.set(p);
      this.scrollToSection('host-upcoming-events-section');
    }
  }

  toggleActionMenu(id: string, ev: MouseEvent) {
    ev.stopPropagation();
    if (this.activeActionMenuId() === id) {
      this.activeActionMenuId.set(null);
    } else {
      this.activeActionMenuId.set(id);
    }
  }

  getStatusBadgeClass(status: HostEventStatus): string {
    switch (status) {
      case 'published': return 'badge-published';
      case 'pending_review': return 'badge-pending';
      case 'changes_requested': return 'badge-changes';
      case 'approved': return 'badge-approved';
      case 'draft': return 'badge-draft';
      case 'rejected': return 'badge-rejected';
      default: return '';
    }
  }

  getStatusLabel(status: HostEventStatus): string {
    switch (status) {
      case 'published': return 'Published';
      case 'pending_review': return 'Pending Review';
      case 'changes_requested': return 'Action Required';
      case 'approved': return 'Approved';
      case 'draft': return 'Draft';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  }

  private scrollToSection(sectionId: string) {
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }
}
