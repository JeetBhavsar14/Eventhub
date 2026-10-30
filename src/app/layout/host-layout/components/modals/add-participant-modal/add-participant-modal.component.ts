import { Component, Input, Output, EventEmitter, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent, SelectComponent, SelectOption } from '@shared/components';
import { EventOwnershipService } from '@core/state/event-ownership.service';
import { ToastService } from '@core/state';

@Component({
  selector: 'app-add-participant-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, SelectComponent],
  templateUrl: './add-participant-modal.component.html',
  styleUrls: ['../host-modal-shared.css', './add-participant-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddParticipantModalComponent implements OnInit {
  private readonly ownershipService = inject(EventOwnershipService);
  private readonly toastService = inject(ToastService);

  @Input() initialCategory: 'speaker' | 'artist' | 'sponsor' = 'speaker';
  @Input() eventId: string = 'evt-100';
  @Output() close = new EventEmitter<void>();

  newParticipantForm = {
    category: 'speaker' as 'speaker' | 'artist' | 'sponsor',
    name: '',
    designationOrCompany: '',
    bio: '',
    email: ''
  };

  readonly participantCategoryOptions: SelectOption[] = [
    { label: 'Keynote Speaker', value: 'speaker' },
    { label: 'Headline Artist / Performer', value: 'artist' },
    { label: 'Brand Sponsor', value: 'sponsor' }
  ];

  ngOnInit() {
    this.newParticipantForm.category = this.initialCategory;
  }

  async submitAddParticipant() {
    if (!this.newParticipantForm.name.trim()) {
      this.toastService.show('Please enter the participant or sponsor name.', 'error');
      return;
    }

    const res = await this.ownershipService.addParticipant(
      this.eventId,
      this.newParticipantForm.category,
      this.newParticipantForm.name.trim(),
      this.newParticipantForm.designationOrCompany.trim(),
      this.newParticipantForm.bio.trim(),
      this.newParticipantForm.email.trim()
    );

    this.toastService.show(res.message, res.success ? 'success' : 'error');
    if (res.success) {
      this.close.emit();
    }
  }

  onClose() {
    this.close.emit();
  }
}

