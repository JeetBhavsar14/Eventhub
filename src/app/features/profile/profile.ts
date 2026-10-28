import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';
import { ProfileFormComponent } from '@shared/forms';
import { AuthService } from '@core/auth';
import { HostApplicationService, ToastService } from '@core/state';
import { ApiClient } from '@core/api';
import { UserProfileUpdate, Booking, GiftCardPurchase } from '@core/models';
import { IconComponent, PaginationBarComponent } from '@shared/components';

export type ProfileTab = 'dashboard' | 'bookings' | 'personal' | 'payments' | 'roles';

export interface RoleWorkspaceTask {
  title: string;
  route: string;
  queryParams?: Record<string, any>;
  icon: string;
  description: string;
  badge?: string;
  actionText: string;
}

export interface RolePermissionItem {
  name: string;
  description: string;
  granted: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ProfileFormComponent, IconComponent, PaginationBarComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  activeTab = signal<ProfileTab>('dashboard');
  
  private authService = inject(AuthService);
  private hostAppService = inject(HostApplicationService);
  private apiClient = inject(ApiClient);
  private toastService = inject(ToastService);

  readonly currentUser = this.authService.currentUser;
  readonly hostStatus = this.hostAppService.status;
  readonly applicationData = this.hostAppService.applicationData;

  // Role Computeds
  readonly userRole = computed(() => this.currentUser()?.platformRole || 'user');

  readonly isApprovedHost = computed(() => {
    return this.hostStatus() === 'approved' || this.currentUser()?.isHost === true || this.userRole() === 'host';
  });

  readonly isHostApplied = computed(() => {
    return this.hostStatus() !== 'guest' && this.hostStatus() !== 'not_applied';
  });

  readonly isStaffUser = computed(() => {
    const role = this.userRole();
    return role === 'staff' || role === 'management' || role === 'admin' || role === 'super_admin';
  });

  readonly isStaffOnly = computed(() => this.userRole() === 'staff');
  readonly isManagementUser = computed(() => this.userRole() === 'management' || this.userRole() === 'admin' || this.userRole() === 'super_admin');
  readonly isAdminUser = computed(() => this.userRole() === 'admin' || this.userRole() === 'super_admin');

  // Role Display Meta
  readonly roleTitle = computed(() => {
    const role = this.userRole();
    if (role === 'admin' || role === 'super_admin') return 'Platform Administrator';
    if (role === 'management') return 'Operations Manager';
    if (role === 'staff') return 'Field Staff & Scanner';
    if (this.isApprovedHost()) return 'Verified Event Host';
    return 'Verified Attendee';
  });

  readonly roleBadgeClass = computed(() => {
    const role = this.userRole();
    if (role === 'admin' || role === 'super_admin') return 'role-pill--admin';
    if (role === 'management') return 'role-pill--management';
    if (role === 'staff') return 'role-pill--staff';
    if (this.isApprovedHost()) return 'role-pill--host';
    return 'role-pill--user';
  });

  readonly roleBadgeIcon = computed(() => {
    const role = this.userRole();
    if (role === 'admin' || role === 'super_admin') return 'shield';
    if (role === 'management') return 'layers';
    if (role === 'staff') return 'user-check';
    if (this.isApprovedHost()) return 'shield-check';
    return 'check-circle';
  });

  readonly roleDescription = computed(() => {
    const role = this.userRole();
    if (role === 'admin' || role === 'super_admin') {
      return 'You have master administrative authority across EventHub, including global platform configuration, host accreditations, and user security governance.';
    }
    if (role === 'management') {
      return 'You manage live multi-event operations, supervise turnstile check-in staff, review host applications, and resolve venue entrance escalations.';
    }
    if (role === 'staff') {
      return 'You are authorized as venue gate staff with high-speed QR ticket scanning, turnstile pass validation, and attendee admission verification.';
    }
    if (this.isApprovedHost()) {
      return 'You are an accredited EventHub Host with full capabilities to create events, configure ticket tiers, monitor revenue, and dispatch staff teams.';
    }
    return 'You have an active attendee account with instant ticket bookings, live digital QR passes, and eligibility to apply for organizer hosting privileges.';
  });

  // Dynamic Workspace Tasks
  readonly roleWorkspaces = computed<RoleWorkspaceTask[]>(() => {
    const role = this.userRole();

    if (role === 'admin' || role === 'super_admin') {
      return [
        {
          title: 'Admin Control Center',
          route: '/admin',
          icon: 'shield',
          description: 'Global system governance, real-time analytics, and platform-wide monitoring',
          actionText: 'Launch Admin Console'
        },
        {
          title: 'Host Applications Queue',
          route: '/admin/applications',
          icon: 'file-text',
          description: 'Review and accredit organizer host applications with full vetting audit',
          actionText: 'Review Applications'
        },
        {
          title: 'User & Role Governance',
          route: '/admin/users',
          icon: 'users',
          description: 'Audit attendee and host accounts, manage platform privileges and roles',
          actionText: 'Manage Users'
        }
      ];
    }

    if (role === 'management') {
      return [
        {
          title: 'Operations Center',
          route: '/management',
          icon: 'layers',
          description: 'Supervise live venue check-ins, staff teams, and active gate flows',
          actionText: 'Open Operations Hub'
        },
        {
          title: 'Host Approvals Queue',
          route: '/management/approvals',
          icon: 'shield-check',
          description: 'Vet and approve incoming event organizer applications',
          actionText: 'Review Approvals'
        },
        {
          title: 'Turnstile Gate Monitoring',
          route: '/management/operations',
          icon: 'activity',
          description: 'Real-time gate traffic, pass scans, and emergency overrides',
          actionText: 'View Gate Flow'
        }
      ];
    }

    if (role === 'staff') {
      return [
        {
          title: 'Live QR Turnstile Scanner',
          route: '/staff/scanner',
          icon: 'qr-code',
          description: 'High-speed camera scanner for gate admission and rapid pass validation',
          actionText: 'Open QR Scanner'
        },
        {
          title: "Today's Assigned Shifts",
          route: '/staff/today',
          icon: 'calendar',
          description: 'View your active event stations, shift timings, and venue details',
          actionText: 'View Schedule'
        },
        {
          title: 'Attendee Roster Search',
          route: '/staff/checkin',
          icon: 'user-check',
          description: 'Manual check-in lookup by name, booking reference, or phone number',
          actionText: 'Check-in Roster'
        }
      ];
    }

    if (this.isApprovedHost()) {
      return [
        {
          title: 'Host Organizer Dashboard',
          route: '/host/dashboard',
          icon: 'grid',
          description: 'Manage published events, sales metrics, and real-time revenue breakdowns',
          actionText: 'Open Host Workspace'
        },
        {
          title: 'Event Team Dispatch',
          route: '/host/dashboard',
          queryParams: { view: 'team' },
          icon: 'users',
          description: 'Dispatch event staff, assign gate scanners, and view attendee lists',
          actionText: 'Manage Teams'
        }
      ];
    }

    // Default Attendee Workspaces
    return [
      {
        title: 'Explore Verified Events',
        route: '/discover',
        icon: 'compass',
        description: 'Discover concerts, festivals, comedy shows, and sports in your city',
        actionText: 'Browse Catalog'
      },
      {
        title: 'Gift Card Wallet',
        route: '/my-gift-cards',
        icon: 'gift',
        description: 'Send and redeem digital event vouchers with zero transaction fees',
        actionText: 'Manage Wallet'
      },
      {
        title: 'Apply for Host Accreditation',
        route: '/host/apply',
        icon: 'star',
        description: 'Organize and monetize your own live events on EventHub platform',
        actionText: 'Become a Host'
      }
    ];
  });

  // Dynamic Permissions List
  readonly rolePermissions = computed<RolePermissionItem[]>(() => {
    const role = this.userRole();

    if (role === 'admin' || role === 'super_admin') {
      return [
        { name: 'Master System Governance', description: 'Full root access across all platform configurations and features', granted: true },
        { name: 'Host Accreditation Authority', description: 'Review, approve, and reject incoming organizer host requests', granted: true },
        { name: 'Role & Access Control', description: 'Assign staff, manager, host, and admin platform roles', granted: true },
        { name: 'Financial & Payout Oversight', description: 'Monitor all transactions, refunds, settlements, and organizer earnings', granted: true },
        { name: 'Security Audit & Overrides', description: 'Full access to system audit logs and emergency turnstile overrides', granted: true },
      ];
    }

    if (role === 'management') {
      return [
        { name: 'Multi-Event Venue Control', description: 'Oversee active events and venue operations in real time', granted: true },
        { name: 'Host Application Review', description: 'Vet organizer documentation and preliminary application review', granted: true },
        { name: 'Staff Team Allocation', description: 'Assign field staff and scanner operators to venue turnstile gates', granted: true },
        { name: 'Turnstile Traffic Oversight', description: 'Monitor gate inflow and entry bottlenecks live', granted: true },
        { name: 'Emergency Admission Overrides', description: 'Authorize manual check-in for ticket disputes', granted: true },
      ];
    }

    if (role === 'staff') {
      return [
        { name: 'High-Speed QR Scanner Access', description: 'Live optical camera scanning for verified QR tickets', granted: true },
        { name: 'Gate Turnstile Pass Validation', description: 'Mark tickets as admitted and prevent duplicate re-entry', granted: true },
        { name: 'Attendee Roster Lookup', description: 'Search guests by booking reference, name, or phone number', granted: true },
        { name: 'Station Check-In Reporting', description: 'View real-time tally of scanned passes during shift', granted: true },
      ];
    }

    if (this.isApprovedHost()) {
      return [
        { name: 'Event Creation & Publishing', description: 'Create and launch concerts, festivals, conferences, and shows', granted: true },
        { name: 'Tiered Ticketing & Pricing', description: 'Set VIP, General Admission, and Early-bird tiers with custom quotas', granted: true },
        { name: 'Real-Time Sales & Revenue Analytics', description: 'View earnings breakdown, ticket volume, and payout status', granted: true },
        { name: 'Team Dispatch & Staff Invitations', description: 'Invite co-owners, event managers, and gate scanner staff', granted: true },
        { name: 'Attendee List Export', description: 'Download CSV roster of verified ticket holders', granted: true },
      ];
    }

    return [
      { name: 'Event Ticket Reservations', description: 'Book verified QR admissions with zero hidden convenience fees', granted: true },
      { name: 'Live Digital QR Entry Passes', description: 'Access scan-ready mobile passes with offline fallback', granted: true },
      { name: 'Digital Passes & Admissions', description: 'Store, view, and print live QR turnstile admission passes', granted: true },
      { name: 'Digital Gift Cards Wallet', description: 'Store and redeem prepaid gift cards at checkout', granted: true },
      { name: 'Host Accreditation Application', description: 'Eligible to apply to organize and host events on EventHub', granted: true },
    ];
  });

  // Bookings Data
  readonly bookings = signal<Booking[]>([]);
  readonly isLoadingBookings = signal(false);

  // Pagination for Bookings
  readonly bookingPage = signal(1);
  readonly bookingPageSize = signal(4);

  readonly totalBookingPages = computed(() => {
    return Math.max(1, Math.ceil(this.bookings().length / this.bookingPageSize()));
  });

  readonly paginatedBookings = computed(() => {
    const list = this.bookings();
    const size = this.bookingPageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(this.bookingPage(), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  readonly bookingStartItem = computed(() => {
    const total = this.bookings().length;
    if (total === 0) return 0;
    const size = this.bookingPageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.bookingPage(), maxPage);
    return (page - 1) * size + 1;
  });

  readonly bookingEndItem = computed(() => {
    const total = this.bookings().length;
    const size = this.bookingPageSize();
    const maxPage = Math.max(1, Math.ceil(total / size));
    const page = Math.min(this.bookingPage(), maxPage);
    return Math.min(page * size, total);
  });

  setBookingPage(page: number) {
    if (page >= 1 && page <= this.totalBookingPages()) {
      this.bookingPage.set(page);
    }
  }

  // Gift Cards Data (Dynamic wallet balance)
  readonly giftCards = signal<GiftCardPurchase[]>([]);
  readonly isLoadingGiftCards = signal(false);

  readonly activeGiftCards = computed(() => {
    return this.giftCards().filter(c => c.status === 'active');
  });

  readonly totalGiftBalance = computed(() => {
    return this.activeGiftCards().reduce((sum, c) => sum + (c.balance ?? c.amount ?? 0), 0);
  });

  readonly totalSpent = computed(() => {
    return this.bookings().reduce((sum, b) => b.status === 'confirmed' ? sum + (b.totalAmount || 0) : sum, 0);
  });

  // QR Modal State
  readonly selectedBookingForQr = signal<Booking | null>(null);
  readonly qrModalUrl = signal<string>('');

  // Upcoming Bookings Filter
  readonly upcomingBookings = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.bookings().filter(b => b.status === 'confirmed' && b.eventDate >= today);
  });

  // Past Bookings Filter
  readonly pastBookings = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.bookings().filter(b => b.eventDate < today || b.status !== 'confirmed');
  });

  // Total Active Tickets Count
  readonly activeTicketsCount = computed(() => {
    return this.upcomingBookings().reduce((sum, b) => {
      const ticketsInBooking = b.tickets.reduce((cnt, t) => cnt + t.quantity, 0);
      return sum + ticketsInBooking;
    }, 0);
  });

  // Nearest Upcoming Spotlight Booking
  readonly nextUpcomingBooking = computed(() => {
    const upcoming = this.upcomingBookings();
    if (upcoming.length === 0) return null;
    return [...upcoming].sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0];
  });

  readonly isSaving = signal(false);
  readonly saveMessage = signal('');
  readonly saveError = signal(false);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadUserBookings(),
      this.loadUserGiftCards()
    ]);
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async loadUserBookings(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    this.isLoadingBookings.set(true);

    try {
      const res = await this.apiClient.get<Booking[]>('/bookings', { userId: user.id });
      if (res.data) {
        this.bookings.set([...res.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
    } catch (e) {
      console.error('Failed to load bookings', e);
    } finally {
      this.isLoadingBookings.set(false);
    }
  }

  async loadUserGiftCards(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    this.isLoadingGiftCards.set(true);

    try {
      const res = await this.apiClient.get<GiftCardPurchase[]>('/giftCardPurchases', { userId: user.id });
      if (res.data) {
        this.giftCards.set([...res.data].sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || '')));
      }
    } catch (e) {
      console.error('Failed to load gift cards', e);
    } finally {
      this.isLoadingGiftCards.set(false);
    }
  }

  // Open Quick QR Pass Modal
  async openQrPass(booking: Booking): Promise<void> {
    this.selectedBookingForQr.set(booking);
    const code = booking.bookingReference || booking.id;
    try {
      const url = await QRCode.toDataURL(code, { width: 220, margin: 1 });
      this.qrModalUrl.set(url);
    } catch {
      this.qrModalUrl.set('');
    }
  }

  closeQrPass(): void {
    this.selectedBookingForQr.set(null);
    this.qrModalUrl.set('');
  }

  getBookingTicketsCount(booking: Booking): number {
    return booking.tickets.reduce((acc, t) => acc + t.quantity, 0);
  }

  async saveProfile(changes: UserProfileUpdate): Promise<void> {
    this.isSaving.set(true);
    this.saveMessage.set('');
    const result = await this.authService.updateProfile(changes);
    this.saveError.set(!result.success);
    this.saveMessage.set(result.message);
    if (result.success) {
      this.toastService.success('Profile updated successfully');
    } else {
      this.toastService.error(result.message || 'Failed to update profile');
    }
    this.isSaving.set(false);
  }

  printTicket(): void {
    window.print();
  }
}
