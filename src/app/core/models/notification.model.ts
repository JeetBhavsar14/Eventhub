export type NotificationType =
  | 'booking'
  | 'invitation'
  | 'event_status'
  | 'host_application'
  | 'reminder'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationAction {
  label: string;
  actionType: 'navigate' | 'accept_invitation' | 'decline_invitation' | 'dismiss';
  route?: string;
  queryParams?: Record<string, string | number | boolean>;
  invitationId?: string;
  primary?: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  userEmail?: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority?: NotificationPriority;
  icon?: string;
  eventId?: string;
  eventTitle?: string;
  bookingReference?: string;
  invitationId?: string;
  invitationStatus?: 'pending' | 'accepted' | 'declined';
  targetRole?: string;
  targetRoute?: string;
  action?: NotificationAction;
  metadata?: Record<string, unknown>;
}
