import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent, SelectComponent, SelectOption } from '@shared/components';
import { EventOwnershipService } from '@core/state/event-ownership.service';
import { ManagerResponsibilityArea } from '@core/models';
import { ToastService } from '@core/state';

@Component({
  selector: 'app-assign-manager-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, SelectComponent],
  templateUrl: './assign-manager-modal.component.html',
  styleUrls: ['../host-modal-shared.css', './assign-manager-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignManagerModalComponent {
  private readonly ownershipService = inject(EventOwnershipService);
  private readonly toastService = inject(ToastService);

  @Input() eventId: string = 'evt-100';
  @Output() close = new EventEmitter<void>();

  newManagerForm = {
    userName: '',
    userEmail: '',
    responsibilityArea: 'venue_logistics' as ManagerResponsibilityArea,
    customTitle: ''
  };

  readonly managerAreaOptions: SelectOption[] = [
    { label: 'Overall Operations & Show Director', value: 'overall_operations' },
    { label: 'Venue & Floor Logistics Lead', value: 'venue_logistics' },
    { label: 'Sponsorships & Brand Partnerships', value: 'sponsorships' },
    { label: 'Production, Stage & Audio-Visual Lead', value: 'production_technical' },
    { label: 'Chief Safety & Incident Officer', value: 'security_safety' },
    { label: 'Admissions & Box Office Supervisor', value: 'registration_ticketing' }
  ];

  async submitAssignManager() {
    if (!this.newManagerForm.userName.trim() || !this.newManagerForm.userEmail.trim()) {
      this.toastService.show('Please provide manager name and email.', 'error');
      return;
    }

    const res = await this.ownershipService.assignManager(
      this.eventId,
      this.newManagerForm.userName.trim(),
      this.newManagerForm.userEmail.trim(),
      this.newManagerForm.responsibilityArea,
      this.newManagerForm.customTitle.trim()
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

