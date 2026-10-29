import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  EventOwnerStake, 
  EventManagerAssignment, 
  EventParticipantProfile, 
  EventInvitation, 
  EventMembership 
} from '@core/models';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-host-team',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './host-team.component.html',
  styleUrl: './host-team.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostTeamComponent {
  @Input({ required: true }) ownerStakes: EventOwnerStake[] = [];
  @Input({ required: true }) isEquityValid: boolean = true;
  @Input({ required: true }) totalAllocatedEquity: number = 100;
  @Input({ required: true }) remainingEquityPool: number = 0;
  @Input({ required: true }) eventManagers: EventManagerAssignment[] = [];
  @Input({ required: true }) operationalTeam: EventMembership[] = [];
  @Input({ required: true }) eventParticipants: EventParticipantProfile[] = [];
  @Input({ required: true }) pendingInvitations: EventInvitation[] = [];
  @Input() primaryOwner: EventOwnerStake | null = null;

  @Output() addOwner = new EventEmitter<void>();
  @Output() assignManager = new EventEmitter<void>();
  @Output() inviteTeam = new EventEmitter<void>();
  @Output() addParticipant = new EventEmitter<'speaker' | 'artist' | 'sponsor'>();
  @Output() updateStake = new EventEmitter<{ stakeId: string; percentage: number }>();
  @Output() removeStake = new EventEmitter<EventOwnerStake>();
  @Output() toggleManagerDelegation = new EventEmitter<EventManagerAssignment>();
  @Output() removeManager = new EventEmitter<EventManagerAssignment>();
  @Output() removeStaffMember = new EventEmitter<{ memberId: string; memberName: string }>();
  @Output() removeParticipant = new EventEmitter<EventParticipantProfile>();

  maxCoOwnerCanHold(stakeId: string): number {
    const primary = this.primaryOwner || this.ownerStakes.find(s => s.isPrimaryOwner);
    const target = this.ownerStakes.find(s => s.id === stakeId);
    if (!primary || !target) return 99;
    return target.percentage + Math.max(0, primary.percentage - 1);
  }

  onUpdateStake(stakeId: string, value: any): void {
    const percentage = Number(value);
    if (!isNaN(percentage)) {
      this.updateStake.emit({ stakeId, percentage });
    }
  }
}
