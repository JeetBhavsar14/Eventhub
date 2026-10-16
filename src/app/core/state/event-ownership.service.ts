import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiClient } from '@core/api';
import {
  EventOwnerStake,
  EventManagerAssignment,
  EventParticipantProfile,
  ManagerResponsibilityArea
} from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class EventOwnershipService {
  private api = inject(ApiClient);

  readonly ownerStakes = signal<EventOwnerStake[]>([]);
  readonly managers = signal<EventManagerAssignment[]>([]);
  readonly participants = signal<EventParticipantProfile[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // 100% Equity Allocation Computations (§ 11.0)
  readonly totalAllocatedEquity = computed(() =>
    this.ownerStakes()
      .filter(s => s.status === 'active' || s.status === 'invited')
      .reduce((sum, s) => sum + (Number(s.percentage) || 0), 0)
  );

  readonly remainingEquityPool = computed(() => {
    return Math.max(0, 100 - this.totalAllocatedEquity());
  });

  readonly isEquityValid = computed(() => {
    return this.totalAllocatedEquity() === 100;
  });

  // Active managers vs invited
  readonly activeManagers = computed(() =>
    this.managers().filter(m => m.status === 'active')
  );

  // Participants by category (§ 14.0)
  readonly speakers = computed(() =>
    this.participants().filter(p => p.category === 'speaker')
  );

  readonly artists = computed(() =>
    this.participants().filter(p => p.category === 'artist')
  );

  readonly sponsors = computed(() =>
    this.participants().filter(p => p.category === 'sponsor')
  );

  async loadEventGovernance(eventId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [stakesRes, mgrRes, partRes] = await Promise.all([
        this.api.get<EventOwnerStake[]>('/eventOwnerStakes', { eventId }),
        this.api.get<EventManagerAssignment[]>('/eventManagerAssignments', { eventId }),
        this.api.get<EventParticipantProfile[]>('/eventParticipants', { eventId })
      ]);

      if (stakesRes.data) {
        this.ownerStakes.set(stakesRes.data);
      }
      if (mgrRes.data) {
        this.managers.set(mgrRes.data);
      }
      if (partRes.data) {
        this.participants.set(partRes.data);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load event ownership and governance data');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * § 11.0: Add / Invite Co-Owner with Equity Stake
   * Enforces business rule: Total allocated cannot exceed 100%.
   */
  async addCoOwnerStake(
    eventId: string,
    userName: string,
    userEmail: string,
    organizationName: string,
    percentage: number
  ): Promise<{ success: boolean; message: string }> {
    const requested = Number(percentage);
    if (requested <= 0 || requested > 100) {
      return { success: false, message: 'Ownership percentage must be between 1% and 100%.' };
    }

    const available = this.remainingEquityPool();
    if (requested > available) {
      return {
        success: false,
        message: `Exceeds available pool! You only have ${available}% unallocated equity remaining.`
      };
    }

    const existing = this.ownerStakes().find(
      s => s.userEmail.toLowerCase() === userEmail.toLowerCase()
    );
    if (existing) {
      return { success: false, message: `Co-owner with email ${userEmail} is already allocated.` };
    }

    const newStake: EventOwnerStake = {
      id: `stake-${Date.now()}`,
      eventId,
      userId: `user-${Date.now()}`,
      userName,
      userEmail,
      organizationName,
      percentage: requested,
      isPrimaryOwner: false,
      status: 'active',
      assignedAt: new Date().toISOString()
    };

    const res = await this.api.post<EventOwnerStake>('/eventOwnerStakes', newStake);
    if (res.data) {
      this.ownerStakes.update(list => [...list, res.data!]);
      return {
        success: true,
        message: `Successfully added ${userName} (${requested}% equity allocated).`
      };
    }
    return { success: false, message: res.error?.message || 'Failed to save co-owner stake.' };
  }

  /**
   * Update existing stake percentage
   */
  async updateStakePercentage(
    stakeId: string,
    newPercentage: number
  ): Promise<{ success: boolean; message: string }> {
    const stake = this.ownerStakes().find(s => s.id === stakeId);
    if (!stake) return { success: false, message: 'Stake not found.' };

    const diff = Number(newPercentage) - stake.percentage;
    if (diff > this.remainingEquityPool()) {
      return {
        success: false,
        message: `Allocation error: Total equity would exceed 100%. Max available is ${stake.percentage + this.remainingEquityPool()}%.`
      };
    }

    const res = await this.api.patch<EventOwnerStake>(`/eventOwnerStakes/${stakeId}`, {
      percentage: Number(newPercentage)
    });

    if (res.data) {
      this.ownerStakes.update(list =>
        list.map(s => (s.id === stakeId ? { ...s, percentage: Number(newPercentage) } : s))
      );
      return { success: true, message: 'Stake updated successfully.' };
    }
    return { success: false, message: 'Failed to update stake.' };
  }

  /**
   * Remove co-owner stake
   */
  async removeCoOwnerStake(stakeId: string): Promise<boolean> {
    const stake = this.ownerStakes().find(s => s.id === stakeId);
    if (stake?.isPrimaryOwner) {
      return false; // Cannot remove primary creator
    }

    await this.api.delete(`/eventOwnerStakes/${stakeId}`);
    this.ownerStakes.update(list => list.filter(s => s.id !== stakeId));
    return true;
  }

  /**
   * § 12.0: Assign Event Manager with Operational Responsibility
   */
  async assignManager(
    eventId: string,
    userName: string,
    userEmail: string,
    responsibilityArea: ManagerResponsibilityArea,
    customTitle?: string
  ): Promise<{ success: boolean; message: string }> {
    const titleMap: Record<ManagerResponsibilityArea, string> = {
      overall_operations: 'General Operations & Schedule Director',
      venue_logistics: 'Venue & Floor Logistics Lead',
      sponsorships: 'Brand Partnerships & Sponsor Manager',
      production_technical: 'Production, Stage & Audio-Visual Lead',
      security_safety: 'Chief Safety & Incident Response Officer',
      registration_ticketing: 'Admissions & Box Office Supervisor'
    };

    const newMgr: EventManagerAssignment = {
      id: `mgr-${Date.now()}`,
      eventId,
      userId: `user-${Date.now()}`,
      userName,
      userEmail,
      responsibilityArea,
      responsibilityTitle: customTitle || titleMap[responsibilityArea],
      delegationActive: true,
      status: 'active',
      assignedAt: new Date().toISOString()
    };

    const res = await this.api.post<EventManagerAssignment>('/eventManagerAssignments', newMgr);
    if (res.data) {
      this.managers.update(list => [...list, res.data!]);
      return { success: true, message: `Manager assigned: ${userName} for ${newMgr.responsibilityTitle}.` };
    }
    return { success: false, message: res.error?.message || 'Failed to assign manager.' };
  }

  async toggleManagerDelegation(mgrId: string, active: boolean): Promise<boolean> {
    await this.api.patch(`/eventManagerAssignments/${mgrId}`, { delegationActive: active });
    this.managers.update(list =>
      list.map(m => (m.id === mgrId ? { ...m, delegationActive: active } : m))
    );
    return true;
  }

  async removeManager(mgrId: string): Promise<boolean> {
    await this.api.delete(`/eventManagerAssignments/${mgrId}`);
    this.managers.update(list => list.filter(m => m.id !== mgrId));
    return true;
  }

  /**
   * § 14.0: Add Event Participant (Speaker, Artist, Sponsor)
   */
  async addParticipant(
    eventId: string,
    category: 'speaker' | 'artist' | 'sponsor',
    name: string,
    designationOrCompany: string,
    bio: string,
    email?: string
  ): Promise<{ success: boolean; message: string }> {
    const avatarSeeds = {
      artist: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=120&q=80',
      speaker: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      sponsor: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=120&q=80'
    };

    const newPart: EventParticipantProfile = {
      id: `part-${Date.now()}`,
      eventId,
      category,
      name,
      designationOrCompany,
      email: email || '',
      avatarUrl: avatarSeeds[category],
      bio,
      status: 'confirmed'
    };

    const res = await this.api.post<EventParticipantProfile>('/eventParticipants', newPart);
    if (res.data) {
      this.participants.update(list => [...list, res.data!]);
      return { success: true, message: `Added ${name} as confirmed ${category}.` };
    }
    return { success: false, message: 'Failed to add participant.' };
  }

  async removeParticipant(partId: string): Promise<boolean> {
    await this.api.delete(`/eventParticipants/${partId}`);
    this.participants.update(list => list.filter(p => p.id !== partId));
    return true;
  }
}
