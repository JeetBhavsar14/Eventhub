import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-host-dashboard-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-dashboard-preview.component.html',
  styleUrl: './host-dashboard-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostDashboardPreviewComponent {
  selectedDashboardTab = signal<'overview' | 'events' | 'revenue' | 'activity'>('overview');
}

