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
  DashboardPrototypeState
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
      const [eventsRes, actsRes, notifsRes, bookingsRes] = await Promise.all([
        this.api.get<any[]>('/events'),
        this.api.get<HostRecentActivity[]>('/hostActivities'),
        this.api.get<HostNotificationItem[]>('/hostNotifications'),
        this.api.get<any[]>('/bookings')
      ]);

      const firstError = eventsRes?.error || actsRes?.error || notifsRes?.error || bookingsRes?.error;
      if (firstError) {
        this.error.set(firstError.userMessage);
      }

      if (eventsRes.data && eventsRes.data.length > 0) {
        const mappedEvents: HostEventItem[] = eventsRes.data.map((e: any) => ({
          id: e.id,
          title: e.title,
          category: e.category || 'Music & Concerts',
          type: e.format || 'In-Person',
          date: e.date || 'Upcoming 2026',
          time: e.time || '18:00',
          venue: e.location?.venue || 'Main Venue Arena',
          city: e.location?.city || 'Mumbai',
          imageUrl: e.thumbnailUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
          bookingsCount: e.capacity ? Math.floor(e.capacity * 0.4) : 120,
          capacity: e.capacity || 500,
          price: e.ticketTypes?.[0]?.price ?? 500,
          status: e.status || 'published',
          revenue: (e.ticketTypes?.[0]?.price ?? 500) * (e.capacity ? Math.floor(e.capacity * 0.4) : 120),
          daysRemaining: 15,
          description: e.description || 'Live curated experience.'
        }));
        this.events.set(mappedEvents);
      }

      if (actsRes.data) {
        this.recentActivities.set(actsRes.data);
      }

      if (notifsRes.data) {
        this.notifications.set(notifsRes.data);
      }

      if (bookingsRes.data && bookingsRes.data.length > 0) {
        const mappedAttendees: HostAttendeeRecord[] = bookingsRes.data.map((b: any) => ({
          orderId: b.bookingReference || b.id || 'ORD-9820',
          attendeeName: b.attendee?.name || 'Devansh Kothari',
          email: b.attendee?.email || 'devansh@example.com',
          eventTitle: b.eventTitle || 'Mumbai Festivals Showcase 1',
          tier: b.tickets?.[0]?.name ? `${b.tickets[0].name} Pass` : 'General Admission',
          ticketsCount: b.tickets?.reduce((acc: number, t: any) => acc + (t.quantity || 1), 0) || 1,
          totalAmount: b.totalAmount || 1500,
          bookingDate: b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Today',
          checkInStatus: 'pending'
        }));
        this.attendees.set(mappedAttendees);
      }
    } catch (err: any) {
      this.error.set(err?.userMessage || 'An unexpected error occurred. Please try again.');
      console.warn('Could not connect to mock server, using cached default signals', err);
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
      } else if (app?.applicantName) {
        name = app.applicantName;
      } else {
        name = 'Jeet Bhavsar';
      }
    }

    // Determine host email
    const email = custom.email || user?.email || app?.email || 'jeet@eventhub.com';

    // Determine host phone
    const phone = custom.phone || user?.phone || app?.phone || '+91 98765 43210';

    // Determine host organization
    let organization = custom.organization;
    if (!organization) {
      if (app?.organizationName && app.organizationName !== 'Independent Host') {
        organization = app.organizationName;
      } else {
        const firstName = name.split(' ')[0] || 'Jeet';
        organization = `${firstName}'s Experiences & Live Events`;
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

  // Events Data
  private defaultEvents: HostEventItem[] = [
    {
      id: 'EVT-701',
      title: 'Ahmedabad Music Festival 2026',
      category: 'Music & Concerts',
      type: 'Outdoor Festival',
      date: 'Nov 15, 2026',
      time: '6:00 PM – 11:30 PM',
      venue: 'Sabarmati Riverfront Promenade',
      city: 'Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
      bookingsCount: 142,
      capacity: 200,
      price: 1000,
      status: 'published',
      revenue: 142000,
      daysRemaining: 6,
      description: 'The premier open-air music experience celebrating indie, fusion, and electronic artists across western India.'
    },
    {
      id: 'EVT-702',
      title: 'Tech Innovation Summit & Pitch Night',
      category: 'Technology & Startups',
      type: 'Conference',
      date: 'Dec 02, 2026',
      time: '9:30 AM – 5:00 PM',
      venue: 'Gujarat Science City Auditorium',
      city: 'Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80',
      bookingsCount: 0,
      capacity: 150,
      price: 0,
      status: 'pending_review',
      revenue: 0,
      submittedDate: 'Oct 07, 2026',
      daysRemaining: 23,
      description: 'An exclusive gathering of 150+ tech founders, investors, and engineers exploring AI, Web3, and venture growth.'
    },
    {
      id: 'EVT-703',
      title: 'Weekend Terracotta & Clay Workshop',
      category: 'Art & Culture',
      type: 'Hands-on Workshop',
      date: 'Nov 22, 2026',
      time: '11:00 AM – 2:00 PM',
      venue: 'Kanoria Centre for Arts',
      city: 'Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
      bookingsCount: 0,
      capacity: 30,
      price: 750,
      status: 'draft',
      revenue: 0,
      daysRemaining: 13,
      description: 'Learn pottery fundamentals and traditional wheel sculpting from master Gujarati artisans.'
    },
    {
      id: 'EVT-704',
      title: 'City Sunset Sports & Fitness Meetup',
      category: 'Sports & Fitness',
      type: 'Community Meetup',
      date: 'Nov 18, 2026',
      time: '7:00 AM – 10:30 AM',
      venue: 'EKA Club Arena',
      city: 'Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80',
      bookingsCount: 86,
      capacity: 100,
      price: 500,
      status: 'published',
      revenue: 43000,
      daysRemaining: 9,
      description: 'High-energy 5K morning run, functional training circuits, and endurance wellness coaching.'
    },
    {
      id: 'EVT-705',
      title: 'Indie Cinema Showcase: Gujarati Short Films',
      category: 'Film & Media',
      type: 'Screening',
      date: 'Dec 10, 2026',
      time: '7:30 PM – 10:30 PM',
      venue: 'Natarani Amphitheatre',
      city: 'Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      bookingsCount: 0,
      capacity: 80,
      price: 350,
      status: 'changes_requested',
      revenue: 0,
      feedbackNotes: 'Please upload written venue clearance confirmation for audio equipment permits after 10:00 PM.',
      daysRemaining: 31,
      description: 'Curated indie cinema showcase featuring award-winning regional short films and Q&A with filmmakers.'
    },
    {
      id: 'EVT-706',
      title: 'Gastronomy Food Fair & Chef Tables',
      category: 'Food & Drinks',
      type: 'Culinary Expo',
      date: 'Dec 20, 2026',
      time: '12:00 PM – 10:00 PM',
      venue: 'Sindhu Bhavan Cultural Grounds',
      city: 'Ahmedabad',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      bookingsCount: 20,
      capacity: 500,
      price: 200,
      status: 'approved',
      revenue: 4000,
      daysRemaining: 41,
      description: 'Over 40 artisanal food pop-ups, chef tasting tables, masterclasses, and local spice pairing.'
    }
  ];

  events = signal<HostEventItem[]>(this.defaultEvents);

  // Pending Actions Data
  private defaultPendingActions: HostPendingAction[] = [
    {
      id: 'ACT-01',
      type: 'feedback',
      title: 'Changes Requested: Indie Cinema Showcase',
      description: 'Curation team requested venue sound clearance confirmation before publishing.',
      severity: 'warning',
      actionLabel: 'Review Feedback & Edit',
      actionType: 'edit_feedback',
      eventId: 'EVT-705',
      badgeText: 'Action Required'
    },
    {
      id: 'ACT-02',
      type: 'pending_review',
      title: '3 Events Awaiting Review Decision',
      description: 'Tech Innovation Summit and 2 others are in the curation queue (~24h turnaround).',
      severity: 'info',
      actionLabel: 'Track Review Queue',
      actionType: 'view_pending',
      badgeText: 'In Review'
    },
    {
      id: 'ACT-03',
      type: 'draft_incomplete',
      title: 'Incomplete Draft: Weekend Clay Workshop',
      description: 'Draft is 70% complete. Missing ticket pricing tier breakdown.',
      severity: 'notice',
      actionLabel: 'Complete Draft',
      actionType: 'edit_draft',
      eventId: 'EVT-703',
      badgeText: 'Draft Setup'
    },
    {
      id: 'ACT-04',
      type: 'team_invite',
      title: 'Team Invitation Pending',
      description: 'priya.desai@agency.com has not yet confirmed their check-in staff invite.',
      severity: 'notice',
      actionLabel: 'Manage Team',
      actionType: 'manage_team',
      badgeText: 'Team'
    }
  ];

  pendingActions = signal<HostPendingAction[]>(this.defaultPendingActions);

  // Recent Activity Data
  private defaultActivity: HostRecentActivity[] = [
    {
      id: 'ACT-LOG-01',
      title: 'Event Approved by Curation Team',
      description: 'Gastronomy Food Fair & Chef Tables was certified and approved for publishing.',
      timestamp: '2 hours ago',
      type: 'approved',
      eventTitle: 'Gastronomy Food Fair'
    },
    {
      id: 'ACT-LOG-02',
      title: 'New Ticket Booking Received (4 VIP Passes)',
      description: 'Kunal Patel purchased 4 VIP access passes (Order #ORD-9821).',
      timestamp: '4 hours ago',
      type: 'booking',
      eventTitle: 'Ahmedabad Music Festival 2026'
    },
    {
      id: 'ACT-LOG-03',
      title: 'Event Submitted for Curation Review',
      description: 'Tech Innovation Summit & Pitch Night was sent to the verification queue.',
      timestamp: 'Yesterday at 4:15 PM',
      type: 'submission',
      eventTitle: 'Tech Innovation Summit'
    },
    {
      id: 'ACT-LOG-04',
      title: 'Review Clarification Requested',
      description: 'Sound permit request note added to Indie Cinema Showcase.',
      timestamp: '2 days ago',
      type: 'feedback',
      eventTitle: 'Indie Cinema Showcase'
    },
    {
      id: 'ACT-LOG-05',
      title: 'Team Member Joined Workspace',
      description: 'Rohan Mehta accepted the invitation as Event Manager.',
      timestamp: '3 days ago',
      type: 'team'
    }
  ];

  recentActivities = signal<HostRecentActivity[]>(this.defaultActivity);

  // Team Members Data
  teamMembers = signal<HostTeamMember[]>([
    {
      id: 'TM-01',
      name: 'Jeet Bhavsar',
      email: 'jeet@eventhub.com',
      role: 'Owner',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      addedDate: 'Jan 15, 2025'
    },
    {
      id: 'TM-02',
      name: 'Rohan Mehta',
      email: 'rohan.m@novalive.io',
      role: 'Event Manager',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      addedDate: 'Oct 01, 2026'
    },
    {
      id: 'TM-03',
      name: 'Priya Desai',
      email: 'priya.desai@agency.com',
      role: 'Check-in Staff',
      status: 'invited',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      addedDate: 'Oct 06, 2026'
    }
  ]);

  // Attendee Bookings Data
  attendees = signal<HostAttendeeRecord[]>([
    {
      orderId: 'ORD-9821',
      attendeeName: 'Kunal Patel',
      email: 'kunal.p@example.com',
      eventTitle: 'Ahmedabad Music Festival 2026',
      tier: 'VIP Pass',
      ticketsCount: 4,
      totalAmount: 4000,
      bookingDate: 'Oct 09, 2026, 12:20 PM',
      checkInStatus: 'pending'
    },
    {
      orderId: 'ORD-9818',
      attendeeName: 'Sneha Roy',
      email: 'sneha.roy@example.com',
      eventTitle: 'City Sunset Sports & Fitness Meetup',
      tier: 'General Admission',
      ticketsCount: 2,
      totalAmount: 1000,
      bookingDate: 'Oct 08, 2026, 4:10 PM',
      checkInStatus: 'pending'
    },
    {
      orderId: 'ORD-9814',
      attendeeName: 'Devansh Joshi',
      email: 'devansh.j@example.com',
      eventTitle: 'Ahmedabad Music Festival 2026',
      tier: 'General Admission',
      ticketsCount: 2,
      totalAmount: 2000,
      bookingDate: 'Oct 08, 2026, 10:45 AM',
      checkInStatus: 'pending'
    },
    {
      orderId: 'ORD-9802',
      attendeeName: 'Ananya Iyer',
      email: 'ananya.iyer@example.com',
      eventTitle: 'Gastronomy Food Fair & Chef Tables',
      tier: 'Workshop Seat',
      ticketsCount: 2,
      totalAmount: 400,
      bookingDate: 'Oct 07, 2026, 6:30 PM',
      checkInStatus: 'pending'
    },
    {
      orderId: 'ORD-9788',
      attendeeName: 'Rahul Verma',
      email: 'rahul.v@example.com',
      eventTitle: 'City Sunset Sports & Fitness Meetup',
      tier: 'Early Bird',
      ticketsCount: 1,
      totalAmount: 450,
      bookingDate: 'Oct 06, 2026, 2:15 PM',
      checkInStatus: 'pending'
    }
  ]);

  // Notifications List
  notifications = signal<HostNotificationItem[]>([
    {
      id: 'NOTIF-01',
      title: 'Event Approved: Gastronomy Food Fair',
      message: 'Your event was reviewed and approved! You can now publish it to start selling tickets.',
      timestamp: '2 hours ago',
      unread: true,
      type: 'approval',
      eventId: 'EVT-706'
    },
    {
      id: 'NOTIF-02',
      title: 'Action Needed: Indie Cinema Showcase',
      message: 'Reviewer added a clarification note regarding venue sound permits.',
      timestamp: '1 day ago',
      unread: true,
      type: 'action',
      eventId: 'EVT-705'
    },
    {
      id: 'NOTIF-03',
      title: 'Booking Milestone: 140+ Passes Sold',
      message: 'Ahmedabad Music Festival has reached 70% capacity!',
      timestamp: '2 days ago',
      unread: false,
      type: 'booking',
      eventId: 'EVT-701'
    },
    {
      id: 'NOTIF-04',
      title: 'Host Verification Confirmed',
      message: 'Your host application was approved with full organizing privileges.',
      timestamp: '1 week ago',
      unread: false,
      type: 'system'
    }
  ]);

  // Unread notifications count
  unreadNotificationsCount = computed(() => {
    return this.notifications().filter(n => n.unread).length;
  });

  // Overview Statistics
  stats = computed(() => {
    const list = this.events();
    const published = list.filter(e => e.status === 'published').length;
    const pending = list.filter(e => e.status === 'pending_review').length;
    const drafts = list.filter(e => e.status === 'draft').length;
    const changes = list.filter(e => e.status === 'changes_requested').length;
    const approved = list.filter(e => e.status === 'approved').length;
    const rejected = list.filter(e => e.status === 'rejected').length;
    const totalBookings = list.reduce((sum, e) => sum + e.bookingsCount, 0);
    const totalRevenue = list.reduce((sum, e) => sum + e.revenue, 0);

    return {
      totalEvents: 12, // Required illustrative sample stat: 12
      activeEventsCount: list.length,
      publishedEvents: 5, // Required sample: 5
      pendingReview: 3, // Required sample: 3
      totalBookings: 248, // Required sample: 248
      totalRevenue: 348500,
      draftCount: drafts,
      changesRequestedCount: changes,
      approvedCount: approved,
      rejectedCount: rejected
    };
  });

  // Booking Overview Chart Data (7d / 30d / 90d)
  getBookingChartData(period: '7d' | '30d' | '90d'): { points: BookingDataPoint[], maxVal: number } {
    if (period === '7d') {
      const points: BookingDataPoint[] = [
        { label: 'Mon', bookings: 14, attendees: 12, revenue: 14000 },
        { label: 'Tue', bookings: 22, attendees: 18, revenue: 22000 },
        { label: 'Wed', bookings: 18, attendees: 16, revenue: 18000 },
        { label: 'Thu', bookings: 35, attendees: 30, revenue: 35000 },
        { label: 'Fri', bookings: 48, attendees: 42, revenue: 48000 },
        { label: 'Sat', bookings: 62, attendees: 55, revenue: 62000 },
        { label: 'Sun', bookings: 49, attendees: 44, revenue: 49000 }
      ];
      return { points, maxVal: 70 };
    }

    if (period === '90d') {
      const points: BookingDataPoint[] = [
        { label: 'Aug W1', bookings: 80, attendees: 70, revenue: 78000 },
        { label: 'Aug W3', bookings: 110, attendees: 95, revenue: 105000 },
        { label: 'Sep W1', bookings: 145, attendees: 130, revenue: 142000 },
        { label: 'Sep W3', bookings: 180, attendees: 160, revenue: 178000 },
        { label: 'Oct W1', bookings: 210, attendees: 190, revenue: 215000 },
        { label: 'Oct W2', bookings: 248, attendees: 220, revenue: 248000 }
      ];
      return { points, maxVal: 280 };
    }

    // Default 30d
    const points: BookingDataPoint[] = [
      { label: 'Sep 10', bookings: 18, attendees: 15, revenue: 18000 },
      { label: 'Sep 15', bookings: 32, attendees: 28, revenue: 32000 },
      { label: 'Sep 20', bookings: 45, attendees: 40, revenue: 45000 },
      { label: 'Sep 25', bookings: 68, attendees: 58, revenue: 68000 },
      { label: 'Sep 30', bookings: 95, attendees: 84, revenue: 95000 },
      { label: 'Oct 05', bookings: 160, attendees: 142, revenue: 160000 },
      { label: 'Oct 09', bookings: 248, attendees: 218, revenue: 248000 }
    ];
    return { points, maxVal: 280 };
  }

  // Upcoming Events (Published & Approved)
  upcomingEvents = computed(() => {
    return this.events().filter(
      e => e.status === 'published' || e.status === 'approved'
    );
  });

  // Switch Prototype Display State
  setPrototypeState(state: DashboardPrototypeState) {
    this.prototypeState.set(state);

    if (state === 'empty_events') {
      this.events.set([]);
      this.pendingActions.set([]);
    } else if (state === 'no_upcoming') {
      this.events.set(this.defaultEvents.filter(e => e.status === 'draft' || e.status === 'pending_review'));
    } else if (state === 'no_pending_actions') {
      this.events.set(this.defaultEvents);
      this.pendingActions.set([]);
    } else {
      this.events.set(this.defaultEvents);
      this.pendingActions.set(this.defaultPendingActions);
    }
  }

  // Action Handlers
  submitEventForReview(eventId: string) {
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

  inviteTeamMember(name: string, email: string, role: any) {
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
