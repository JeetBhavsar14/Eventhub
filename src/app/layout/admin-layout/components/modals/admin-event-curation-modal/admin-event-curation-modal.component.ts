import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components';
import { AdminCurationEvent } from '@core/state';

@Component({
  selector: 'app-admin-event-curation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './admin-event-curation-modal.component.html',
  styleUrls: ['../admin-modal-shared.css', './admin-event-curation-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminEventCurationModalComponent {
  @Input() event: AdminCurationEvent | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() sendFeedback = new EventEmitter<{ id: string; feedback: string }>();
  @Output() approve = new EventEmitter<{ id: string; title: string }>();

  feedbackText = signal('');

  onClose() {
    this.feedbackText.set('');
    this.close.emit();
  }

  onSendFeedback() {
    if (this.event) {
      this.sendFeedback.emit({
        id: this.event.id,
        feedback: this.feedbackText()
      });
      this.feedbackText.set('');
    }
  }

  onApprove() {
    if (this.event) {
      this.approve.emit({
        id: this.event.id,
        title: this.event.title
      });
      this.feedbackText.set('');
    }
  }
}

