import { Permission } from './permission.model';
import { StaffResponsibility } from './policy.model';

export type MembershipRole =
  | 'owner'
  | 'manager'
  | 'staff'
  | 'attendee'
  | 'speaker'
  | 'sponsor';

export type MembershipStatus =
  | 'pending'
  | 'active'
  | 'rejected'
  | 'expired';

export interface EventMembership {
  id: string;
  eventId: string;
  userId: string;
  role: MembershipRole;
  responsibility?: StaffResponsibility;
  ownershipPercentage?: number;
  status: MembershipStatus;
  policyIds: string[];
  directPermissions: Permission[];
  joinedAt?: string;
  expiresAt?: string;
}
