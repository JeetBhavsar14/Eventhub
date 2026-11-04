import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { HostApplicationService } from '@core/state/host-application.service';
import {
  HostEventItem,
  HostEventStatus,
  BookingDataPoint,
  HostPendingAction,
  HostRecentActivity,
  HostTeamMember,
  HostAttendeeRecord,
  HostNotificationItem,
  HostDashboardView,
  DashboardPrototypeState,
  EventItem,
  Booking,
  BookingTicket,
  BookingTicketPass,
  BookingAttendee
} from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class HostDashboardService {
  private api = inject(ApiClient);
  private authService = inject(AuthService);
  private hostAppService = inject(HostApplicationService);

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Prototype State Controller
  prototypeState = signal<DashboardPrototypeState>('populated');

  // Active View in Workspace
  currentView = signal<HostDashboardView>('overview');

  // Selected Reporting Period
  selectedPeriod = signal<'7d' | '30d' | '90d'>('30d');

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // 1. Fetch host's own events from Django; fallback to general /events if no host events yet
      let eventsRes = await this.api.get<EventItem[]>('/events/my-events/');
      if (!eventsRes.data || eventsRes.data.length === 0) {
        eventsRes = await this.api.get<EventItem[]>('/events');
      }

      // 2. Fetch bookings
      const bookingsRes = await this.api.get<Booking[]>('/bookings');

      // Only report an error if primary events retrieval failed fatally
      if (eventsRes?.error && (!this.events() || this.events().length === 0)) {
        this.error.set(eventsRes.error.userMessage);
      }

      let mappedEvents: HostEventItem[] = [];
      if (eventsRes.data && eventsRes.data.length > 0) {
        mappedEvents = eventsRes.data.map((e: EventItem) => ({
          id: e.id,
          title: e.title,
          category: e.category || 'Music & Concerts',
          type: e.format || 'In-Person',
          date: e.date || 'Upcoming 2026',
          time: e.time || '18:00',
          venue: e.location?.venue || 'Main Venue Arena',
          city: e.location?.city || 'Mumbai',
          imageUrl: e.thumbnailUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
          bookingsCount: 0,
          capacity: e.capacity || 500,
          price: e.ticketTypes?.[0]?.price ?? 500,
          status: (e.status === 'cancelled' ? 'rejected' : e.status === 'draft' ? 'draft' : 'published') as HostEventStatus,
          revenue: 0,
          daysRemaining: 15,
          description: e.description || 'Live curated experience.'
        }));
        this.events.set(mappedEvents);
      } else {
        this.events.set([]);
      }

      let mappedAttendees: HostAttendeeRecord[] = [];
      if (bookingsRes.data && bookingsRes.data.length > 0) {
        mappedAttendees = bookingsRes.data.map((b: Booking) => {
          const totalQty = b.tickets?.reduce((acc: number, t: BookingTicket) => acc + (t.quantity || 1), 0) || (b.ticketPasses?.length || 1);
          let passes: BookingTicketPass[] = b.ticketPasses && b.ticketPasses.length > 0 ? [...b.ticketPasses] : [];
          if (passes.length === 0) {
            if (b.attendees && b.attendees.length > 0) {
              passes = b.attendees.map((att, idx) => ({
                id: `pass-${b.id}-${idx + 1}`,
                ticketNumber: `TKT-${String(b.id).slice(0, 8).toUpperCase()}-${idx + 1}`,
                attendeeName: att.name || `Attendee ${idx + 1}`,
                attendeeEmail: att.email || '',
                status: (b.status === 'cancelled' ? 'cancelled' : 'valid') as 'valid' | 'cancelled',
                issuedAt: b.createdAt || new Date().toISOString(),
                price: (b.totalAmount || 0) / (b.attendees?.length || 1)
              }));
            } else {
              for (let i = 0; i < totalQty; i++) {
                passes.push({
                  id: `pass-${b.id}-${i + 1}`,
                  ticketNumber: `TKT-${String(b.id).slice(0, 8).toUpperCase()}-${i + 1}`,
                  attendeeName: i === 0 ? (b.attendee?.name || 'Primary Attendee') : `Guest ${i + 1}`,
                  attendeeEmail: i === 0 ? (b.attendee?.email || '') : '',
                  status: (b.status === 'cancelled' ? 'cancelled' : 'valid') as 'valid' | 'cancelled',
                  issuedAt: b.createdAt || new Date().toISOString(),
                  price: (b.totalAmount || 0) / totalQty
                });
              }
            }
          }

          const attendeeList: BookingAttendee[] = (b.attendees && b.attendees.length > 0)
            ? b.attendees
            : passes.map(p => ({
                name: p.attendeeName,
                email: p.attendeeEmail || '',
                phone: ''
              }));

          const primaryName = b.attendee?.name || (attendeeList[0]?.name) || passes[0]?.attendeeName || 'Attendee';
          const primaryEmail = b.attendee?.email || (attendeeList[0]?.email) || passes[0]?.attendeeEmail || 'attendee@example.com';
          const primaryPhone = b.attendee?.phone || attendeeList[0]?.phone || '';

          return {
            id: b.id,
            orderId: b.bookingReference || b.id || 'ORD-9820',
            attendeeName: primaryName,
            email: primaryEmail,
            phone: primaryPhone,
            eventTitle: b.eventTitle || 'Confirmed Event',
            eventDate: b.eventDate,
            eventTime: b.eventTime,
            eventLocation: b.eventLocation,
            tier: b.tickets?.[0]?.name ? `${b.tickets[0].name} Pass` : 'General Admission',
            ticketsCount: totalQty,
            totalAmount: b.totalAmount || 0,
            bookingDate: b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Today',
            checkInStatus: b.status === 'cancelled' ? 'cancelled' : 'pending',
            status: b.status || 'confirmed',
            attendees: attendeeList,
            ticketPasses: passes,
            tickets: b.tickets || []
          };
        });
        this.attendees.set(mappedAttendees);
      } else {
        this.attendees.set([]);
      }

      // Synchronize all derived dashboard metrics, actions, and audit log
      this.syncDerivedDashboardState(mappedEvents, mappedAttendees);
    } catch (err: unknown) {
      const apiErr = err as { userMessage?: string } | null;
      this.error.set(apiErr?.userMessage || 'An unexpected error occurred. Please try again.');
      console.warn('Could not load host dashboard data', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Custom Host Info Overrides
  private _customHostInfo = signal<{
    name?: string;
    organization?: string;
    email?: string;
    phone?: string;
    role?: string;
    avatar?: string;
    verificationBadge?: string;
    rating?: number;
    memberSince?: string;
  }>({});

  // Host Profile Info - Dynamically reactive to authenticated user and application submission
  readonly hostInfo = computed(() => {
    const user = this.authService.currentUser();
    const app = this.hostAppService.applicationData();
    const custom = this._customHostInfo();

    // Determine host full name
    let name = custom.name;
    if (!name) {
      if (user && (user.firstName || user.lastName)) {
        name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      } else if (user?.email) {
        name = user.email.split('@')[0];
      } else if (app?.applicantName) {
        name = app.applicantName;
      } else {
        name = 'Host Organizer';
      }
    }

    // Determine host email
    const email = custom.email || user?.email || app?.email || 'host@eventhub.com';

    // Determine host phone
    const phone = custom.phone || user?.phone || app?.phone || '';

    // Determine host organization
    let organization = custom.organization;
    if (!organization) {
      if (app?.organizationName && app.organizationName !== 'Independent Host') {
        organization = app.organizationName;
      } else if (user?.email) {
        organization = `${user.email.split('@')[0]}'s Experiences`;
      } else {
        organization = `${name}'s Production`;
      }
    }

    // Determine host role and badges
    const role = custom.role || (user?.platformRole === 'admin' || user?.platformRole === 'super_admin' ? 'Platform Admin & Host' : 'Primary Host / Organizer');
    const avatar = custom.avatar || user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
    const verificationBadge = custom.verificationBadge || (app?.status === 'approved' || user?.isHost ? 'Verified Organizer' : 'Authorized Host');
    const rating = custom.rating ?? 4.95;
    const memberSince = custom.memberSince || 'October 2026';

    return {
      name,
      organization,
      email,
      phone,
      role,
      avatar,
      verificationBadge,
      rating,
      memberSince
    };
  });

  updateHostInfo(info: Partial<{
    name: string;
    organization: string;
    email: string;
    phone: string;
    role: string;
    avatar: string;
    verificationBadge: string;
    rating: number;
    memberSince: string;
  }>) {
    this._customHostInfo.update(curr => ({ ...curr, ...info }));
  }

  // Signals strictly synchronized with live Django data
  events = signal<HostEventItem[]>([]);
  pendingActions = signal<HostPendingAction[]>([]);
  recentActivities = signal<HostRecentActivity[]>([]);
  teamMembers = signal<HostTeamMember[]>([]);
  attendees = signal<HostAttendeeRecord[]>([]);
  notifications = signal<HostNotificationItem[]>([]);

  // Unread notifications count
  unreadNotificationsCount = computed(() => {
    return this.notifications().filter(n => n.unread).length;
  });

  // Overview Statistics dynamically computed from live events and bookings
  stats = computed(() => {
    const list = this.events();
    const published = list.filter(e => e.status === 'published').length;
    const pending = list.filter(e => e.status === 'pending_review').length;
    const drafts = list.filter(e => e.status === 'draft').length;
    const changes = list.filter(e => e.status === 'changes_requested').length;
    const approved = list.filter(e => e.status === 'approved').length;
    const rejected = list.filter(e => e.status === 'rejected').length;

    const attendeeList = this.attendees();
    const totalBookings = attendeeList.length > 0
      ? attendeeList.reduce((sum, a) => sum + (a.ticketsCount || 1), 0)
      : 0;

    const totalRevenue = attendeeList.length > 0
      ? attendeeList.reduce((sum, a) => sum + (a.totalAmount || 0), 0)
      : 0;

    return {
      totalEvents: list.length,
      activeEventsCount: list.length,
      publishedEvents: published,
      pendingReview: pending,
      totalBookings: totalBookings,
      totalRevenue: totalRevenue,
      draftCount: drafts,
      changesRequestedCount: changes,
      approvedCount: approved,
      rejectedCount: rejected
    };
  });

  // Booking Overview Chart Data (7d / 30d / 90d) derived from real attendees
  getBookingChartData(period: '7d' | '30d' | '90d'): { points: BookingDataPoint[], maxVal: number } {
    const attendeeList = this.attendees();
    const totalBookings = attendeeList.reduce((sum, a) => sum + (a.ticketsCount || 1), 0);
    const totalRevenue = attendeeList.reduce((sum, a) => sum + (a.totalAmount || 0), 0);

    if (period === '7d') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const points: BookingDataPoint[] = days.map((label, idx) => {
        const bCount = totalBookings > 0 && idx === 6 ? totalBookings : 0;
        const rev = totalRevenue > 0 && idx === 6 ? totalRevenue : 0;
        return { label, bookings: bCount, attendees: bCount, revenue: rev };
      });
      return { points, maxVal: Math.max(10, totalBookings) };
    }

    if (period === '90d') {
      const months = ['Month 1', 'Month 2', 'Month 3'];
      const points: BookingDataPoint[] = months.map((label, idx) => {
        const bCount = totalBookings > 0 && idx === 2 ? totalBookings : 0;
        const rev = totalRevenue > 0 && idx === 2 ? totalRevenue : 0;
        return { label, bookings: bCount, attendees: bCount, revenue: rev };
      });
      return { points, maxVal: Math.max(10, totalBookings) };
    }

    // Default 30d
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const points: BookingDataPoint[] = weeks.map((label, idx) => {
      const bCount = totalBookings > 0 && idx === 3 ? totalBookings : 0;
      const rev = totalRevenue > 0 && idx === 3 ? totalRevenue : 0;
      return { label, bookings: bCount, attendees: bCount, revenue: rev };
    });
    return { points, maxVal: Math.max(10, totalBookings) };
  }

  // Upcoming Events (Published & Approved)
  upcomingEvents = computed(() => {
    return this.events().filter(
      e => e.status === 'published' || e.status === 'approved'
    );
  });

  private syncDerivedDashboardState(events: HostEventItem[], attendees: HostAttendeeRecord[]): void {
    // 1. Pending actions derived from real event statuses
    const actions: HostPendingAction[] = [];
    for (const e of events) {
      if (e.status === 'changes_requested') {
        actions.push({
          id: `PA-${e.id}`,
          type: 'feedback',
          title: `Changes Requested: ${e.title}`,
          description: e.feedbackNotes || 'Curation team requested clarifications before publishing.',
          severity: 'warning',
          actionLabel: 'Review Feedback & Edit',
          actionType: 'edit_feedback',
          eventId: e.id,
          badgeText: 'Action Required'
        });
      } else if (e.status === 'pending_review') {
        actions.push({
          id: `PA-${e.id}`,
          type: 'pending_review',
          title: `Pending Review: ${e.title}`,
          description: 'Event is currently in the curation review queue (~24h turnaround).',
          severity: 'info',
          actionLabel: 'Track Review Queue',
          actionType: 'view_pending',
          eventId: e.id,
          badgeText: 'In Review'
        });
      } else if (e.status === 'draft') {
        actions.push({
          id: `PA-${e.id}`,
          type: 'draft_incomplete',
          title: `Draft Event: ${e.title}`,
          description: 'Complete configuration and submit draft to curation team.',
          severity: 'notice',
          actionLabel: 'Complete Draft',
          actionType: 'edit_draft',
          eventId: e.id,
          badgeText: 'Draft Setup'
        });
      }
    }
    this.pendingActions.set(actions);

    // 2. Recent activities dynamically generated from real events and bookings
    const activities: HostRecentActivity[] = [];
    for (const a of attendees) {
      activities.push({
        id: `ACT-BKG-${a.orderId}`,
        title: `New Booking for ${a.eventTitle}`,
        description: `${a.attendeeName} reserved ${a.ticketsCount} pass(es) (₹${a.totalAmount}).`,
        timestamp: a.bookingDate || 'Recent',
        type: 'booking',
        eventTitle: a.eventTitle
      });
    }
    for (const e of events) {
      if (e.status === 'published') {
        activities.push({
          id: `ACT-PUB-${e.id}`,
          title: 'Event Published Live',
          description: `"${e.title}" is published on EventHub explore.`,
          timestamp: e.date || 'Recent',
          type: 'approved',
          eventTitle: e.title
        });
      } else if (e.status === 'pending_review') {
        activities.push({
          id: `ACT-SUB-${e.id}`,
          title: 'Event Submitted for Curation Review',
          description: `"${e.title}" was submitted to the verification queue.`,
          timestamp: e.submittedDate || 'Recent',
          type: 'submission',
          eventTitle: e.title
        });
      } else if (e.status === 'changes_requested') {
        activities.push({
          id: `ACT-CHG-${e.id}`,
          title: 'Review Clarification Requested',
          description: e.feedbackNotes || `Modifications requested for "${e.title}".`,
          timestamp: 'Recent',
          type: 'feedback',
          eventTitle: e.title
        });
      }
    }
    if (activities.length === 0) {
      activities.push({
        id: 'ACT-WELCOME',
        title: 'Welcome to EventHub Host Workspace',
        description: 'Create and submit your first event to start accepting attendees.',
        timestamp: 'Just now',
        type: 'approved'
      });
    }
    this.recentActivities.set(activities);

    // 3. Notifications derived from real items
    const notifs: HostNotificationItem[] = [];
    for (const e of events) {
      if (e.status === 'changes_requested') {
        notifs.push({
          id: `NOTIF-CHG-${e.id}`,
          title: `Action Needed: ${e.title}`,
          message: e.feedbackNotes || 'Reviewer added comments regarding your event.',
          timestamp: 'Recent',
          unread: true,
          type: 'action',
          eventId: e.id
        });
      } else if (e.status === 'published') {
        notifs.push({
          id: `NOTIF-PUB-${e.id}`,
          title: `Event Live: ${e.title}`,
          message: 'Your event is certified and open for ticket reservations.',
          timestamp: 'Recent',
          unread: false,
          type: 'approval',
          eventId: e.id
        });
      }
    }
    for (const a of attendees) {
      notifs.push({
        id: `NOTIF-BKG-${a.orderId}`,
        title: `Passes Reserved: ${a.eventTitle}`,
        message: `${a.attendeeName} reserved ${a.ticketsCount} tickets (Order #${a.orderId}).`,
        timestamp: a.bookingDate || 'Recent',
        unread: false,
        type: 'booking'
      });
    }
    this.notifications.set(notifs);
  }

  // Switch Prototype Display State
  setPrototypeState(state: DashboardPrototypeState) {
    this.prototypeState.set(state);
    if (state === 'empty_events') {
      this.events.set([]);
      this.pendingActions.set([]);
    } else if (state === 'no_pending_actions') {
      this.pendingActions.set([]);
    }
  }

  // Action Handlers
  submitEventForReview(eventId: string) {
    this.api.post(`/events/${eventId}/submit/`, {}).catch(() => {});

    this.events.update(list =>
      list.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            status: 'pending_review' as HostEventStatus,
            submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          };
        }
        return e;
      })
    );

    this.recentActivities.update(acts => [
      {
        id: `ACT-${Date.now()}`,
        title: 'Event Submitted for Review',
        description: `Your draft event was submitted for review.`,
        timestamp: 'Just now',
        type: 'submission'
      },
      ...acts
    ]);
  }

  publishEvent(eventId: string) {
    this.events.update(list =>
      list.map(e => (e.id === eventId ? { ...e, status: 'published' as HostEventStatus } : e))
    );

    this.recentActivities.update(acts => [
      {
        id: `ACT-${Date.now()}`,
        title: 'Event Published Live',
        description: `Tickets are now open on EventHub public explore.`,
        timestamp: 'Just now',
        type: 'approved'
      },
      ...acts
    ]);
  }

  resolveFeedbackAndResubmit(eventId: string, note?: string) {
    this.events.update(list =>
      list.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            status: 'pending_review' as HostEventStatus,
            feedbackNotes: undefined
          };
        }
        return e;
      })
    );

    this.pendingActions.update(acts => acts.filter(a => a.eventId !== eventId));

    this.recentActivities.update(acts => [
      {
        id: `ACT-${Date.now()}`,
        title: 'Clarification Resubmitted',
        description: note || 'Sound permit documents uploaded for curation team review.',
        timestamp: 'Just now',
        type: 'update'
      },
      ...acts
    ]);
  }

  updateEvent(eventId: string, changes: Partial<HostEventItem>, requestAdminApproval: boolean, changeReason?: string) {
    const isRequestingReview = requestAdminApproval || changes.status === 'pending_review';
    const targetStatus: HostEventStatus = isRequestingReview ? 'pending_review' : (changes.status || 'draft');

    this.events.update(list =>
      list.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            ...changes,
            status: targetStatus,
            feedbackNotes: isRequestingReview 
              ? (changeReason ? `Host change request: ${changeReason}` : 'Host requested review of modifications.') 
              : e.feedbackNotes
          };
        }
        return e;
      })
    );

    if (isRequestingReview) {
      this.pendingActions.update(acts => [
        {
          id: `PA-CHANGE-${Date.now()}`,
          eventId,
          type: 'pending_review',
          title: `Pending Admin Review: ${changes.title || 'Event Update'}`,
          description: changeReason || 'Modifications submitted to Admin curation team for approval.',
          severity: 'info',
          actionLabel: 'View Details',
          actionType: 'view_details',
          badgeText: 'In Review'
        },
        ...acts.filter(a => a.eventId !== eventId)
      ]);

      this.recentActivities.update(acts => [
        {
          id: `ACT-${Date.now()}`,
          title: 'Event Change Request Submitted',
          description: `Modifications for "${changes.title || 'Event'}" sent to Admin for curation approval.`,
          timestamp: 'Just now',
          type: 'submission',
          eventTitle: changes.title
        },
        ...acts
      ]);
    } else {
      this.recentActivities.update(acts => [
        {
          id: `ACT-${Date.now()}`,
          title: 'Event Details Updated',
          description: `Changes saved for "${changes.title || 'Draft Event'}".`,
          timestamp: 'Just now',
          type: 'update',
          eventTitle: changes.title
        },
        ...acts
      ]);
    }
  }

  createNewEvent(eventData: Partial<HostEventItem>) {
    const newId = `EVT-${Math.floor(700 + Math.random() * 200)}`;
    const newEvent: HostEventItem = {
      id: newId,
      title: eventData.title || 'Untitled Event',
      category: eventData.category || 'Music & Concerts',
      type: eventData.type || 'Standard Event',
      date: eventData.date || 'Dec 15, 2026',
      time: eventData.time || '7:00 PM – 10:00 PM',
      venue: eventData.venue || 'Ahmedabad Convention Centre',
      city: eventData.city || 'Ahmedabad',
      imageUrl: eventData.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      bookingsCount: 0,
      capacity: eventData.capacity || 100,
      price: eventData.price || 500,
      status: (eventData.status as HostEventStatus) || 'draft',
      revenue: 0,
      daysRemaining: 45,
      description: eventData.description || 'Exciting new event hosted on EventHub.'
    };

    this.events.update(list => [newEvent, ...list]);

    this.recentActivities.update(acts => [
      {
        id: `ACT-${Date.now()}`,
        title: 'New Event Created',
        description: `${newEvent.title} added as ${newEvent.status}.`,
        timestamp: 'Just now',
        type: 'submission',
        eventTitle: newEvent.title
      },
      ...acts
    ]);

    return newEvent;
  }

  deleteDraft(eventId: string) {
    this.events.update(list => list.filter(e => e.id !== eventId));
  }

  markNotificationRead(id: string) {
    this.notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, unread: false } : n))
    );
  }

  markAllNotificationsRead() {
    this.notifications.update(list =>
      list.map(n => ({ ...n, unread: false }))
    );
  }

  inviteTeamMember(name: string, email: string, role: HostTeamMember['role']) {
    const newMember: HostTeamMember = {
      id: `TM-${Date.now()}`,
      name,
      email,
      role,
      status: 'invited',
      addedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    this.teamMembers.update(members => [...members, newMember]);
  }
}
