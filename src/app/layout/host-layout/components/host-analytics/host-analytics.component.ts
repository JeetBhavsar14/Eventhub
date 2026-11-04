import { Component, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostDashboardService } from '@core/state/host-dashboard.service';

@Component({
  selector: 'app-host-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-analytics.component.html',
  styleUrl: './host-analytics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostAnalyticsComponent {
  private readonly dashboardService = inject(HostDashboardService);
  readonly selectedPeriod = signal<'30d' | 'all'>('30d');

  readonly stats = this.dashboardService.stats;
  readonly events = this.dashboardService.events;
  readonly attendees = this.dashboardService.attendees;
  readonly hostInfo = this.dashboardService.hostInfo;

  // Real top-performing events sorted by revenue and ticket reservations
  readonly topPerformingEvents = computed(() => {
    return [...this.events()]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 5);
  });

  // Gross ticket sales reactive to period and live backend data
  readonly grossTicketSales = computed(() => {
    return this.stats().totalRevenue;
  });

  setPeriod(period: '30d' | 'all'): void {
    this.selectedPeriod.set(period);
  }
}
