import { Component, signal, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-host-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-analytics.component.html',
  styleUrl: './host-analytics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostAnalyticsComponent {
  selectedPeriod = signal<'30d' | 'all'>('30d');

  setPeriod(period: '30d' | 'all'): void {
    this.selectedPeriod.set(period);
  }
}
