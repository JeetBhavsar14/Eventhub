import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiClient } from '@core/api';
import { EventMembership, EventInvitation, MembershipRole, EventOperationalRole, EventParticipantType } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class EventTeamService {
  private api = inject(ApiClient);

  readonly memberships = signal<EventMembership[]>([]);
  readonly invitations = signal<EventInvitation[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Operational team members
  readonly operationalTeam = computed(() =>
    this.memberships().filter(m => m.roleCategory === 'operational' && m.status === 'active')
  );

  // Invited participants (Speakers, Sponsors, etc.)
  readonly participantMembers = computed(() =>
    this.memberships().filter(m => m.roleCategory === 'participant' && m.status === 'active')
  );

  // Pending invitations
  readonly pendingInvitations = computed(() =>
    this.invitations().filter(i => i.status === 'pending')
  );

  async loadEventTeam(eventId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [memRes, invRes] = await Promise.all([
        this.api.get<EventMembership[]>('/eventMemberships', { eventId }),
        this.api.get<EventInvitation[]>('/eventInvitations', { eventId })
      ]);

      if (memRes.data) {
        this.memberships.set(memRes.data);
      }
      if (invRes.data) {
        this.invitations.set(invRes.data);
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load event team and invitations');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * § 5.2 & § 5.3: Send invitation to an EventHub user.
   * Enforces business rules:
   * 1. Max 3 operational roles per user within the same event.
   * 2. Prevents duplicate active role assignments.
   */
  async sendInvitation(
    eventId: string,
    eventTitle: string,
    inviterId: string,
    inviteeEmail: string,
    inviteeName: string,
    role: MembershipRole,
    roleCategory: 'operational' | 'participant',
    customRoleName?: string,
    options?: {
      designation?: string;
      responsibility?: any;
      permissions?: string[];
    }
  ): Promise<{ success: boolean; message: string }> {
    // Check duplicate active membership for same role
    const existingRole = this.memberships().find(
      m => m.email.toLowerCase() === inviteeEmail.toLowerCase() && m.role === role && m.status === 'active'
    );
    if (existingRole) {
      return { success: false, message: `User already holds the "${role}" role for this event.` };
    }

    // Check duplicate pending invite
    const pendingInvite = this.invitations().find(
      i => i.inviteeEmail.toLowerCase() === inviteeEmail.toLowerCase() && i.role === role && i.status === 'pending'
    );
    if (pendingInvite) {
      return { success: false, message: `An invitation for this role is already pending response.` };
    }

    // § 5.3: Max 3 operational roles per user within same event
    if (roleCategory === 'operational') {
      const currentOperationalRoles = this.memberships().filter(
        m => m.email.toLowerCase() === inviteeEmail.toLowerCase() && m.roleCategory === 'operational' && m.status === 'active'
      );
      if (currentOperationalRoles.length >= 3) {
        return { success: false, message: 'Policy limit reached: A user can hold a maximum of 3 operational roles in one event.' };
      }
    }

    const newInvite: EventInvitation = {
      id: `inv-${Date.now()}`,
      eventId,
      eventTitle,
      inviterId,
      inviteeEmail,
      inviteeName: inviteeName || inviteeEmail.split('@')[0],
      role,
      roleCategory,
      designation: options?.designation || customRoleName || formatRoleLabel(role),
      responsibility: options?.responsibility,
      permissions: options?.permissions || (role === 'staff' ? ['scan_tickets', 'view_attendees'] : ['view_duty']),
      customRoleName,
      status: 'pending',
      sentAt: new Date().toISOString()
    };

    const res = await this.api.post<EventInvitation>('/eventInvitations', newInvite);
    if (res.data) {
      this.invitations.update(list => [res.data!, ...list]);

      // Automatically dispatch notification to recipient (Phase 8)
      try {
        await this.api.post('/notifications', {
          id: `notif-${Date.now()}`,
          userId: 'invited-user',
          userEmail: inviteeEmail,
          type: 'invitation',
          title: 'New Team Invitation',
          message: `You have been invited to join "${eventTitle}" as ${newInvite.designation || formatRoleLabel(role)}.`,
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'high',
          icon: 'mail',
          eventId,
          eventTitle,
          invitationId: newInvite.id,
          action: {
            label: 'Accept & Join',
            actionType: 'accept_invitation',
            invitationId: newInvite.id,
            primary: true
          }
        });
      } catch (e) {
        console.warn('Could not post invitation notification:', e);
      }

      return { success: true, message: `Invitation dispatched to ${inviteeEmail}.` };
    }
    return { success: false, message: res.error?.userMessage || 'Failed to dispatch invitation.' };
  }

  /**
   * Accept an invitation and activate the membership with dynamic role-based routing
   */
  async acceptInvitation(
    invitationId: string, 
    user: { id: string; name: string; email: string },
    fallbackRole?: string,
    fallbackEventId?: string
  ): Promise<{ success: boolean; role: string; targetRoute: string }> {
    let invite = this.invitations().find(i => i.id === invitationId);
    
    // If not in local signal, fetch from server
    if (!invite && invitationId) {
      try {
        const res = await this.api.get<EventInvitation>(`/eventInvitations/${invitationId}`);
        if (res.data) {
          invite = res.data;
        }
      } catch {
        // Fallback gracefully
      }
    }

    const role = (invite?.role || fallbackRole || 'staff') as MembershipRole;
    const eventId = invite?.eventId || fallbackEventId || 'evt-100';

    // Determine target route strictly by role type
    let targetRoute = '/staff';
    if (role === 'event_owner') {
      targetRoute = '/host/dashboard';
    } else if (role === 'event_manager') {
      targetRoute = '/management';
    } else if (role === 'speaker' || role === 'sponsor' || role === 'attendee') {
      targetRoute = `/events/${eventId}`;
    }

    // Patch invite status if present
    if (invitationId) {
      try {
        await this.api.patch(`/eventInvitations/${invitationId}`, {
          status: 'accepted',
          respondedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Could not patch invitation status:', e);
      }
    }

    // Create active membership
    const newMembership: EventMembership = {
      id: `mem-${Date.now()}`,
      eventId,
      userId: user.id,
      email: user.email,
      name: user.name,
      role,
      roleName: invite?.customRoleName || invite?.designation || formatRoleLabel(role),
      designation: invite?.designation || invite?.customRoleName || formatRoleLabel(role),
      responsibility: invite?.responsibility || (role === 'staff' ? 'ticketing' : undefined),
      permissions: invite?.permissions || (role === 'staff' ? ['scan_tickets', 'view_attendees', 'view_duty'] : ['all']),
      isOwner: role === 'event_owner',
      roleCategory: (role === 'speaker' || role === 'sponsor' || role === 'attendee') ? 'participant' : 'operational',
      status: 'active',
      joinedAt: new Date().toISOString()
    };

    try {
      const memRes = await this.api.post<EventMembership>('/eventMemberships', newMembership);
      if (memRes.data) {
        this.memberships.update(list => [memRes.data!, ...list]);
      }
    } catch (e) {
      console.warn('Could not post membership record:', e);
    }

    if (invitationId) {
      this.invitations.update(list =>
        list.map(i => i.id === invitationId ? { ...i, status: 'accepted' } : i)
      );
    }

    return { success: true, role: String(role), targetRoute };
  }

  /**
   * Decline / reject an invitation without destroying history
   */
  async declineInvitation(invitationId: string): Promise<boolean> {
    if (!invitationId) return true;

    try {
      await this.api.patch(`/eventInvitations/${invitationId}`, {
        status: 'rejected',
        respondedAt: new Date().toISOString()
      });
      this.invitations.update(list =>
        list.map(i => i.id === invitationId ? { ...i, status: 'rejected' } : i)
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * § 5.4: Temporary Management Delegation
   */
  async toggleManagementDelegation(membershipId: string, delegate: boolean): Promise<boolean> {
    await this.api.patch(`/eventMemberships/${membershipId}`, {
      delegationActive: delegate
    });
    this.memberships.update(list =>
      list.map(m => m.id === membershipId ? { ...m, delegationActive: delegate } : m)
    );
    return true;
  }

  /**
   * Revoke or remove membership
   */
  async removeMember(membershipId: string): Promise<boolean> {
    await this.api.delete(`/eventMemberships/${membershipId}`);
    this.memberships.update(list => list.filter(m => m.id !== membershipId));
    return true;
  }
}

function formatRoleLabel(role: MembershipRole): string {
  switch (role) {
    case 'event_owner': return 'Event Owner';
    case 'event_manager': return 'Event Manager';
    case 'staff': return 'Field & Gate Staff';
    case 'volunteer': return 'Event Volunteer';
    case 'speaker': return 'Speaker / Artist';
    case 'sponsor': return 'Brand Sponsor';
    default: return String(role);
  }
}
