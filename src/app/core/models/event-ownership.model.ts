// src/app/core/models/event-ownership.model.ts
/**
 * § 11.0 EVENT OWNERSHIP & EQUITY ALLOCATION
 * Rule: Ownership allocations must sum to exactly 100%.
 * Ownership is event-specific and distinct from operational management.
 */
export interface EventOwnerStake {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  organizationName?: string;
  percentage: number; // e.g. 50 (for 50%)
  isPrimaryOwner: boolean;
  status: 'active' | 'invited' | 'declined';
  assignedAt: string;
}

/**
 * § 12.0 EVENT MANAGERS & OPERATIONAL RESPONSIBILITY
 * Rule: Multiple managers are valid per event.
 * Permissions are tied to assigned responsibility areas, not just the title "Manager".
 */
export type ManagerResponsibilityArea =
  | 'overall_operations'
  | 'venue_logistics'
  | 'sponsorships'
  | 'production_technical'
  | 'security_safety'
  | 'registration_ticketing';

export interface EventManagerAssignment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  responsibilityArea: ManagerResponsibilityArea;
  responsibilityTitle: string;
  delegationActive: boolean;
  status: 'active' | 'invited';
  assignedAt: string;
}

/**
 * § 14.0 EVENT PARTICIPANTS
 * Rule: Participants (Speakers, Artists, Sponsors) participate in the event.
 * They do not automatically receive operational permissions.
 */
export type EventParticipantCategory = 'speaker' | 'artist' | 'sponsor';

export interface EventParticipantProfile {
  id: string;
  eventId: string;
  category: EventParticipantCategory;
  name: string;
  designationOrCompany?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  status: 'confirmed' | 'invited';
}
