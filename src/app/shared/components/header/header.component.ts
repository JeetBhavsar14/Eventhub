import { Component, Input, inject, computed, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '@core/auth';
import { ApiClient } from '@core/api';
import { LocationService, HostApplicationService, NotificationService, EventTeamService, ToastService } from '@core/state';
import { AppNotification } from '@core/models';
import { SVGS } from '@shared/assets';
import { IconComponent } from '../icon/icon.component';

export interface NavCategory {
  label: string;
  icon: SafeHtml;
  route: string;
  active?: boolean;
}

export interface NavSecondaryLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, IconComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private apiClient = inject(ApiClient);
  private sanitizer = inject(DomSanitizer);
  private locationService = inject(LocationService);
  private hostAppService = inject(HostApplicationService);
  private notificationService = inject(NotificationService);
  private eventTeamService = inject(EventTeamService);
  private toast = inject(ToastService);

  private svg(fullSvg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(fullSvg);
  }

  @Input() categories: NavCategory[] = [
    { label: 'Events', icon: this.svg(SVGS.events), route: '/discover' },
    { label: 'Concerts', icon: this.svg(SVGS.concerts), route: '/discover?category=Concerts' },
    { label: 'Sports', icon: this.svg(SVGS.sports), route: '/discover?category=Sports' },
    { label: 'Conferences', icon: this.svg(SVGS.conferences), route: '/discover?category=Conferences' },
    { label: 'Workshops', icon: this.svg(SVGS.workshops), route: '/discover?category=Workshops' },
    { label: 'Festivals', icon: this.svg(SVGS.festivals), route: '/discover?category=Festivals' },
    { label: 'Others', icon: this.svg(SVGS.others), route: '/discover?category=Others' },
  ];

  @Input() secondaryLinks: NavSecondaryLink[] = [
    { label: 'Host an Event', route: '/host/apply' },
    { label: 'Corporates',    route: '/corporate' },
    { label: 'Offers',        route: '/offers' },
    { label: 'Gift Cards',    route: '/gift-cards' },
  ];

  isAuthenticated = this.authService.isAuthenticated;
  currentUser     = this.authService.currentUser;
  selectedCity    = this.locationService.selectedCity;
  hostStatus      = this.hostAppService.status;

  // ── Notification State ─────────────────────────────────────
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount   = this.notificationService.unreadCount;
  showNotifications      = signal(false);
  notificationFilter     = signal<'all' | 'action_required' | 'activity' | 'unread'>('all');

  readonly actionRequiredNotifications = computed(() =>
    this.notifications().filter(n => n.type === 'invitation' && (!n.invitationStatus || n.invitationStatus === 'pending'))
  );

  readonly activityNotifications = computed(() =>
    this.notifications().filter(n => !(n.type === 'invitation' && (!n.invitationStatus || n.invitationStatus === 'pending')))
  );

  readonly filteredNotifications = computed(() => {
    const filter = this.notificationFilter();
    if (filter === 'action_required') {
      return this.actionRequiredNotifications();
    }
    if (filter === 'activity') {
      return this.activityNotifications();
    }
    if (filter === 'unread') {
      return this.notifications().filter(n => !n.read);
    }
    return this.notifications();
  });

  // ── Search & Spotlight State ───────────────────────────────
  searchQuery      = '';
  searchFocused    = signal(false);
  allEvents        = signal<any[]>([]);
  recentSearches   = signal<string[]>(['Festivals', 'Concerts', 'Mumbai', 'Comedy', 'Workshop']);

  readonly spotlightEvents = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();
    const events = this.allEvents();

    if (!query) {
      // Default: Return top 4 featured / popular events
      return events.filter(e => e.isFeatured || e.isPopular || e.status === 'published').slice(0, 4);
    }

    return events.filter(e =>
      (e.title && e.title.toLowerCase().includes(query)) ||
      (e.category && e.category.toLowerCase().includes(query)) ||
      (e.location?.venue && e.location.venue.toLowerCase().includes(query)) ||
      (e.location?.city && e.location.city.toLowerCase().includes(query)) ||
      (e.description && e.description.toLowerCase().includes(query))
    ).slice(0, 5);
  });

  isApprovedHost = computed(() => {
    const role = this.currentUser()?.platformRole;
    return this.hostStatus() === 'approved' || this.currentUser()?.isHost === true || role === 'host' || role === 'management' || role === 'admin';
  });

  isAdmin = computed(() => {
    const role = this.currentUser()?.platformRole;
    return role === 'admin' || role === 'super_admin';
  });

  isManagement = computed(() => {
    const role = this.currentUser()?.platformRole;
    return role === 'management' || role === 'admin' || role === 'super_admin';
  });

  isStaff = computed(() => {
    const role = this.currentUser()?.platformRole;
    return role === 'staff' || role === 'management' || role === 'admin' || role === 'super_admin';
  });

  showUserMenu = false;
  showCityMenu = false;
  citySearchQuery = '';

  popularCities = [
    'Mumbai', 'Ahmedabad', 'Delhi-NCR', 'Bengaluru', 'Pune', 
    'Hyderabad', 'Chennai', 'Kolkata', 'Chandigarh', 'Jaipur'
  ];
  
  get filteredCities(): string[] {
    if (!this.citySearchQuery.trim()) {
      return this.popularCities;
    }
    const lowerQuery = this.citySearchQuery.toLowerCase();
    return this.popularCities.filter(city => 
      city.toLowerCase().includes(lowerQuery)
    );
  }

  ngOnInit() {
    this.loadEventsForSearch();
  }

  async loadEventsForSearch() {
    try {
      const res = await this.apiClient.get<any[]>('/events');
      if (res.data) {
        this.allEvents.set(res.data);
      }
    } catch {
      // Fallback
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-avatar-wrap') && !target.closest('.city-selector-wrap') && !target.closest('.notification-wrap')) {
      this.showUserMenu = false;
      this.showCityMenu = false;
      this.showNotifications.set(false);
    }
    if (!target.closest('.search-container')) {
      this.searchFocused.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.searchFocused.set(false);
    this.showNotifications.set(false);
    this.showUserMenu = false;
    this.showCityMenu = false;
  }

  onSearchFocus() {
    this.searchFocused.set(true);
    if (this.allEvents().length === 0) {
      this.loadEventsForSearch();
    }
  }

  onSearchSubmit(event?: Event) {
    if (event) event.preventDefault();
    if (!this.searchQuery.trim()) return;

    // Add to recent searches
    const q = this.searchQuery.trim();
    this.recentSearches.update(list => [q, ...list.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 5));

    this.searchFocused.set(false);
    this.router.navigate(['/discover'], { queryParams: { search: q } });
  }

  selectSearchItem(eventId: string) {
    this.searchFocused.set(false);
    this.router.navigate(['/events', eventId]);
  }

  selectRecentSearch(term: string) {
    this.searchQuery = term;
    this.onSearchSubmit();
  }

  clearSearch() {
    this.searchQuery = '';
  }

  toggleUserMenu(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) {
      this.showCityMenu = false;
      this.showNotifications.set(false);
    }
  }

  toggleCityMenu(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.showCityMenu = !this.showCityMenu;
    if (this.showCityMenu) {
      this.showUserMenu = false;
      this.showNotifications.set(false);
    }
  }

  toggleNotifications(event: MouseEvent) {
    event.stopPropagation();
    const nextState = !this.showNotifications();
    this.showNotifications.set(nextState);
    if (nextState) {
      this.showUserMenu = false;
      this.showCityMenu = false;
      this.searchFocused.set(false);
      this.notificationService.loadNotifications();
    }
  }

  setNotificationFilter(filter: 'all' | 'action_required' | 'activity' | 'unread', event: MouseEvent) {
    event.stopPropagation();
    this.notificationFilter.set(filter);
  }

  async markAllNotificationsAsRead(event: MouseEvent) {
    event.stopPropagation();
    await this.notificationService.markAllAsRead();
    this.toast.info('All notifications marked as read', 'Notifications');
  }

  async onNotificationClick(notif: AppNotification) {
    if (!notif.read) {
      await this.notificationService.markAsRead(notif.id);
    }

    if (notif.action?.route) {
      this.showNotifications.set(false);
      this.router.navigate([notif.action.route], { queryParams: notif.action.queryParams });
    }
  }

  async acceptInvitation(notif: AppNotification, event: MouseEvent) {
    event.stopPropagation();
    const user = this.currentUser();
    if (!user) return;

    let inferredRole = notif.targetRole || (notif.metadata?.['role'] as string) || '';
    if (!inferredRole) {
      const text = (notif.title + ' ' + notif.message).toLowerCase();
      if (text.includes('co-owner') || text.includes('owner')) inferredRole = 'event_owner';
      else if (text.includes('manager')) inferredRole = 'event_manager';
      else if (text.includes('staff') || text.includes('scanner') || text.includes('turnstile')) inferredRole = 'staff';
    }

    const res = await this.eventTeamService.acceptInvitation(
      notif.invitationId || '',
      {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email
      },
      inferredRole,
      notif.eventId
    );

    await this.notificationService.updateInvitationStatus(notif.id, 'accepted');
    this.showNotifications.set(false);

    // Toast notification
    const roleLabel = inferredRole === 'event_owner' ? 'Co-Owner' : inferredRole === 'event_manager' ? 'Event Manager' : 'Field Staff';
    this.toast.success(`You have successfully joined as ${roleLabel}!`, 'Invitation Accepted 🎉');

    const destination = notif.targetRoute || res.targetRoute || (inferredRole === 'event_owner' ? '/host/dashboard' : '/staff');
    this.router.navigate([destination]);
  }

  async declineInvitation(notif: AppNotification, event: MouseEvent) {
    event.stopPropagation();
    if (notif.invitationId) {
      await this.eventTeamService.declineInvitation(notif.invitationId);
    }
    await this.notificationService.updateInvitationStatus(notif.id, 'declined');
    this.toast.warning('Invitation has been declined.', 'Notice');
  }

  goToWorkspace(notif: AppNotification, event: MouseEvent) {
    event.stopPropagation();
    this.showNotifications.set(false);
    let dest = notif.targetRoute;
    if (!dest) {
      const text = (notif.title + ' ' + notif.message).toLowerCase();
      if (text.includes('co-owner') || text.includes('owner')) dest = '/host/dashboard';
      else if (text.includes('manager')) dest = '/management';
      else if (text.includes('staff') || text.includes('scanner')) dest = '/staff';
      else dest = notif.eventId ? `/events/${notif.eventId}` : '/discover';
    }
    this.router.navigate([dest]);
  }

  async dismissNotification(notifId: string, event: MouseEvent) {
    event.stopPropagation();
    await this.notificationService.deleteNotification(notifId);
  }

  selectCity(city: string) {
    this.locationService.setCity(city);
    this.showCityMenu = false;
    this.citySearchQuery = '';
  }

  detectLocation() {
    this.selectCity('Ahmedabad');
  }

  logout() {
    this.showUserMenu = false;
    this.showNotifications.set(false);
    this.authService.logout();
    this.toast.info('You have logged out.', 'Account');
  }

  getInitials(): string {
    const user = this.currentUser();
    if (!user) return '?';
    return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  }

  scrollToEvents() {
    setTimeout(() => {
      const el = document.getElementById('discover-events-section');
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  }

  formatTimeAgo(isoString: string): string {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'booking': return 'ticket';
      case 'invitation': return 'mail';
      case 'event_status': return 'check-circle';
      case 'reminder': return 'calendar';
      case 'host_application': return 'shield';
      default: return 'bell';
    }
  }
}
