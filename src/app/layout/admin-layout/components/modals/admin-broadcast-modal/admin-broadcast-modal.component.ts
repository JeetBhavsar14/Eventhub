import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-admin-broadcast-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './admin-broadcast-modal.component.html',
  styleUrls: ['../admin-modal-shared.css', './admin-broadcast-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminBroadcastModalComponent {
  @Input() isOpen = false;

  @Output() close = new EventEmitter<void>();
  @Output() broadcast = new EventEmitter<{ title: string; body: string }>();

  title = signal('');
  body = signal('');

  onClose() {
    this.title.set('');
    this.body.set('');
    this.close.emit();
  }

  onSend() {
    const t = this.title().trim();
    const b = this.body().trim();
    if (t && b) {
      this.broadcast.emit({ title: t, body: b });
      this.title.set('');
      this.body.set('');
    }
  }
}

