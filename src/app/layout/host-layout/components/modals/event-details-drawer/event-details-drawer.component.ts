import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HostEventItem } from '@core/models/host-dashboard.model';
import { IconComponent, SelectComponent, SelectOption } from '@shared/components';
import { EVENT_CATEGORIES } from '@core/constants';

export interface EventEditPayload {
  title: string;
  category: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  capacity: number;
  price: number;
  imageUrl: string;
  changeReason: string;
}

@Component({
  selector: 'app-event-details-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, SelectComponent],
  templateUrl: './event-details-drawer.component.html',
  styleUrls: ['../host-modal-shared.css', './event-details-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventDetailsDrawerComponent {
  @Input({ required: true }) event!: HostEventItem;

  isEditing = signal(false);

  readonly categoryOptions: SelectOption[] = EVENT_CATEGORIES.map(c => ({ label: c, value: c }));

  editForm: EventEditPayload = {
    title: '',
    category: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    city: '',
    capacity: 100,
    price: 0,
    imageUrl: '',
    changeReason: ''
  };

  @Output() close = new EventEmitter<void>();
  @Output() submitDraft = new EventEmitter<string>();
  @Output() publishApproved = new EventEmitter<string>();
  @Output() saveChanges = new EventEmitter<{ data: EventEditPayload; submitForReview: boolean }>();

  startEditing() {
    this.editForm = {
      title: this.event.title,
      category: this.event.category,
      description: this.event.description || '',
      date: this.event.date,
      time: this.event.time || '',
      venue: this.event.venue,
      city: this.event.city || 'Mumbai',
      capacity: this.event.capacity,
      price: this.event.price,
      imageUrl: this.event.imageUrl || '',
      changeReason: ''
    };
    this.isEditing.set(true);
  }

  cancelEditing() {
    this.isEditing.set(false);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'published': return 'badge-published';
      case 'approved': return 'badge-approved';
      case 'pending':
      case 'pending_review': return 'badge-pending';
      case 'draft': return 'badge-draft';
      case 'action_required':
      case 'rejected': return 'badge-action';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'published': return 'Live on App';
      case 'approved': return 'Approved (Unpublished)';
      case 'pending':
      case 'pending_review': return 'Pending Review';
      case 'draft': return 'Draft';
      case 'action_required': return 'Action Required';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  }

  onSave(submitForReview: boolean) {
    this.saveChanges.emit({ data: this.editForm, submitForReview });
    this.isEditing.set(false);
  }

  onSubmitDraft() {
    this.submitDraft.emit(this.event.id);
  }

  onPublishApproved() {
    this.publishApproved.emit(this.event.id);
  }

  onClose() {
    this.close.emit();
  }
}

