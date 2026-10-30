import { Component, Output, EventEmitter, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminHostApplication } from '@core/state';

@Component({
  selector: 'app-admin-host-applications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-host-applications.component.html',
  styleUrls: ['../../admin-shared.css', './admin-host-applications.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminHostApplicationsComponent {
  private readonly adminService = inject(AdminService);

  readonly hostFilter = signal<'all' | 'under_review' | 'approved' | 'rejected' | 'changes_requested' | 'submitted'>('all');
  readonly hostApplications = this.adminService.hostApplications;

  readonly filteredHostApplications = computed(() => {
    const list = this.hostApplications();
    const filter = this.hostFilter();
    if (filter === 'all') return list;
    return list.filter(a => a.status === filter);
  });

  @Output() inspectApp = new EventEmitter<AdminHostApplication>();
  @Output() approveApp = new EventEmitter<{ id: string; name: string }>();

  setFilter(filter: 'all' | 'under_review' | 'approved' | 'rejected' | 'changes_requested' | 'submitted') {
    this.hostFilter.set(filter);
  }

  onInspect(app: AdminHostApplication) {
    this.inspectApp.emit(app);
  }

  onApprove(id: string, name: string) {
    this.approveApp.emit({ id, name });
  }
}

