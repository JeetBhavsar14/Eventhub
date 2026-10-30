import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HostEventItem } from '@core/models/host-dashboard.model';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-event-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './event-feedback-modal.component.html',
  styleUrls: ['../host-modal-shared.css', './event-feedback-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventFeedbackModalComponent {
  @Input({ required: true }) event!: HostEventItem;

  responseNote = signal('');

  @Output() close = new EventEmitter<void>();
  @Output() submitResponse = new EventEmitter<{ eventId: string; note: string }>();

  onSubmit() {
    if (this.responseNote().trim()) {
      this.submitResponse.emit({
        eventId: this.event.id,
        note: this.responseNote().trim()
      });
    }
  }

  onClose() {
    this.close.emit();
  }
}

