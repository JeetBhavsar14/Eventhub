import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-host-guest-auth-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-guest-auth-modal.component.html',
  styleUrl: './host-guest-auth-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostGuestAuthModalComponent {
  @Input({ required: true }) show: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();
  @Output() register = new EventEmitter<void>();
}

