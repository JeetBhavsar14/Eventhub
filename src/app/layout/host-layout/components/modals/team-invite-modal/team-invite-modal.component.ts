import { Component, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent, SelectComponent, SelectOption } from '@shared/components';
import { EventTeamService } from '@core/state/event-team.service';
import { MembershipRole, StaffResponsibility } from '@core/models';
import { AuthService } from '@core/auth';
import { ToastService } from '@core/state';

@Component({
  selector: 'app-team-invite-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, SelectComponent],
  templateUrl: './team-invite-modal.component.html',
  styleUrls: ['../host-modal-shared.css', './team-invite-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamInviteModalComponent {
  private readonly eventTeamService = inject(EventTeamService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  @Output() close = new EventEmitter<void>();

  inviteForm = {
    name: '',
    email: '',
    role: 'staff' as MembershipRole,
    roleCategory: 'operational' as 'operational' | 'participant',
    customRoleName: '',
    designationPreset: 'gate_scanner',
    designation: 'Gate & Barcode Scanner',
    responsibility: 'ticketing' as StaffResponsibility,
    permissions: ['scan_tickets', 'view_attendees', 'view_duty'] as string[]
  };

  readonly operationalRoleOptions: SelectOption[] = [
    { label: 'Field & Gate Staff (Check-in / Safety / Concierge)', value: 'staff' },
    { label: 'Event Manager (Delegated Operations)', value: 'event_manager' },
    { label: 'Event Volunteer (Guest Support)', value: 'volunteer' },
    { label: 'Custom Operational Role', value: 'custom_role' }
  ];

  readonly staffDesignationOptions: SelectOption[] = [
    { label: 'Gate & Barcode Scanner (Admissions & Wristbands)', value: 'gate_scanner' },
    { label: 'Security & Incident Officer (Safety & Escalations)', value: 'security_officer' },
    { label: 'Guest Relations & Info Desk (Concierge & Roster)', value: 'guest_relations' },
    { label: 'Venue Operations Supervisor (All Access & Control)', value: 'venue_supervisor' },
    { label: 'Custom Staff Specialist', value: 'custom_role' }
  ];

  readonly participantRoleOptions: SelectOption[] = [
    { label: 'Keynote Speaker / Artist', value: 'speaker' },
    { label: 'Brand Sponsor', value: 'sponsor' }
  ];

  onDesignationPresetChange(preset: string) {
    this.inviteForm.designationPreset = preset;
    switch (preset) {
      case 'gate_scanner':
        this.inviteForm.designation = 'Gate & Barcode Scanner';
        this.inviteForm.responsibility = 'ticketing';
        this.inviteForm.permissions = ['scan_tickets', 'view_attendees', 'view_duty'];
        break;
      case 'security_officer':
        this.inviteForm.designation = 'Security & Incident Officer';
        this.inviteForm.responsibility = 'security_safety';
        this.inviteForm.permissions = ['log_incidents', 'view_duty'];
        break;
      case 'guest_relations':
        this.inviteForm.designation = 'Guest Relations & Info Desk';
        this.inviteForm.responsibility = 'registration';
        this.inviteForm.permissions = ['view_attendees', 'view_duty'];
        break;
      case 'venue_supervisor':
        this.inviteForm.designation = 'Venue Operations Supervisor';
        this.inviteForm.responsibility = 'venue_operations';
        this.inviteForm.permissions = ['scan_tickets', 'view_attendees', 'log_incidents', 'view_duty'];
        break;
      case 'custom_role':
        this.inviteForm.designation = this.inviteForm.customRoleName || 'Custom Operational Staff';
        this.inviteForm.responsibility = 'volunteer';
        this.inviteForm.permissions = ['view_duty'];
        break;
    }
  }

  toggleInvitePermission(perm: string) {
    const idx = this.inviteForm.permissions.indexOf(perm);
    if (idx > -1) {
      this.inviteForm.permissions.splice(idx, 1);
    } else {
      this.inviteForm.permissions.push(perm);
    }
  }

  hasInvitePermission(perm: string): boolean {
    return this.inviteForm.permissions.includes(perm);
  }

  async submitTeamInvite() {
    if (!this.inviteForm.email.trim()) {
      this.toastService.show('Please enter the invitee email address.', 'error');
      return;
    }

    const hostId = this.authService.currentUser()?.id || 'user-003';
    const result = await this.eventTeamService.sendInvitation(
      'evt-100',
      'Mumbai Festivals Showcase 1',
      hostId,
      this.inviteForm.email.trim(),
      this.inviteForm.name.trim(),
      this.inviteForm.role,
      this.inviteForm.roleCategory,
      this.inviteForm.customRoleName,
      {
        designation: this.inviteForm.designation || this.inviteForm.customRoleName || 'Event Staff',
        responsibility: this.inviteForm.responsibility,
        permissions: this.inviteForm.permissions
      }
    );

    if (result.success) {
      this.toastService.show(result.message, 'success');
      this.close.emit();
    } else {
      this.toastService.show(result.message, 'error');
    }
  }

  onClose() {
    this.close.emit();
  }
}

