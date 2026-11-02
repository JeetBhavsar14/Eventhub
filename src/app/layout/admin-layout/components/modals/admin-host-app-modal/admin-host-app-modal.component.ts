import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components';
import { AdminHostApplication } from '@core/state';

@Component({
  selector: 'app-admin-host-app-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './admin-host-app-modal.component.html',
  styleUrls: ['../admin-modal-shared.css', './admin-host-app-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminHostAppModalComponent {
  @Input() app: AdminHostApplication | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() requestClarification = new EventEmitter<string>();
  @Output() reject = new EventEmitter<{ id: string; applicantName: string }>();
  @Output() approve = new EventEmitter<{ id: string; applicantName: string }>();

  onRequestClarification() {
    if (this.app) {
      this.requestClarification.emit(this.app.id);
    }
  }

  onReject() {
    if (this.app) {
      this.reject.emit({ id: this.app.id, applicantName: this.app.applicantName });
    }
  }

  onApprove() {
    if (this.app) {
      this.approve.emit({ id: this.app.id, applicantName: this.app.applicantName });
    }
  }
}

