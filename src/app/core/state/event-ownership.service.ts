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
  readonly primaryOwner = computed(() =>
    this.ownerStakes().find(s => s.isPrimaryOwner) || null
  );

  readonly coOwners = computed(() =>
    this.ownerStakes().filter(s => !s.isPrimaryOwner)
  );

  readonly totalAllocatedEquity = computed(() =>
    this.ownerStakes()
      .filter(s => s.status === 'active' || s.status === 'invited')
      .reduce((sum, s) => sum + (Number(s.percentage) || 0), 0)
  );

  readonly availableCoOwnerEquity = computed(() => {
    const primary = this.primaryOwner();
    // Primary host keeps at least 1% equity, remaining can be distributed to co-owners
    return primary ? Math.max(0, Number(primary.percentage) - 1) : 0;
  });

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
        let stakes = stakesRes.data;
        const primary = stakes.find(s => s.isPrimaryOwner);
        const coOwners = stakes.filter(s => !s.isPrimaryOwner);

        if (coOwners.length === 0) {
          // Rule: If no co-founders/co-owners exist, event primary host is directly given 100% by default
          if (primary && primary.percentage !== 100) {
            primary.percentage = 100;
            this.api.patch(`/eventOwnerStakes/${primary.id}`, { percentage: 100 });
          }
        } else if (primary) {
          // If co-owners exist, balance primary owner stake to ensure total is exactly 100%
          const coOwnersTotal = coOwners.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);
          const expectedPrimary = Math.max(1, 100 - coOwnersTotal);
          if (primary.percentage !== expectedPrimary) {
            primary.percentage = expectedPrimary;
            this.api.patch(`/eventOwnerStakes/${primary.id}`, { percentage: expectedPrimary });
          }
        }
        this.ownerStakes.set(stakes);
      }
      if (mgrRes.data) {
        this.managers.set(mgrRes.data);
      }
      if (partRes.data) {
        this.participants.set(partRes.data);
      }
    } catch (err: any) {
      this.error.set(err?.userMessage || 'An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * § 11.0: Add / Invite Co-Owner with Equity Stake
   * The requested percentage is carved out directly from the primary owner's pool.
   * Total allocated equity remains strictly 100%.
   */
  async addCoOwnerStake(
    eventId: string,
    userName: string,
    userEmail: string,
    organizationName: string,
    percentage: number
  ): Promise<{ success: boolean; message: string }> {
    const requested = Math.round(Number(percentage));
    if (requested <= 0 || requested >= 100) {
      return { success: false, message: 'Co-owner ownership percentage must be between 1% and 99%.' };
    }

    const existing = this.ownerStakes().find(
      s => s.userEmail.toLowerCase() === userEmail.toLowerCase()
    );
    if (existing) {
      return { success: false, message: `Co-owner with email ${userEmail} is already allocated.` };
    }

    const primaryOwner = this.ownerStakes().find(s => s.isPrimaryOwner);
    const coOwners = this.ownerStakes().filter(s => !s.isPrimaryOwner);
    const currentCoOwnersTotal = coOwners.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);

    // Primary owner must retain at least 1%
    if (currentCoOwnersTotal + requested > 99) {
      const maxAllowed = Math.max(0, 99 - currentCoOwnersTotal);
      return {
        success: false,
        message: `Cannot allocate ${requested}%. Maximum equity available for new co-owners is ${maxAllowed}% (Primary host retains at least 1%).`
      };
    }

    const newPrimaryPercentage = 100 - (currentCoOwnersTotal + requested);

    if (primaryOwner) {
      await this.api.patch<EventOwnerStake>(`/eventOwnerStakes/${primaryOwner.id}`, {
        percentage: newPrimaryPercentage
      });
      primaryOwner.percentage = newPrimaryPercentage;
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
      this.ownerStakes.update(list => {
        const updated = list.map(s => s.id === primaryOwner?.id ? { ...s, percentage: newPrimaryPercentage } : s);
        return [...updated, res.data!];
      });
      return {
        success: true,
        message: `Successfully added ${userName} (${requested}% equity allocated). Primary host equity is now ${newPrimaryPercentage}%.`
      };
    }
    return { success: false, message: res.error?.userMessage || 'Failed to save co-owner stake.' };
  }

  /**
   * Update existing stake percentage.
   * If a co-owner's equity changes, the difference is directly balanced with the primary owner.
   */
  async updateStakePercentage(
    stakeId: string,
    newPercentage: number
  ): Promise<{ success: boolean; message: string }> {
    const targetStake = this.ownerStakes().find(s => s.id === stakeId);
    if (!targetStake) return { success: false, message: 'Stake not found.' };

    if (targetStake.isPrimaryOwner) {
      return {
        success: false,
        message: 'Primary owner equity automatically holds the remaining pool (100% minus co-owners).'
      };
    }

    const primaryOwner = this.ownerStakes().find(s => s.isPrimaryOwner);
    if (!primaryOwner) return { success: false, message: 'Primary owner not found.' };

    const requested = Math.round(Number(newPercentage));
    if (requested < 1 || requested > 99) {
      return { success: false, message: 'Co-owner equity must be between 1% and 99%.' };
    }

    const otherCoOwners = this.ownerStakes().filter(s => !s.isPrimaryOwner && s.id !== stakeId);
    const otherCoOwnersTotal = otherCoOwners.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);

    if (otherCoOwnersTotal + requested > 99) {
      const maxAllowed = 99 - otherCoOwnersTotal;
      return {
        success: false,
        message: `Maximum equity allowed for this co-owner is ${maxAllowed}% so the primary host retains at least 1%.`
      };
    }

    const newPrimaryPercentage = 100 - (otherCoOwnersTotal + requested);

    const patchRes1 = await this.api.patch<EventOwnerStake>(`/eventOwnerStakes/${stakeId}`, {
      percentage: requested
    });
    if (patchRes1.error) {
      return { success: false, message: patchRes1.error?.userMessage || 'Failed to update co-owner stake.' };
    }

    await this.api.patch<EventOwnerStake>(`/eventOwnerStakes/${primaryOwner.id}`, {
      percentage: newPrimaryPercentage
    });
    primaryOwner.percentage = newPrimaryPercentage;
    targetStake.percentage = requested;

    this.ownerStakes.update(list =>
      list.map(s => {
        if (s.id === stakeId) return { ...s, percentage: requested };
        if (s.id === primaryOwner.id) return { ...s, percentage: newPrimaryPercentage };
        return s;
      })
    );

    return {
      success: true,
      message: `Updated ${targetStake.userName} to ${requested}%. Primary host holds ${newPrimaryPercentage}%.`
    };
  }

  /**
   * Remove co-owner stake.
   * When ANY co-owner is removed, their equity goes directly to the primary owner.
   * If no co-founders remain, the primary host directly gets 100% by default.
   */
  async removeCoOwnerStake(stakeId: string): Promise<boolean> {
    const stake = this.ownerStakes().find(s => s.id === stakeId);
    if (!stake || stake.isPrimaryOwner) {
      return false; // Cannot remove primary creator
    }

    const delRes = await this.api.delete(`/eventOwnerStakes/${stakeId}`);
    if (delRes.error) return false;
    
    const remainingCoOwners = this.ownerStakes().filter(s => s.id !== stakeId && !s.isPrimaryOwner);
    const primaryOwner = this.ownerStakes().find(s => s.isPrimaryOwner);

    // Business Rule:
    // If no co-founders remain, the primary host directly gets 100%.
    // If other co-founders remain, the removed co-founder's entire stake goes directly to the primary owner.
    const remainingCoOwnersTotal = remainingCoOwners.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);
    const newPrimaryPercentage = remainingCoOwners.length === 0 ? 100 : (100 - remainingCoOwnersTotal);

    if (primaryOwner) {
      await this.api.patch<EventOwnerStake>(`/eventOwnerStakes/${primaryOwner.id}`, {
        percentage: newPrimaryPercentage
      });
      primaryOwner.percentage = newPrimaryPercentage;
    }

    this.ownerStakes.update(list => {
      const filtered = list.filter(s => s.id !== stakeId);
      if (primaryOwner) {
        return filtered.map(s => s.id === primaryOwner.id ? { ...s, percentage: newPrimaryPercentage } : s);
      }
      return filtered;
    });

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
    return { success: false, message: res.error?.userMessage || 'Failed to assign manager.' };
  }

  async toggleManagerDelegation(mgrId: string, active: boolean): Promise<boolean> {
    const res = await this.api.patch(`/eventManagerAssignments/${mgrId}`, { delegationActive: active });
    if (res.error) return false;
    this.managers.update(list =>
      list.map(m => (m.id === mgrId ? { ...m, delegationActive: active } : m))
    );
    return true;
  }

  async removeManager(mgrId: string): Promise<boolean> {
    const res = await this.api.delete(`/eventManagerAssignments/${mgrId}`);
    if (res.error) return false;
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
    return { success: false, message: res.error?.userMessage || 'Failed to add participant.' };
  }

  async removeParticipant(partId: string): Promise<boolean> {
    const res = await this.api.delete(`/eventParticipants/${partId}`);
    if (res.error) return false;
    this.participants.update(list => list.filter(p => p.id !== partId));
    return true;
  }
}
