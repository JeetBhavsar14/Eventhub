import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { AppNotification, NotificationType, NotificationPriority, Booking } from '@core/models';

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

  // Local Storage state helpers for persistent read & dismissed notifications
  private getLocalReadIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('eventhub_read_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveLocalReadId(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const set = this.getLocalReadIds();
      set.add(id);
      localStorage.setItem('eventhub_read_notifications', JSON.stringify(Array.from(set)));
    } catch {}
  }

  private saveAllLocalReadIds(ids: string[]): void {
    if (typeof window === 'undefined') return;
    try {
      const set = this.getLocalReadIds();
      ids.forEach(id => set.add(id));
      localStorage.setItem('eventhub_read_notifications', JSON.stringify(Array.from(set)));
    } catch {}
  }

  private getLocalDismissedIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('eventhub_dismissed_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveLocalDismissedId(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const set = this.getLocalDismissedIds();
      set.add(id);
      localStorage.setItem('eventhub_dismissed_notifications', JSON.stringify(Array.from(set)));
    } catch {}
  }

  /**
   * Fetch and synchronize notifications:
   * 1. Maps live ticket bookings from Django backend into notifications.
   * 2. Incorporates server notifications from /notifications (gracefully handling backend future scope).
   */
  async loadNotifications(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) {
      this.notifications.set([]);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const readIds = this.getLocalReadIds();
    const dismissedIds = this.getLocalDismissedIds();
    const allNotifs: AppNotification[] = [];

    try {
      // 1. Authoritative Ticket Booking Mapping from Django Backend
      const bookingsRes = await this.api.get<Booking[]>('/bookings', { userId: user.id });
      if (bookingsRes.data && Array.isArray(bookingsRes.data)) {
        for (const b of bookingsRes.data) {
          const bookingRef = b.bookingReference || b.id || 'EVT-BOOKING';
          const ticketsQty = (b.tickets && b.tickets.length > 0)
            ? b.tickets.reduce((sum, t) => sum + (t.quantity || 1), 0)
            : (b.ticketPasses?.length || 1);
          const totalAmt = b.totalAmount || 0;

          if (b.status === 'confirmed' || b.status === 'partially_cancelled') {
            const notifId = `notif-booking-${b.id || bookingRef}`;
            if (!dismissedIds.has(notifId)) {
              allNotifs.push({
                id: notifId,
                userId: user.id,
                userEmail: user.email,
                type: 'booking',
                title: 'Ticket Booking Confirmed!',
                message: `Your booking for "${b.eventTitle || 'Confirmed Event'}" (${ticketsQty} ticket pass${ticketsQty > 1 ? 'es' : ''} • ₹${totalAmt.toLocaleString()}) is confirmed. Pass Ref: ${bookingRef}`,
                priority: 'high',
                icon: 'ticket',
                eventId: b.eventId,
                eventTitle: b.eventTitle,
                bookingReference: bookingRef,
                timestamp: b.createdAt || new Date().toISOString(),
                read: readIds.has(notifId),
                action: {
                  label: 'View Tickets',
                  actionType: 'navigate',
                  route: '/bookings',
                  primary: true
                }
              });
            }
          } else if (b.status === 'cancelled') {
            const notifId = `notif-cancel-${b.id || bookingRef}`;
            if (!dismissedIds.has(notifId)) {
              allNotifs.push({
                id: notifId,
                userId: user.id,
                userEmail: user.email,
                type: 'booking',
                title: 'Booking Cancelled',
                message: `Your booking for "${b.eventTitle || 'Event'}" (${bookingRef}) was cancelled and admission passes are voided.`,
                priority: 'normal',
                icon: 'alert-circle',
                eventId: b.eventId,
                eventTitle: b.eventTitle,
                bookingReference: bookingRef,
                timestamp: b.createdAt || new Date().toISOString(),
                read: readIds.has(notifId),
                action: {
                  label: 'View Bookings',
                  actionType: 'navigate',
                  route: '/bookings',
                  primary: true
                }
              });
            }
          }
        }
      }

      // 2. Fetch server-side notifications from /notifications endpoint (gracefully handles backend future scope)
      try {
        const res = await this.api.get<AppNotification[]>('/notifications');
        if (res.data && Array.isArray(res.data)) {
          const userNotifs = res.data.filter(n =>
            !dismissedIds.has(n.id) &&
            (n.userId === user.id ||
              n.userId === 'all' ||
              (n.userEmail && n.userEmail.toLowerCase() === user.email.toLowerCase()))
          );
          for (const n of userNotifs) {
            const alreadyExists = allNotifs.some(
              existing => existing.id === n.id || (n.bookingReference && existing.bookingReference === n.bookingReference)
            );
            if (!alreadyExists) {
              allNotifs.push({
                ...n,
                read: n.read || readIds.has(n.id)
              });
            }
          }
        }
      } catch {
        // Backend /notifications API is in Backend Future Scope
      }

      // 3. Sort by timestamp descending
      allNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      this.notifications.set(allNotifs);
    } catch (err: unknown) {
      console.warn('Could not load notifications / bookings:', err);
      this.notifications.set(allNotifs);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string): Promise<boolean> {
    this.saveLocalReadId(id);
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );

    try {
      const res = await this.api.patch(`/notifications/${id}`, { read: true });
      return !res.error;
    } catch {
      return true; // Local persistence guarantees state
    }
  }

  /**
   * Mark all notifications for the current user as read
   */
  async markAllAsRead(): Promise<boolean> {
    const unread = this.notifications().filter(n => !n.read);
    if (unread.length === 0) return true;

    this.saveAllLocalReadIds(unread.map(n => n.id));
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));

    try {
      await Promise.all(
        unread.map(n => this.api.patch(`/notifications/${n.id}`, { read: true }).catch(() => {}))
      );
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Delete / dismiss a notification completely
   */
  async deleteNotification(id: string): Promise<boolean> {
    this.saveLocalDismissedId(id);
    this.notifications.update(list => list.filter(n => n.id !== id));

    try {
      const res = await this.api.delete(`/notifications/${id}`);
      return !res.error;
    } catch {
      return true;
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
   * Dispatch a notification
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

    // Real-time optimistic update for the active user
    const user = this.auth.currentUser();
    if (
      user &&
      (newNotif.userId === user.id ||
        newNotif.userId === 'all' ||
        (newNotif.userEmail && newNotif.userEmail.toLowerCase() === user.email.toLowerCase()))
    ) {
      this.notifications.update(list => {
        if (newNotif.bookingReference && list.some(item => item.bookingReference === newNotif.bookingReference)) {
          return list;
        }
        return [newNotif, ...list];
      });
    }

    try {
      const res = await this.api.post<AppNotification>('/notifications', newNotif);
      if (res.data) {
        return res.data;
      }
    } catch {
      // Backend /notifications API is in Backend Future Scope
    }
    return newNotif;
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
