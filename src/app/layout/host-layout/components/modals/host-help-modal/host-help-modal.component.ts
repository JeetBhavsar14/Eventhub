import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-host-help-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './host-help-modal.component.html',
  styleUrls: ['../host-modal-shared.css', './host-help-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostHelpModalComponent {
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}

