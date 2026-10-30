import { Component, Input, Output, EventEmitter, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components';
import { EventOwnershipService } from '@core/state/event-ownership.service';
import { ToastService } from '@core/state';

@Component({
  selector: 'app-add-co-owner-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './add-co-owner-modal.component.html',
  styleUrls: ['../host-modal-shared.css', './add-co-owner-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddCoOwnerModalComponent implements OnInit {
  private readonly ownershipService = inject(EventOwnershipService);
  private readonly toastService = inject(ToastService);

  @Input() availableEquity: number = 0;
  @Input() eventId: string = 'evt-100';
  @Output() close = new EventEmitter<void>();

  newOwnerForm = {
    userName: '',
    userEmail: '',
    organizationName: '',
    percentage: 10
  };

  ngOnInit() {
    this.newOwnerForm.percentage = Math.min(10, Math.max(1, this.availableEquity));
  }

  async submitAddOwner() {
    if (!this.newOwnerForm.userName.trim() || !this.newOwnerForm.userEmail.trim()) {
      this.toastService.show('Please enter the owner name and verified email.', 'error');
      return;
    }

    const res = await this.ownershipService.addCoOwnerStake(
      this.eventId,
      this.newOwnerForm.userName.trim(),
      this.newOwnerForm.userEmail.trim(),
      this.newOwnerForm.organizationName.trim() || 'Co-Owner Enterprise',
      this.newOwnerForm.percentage
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
