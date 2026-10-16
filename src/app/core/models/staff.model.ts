export type StaffPermission = 'scan_tickets' | 'view_attendees' | 'log_incidents' | 'view_duty';

export interface StaffEventDuty {
  title: string;
  venue: string;
  gate: string;
  startTime: string;
  endTime: string;
  roleDuty: string;
  designation?: string;
  responsibility?: string;
  permissions?: string[];
}

export interface StaffAttendee {
  id: string;
  orderId: string;
  name: string;
  ticketTier: string;
  ticketsCount: number;
  wristbandColor: string;
  checkInStatus: 'pending' | 'checked_in' | 'flagged';
  checkInTime: string | null;
  isVIP: boolean;
  notes?: string | null;
}

export interface StaffIncident {
  id: string;
  category: string;
  description: string;
  time: string;
  status: 'resolved' | 'escalated' | 'open' | 'dispatched';
}

export interface StaffRosterItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  designation?: string;
  permissions?: string[];
  assignedEvent: string;
  assignedGate: string;
  status: 'on_duty' | 'break' | 'off_duty';
}
