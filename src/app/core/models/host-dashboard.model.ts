export type HostEventStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'rejected';

export interface HostEventItem {
  id: string;
  title: string;
  category: string;
  type: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  imageUrl: string;
  bookingsCount: number;
  capacity: number;
  price: number;
  status: HostEventStatus;
  revenue: number;
  feedbackNotes?: string;
  submittedDate?: string;
  daysRemaining?: number;
  description?: string;
}

export interface BookingDataPoint {
  label: string;
  bookings: number;
  attendees: number;
  revenue: number;
}

export interface HostPendingAction {
  id: string;
  type: 'feedback' | 'pending_review' | 'draft_incomplete' | 'team_invite';
  title: string;
  description: string;
  severity: 'warning' | 'info' | 'notice';
  actionLabel: string;
  actionType: string;
  eventId?: string;
  badgeText: string;
}

export interface HostRecentActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'approved' | 'booking' | 'submission' | 'feedback' | 'team' | 'update';
  eventTitle?: string;
}

export interface HostTeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Event Manager' | 'Check-in Staff' | 'Marketing Lead';
  status: 'active' | 'invited';
  avatar?: string;
  addedDate: string;
}

export interface HostAttendeeRecord {
  orderId: string;
  attendeeName: string;
  email: string;
  eventTitle: string;
  tier: 'General Admission' | 'VIP Pass' | 'Early Bird' | 'Workshop Seat' | string;
  ticketsCount: number;
  totalAmount: number;
  bookingDate: string;
  checkInStatus: 'checked_in' | 'pending';
}

export interface HostNotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  unread: boolean;
  type: 'approval' | 'booking' | 'system' | 'action';
  eventId?: string;
}

export type HostDashboardView =
  | 'overview'
  | 'my_events'
  | 'create_event'
  | 'bookings'
  | 'team'
  | 'analytics'
  | 'notifications'
  | 'settings';

export type DashboardPrototypeState =
  | 'populated'
  | 'skeleton'
  | 'empty_events'
  | 'no_upcoming'
  | 'no_pending_actions'
  | 'api_error';
