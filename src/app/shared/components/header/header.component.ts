import { Component, Input, inject, computed, signal, HostListener, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AuthService } from '@core/auth';
import { ApiClient } from '@core/api';
import { LocationService, HostApplicationService, NotificationService, EventTeamService, ToastService } from '@core/state';
import { AppNotification, EventItem } from '@core/models';
import { IconComponent } from '../icon/icon.component';
import {
  HeaderCitySelectorComponent,
  HeaderSearchComponent,
  HeaderNotificationsComponent,
  HeaderUserMenuComponent
} from './components';

export interface NavCategory {
  label: string;
  iconName: string;
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
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    HeaderCitySelectorComponent,
    HeaderSearchComponent,
    HeaderNotificationsComponent,
    HeaderUserMenuComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private apiClient = inject(ApiClient);
  private locationService = inject(LocationService);
  private hostAppService = inject(HostApplicationService);
  private notificationService = inject(NotificationService);
  private eventTeamService = inject(EventTeamService);
  private toast = inject(ToastService);

  primaryCategories: NavCategory[] = [
    { label: 'All', iconName: 'events', route: '/discover' },
    { label: 'Concerts', iconName: 'concerts', route: '/discover?category=Concerts' },
    { label: 'Sports', iconName: 'sports', route: '/discover?category=Sports' },
    { label: 'Conferences', iconName: 'conferences', route: '/discover?category=Conferences' },
    { label: 'Workshops', iconName: 'workshops', route: '/discover?category=Workshops' },
    { label: 'Festivals', iconName: 'festivals', route: '/discover?category=Festivals' },
  ];

  otherCategories: NavCategory[] = [
    { label: 'Shows & Entertainment', iconName: 'shows', route: '/discover?category=Shows%20%26%20Entertainment' },
    { label: 'Activities', iconName: 'activities', route: '/discover?category=Activities' },
    { label: 'Technology', iconName: 'technology', route: '/discover?category=Technology' },
    { label: 'Arts & Culture', iconName: 'arts', route: '/discover?category=Arts%20%26%20Culture' },
    { label: 'Food & Lifestyle', iconName: 'food', route: '/discover?category=Food%20%26%20Lifestyle' },
    { label: 'Comedy & Theater', iconName: 'comedy', route: '/discover?category=Comedy%20%26%20Theater' },
    { label: 'Health & Wellness', iconName: 'wellness', route: '/discover?category=Health%20%26%20Wellness' },
    { label: 'Parties & Nightlife', iconName: 'parties', route: '/discover?category=Parties%20%26%20Nightlife' },
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

  // Notification State
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount   = this.notificationService.unreadCount;
  showNotifications      = signal(false);

  // Search State
  allEvents = signal<EventItem[]>([]);
  searchFocused = signal(false);

  // Layout & Dropdowns
  showUserMenu = false;
  showCityMenu = false;
  showCategoryMenu = signal(false);
  showOthersDropdown = signal(false);
  selectedCategory = signal<string>('Categories');
  activeCategory = signal<string>('');
  currentUrl = signal<string>(this.router.url);
  isScrolled = signal(false);

  isApprovedHost = computed(() => {
    const role = this.currentUser()?.platformRole;
    return this.hostStatus() === 'approved' || this.currentUser()?.isHost === true || role === 'host' || role === 'management' || role === 'admin';
  });

  isAdmin = computed(() => {
    const role = this.currentUser()?.platformRole;
    return role === 'admin' || role === 'super_admin';
  });

  homeRoute = computed(() => {
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

  private prevNavPath = '';

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollY = typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0;
    this.isScrolled.set(scrollY > 10);
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
    });
  }

  async loadEventsForSearch() {
    try {
      const res = await this.apiClient.get<EventItem[]>('/events');
      if (res.data) {
        this.allEvents.set(res.data);
      }
    } catch {
      // Fallback
    }
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
  }

  // ── City Selector Handlers ──────────────────────────────────
  toggleCityMenu() {
    this.showCityMenu = !this.showCityMenu;
    if (this.showCityMenu) {
      this.showUserMenu = false;
      this.showNotifications.set(false);
    }
  }

  onCitySelected(city: string) {
    this.locationService.setCity(city);
    this.showCityMenu = false;
  }

  onDetectLocation() {
    this.onCitySelected('Ahmedabad');
  }

  // ── Search Handlers ─────────────────────────────────────────
  onSearchSubmitted(query: string) {
    this.searchFocused.set(false);
    this.router.navigate(['/discover'], { queryParams: { search: query } });
  }

  onEventSelected(eventId: string) {
    this.searchFocused.set(false);
    this.router.navigate(['/events', eventId]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSearchFocusChanged(focused: boolean) {
    this.searchFocused.set(focused);
    if (focused && this.allEvents().length === 0) {
      this.loadEventsForSearch();
    }
  }

  // ── Notification Handlers ───────────────────────────────────
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

  async acceptInvitation(data: { notification: AppNotification; event: MouseEvent }) {
    data.event.stopPropagation();
    const notif = data.notification;
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

    const roleLabel = inferredRole === 'event_owner' ? 'Co-Owner' : inferredRole === 'event_manager' ? 'Event Manager' : 'Field Staff';
    this.toast.success(`You have successfully joined as ${roleLabel}!`, 'Invitation Accepted 🎉');

    const destination = notif.targetRoute || res.targetRoute || (inferredRole === 'event_owner' ? '/host/dashboard' : '/staff');
    this.router.navigate([destination]);
  }

  async declineInvitation(data: { notification: AppNotification; event: MouseEvent }) {
    data.event.stopPropagation();
    const notif = data.notification;
    if (notif.invitationId) {
      await this.eventTeamService.declineInvitation(notif.invitationId);
    }
    await this.notificationService.updateInvitationStatus(notif.id, 'declined');
    this.toast.warning('Invitation has been declined.', 'Notice');
  }

  goToWorkspace(data: { notification: AppNotification; event: MouseEvent }) {
    data.event.stopPropagation();
    const notif = data.notification;
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

  async dismissNotification(data: { id: string; event: MouseEvent }) {
    data.event.stopPropagation();
    await this.notificationService.deleteNotification(data.id);
  }

  // ── User Menu Handlers ──────────────────────────────────────
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) {
      this.showCityMenu = false;
      this.showNotifications.set(false);
    }
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  logout() {
    this.showUserMenu = false;
    this.showNotifications.set(false);
    this.authService.logout();
    this.toast.info('You have logged out.', 'Account');
  }

  // ── Category Navigation ─────────────────────────────────────
  isCategoryActive(label: string): boolean {
    const url = this.currentUrl() || this.router.url;
    const [path, query] = url.split('?');
    if (path !== '/discover') return false;

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
}
