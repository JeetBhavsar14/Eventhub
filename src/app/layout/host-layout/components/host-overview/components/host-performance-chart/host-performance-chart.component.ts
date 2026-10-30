import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostWorkspaceInfo, HostDashboardStats, BookingDataPoint } from '@core/models';
import { IconComponent } from '@shared/components';

export interface HostOverviewChartData {
  points: BookingDataPoint[];
  maxVal: number;
}

@Component({
  selector: 'app-host-performance-chart',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './host-performance-chart.component.html',
  styleUrl: './host-performance-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostPerformanceChartComponent {
  @Input({ required: true }) hostInfo!: HostWorkspaceInfo;
  @Input({ required: true }) stats!: HostDashboardStats;
  @Input({ required: true }) selectedPeriod: '7d' | '30d' | '90d' = '30d';
  @Input({ required: true }) chartData!: HostOverviewChartData;

  @Output() periodChange = new EventEmitter<'7d' | '30d' | '90d'>();

  // Interactive Chart Tooltip
  readonly hoveredChartPoint = signal<BookingDataPoint | null>(null);
}

