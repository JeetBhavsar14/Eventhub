import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth';
import { HostApplicationService, AdminService, AdminHostApplication, AdminCurationEvent, AdminUser, AdminSettlement, ToastService } from '@core/state';
import { IconComponent, ConfirmDialogComponent } from '@shared/components';
import {
  AdminSidebarComponent,
  AdminHeaderComponent,
  AdminOverviewComponent,
  AdminHostApplicationsComponent,
  AdminEventCurationComponent,
  AdminUsersComponent,
  AdminFinanceComponent,
  AdminSettingsComponent,
  AdminHostAppModalComponent,
  AdminEventCurationModalComponent,
  AdminBroadcastModalComponent,
  AdminUserDossierModalComponent
} from './components';

import { AdminView, PlatformStats } from './admin.models';
export * from './admin.models';

export interface AdminConfirmDialogData {
  title: string;
  message: string;
  actionBtnText: string;
  isDestructive: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    ConfirmDialogComponent,
    AdminSidebarComponent,
    AdminHeaderComponent,
    AdminOverviewComponent,
    AdminHostApplicationsComponent,
    AdminEventCurationComponent,
    AdminUsersComponent,
    AdminFinanceComponent,
    AdminSettingsComponent,
    AdminHostAppModalComponent,
    AdminEventCurationModalComponent,
    AdminBroadcastModalComponent,
    AdminUserDossierModalComponent
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css', './admin-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly hostAppService = inject(HostApplicationService);
  readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  // Layout Navigation State
  activeNav = signal<AdminView>('overview');
  currentView = this.activeNav;
  isSidebarCollapsed = signal(false);
  isMobileNavOpen = signal(false);
  toastMessage = signal<string | null>(null);

  // Modals & Drawers State
  selectedAppForModal = signal<AdminHostApplication | null>(null);
  selectedEventForModal = signal<AdminCurationEvent | null>(null);
  selectedUserForDossier = signal<AdminUser | null>(null);
  showBroadcastModal = signal(false);

  // Confirmation Dialog System
  showConfirmationDialog = signal(false);
  confirmDialogData: AdminConfirmDialogData = {
    title: '',
    message: '',
    actionBtnText: 'Confirm',
    isDestructive: false
  };
  pendingConfirmAction: (() => Promise<void> | void) | null = null;

  // Expose signals from AdminService
  readonly hostApplications = this.adminService.hostApplications;
  readonly curationEvents = this.adminService.curationEvents;
  readonly users = this.adminService.users;
  readonly settlements = this.adminService.settlements;
  readonly financialMetrics = this.adminService.financialMetrics;

  // Computed Platform Metrics
  platformStats = computed<PlatformStats>(() => {
    const apps = this.hostApplications();
    const curEvents = this.curationEvents();
    const usersList = this.users();
    const fin = this.financialMetrics();

    const pendingApps = apps.filter(a => a.status === 'under_review' || a.status === 'changes_requested').length;
    const pendingEvents = curEvents.filter(e => e.status === 'pending_review').length;
    const verifiedHosts = usersList.filter(u => u.role === 'host' || u.role === 'admin').length;

    return {
      totalGMV: '₹' + fin.totalGMV.toLocaleString('en-IN'),
      platformCommission: '₹' + fin.totalPlatformCommission.toLocaleString('en-IN'),
      pendingPayouts: '₹' + fin.pendingPayouts.toLocaleString('en-IN'),
      settledPayouts: '₹' + fin.settledPayouts.toLocaleString('en-IN'),
      totalUsers: usersList.length,
      activeUsers: usersList.filter(u => u.status === 'active').length,
      verifiedHosts,
      pendingAppsCount: pendingApps,
      pendingEventsCount: pendingEvents,
      actionRequiredEvents: curEvents.filter(e => e.status === 'changes_requested').length,
      systemUptime: '99.98%'
    };
  });

  ngOnInit() {
    this.adminService.loadAll();
  }

  toggleMobileNav() {
    this.isMobileNavOpen.update(v => !v);
  }

  openBroadcastModal() {
    this.showBroadcastModal.set(true);
  }

  closeBroadcastModal() {
    this.showBroadcastModal.set(false);
  }

  // Navigation
  setView(view: AdminView) {
    this.setNav(view);
  }

  setNav(view: AdminView) {
    this.activeNav.set(view);
    this.isMobileNavOpen.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Confirmation Modal Engine
  triggerConfirm(title: string, message: string, actionBtnText: string, isDestructive: boolean, action: () => Promise<void> | void) {
    this.confirmDialogData = { title, message, actionBtnText, isDestructive };
    this.pendingConfirmAction = action;
    this.showConfirmationDialog.set(true);
  }

  async executeConfirmAction() {
    if (this.pendingConfirmAction) {
      await this.pendingConfirmAction();
      this.pendingConfirmAction = null;
    }
    this.showConfirmationDialog.set(false);
  }

  cancelConfirm() {
    this.pendingConfirmAction = null;
    this.showConfirmationDialog.set(false);
  }

  // User Management Actions
  openUserDossier(u: AdminUser) {
    this.selectedUserForDossier.set(u);
  }

  closeUserDossier() {
    this.selectedUserForDossier.set(null);
  }

  promptChangeUserRole(u: AdminUser, newRole: AdminUser['role']) {
    this.triggerConfirm(
      `Change Role to ${newRole.toUpperCase()}?`,
      `Are you sure you want to change ${u.name}'s platform role to "${newRole.toUpperCase()}"? This immediately updates database credentials and permission layouts.`,
      `Update to ${newRole.toUpperCase()}`,
      false,
      async () => {
        await this.adminService.changeUserRole(u.id, newRole);
        this.selectedUserForDossier.set(null);
        this.showToast(`Updated ${u.name}'s role to ${newRole.toUpperCase()}.`);
      }
    );
  }

  promptToggleUserSuspension(u: AdminUser) {
    const isSuspended = u.status === 'suspended';
    const nextStatus = isSuspended ? 'active' : 'suspended';
    const actionText = isSuspended ? 'Reactivate Account' : 'Suspend Account';

    this.triggerConfirm(
      `${actionText}?`,
      isSuspended
        ? `Reactivate account for ${u.name} (${u.email})? They will be allowed to log in and participate in events.`
        : `Are you sure you want to suspend ${u.name} (${u.email})? They will be blocked from logging in across all apps.`,
      actionText,
      !isSuspended,
      async () => {
        await this.adminService.changeUserStatus(u.id, nextStatus);
        this.selectedUserForDossier.set(null);
        this.showToast(`User ${u.name} is now ${nextStatus.toUpperCase()}.`);
      }
    );
  }

  // Host Application Actions
  openAppDetailsModal(app: AdminHostApplication) {
    this.selectedAppForModal.set(app);
  }

  closeAppDetailsModal() {
    this.selectedAppForModal.set(null);
  }

  promptApproveHostApplication(appId: string, applicantName: string) {
    this.triggerConfirm(
      'Approve Host Application & Grant SaaS Access?',
      `Confirm approval for ${applicantName}? This promotes their profile to a Verified Host in db.json and unlocks the Host Studio.`,
      'Approve & Promote',
      false,
      async () => {
        const success = await this.adminService.approveHostApplication(appId);
        if (success) {
          this.hostAppService.setPrototypeState('approved');
          this.selectedAppForModal.set(null);
          this.showToast(`Host application for ${applicantName} approved and promoted!`);
        }
      }
    );
  }

  promptRejectHostApplication(appId: string, applicantName: string) {
    this.triggerConfirm(
      'Reject Host Application?',
      `Are you sure you want to reject the application for ${applicantName}? An official rejection notification will be logged.`,
      'Reject Application',
      true,
      async () => {
        const success = await this.adminService.rejectHostApplication(appId);
        if (success) {
          this.selectedAppForModal.set(null);
          this.showToast(`Host application for ${applicantName} rejected.`);
        }
      }
    );
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
  }

  closeEventCurationModal() {
    this.selectedEventForModal.set(null);
  }

  promptApproveEventForLive(eventId: string, eventTitle: string) {
    this.triggerConfirm(
      'Approve Event for Public Feed?',
      `Publish "${eventTitle}" live to the public Discover feed? Attendees will be able to book tickets immediately.`,
      'Publish Live',
      false,
      async () => {
        const success = await this.adminService.approveEvent(eventId);
        if (success) {
          this.selectedEventForModal.set(null);
          this.showToast(`"${eventTitle}" is now published LIVE on EventHub.`);
        }
      }
    );
  }

  promptDelistEvent(eventId: string, eventTitle: string) {
    this.triggerConfirm(
      'Delist Event from Discover?',
      `Delist "${eventTitle}" from the public marketplace? It will be removed from discover searches and ticket booking will freeze.`,
      'Delist Event',
      true,
      async () => {
        const success = await this.adminService.delistEvent(eventId);
        if (success) {
          this.selectedEventForModal.set(null);
          this.showToast(`"${eventTitle}" has been delisted.`);
        }
      }
    );
  }

  async toggleEventFeatured(eventId: string, eventTitle: string) {
    await this.adminService.toggleEventFeatured(eventId);
    this.showToast(`Updated featured showcase banner for "${eventTitle}".`);
  }

  async sendEventFeedback(event: { id: string; feedback: string }) {
    const note = event.feedback.trim() || 'Please provide updated permit documentation.';
    const success = await this.adminService.sendEventFeedback(event.id, note);
    if (success) {
      this.selectedEventForModal.set(null);
      this.showToast('Compliance feedback dispatched to organizer.');
    }
  }

  // Settlement Release Action
  promptReleaseSettlementPayout(settlement: AdminSettlement) {
    this.triggerConfirm(
      `Release Payout of ₹${settlement.netPayout.toLocaleString('en-IN')}?`,
      `Confirm electronic disbursement of ₹${settlement.netPayout.toLocaleString('en-IN')} to ${settlement.hostName} (${settlement.bankAccount}) for "${settlement.eventTitle}"? EventHub 5% cut (₹${settlement.platformCommission.toLocaleString('en-IN')}) has been retained.`,
      'Release Payout',
      false,
      async () => {
        await this.adminService.releaseSettlementPayout(settlement.id);
        this.showToast(`Payout of ₹${settlement.netPayout.toLocaleString('en-IN')} successfully settled!`);
      }
    );
  }

  // Broadcast Announcement
  async sendBroadcast(data: { title: string; body: string }) {
    if (data.title && data.body) {
      await this.adminService.sendBroadcast(data.title, data.body);
      this.showBroadcastModal.set(false);
      this.showToast(`Global broadcast "${data.title}" dispatched.`);
    }
  }

  // Toast System
  showToast(msg: string) {
    this.toastMessage.set(msg);
    this.toastService.info(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3600);
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
