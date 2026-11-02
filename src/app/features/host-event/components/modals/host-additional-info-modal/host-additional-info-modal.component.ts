import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-host-additional-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './host-additional-info-modal.component.html',
  styleUrl: './host-additional-info-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostAdditionalInfoModalComponent {
  @Input({ required: true }) show: boolean = false;
  @Input({ required: true }) note: string = '';
  @Input() isSubmitting: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() noteChange = new EventEmitter<string>();
  @Output() submit = new EventEmitter<string>();

  onNoteChange(val: string): void {
    this.note = val;
    this.noteChange.emit(val);
  }

  onSubmit(): void {
    if (this.note.trim() && !this.isSubmitting) {
      this.submit.emit(this.note.trim());
    }
  }
}

