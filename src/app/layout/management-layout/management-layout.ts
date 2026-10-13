import { Component, signal, computed, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth';
import { HostApplicationService, ManagementService, ManagementApprovalItem, ManagementHostReviewItem } from '@core/state';
import { SelectComponent, SelectOption } from '@shared/components';

export type ManagementView =
  | 'overview'
  | 'event_approvals'
  | 'host_applications'
  | 'event_operations'
  | 'bookings'
  | 'staff_teams'
  | 'reports'
  | 'notifications'
  | 'settings';

@Component({
  selector: 'app-management-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SelectComponent],
  templateUrl: './management-layout.html',
  styleUrl: './management-layout.css'
})
export class ManagementLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly hostAppService = inject(HostApplicationService);
  readonly mgmtService = inject(ManagementService);

  // Layout & Navigation State
  isSidebarCollapsed = signal(false);
  isMobileDrawerOpen = signal(false);
  currentView = signal<ManagementView>('overview');
  searchQuery = signal('');
  showHelpModal = signal(false);

  // Dropdown States
  showUserMenu = signal(false);
  showNotificationsMenu = signal(false);
  toastMessage = signal<string | null>(null);

  // Filter States
  approvalFilter = signal<'all' | 'under_review' | 'changes_requested' | 'approved' | 'submitted'>('all');
  hostAppFilter = signal<'all' | 'under_review' | 'approved' | 'changes_requested' | 'submitted'>('all');
  selectedCategoryFilter = signal('all');
  selectedLocationFilter = signal('all');

  // Detail Drawer & Modal States
  selectedApprovalForDrawer = signal<ManagementApprovalItem | null>(null);
  selectedHostForDrawer = signal<ManagementHostReviewItem | null>(null);
  showConfirmationDialog = signal(false);
  pendingConfirmAction: (() => void) | null = null;
  confirmDialogData = { title: '', message: '', actionBtnText: '', isDestructive: false };

  reviewFeedbackNote = signal('');

  // Category & Location Select Options
  readonly categoryOptions: SelectOption[] = [
    { label: 'All Categories', value: 'all' },
    { label: 'Music Festivals', value: 'Music Festivals' },
    { label: 'Conferences', value: 'Conferences' },
    { label: 'Comedy', value: 'Comedy' },
    { label: 'Workshops', value: 'Workshops' }
  ];

  readonly locationOptions: SelectOption[] = [
    { label: 'All Locations', value: 'all' },
    { label: 'Mumbai', value: 'Mumbai' },
    { label: 'Bengaluru', value: 'Bengaluru' },
    { label: 'Delhi NCR', value: 'Delhi NCR' }
  ];

  // Expose signals from ManagementService
  readonly approvalsQueue = this.mgmtService.approvalsQueue;
  readonly hostApplications = this.mgmtService.hostApplications;
  readonly monitoredEvents = this.mgmtService.monitoredEvents;
  readonly staffRoster = this.mgmtService.staffRoster;

  // Computed Operational Progress KPIs
  operationalKPIs = computed(() => {
    const approvals = this.approvalsQueue();
    const apps = this.hostApplications();
    const monitored = this.monitoredEvents();

    const pendingApprovals = approvals.filter(a => a.status === 'under_review').length;
    const actionRequired = approvals.filter(a => a.status === 'changes_requested').length;
    const pendingHostApps = apps.filter(h => h.status === 'under_review').length;
    const activeLiveEvents = monitored.length;
    const totalBookedTickets = monitored.reduce((sum, e) => sum + e.bookedCount, 0);

    return {
      pendingApprovals,
      actionRequired,
      pendingHostApps,
      activeLiveEvents,
      totalBookedTickets,
      criticalUrgencyCount: approvals.filter(a => a.urgency === 'high').length
    };
  });

  // Filtered Approvals
  filteredApprovals = computed(() => {
    const list = this.approvalsQueue();
    const f = this.approvalFilter();
    const q = this.searchQuery().toLowerCase().trim();

    return list.filter(item => {
      const matchFilter = f === 'all' || item.status === f;
      const matchQuery =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.hostName?.toLowerCase().includes(q) ||
        item.organization?.toLowerCase().includes(q) ||
        item.venue?.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  });

  // Filtered Host Applications
  filteredHostApps = computed(() => {
    const list = this.hostApplications();
    const f = this.hostAppFilter();
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

  ngOnInit() {
    this.mgmtService.loadAll();
  }

  // View Navigation
  switchView(view: ManagementView) {
    this.currentView.set(view);
    this.isMobileDrawerOpen.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleSidebar() {
    this.isSidebarCollapsed.update(v => !v);
  }

  toggleMobileDrawer() {
    this.isMobileDrawerOpen.update(v => !v);
  }

  // Drawer Inspections
  openApprovalDrawer(item: ManagementApprovalItem) {
    this.selectedApprovalForDrawer.set(item);
    this.reviewFeedbackNote.set('');
  }

  closeApprovalDrawer() {
    this.selectedApprovalForDrawer.set(null);
  }

  openHostDrawer(item: ManagementHostReviewItem) {
    this.selectedHostForDrawer.set(item);
  }

  closeHostDrawer() {
    this.selectedHostForDrawer.set(null);
  }

  // Approval Actions
  async approveEventSubmission(eventId: string) {
    await this.mgmtService.approveEvent(eventId);
    this.selectedApprovalForDrawer.set(null);
    this.showToast('Event listing verified & approved for publishing.');
  }

  async requestChangesOnEvent(eventId: string) {
    const note = this.reviewFeedbackNote().trim() || 'Please submit updated sound & municipal clearances.';
    await this.mgmtService.requestChangesOnEvent(eventId, note);
    this.selectedApprovalForDrawer.set(null);
    this.showToast('Feedback & change request dispatched to event host.');
  }

  async approveHostApp(appId: string) {
    await this.mgmtService.approveHostApplication(appId);
    this.hostAppService.setPrototypeState('approved');
    this.selectedHostForDrawer.set(null);
    this.showToast('Host application approved with verified organizer credentials.');
  }

  // Confirmation Dialog System
  triggerConfirm(title: string, message: string, actionBtnText: string, isDestructive: boolean, action: () => void) {
    this.confirmDialogData = { title, message, actionBtnText, isDestructive };
    this.pendingConfirmAction = action;
    this.showConfirmationDialog.set(true);
  }

  executeConfirmAction() {
    if (this.pendingConfirmAction) {
      this.pendingConfirmAction();
      this.pendingConfirmAction = null;
    }
    this.showConfirmationDialog.set(false);
  }

  cancelConfirm() {
    this.pendingConfirmAction = null;
    this.showConfirmationDialog.set(false);
  }

  // Toast System
  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3600);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.mgmt-dropdown-trigger') && !target.closest('.mgmt-dropdown-menu')) {
      this.showUserMenu.set(false);
      this.showNotificationsMenu.set(false);
    }
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/discover']);
  }
}
