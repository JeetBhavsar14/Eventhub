import { Component, Input, inject, computed, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
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
  icon?: string;
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
  private route = inject(ActivatedRoute);
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

  othersIcon: SafeHtml = this.svg(SVGS.others);

  primaryCategories: NavCategory[] = [
    { label: 'All', icon: this.svg(SVGS.events), route: '/discover' },
    { label: 'Concerts', icon: this.svg(SVGS.concerts), route: '/discover?category=Concerts' },
    { label: 'Sports', icon: this.svg(SVGS.sports), route: '/discover?category=Sports' },
    { label: 'Conferences', icon: this.svg(SVGS.conferences), route: '/discover?category=Conferences' },
    { label: 'Workshops', icon: this.svg(SVGS.workshops), route: '/discover?category=Workshops' },
    { label: 'Festivals', icon: this.svg(SVGS.festivals), route: '/discover?category=Festivals' },
  ];

  otherCategories: NavCategory[] = [
    { label: 'Shows & Entertainment', icon: this.svg(SVGS.shows), route: '/discover?category=Shows%20%26%20Entertainment' },
    { label: 'Activities', icon: this.svg(SVGS.activities), route: '/discover?category=Activities' },
    { label: 'Technology', icon: this.svg(SVGS.technology), route: '/discover?category=Technology' },
    { label: 'Arts & Culture', icon: this.svg(SVGS.arts), route: '/discover?category=Arts%20%26%20Culture' },
    { label: 'Food & Lifestyle', icon: this.svg(SVGS.food), route: '/discover?category=Food%20%26%20Lifestyle' },
    { label: 'Comedy & Theater', icon: this.svg(SVGS.comedy), route: '/discover?category=Comedy%20%26%20Theater' },
    { label: 'Health & Wellness', icon: this.svg(SVGS.wellness), route: '/discover?category=Health%20%26%20Wellness' },
    { label: 'Parties & Nightlife', icon: this.svg(SVGS.parties), route: '/discover?category=Parties%20%26%20Nightlife' },
  ];

  @Input() categories: NavCategory[] = [
    ...this.primaryCategories,
    ...this.otherCategories
  ];

  @Input() secondaryLinks: NavSecondaryLink[] = [
    { label: 'Host an Event', route: '/host/apply' },
    { label: 'Offers',        route: '/offers' },
    { label: 'Gift Cards',    route: '/gift-cards' },
    { label: 'Corporates',    route: '/corporate' },
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
  searchQuery      = signal<string>('');
  searchFocused    = signal(false);
  allEvents        = signal<any[]>([]);
  recentSearches   = signal<string[]>(['Festivals', 'Concerts', 'Mumbai', 'Comedy', 'Workshop']);

  readonly spotlightEvents = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
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
    ).slice(0, 6);
  });

  isApprovedHost = computed(() => {
    const role = this.currentUser()?.platformRole;
    return this.hostStatus() === 'approved' || this.currentUser()?.isHost === true || role === 'host' || role === 'management' || role === 'admin';
  });

  isAdmin = computed(() => {
    const role = this.currentUser()?.platformRole;
    return role === 'admin' || role === 'super_admin';
  });

  homeRoute = computed(() => {
    // Admin and unauthenticated guests go to the Landing page ('/')
    // Other authenticated users go to the Discover events page ('/discover')
    if (!this.isAuthenticated() || this.isAdmin()) {
      return '/';
    }
    return '/discover';
  });

  isHomeSelected = computed(() => {
    const url = this.currentUrl() || this.router.url;
    const [path] = url.split('?');
    if (path === '/') return true;
    if (this.isAuthenticated() && path === '/discover') return true;
    return false;
  });

  isManagement = computed(() => {
    const role = this.currentUser()?.platformRole;
    return role === 'management' || role === 'admin' || role === 'super_admin';
  });

  isStaff = computed(() => {
    const role = this.currentUser()?.platformRole;
    return role === 'staff' || role === 'management' || role === 'admin' || role === 'super_admin';
  });

  currentUrl = signal<string>(this.router.url);
  isScrolled = signal(false);
  showUserMenu = false;
  showCityMenu = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollY = typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0;
    this.isScrolled.set(scrollY > 10);
  }
  showCategoryMenu = signal(false);
  showOthersDropdown = signal(false);
  selectedCategory = signal<string>('Categories');
  activeCategory = signal<string>('');
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

  isCategoryActive(label: string): boolean {
    const url = this.currentUrl() || this.router.url;
    const [path, query] = url.split('?');
    const isDiscover = path === '/discover';
    if (!isDiscover) return false;

    const params = new URLSearchParams(query || '');
    const active = params.get('category');
    if (!active) return false;

    return active.toLowerCase() === label.toLowerCase();
  }

  isOtherCategoryActive(): boolean {
    const url = this.currentUrl() || this.router.url;
    const [path, query] = url.split('?');
    if (path !== '/discover') return false;

    const params = new URLSearchParams(query || '');
    const active = params.get('category');
    if (!active || active.toLowerCase() === 'all') return false;
    return this.otherCategories.some(cat => cat.label.toLowerCase() === active.toLowerCase());
  }

  getActiveOtherCategoryLabel(): string {
    const url = this.currentUrl() || this.router.url;
    const [, query] = url.split('?');
    const params = new URLSearchParams(query || '');
    const active = params.get('category');
    if (!active) return 'Others';
    const matched = this.otherCategories.find(cat => cat.label.toLowerCase() === active.toLowerCase());
    return matched ? matched.label : 'Others';
  }

  toggleOthersDropdown(event?: Event) {
    if (event) event.stopPropagation();
    this.showOthersDropdown.update(v => !v);
    if (this.showOthersDropdown()) {
      this.showUserMenu = false;
      this.showCityMenu = false;
      this.showNotifications.set(false);
      this.showCategoryMenu.set(false);
    }
  }

  toggleCategoryMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.showCategoryMenu.update(v => !v);
    if (this.showCategoryMenu()) {
      this.showUserMenu = false;
      this.showCityMenu = false;
      this.showNotifications.set(false);
      this.showOthersDropdown.set(false);
    }
  }

  private prevNavPath = '';

  onCategoryPillClick(cat: NavCategory, event?: Event) {
    if (event) event.preventDefault();
    this.showOthersDropdown.set(false);
    this.showCategoryMenu.set(false);

    this.selectedCategory.set(cat.label);
    this.activeCategory.set(cat.label);
    const targetUrl = `/discover?category=${encodeURIComponent(cat.label)}`;
    this.currentUrl.set(targetUrl);
    this.router.navigate(['/discover'], { queryParams: { category: cat.label } }).then(() => {
      this.scrollToEvents();
    });
    this.scrollToEvents();
  }

  selectOtherCategory(cat: NavCategory, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showOthersDropdown.set(false);
    this.showCategoryMenu.set(false);
    this.selectedCategory.set(cat.label);
    this.activeCategory.set(cat.label);
    const targetUrl = `/discover?category=${encodeURIComponent(cat.label)}`;
    this.currentUrl.set(targetUrl);
    this.router.navigate(['/discover'], { queryParams: { category: cat.label } }).then(() => {
      this.scrollToEvents();
    });
    this.scrollToEvents();
  }

  selectCategory(cat: NavCategory, event?: Event) {
    if (event) event.stopPropagation();
    this.showCategoryMenu.set(false);
    this.showOthersDropdown.set(false);
    this.selectedCategory.set(cat.label);
    this.activeCategory.set(cat.label);
    const targetUrl = `/discover?category=${encodeURIComponent(cat.label)}`;
    this.currentUrl.set(targetUrl);
    this.router.navigate(['/discover'], { queryParams: { category: cat.label } }).then(() => {
      this.scrollToEvents();
    });
    this.scrollToEvents();
  }

  private updateCategoryFromUrl(url: string) {
    this.currentUrl.set(url);
    const [, query] = url.split('?');
    const params = new URLSearchParams(query || '');
    const cat = params.get('category') || '';
    this.activeCategory.set(cat);

    if (cat) {
      this.selectedCategory.set(cat);
    } else {
      this.selectedCategory.set('Categories');
    }

    if (params.has('search')) {
      this.searchQuery.set(params.get('search') || '');
    }
  }

  ngOnInit() {
    this.prevNavPath = (this.router.url || '').split('?')[0];
    this.updateCategoryFromUrl(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const fullUrl = event.urlAfterRedirects || event.url;
        const currentPath = fullUrl.split('?')[0];
        if (this.prevNavPath && this.prevNavPath !== currentPath) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
        this.prevNavPath = currentPath;
        this.updateCategoryFromUrl(fullUrl);
      }
    });

    this.loadEventsForSearch();
    this.route.queryParams.subscribe(params => {
      const cat = params['category'];
      if (cat !== undefined) {
        this.activeCategory.set(cat || '');
      }
      if (params['search'] !== undefined) {
        this.searchQuery.set(params['search'] || '');
      }
    });
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
    if (!target.closest('.user-avatar-wrap') && 
        !target.closest('.city-selector-wrap') && 
        !target.closest('.notification-wrap') && 
        !target.closest('.category-dropdown-wrap') &&
        !target.closest('.others-dropdown-wrap')) {
      this.showUserMenu = false;
      this.showCityMenu = false;
      this.showNotifications.set(false);
      this.showCategoryMenu.set(false);
      this.showOthersDropdown.set(false);
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
    this.showCategoryMenu.set(false);
    this.showOthersDropdown.set(false);
  }

  onSearchInputChange(val: string) {
    this.searchQuery.set(val || '');
    if (this.allEvents().length === 0) {
      this.loadEventsForSearch();
    }
  }

  onSearchFocus() {
    this.searchFocused.set(true);
    if (this.allEvents().length === 0) {
      this.loadEventsForSearch();
    }
  }

  onSearchSubmit(event?: Event) {
    if (event) event.preventDefault();
    const q = this.searchQuery().trim();
    if (!q) return;

    // Add to recent searches
    this.recentSearches.update(list => [q, ...list.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 5));

    this.searchFocused.set(false);
    this.router.navigate(['/discover'], { queryParams: { search: q } });
  }

  selectSearchItem(eventId: string) {
    this.searchFocused.set(false);
    this.router.navigate(['/events', eventId]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  selectRecentSearch(term: string) {
    this.searchQuery.set(term);
    this.onSearchSubmit();
  }

  clearSearch() {
    this.searchQuery.set('');
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
    const doScroll = () => {
      const el = document.getElementById('discover-events-section');
      if (el) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          const y = el.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        }
        return true;
      }
      return false;
    };

    if (!doScroll()) {
      setTimeout(doScroll, 80);
      setTimeout(doScroll, 200);
      setTimeout(doScroll, 400);
      setTimeout(doScroll, 700);
    } else {
      setTimeout(doScroll, 100);
    }
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
