import { Permission } from './permission.model';

export type StaffResponsibility =
  | 'registration'
  | 'ticketing'
  | 'venue_operations'
  | 'technical_av'
  | 'security_safety'
  | 'medical'
  | 'marketing'
  | 'finance'
  | 'volunteer';

export interface Policy {
  id: string;
  name: string;
  description: string;
  responsibility?: StaffResponsibility;
  permissions: Permission[];
}
