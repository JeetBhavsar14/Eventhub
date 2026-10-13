import { Component, signal, computed, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth';
import { HostApplicationService, AdminService, AdminHostApplication, AdminCurationEvent, AdminUser } from '@core/state';
import { SelectComponent, SelectOption } from '@shared/components';

export type AdminView = 'overview' | 'host_applications' | 'event_curation' | 'users' | 'revenue' | 'system' | 'finance' | 'settings';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SelectComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly hostAppService = inject(HostApplicationService);
  readonly adminService = inject(AdminService);

  // Layout Navigation State
  activeNav = signal<AdminView>('overview');
  currentView = this.activeNav;
  isSidebarCollapsed = signal(false);
  isMobileNavOpen = signal(false);
  showUserMenu = signal(false);
  showAdminMenu = signal(false);
  showNotifications = signal(false);
  toastMessage = signal<string | null>(null);

  // Filter States
  hostFilter = signal<'all' | 'under_review' | 'approved' | 'rejected' | 'changes_requested' | 'submitted'>('all');
  eventFilter = signal<'all' | 'pending_review' | 'changes_requested' | 'approved'>('all');
  userRoleFilter = signal<string>('all');
  userFilter = signal<string>('all');
  userSearch = signal('');
  searchQuery = signal('');

  // Modals State
  selectedAppForModal = signal<AdminHostApplication | null>(null);
  selectedEventForModal = signal<AdminCurationEvent | null>(null);
  feedbackText = signal('');
  showBroadcastModal = signal(false);
  broadcastMessage = signal({ title: '', body: '', audience: 'all' });

  // Expose signals from AdminService
  readonly hostApplications = this.adminService.hostApplications;
  readonly curationEvents = this.adminService.curationEvents;
  readonly users = this.adminService.users;

  // Computed Platform Metrics
  platformStats = computed(() => {
    const apps = this.hostApplications();
    const curEvents = this.curationEvents();
    const usersList = this.users();

    const pendingApps = apps.filter(a => a.status === 'under_review' || a.status === 'changes_requested').length;
    const pendingEvents = curEvents.filter(e => e.status === 'pending_review').length;
    const verifiedHosts = usersList.filter(u => u.role === 'host' || u.role === 'admin').length;

    return {
      totalGMV: '₹28,45,200',
      platformCommission: '₹2,27,616',
      totalUsers: usersList.length || 1420,
      activeUsers: usersList.length || 1420,
      verifiedHosts,
      pendingAppsCount: pendingApps,
      pendingEventsCount: pendingEvents,
      actionRequiredEvents: curEvents.filter(e => e.status === 'changes_requested').length,
      systemUptime: '99.98%'
    };
  });

  toggleMobileNav() {
    this.isMobileNavOpen.update(v => !v);
  }

  openBroadcastModal() {
    this.showBroadcastModal.set(true);
  }

  setView(view: AdminView) {
    this.setNav(view);
  }

  // Filtered Applications
  filteredHostApplications = computed(() => {
    const list = this.hostApplications();
    const f = this.hostFilter();
    const q = this.searchQuery().toLowerCase().trim();

    return list.filter(item => {
      const matchFilter = f === 'all' || item.status === f;
      const matchQuery =
        !q ||
        item.applicantName?.toLowerCase().includes(q) ||
        item.organizationName?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  });

  // Filtered Curation Events
  filteredCurationEvents = computed(() => {
    const list = this.curationEvents();
    const f = this.eventFilter();
    const q = this.searchQuery().toLowerCase().trim();

    return list.filter(item => {
      const matchFilter = f === 'all' || item.status === f;
      const matchQuery =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.hostName?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  });

  // Filtered Users
  filteredUsers = computed(() => {
    const list = this.users();
    const f = this.userFilter() !== 'all' ? this.userFilter() : this.userRoleFilter();
    const q = this.userSearch().toLowerCase().trim();

    return list.filter(item => {
      const matchRole = f === 'all' || item.role === f;
      const matchQuery =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  });

  async toggleUserRole(u: AdminUser) {
    const nextRole: AdminUser['role'] = u.role === 'host' ? 'user' : 'host';
    await this.adminService.changeUserRole(u.id, nextRole);
    this.showToast(`Changed ${u.name}'s role to ${nextRole.toUpperCase()}`);
  }

  async toggleUserSuspension(u: AdminUser) {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    this.adminService.users.update(list =>
      list.map(user => user.id === u.id ? { ...user, status: nextStatus } : user)
    );
    this.showToast(`User ${u.name} is now ${nextStatus}`);
  }

  ngOnInit() {
    this.adminService.loadAll();
  }

  // Navigation
  setNav(view: AdminView) {
    this.activeNav.set(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Host Application Actions
  openAppDetailsModal(app: AdminHostApplication) {
    this.selectedAppForModal.set(app);
  }

  async approveHostApplication(appId: string) {
    const success = await this.adminService.approveHostApplication(appId);
    if (success) {
      this.hostAppService.setPrototypeState('approved');
      this.selectedAppForModal.set(null);
      this.showToast('Host application verified and approved! Host privileges granted.');
    }
  }

  async rejectHostApplication(appId: string) {
    const success = await this.adminService.rejectHostApplication(appId);
    if (success) {
      this.selectedAppForModal.set(null);
      this.showToast('Host application rejected.');
    }
  }

  async requestMoreHostInfo(appId: string) {
    const success = await this.adminService.requestMoreHostInfo(appId);
    if (success) {
      this.selectedAppForModal.set(null);
      this.showToast('Clarification request notification dispatched to applicant.');
    }
  }

  // Event Curation Actions
  openEventCurationModal(event: AdminCurationEvent) {
    this.selectedEventForModal.set(event);
    this.feedbackText.set('');
  }

  async approveEventForLive(eventId: string) {
    const success = await this.adminService.approveEvent(eventId);
    if (success) {
      this.selectedEventForModal.set(null);
      this.showToast('Event approved for live discovery listing.');
    }
  }

  async sendEventFeedback(eventId: string) {
    const note = this.feedbackText().trim() || 'Please provide updated permit documentation.';
    const success = await this.adminService.sendEventFeedback(eventId, note);
    if (success) {
      this.selectedEventForModal.set(null);
      this.showToast('Modifications requested sent to host.');
    }
  }

  // User Role Management
  async changeUserRole(userId: string, newRole: any) {
    await this.adminService.changeUserRole(userId, newRole);
    this.showToast(`Updated user role to ${String(newRole).toUpperCase()}.`);
  }

  // Broadcast Announcement
  async sendBroadcast() {
    const msg = this.broadcastMessage();
    if (msg.title && msg.body) {
      await this.adminService.sendBroadcast(msg.title, msg.body);
      this.showBroadcastModal.set(false);
      this.showToast(`Platform broadcast "${msg.title}" dispatched.`);
    }
  }

  // Toast System
  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrap') && !target.closest('.notif-menu-wrap')) {
      this.showUserMenu.set(false);
      this.showNotifications.set(false);
    }
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
