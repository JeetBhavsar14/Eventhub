import { Component, Output, EventEmitter, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminCurationEvent } from '@core/state';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-admin-event-curation',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './admin-event-curation.component.html',
  styleUrls: ['../../admin-shared.css', './admin-event-curation.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminEventCurationComponent {
  private readonly adminService = inject(AdminService);

  readonly eventFilter = signal<'all' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected'>('all');
  readonly curationEvents = this.adminService.curationEvents;

  readonly filteredCurationEvents = computed(() => {
    const list = this.curationEvents();
    const filter = this.eventFilter();
    if (filter === 'all') return list;
    return list.filter(e => e.status === filter);
  });

  @Output() inspectEvent = new EventEmitter<AdminCurationEvent>();
  @Output() approveEvent = new EventEmitter<{ id: string; title: string }>();
  @Output() delistEvent = new EventEmitter<{ id: string; title: string }>();
  @Output() toggleFeatured = new EventEmitter<{ id: string; title: string }>();

  setFilter(filter: 'all' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected') {
    this.eventFilter.set(filter);
  }

  onInspect(ev: AdminCurationEvent) {
    this.inspectEvent.emit(ev);
  }

  onApprove(id: string, title: string) {
    this.approveEvent.emit({ id, title });
  }

  onDelist(id: string, title: string) {
    this.delistEvent.emit({ id, title });
  }

  onToggleFeatured(id: string, title: string) {
    this.toggleFeatured.emit({ id, title });
  }
}

