import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostEventItem, HostEventStatus } from '@core/models';
import { IconComponent, PaginationBarComponent } from '@shared/components';

@Component({
  selector: 'app-host-my-events',
  standalone: true,
  imports: [CommonModule, IconComponent, PaginationBarComponent],
  templateUrl: './host-my-events.component.html',
  styleUrl: './host-my-events.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostMyEventsComponent {
  @Input({ required: true }) events: HostEventItem[] = [];

  @Output() viewDetails = new EventEmitter<HostEventItem>();
  @Output() createEvent = new EventEmitter<void>();
  @Output() submitForReview = new EventEmitter<string>();
  @Output() publishEvent = new EventEmitter<string>();
  @Output() reviewFeedback = new EventEmitter<HostEventItem>();

  // Portfolio Grid Pagination
  portfolioPage = signal(1);
  portfolioPageSize = signal(6);

  portfolioTotalPages = computed(() => {
    const total = this.events.length;
    return Math.max(1, Math.ceil(total / this.portfolioPageSize()));
  });

  paginatedPortfolioEvents = computed(() => {
    const list = this.events;
    const size = this.portfolioPageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(this.portfolioPage(), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  portfolioPaginationInfo = computed(() => {
    const total = this.events.length;
    if (total === 0) return { start: 0, end: 0, total: 0 };
    const size = this.portfolioPageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.portfolioPage(), maxPage);
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  portfolioPageNumbers = computed(() => {
    const total = this.portfolioTotalPages();
    const current = this.portfolioPage();
    const pages: number[] = [];
    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(total, startPage + 4);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  });

  setPortfolioPage(p: number): void {
    if (p >= 1 && p <= this.portfolioTotalPages()) {
      this.portfolioPage.set(p);
      this.scrollToTop();
    }
  }

  setPortfolioPageSize(size: number): void {
    this.portfolioPageSize.set(size);
    this.portfolioPage.set(1);
    this.scrollToTop();
  }

  private scrollToTop(): void {
    setTimeout(() => {
      const el = document.getElementById('host-portfolio-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
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
        return '';
    }
  }

  getStatusLabel(status: HostEventStatus): string {
    switch (status) {
      case 'published':
        return 'Published';
      case 'pending_review':
        return 'Pending Review';
      case 'changes_requested':
        return 'Action Required';
      case 'approved':
        return 'Approved';
      case 'draft':
        return 'Draft';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }
}
