import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostApplicationStatus, HostApplicationData } from '@core/models';

@Component({
  selector: 'app-host-application-status-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-application-status-modal.component.html',
  styleUrl: './host-application-status-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostApplicationStatusModalComponent {
  @Input({ required: true }) show: boolean = false;
  @Input({ required: true }) appStatus: HostApplicationStatus = 'guest';
  @Input() appData: HostApplicationData | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() provideInfo = new EventEmitter<void>();
  @Output() reapply = new EventEmitter<void>();
  @Output() openWorkspace = new EventEmitter<void>();
}

