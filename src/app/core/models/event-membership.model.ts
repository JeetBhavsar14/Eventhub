import { Permission } from './permission.model';
import { StaffResponsibility } from './policy.model';

// § 5.3 Event Operational Roles
export type EventOperationalRole =
  | 'event_owner'
  | 'event_manager'
  | 'staff'
  | 'volunteer'
  | 'custom_role';

// § 6.0 Event Participant Types
export type EventParticipantType =
  | 'attendee'
  | 'speaker'
  | 'sponsor';

export type MembershipRole = EventOperationalRole | EventParticipantType;

export type MembershipStatus =
  | 'pending'
  | 'active'
  | 'rejected'
  | 'expired'
  | 'suspended';

export interface EventMembership {
  id: string;
  eventId: string;
  userId: string;
  email: string;
  name: string;
  role: MembershipRole;
  roleName?: string;
  designation?: string;
  isOwner?: boolean;
  roleCategory: 'operational' | 'participant';
  delegationActive?: boolean;
  delegatedUntil?: string;
  policyIds?: string[];
  directPermissions?: Permission[];
  responsibility?: StaffResponsibility;
  permissions?: string[];
  status: MembershipStatus;
  joinedAt?: string;
  expiresAt?: string;
}

// § 5.2 Invitation-Based Event Membership
export interface EventInvitation {
  id: string;
  eventId: string;
  eventTitle: string;
  inviterId: string;
  inviteeEmail: string;
  inviteeName?: string;
  role: MembershipRole;
  roleCategory: 'operational' | 'participant';
  designation?: string;
  responsibility?: StaffResponsibility;
  customRoleName?: string;
  customPermissions?: string[];
  permissions?: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  sentAt: string;
  respondedAt?: string | null;
  expiresAt?: string;
}

export interface EventFilter {
  category: string;
  type?: string;
  date: string;
  customDate?: string;
  startDate?: string;
  endDate?: string;
  price: string;
  minPrice?: number;
  maxPrice?: number;
}