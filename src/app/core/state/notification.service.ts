import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { AppNotification, NotificationType, NotificationPriority } from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private api = inject(ApiClient);
  private auth = inject(AuthService);

  readonly notifications = signal<AppNotification[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Computed signals
  readonly unreadCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  readonly unreadNotifications = computed(() =>
    this.notifications().filter(n => !n.read)
  );

  readonly invitationNotifications = computed(() =>
    this.notifications().filter(n => n.type === 'invitation')
  );

  constructor() {
    // Automatically synchronize notifications whenever active user changes
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.loadNotifications();
      } else {
        this.notifications.set([]);
      }
    });
  }

  /**
   * Fetch all notifications for the active user (matched by userId or userEmail)
   */
  async loadNotifications(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) {
      this.notifications.set([]);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Query notifications from mock server
      const res = await this.api.get<AppNotification[]>('/notifications');
      if (res.data) {
        // Filter notifications addressed to this user, their email, or broadcast to 'all'
        const userNotifs = res.data
          .filter(n =>
            n.userId === user.id ||
            n.userId === 'all' ||
            (n.userEmail && n.userEmail.toLowerCase() === user.email.toLowerCase())
          )
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        this.notifications.set(userNotifs);
      }
    } catch (err: unknown) {
      const apiErr = err as { userMessage?: string } | null;
      this.error.set(apiErr?.userMessage || 'An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string): Promise<boolean> {
    // Optimistic UI update
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );

    try {
      const res = await this.api.patch(`/notifications/${id}`, { read: true });
      return !res.error;
    } catch {
      return false;
    }
  }

  /**
   * Mark all notifications for the current user as read
   */
  async markAllAsRead(): Promise<boolean> {
    const unread = this.notifications().filter(n => !n.read);
    if (unread.length === 0) return true;

    // Optimistic UI update
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));

    try {
      await Promise.all(
        unread.map(n => this.api.patch(`/notifications/${n.id}`, { read: true }))
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete / dismiss a notification completely
   */
  async deleteNotification(id: string): Promise<boolean> {
    this.notifications.update(list => list.filter(n => n.id !== id));

    try {
      const res = await this.api.delete(`/notifications/${id}`);
      return !res.error;
    } catch {
      return false;
    }
  }

  /**
   * Update the invitation status (accepted/declined) on a notification without deleting it
   */
  async updateInvitationStatus(id: string, status: 'accepted' | 'declined'): Promise<boolean> {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true, invitationStatus: status } : n)
    );

    try {
      const res = await this.api.patch(`/notifications/${id}`, {
        read: true,
        invitationStatus: status
      });
      return !res.error;
    } catch {
      return false;
    }
  }

  /**
   * Dispatch a generic notification to a recipient
   */
  async sendNotification(data: {
    userId: string;
    userEmail?: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    icon?: string;
    eventId?: string;
    eventTitle?: string;
    bookingReference?: string;
    invitationId?: string;
    action?: {
      label: string;
      actionType: 'navigate' | 'accept_invitation' | 'decline_invitation' | 'dismiss';
      route?: string;
      queryParams?: Record<string, string | number | boolean>;
      invitationId?: string;
      primary?: boolean;
    };
    metadata?: Record<string, unknown>;
  }): Promise<AppNotification | null> {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...data,
      timestamp: new Date().toISOString(),
      read: false
    };

    try {
      const res = await this.api.post<AppNotification>('/notifications', newNotif);
      if (res.data) {
        const user = this.auth.currentUser();
        // If this notification belongs to currently logged-in user, append to live list
        if (
          user &&
          (newNotif.userId === user.id ||
            newNotif.userId === 'all' ||
            (newNotif.userEmail && newNotif.userEmail.toLowerCase() === user.email.toLowerCase()))
        ) {
          this.notifications.update(list => [res.data!, ...list]);
        }
        return res.data;
      }
    } catch (err) {
      console.warn('Could not post notification to API:', err);
    }
    return null;
  }

  /**
   * Helper: Dispatch a booking confirmation notification
   */
  async dispatchBookingNotification(params: {
    userId: string;
    userEmail: string;
    eventTitle: string;
    eventId: string;
    bookingReference: string;
    ticketsCount: number;
    totalAmount: number;
  }): Promise<void> {
    await this.sendNotification({
      userId: params.userId,
      userEmail: params.userEmail,
      type: 'booking',
      title: 'Booking Confirmed!',
      message: `Your booking for "${params.eventTitle}" (${params.ticketsCount} tickets • ₹${params.totalAmount.toLocaleString()}) has been confirmed. Pass: ${params.bookingReference}`,
      priority: 'high',
      icon: 'ticket',
      eventId: params.eventId,
      eventTitle: params.eventTitle,
      bookingReference: params.bookingReference,
      action: {
        label: 'View Tickets',
        actionType: 'navigate',
        route: '/bookings',
        primary: true
      }
    });
  }

  /**
   * Helper: Dispatch a team/staff invitation notification
   */
  async dispatchInvitationNotification(params: {
    inviteeEmail: string;
    inviteeId?: string;
    inviterName: string;
    eventTitle: string;
    eventId: string;
    roleName: string;
    invitationId: string;
  }): Promise<void> {
    await this.sendNotification({
      userId: params.inviteeId || 'invited-user',
      userEmail: params.inviteeEmail,
      type: 'invitation',
      title: 'New Event Team Invitation',
      message: `${params.inviterName} invited you to join "${params.eventTitle}" as ${params.roleName}.`,
      priority: 'high',
      icon: 'mail',
      eventId: params.eventId,
      eventTitle: params.eventTitle,
      invitationId: params.invitationId,
      action: {
        label: 'Accept & Join',
        actionType: 'accept_invitation',
        invitationId: params.invitationId,
        primary: true
      }
    });
  }

  /**
   * Helper: Dispatch an event reminder notification
   */
  async dispatchReminderNotification(params: {
    userId: string;
    userEmail: string;
    eventTitle: string;
    eventId: string;
    startDate: string;
    startTime: string;
    venue: string;
  }): Promise<void> {
    await this.sendNotification({
      userId: params.userId,
      userEmail: params.userEmail,
      type: 'reminder',
      title: 'Upcoming Event Reminder',
      message: `"${params.eventTitle}" is taking place on ${params.startDate} at ${params.startTime} (${params.venue}). Have your digital QR pass ready!`,
      priority: 'normal',
      icon: 'calendar',
      eventId: params.eventId,
      eventTitle: params.eventTitle,
      action: {
        label: 'View Event',
        actionType: 'navigate',
        route: `/events/${params.eventId}`,
        primary: false
      }
    });
  }

  /**
   * Helper: Dispatch an event status notification
   */
  async dispatchEventStatusNotification(params: {
    userId: string;
    userEmail: string;
    eventTitle: string;
    eventId: string;
    status: 'approved' | 'published' | 'rejected' | 'rescheduled';
    notes?: string;
  }): Promise<void> {
    const isApproved = params.status === 'approved' || params.status === 'published';
    await this.sendNotification({
      userId: params.userId,
      userEmail: params.userEmail,
      type: 'event_status',
      title: isApproved ? 'Event Approved & Published!' : 'Event Revision Required',
      message: isApproved
        ? `Congratulations! Your event "${params.eventTitle}" has been approved and is now live on the public discovery portal.`
        : `Your submission for "${params.eventTitle}" needs adjustments: ${params.notes || 'Please review guidelines in Host Dashboard.'}`,
      priority: isApproved ? 'normal' : 'urgent',
      icon: isApproved ? 'check-circle' : 'alert-circle',
      eventId: params.eventId,
      eventTitle: params.eventTitle,
      action: {
        label: 'Open Workspace',
        actionType: 'navigate',
        route: '/host/dashboard',
        primary: true
      }
    });
  }
}
