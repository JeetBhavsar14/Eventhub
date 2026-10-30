import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  HostWorkspaceInfo, 
  HostDashboardStats, 
  HostEventItem, 
  HostPendingAction, 
  HostRecentActivity,
  HostDashboardView
} from '@core/models';
import { IconComponent } from '@shared/components';
import { 
  HostPerformanceChartComponent, 
  HostOverviewChartData,
  HostRecentEventsComponent, 
  HostBottomGridComponent 
} from './components';

export type { HostOverviewChartData };

@Component({
  selector: 'app-host-overview',
  standalone: true,
  imports: [
    CommonModule, 
    IconComponent, 
    HostPerformanceChartComponent, 
    HostRecentEventsComponent, 
    HostBottomGridComponent
  ],
  templateUrl: './host-overview.component.html',
  styleUrl: './host-overview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostOverviewComponent {
  @Input({ required: true }) hostInfo!: HostWorkspaceInfo;
  @Input({ required: true }) stats!: HostDashboardStats;
  @Input({ required: true }) selectedPeriod: '7d' | '30d' | '90d' = '30d';
  @Input({ required: true }) chartData!: HostOverviewChartData;
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

  // Shared Status Filter for Recent Events
  readonly selectedStatusFilter = signal<'all' | 'published' | 'pending' | 'draft' | 'action_required'>('all');

  handleFilterAction(filter: 'all' | 'published' | 'pending' | 'draft' | 'action_required') {
    this.selectedStatusFilter.set(filter);
  }
}
