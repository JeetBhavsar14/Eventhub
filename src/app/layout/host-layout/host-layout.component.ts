import { Component, inject, signal, computed, HostListener, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HostDashboardService } from '@core/state/host-dashboard.service';
import { EventTeamService } from '@core/state/event-team.service';
import { EventOwnershipService } from '@core/state/event-ownership.service';
import { ToastService, AdminService } from '@core/state';
import { AuthService } from '@core/auth';
import {
  HostEventItem,
  HostEventStatus,
  HostDashboardView,
  DashboardPrototypeState,
  BookingDataPoint,
  HostTeamMember,
  EventMembership,
  EventInvitation,
  MembershipRole,
  EventOwnerStake,
  EventManagerAssignment,
  EventParticipantProfile,
  ManagerResponsibilityArea,
  StaffResponsibility
} from '@core/models';
import { SelectOption, IconComponent, ConfirmDialogComponent } from '@shared/components';
import { HostMyEventsComponent } from './components/host-my-events/host-my-events.component';
import { HostBookingsComponent } from './components/host-bookings/host-bookings.component';
import { HostOverviewComponent } from './components/host-overview/host-overview.component';
import { HostTeamComponent } from './components/host-team/host-team.component';
import { HostAnalyticsComponent } from './components/host-analytics/host-analytics.component';
import { HostNotificationsComponent } from './components/host-notifications/host-notifications.component';
import { HostSettingsComponent } from './components/host-settings/host-settings.component';
import {
  CreateEventWizardComponent,
  NewEventPayload,
  EventDetailsDrawerComponent,
  EventEditPayload,
  EventFeedbackModalComponent,
  TeamInviteModalComponent,
  HostHelpModalComponent,
  AddCoOwnerModalComponent,
  AssignManagerModalComponent,
  AddParticipantModalComponent
} from './components/modals';

@Component({
  selector: 'app-host-layout',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    IconComponent, 
    ConfirmDialogComponent,
    HostMyEventsComponent,
    HostBookingsComponent,
    HostOverviewComponent,
    HostTeamComponent,
    HostAnalyticsComponent,
    HostNotificationsComponent,
    HostSettingsComponent,
    CreateEventWizardComponent,
    EventDetailsDrawerComponent,
    EventFeedbackModalComponent,
    TeamInviteModalComponent,
    HostHelpModalComponent,
    AddCoOwnerModalComponent,
    AssignManagerModalComponent,
    AddParticipantModalComponent
  ],
  templateUrl: './host-layout.component.html',
  styleUrl: './host-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostLayoutComponent implements OnInit {
  readonly dashboardService = inject(HostDashboardService);
  readonly eventTeamService = inject(EventTeamService);
  readonly ownershipService = inject(EventOwnershipService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);

  // Phase 5: Event Ownership & Multi-Owner State (§ 11.0, § 12.0, § 14.0)
  readonly ownerStakes = this.ownershipService.ownerStakes;
  readonly primaryOwner = this.ownershipService.primaryOwner;
  readonly coOwners = this.ownershipService.coOwners;
  readonly availableCoOwnerEquity = this.ownershipService.availableCoOwnerEquity;
  readonly totalAllocatedEquity = this.ownershipService.totalAllocatedEquity;
  readonly remainingEquityPool = this.ownershipService.remainingEquityPool;
  readonly isEquityValid = this.ownershipService.isEquityValid;
  readonly eventManagers = this.ownershipService.managers;
  readonly eventParticipants = this.ownershipService.participants;

  // Modals & Delegation State
  showAddOwnerModal = signal(false);
  showAssignManagerModal = signal(false);
  showAddParticipantModal = signal(false);
  showInviteTeamModal = signal(false);

  newParticipantForm = {
    category: 'speaker' as 'speaker' | 'artist' | 'sponsor'
  };

  readonly operationalTeam = this.eventTeamService.operationalTeam;
  readonly participantMembers = this.eventTeamService.participantMembers;
  readonly pendingInvitations = this.eventTeamService.pendingInvitations;

  // Shell Layout State
  isMobileSidebarOpen = signal(false);
  showNotificationsDropdown = signal(false);
  showTopUserMenu = signal(false);
  showSidebarUserMenu = signal(false);
  showHelpModal = signal(false);

  // Active View
  currentView = this.dashboardService.currentView;
  hostInfo = this.dashboardService.hostInfo;

  ngOnInit(): void {
    this.dashboardService.loadAll();
    this.eventTeamService.loadEventTeam('evt-100');
    this.ownershipService.loadEventGovernance('evt-100');

    // Deep link support: map queryParams (e.g. ?view=team) to dashboard views
    const initialView = this.route.snapshot.queryParams['view'];
    if (initialView) {
      this.switchView(initialView as HostDashboardView);
    }
    this.route.queryParams.subscribe(params => {
      if (params['view']) {
        this.switchView(params['view'] as HostDashboardView);
      }
    });
  }

  // Selected Reporting Period
  selectedPeriod = this.dashboardService.selectedPeriod;

  // Events Table Filtering
  eventSearchTerm = signal('');

  // Modals & Drawers State
  selectedEventForDetails = signal<HostEventItem | null>(null);
  selectedEventForFeedback = signal<HostEventItem | null>(null);
  showCreateEventModal = signal(false);
  toastMessage = signal<string | null>(null);

  // Computed Properties from Service
  stats = this.dashboardService.stats;
  events = this.dashboardService.events;
  upcomingEvents = this.dashboardService.upcomingEvents;
  pendingActions = this.dashboardService.pendingActions;
  recentActivities = this.dashboardService.recentActivities;
  teamMembers = this.dashboardService.teamMembers;
  attendees = this.dashboardService.attendees;
  notifications = this.dashboardService.notifications;
  unreadCount = this.dashboardService.unreadNotificationsCount;

  // Chart Data Computation
  chartData = computed(() => {
    return this.dashboardService.getBookingChartData(this.selectedPeriod());
  });

  // Filtered Events in Table
  filteredEvents = computed(() => {
    const list = this.events();
    const search = this.eventSearchTerm().toLowerCase().trim();

    return list.filter(event => {
      return (
        !search ||
        event.title.toLowerCase().includes(search) ||
        event.category.toLowerCase().includes(search) ||
        event.venue.toLowerCase().includes(search)
      );
    });
  });

  // Live Top 3 Search Matching State
  showSearchDropdown = signal(false);

  topMatchingResults = computed(() => {
    const term = this.eventSearchTerm().toLowerCase().trim();
    if (!term) return [];
    return this.events().filter(e =>
      e.title.toLowerCase().includes(term) ||
      e.category.toLowerCase().includes(term) ||
      e.venue.toLowerCase().includes(term) ||
      e.city.toLowerCase().includes(term)
    ).slice(0, 3);
  });

  totalMatchesCount = computed(() => {
    const term = this.eventSearchTerm().toLowerCase().trim();
    if (!term) return 0;
    return this.events().filter(e =>
      e.title.toLowerCase().includes(term) ||
      e.category.toLowerCase().includes(term) ||
      e.venue.toLowerCase().includes(term) ||
      e.city.toLowerCase().includes(term)
    ).length;
  });

  onSearchFocus() {
    if (this.eventSearchTerm().trim()) {
      this.showSearchDropdown.set(true);
    }
  }

  onEventSearchChange(term: string) {
    this.eventSearchTerm.set(term);
    this.showSearchDropdown.set(term.trim().length > 0);
  }

  clearSearch() {
    this.eventSearchTerm.set('');
    this.showSearchDropdown.set(false);
  }

  selectSearchResult(event: HostEventItem) {
    this.showSearchDropdown.set(false);
    this.openEventDetails(event);
  }

  seeAllSearchResults() {
    this.showSearchDropdown.set(false);
    this.switchView('my_events');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-search-box')) {
      this.showSearchDropdown.set(false);
    }
    if (!target.closest('.dropdown-trigger') && !target.closest('.dropdown-menu-box')) {
      this.showTopUserMenu.set(false);
      this.showSidebarUserMenu.set(false);
    }
    if (!target.closest('.relative-dropdown-container')) {
      this.showNotificationsDropdown.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.showSearchDropdown.set(false);
    this.showTopUserMenu.set(false);
    this.showSidebarUserMenu.set(false);
    this.showNotificationsDropdown.set(false);
  }

  // Navigation Methods
  switchView(view: HostDashboardView) {
    this.dashboardService.currentView.set(view);
    this.isMobileSidebarOpen.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleMobileSidebar() {
    this.isMobileSidebarOpen.update(v => !v);
  }

  toggleNotifications(event: MouseEvent) {
    event.stopPropagation();
    this.showNotificationsDropdown.update(v => !v);
    this.showTopUserMenu.set(false);
    this.showSidebarUserMenu.set(false);
  }

  toggleTopUserMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showTopUserMenu.update(v => !v);
    this.showSidebarUserMenu.set(false);
    this.showNotificationsDropdown.set(false);
  }

  toggleSidebarUserMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showSidebarUserMenu.update(v => !v);
    this.showTopUserMenu.set(false);
    this.showNotificationsDropdown.set(false);
  }

  getInitials(): string {
    const name = this.hostInfo().name;
    if (!name) return 'JB';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  setPeriod(period: '7d' | '30d' | '90d') {
    this.dashboardService.selectedPeriod.set(period);
  }

  openEventDetails(event: HostEventItem, startInEditMode = false) {
    this.selectedEventForDetails.set(event);
  }

  openFeedbackModal(event: HostEventItem) {
    this.selectedEventForFeedback.set(event);
  }

  submitDraftForReview(eventId: string) {
    this.dashboardService.submitEventForReview(eventId);
    this.showToast('Event submitted for curation review!');
  }

  publishApprovedEvent(eventId: string) {
    this.dashboardService.publishEvent(eventId);
    this.showToast('Event published live! Tickets are now available.');
  }

  // Confirmation Dialog State
  showConfirmDialog = signal(false);
  confirmDialogData = signal<{
    title: string;
    message: string;
    actionBtnText: string;
    isDestructive: boolean;
  }>({
    title: '',
    message: '',
    actionBtnText: 'Confirm',
    isDestructive: false
  });
  private pendingConfirmAction: (() => void) | null = null;

  triggerConfirm(title: string, message: string, actionBtnText: string, isDestructive: boolean, action: () => void) {
    this.confirmDialogData.set({ title, message, actionBtnText, isDestructive });
    this.pendingConfirmAction = action;
    this.showConfirmDialog.set(true);
  }

  executeConfirm() {
    if (this.pendingConfirmAction) {
      this.pendingConfirmAction();
      this.pendingConfirmAction = null;
    }
    this.showConfirmDialog.set(false);
  }

  cancelConfirm() {
    this.pendingConfirmAction = null;
    this.showConfirmDialog.set(false);
  }

  deleteDraftEvent(eventId: string) {
    this.triggerConfirm(
      'Discard Draft Event',
      'Are you sure you want to delete this draft event? This action cannot be undone.',
      'Delete Draft',
      true,
      () => {
        this.dashboardService.deleteDraft(eventId);
        this.showToast('Draft event removed.');
      }
    );
  }

  openCreateWizard() {
    this.showCreateEventModal.set(true);
  }

  finishCreateEventFromWizard(payload: NewEventPayload) {
    const timeString = `${payload.timeStart} – ${payload.timeEnd}`;
    const dateFormatted = new Date(payload.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    this.dashboardService.createNewEvent({
      title: payload.title || 'New Event Showcase',
      category: payload.category,
      type: payload.type,
      description: payload.description,
      date: dateFormatted,
      time: timeString,
      venue: payload.venue || 'Ahmedabad Main Arena',
      city: payload.city,
      capacity: payload.capacity,
      price: payload.priceType === 'paid' ? payload.price : 0,
      imageUrl: payload.imageUrl,
      status: payload.status
    });

    this.showCreateEventModal.set(false);
    this.showToast(payload.status === 'pending_review' ? 'Event submitted for review!' : 'Event saved to Drafts.');
  }

  saveDrawerEventChanges(evt: {
    data: EventEditPayload;
    submitForReview: boolean;
  }) {
    const current = this.selectedEventForDetails();
    if (!current) return;

    const changes: Partial<HostEventItem> = {
      title: evt.data.title.trim(),
      category: evt.data.category,
      date: evt.data.date,
      time: evt.data.time,
      venue: evt.data.venue,
      city: evt.data.city,
      capacity: Number(evt.data.capacity) || 100,
      price: Number(evt.data.price) || 0,
      description: evt.data.description,
      imageUrl: evt.data.imageUrl || current.imageUrl
    };

    this.dashboardService.updateEvent(current.id, changes, evt.submitForReview, evt.data.changeReason);

    if (evt.submitForReview || current.status !== 'draft') {
      this.adminService.submitEventChangeRequest(current.id, {
        title: changes.title,
        venue: changes.venue,
        city: changes.city,
        date: changes.date,
        capacity: changes.capacity,
        ticketPrice: changes.price,
        imageUrl: changes.imageUrl
      });
    }

    const updated = this.dashboardService.events().find(e => e.id === current.id);
    if (updated) {
      this.selectedEventForDetails.set(updated);
    }

    if (evt.submitForReview || current.status !== 'draft') {
      this.showToast('Changes submitted to Admin! Review request is pending curation approval.');
    } else {
      this.showToast('Draft event saved successfully.');
    }
  }

  handleFeedbackResubmit(data: { eventId: string; note: string }) {
    this.dashboardService.resolveFeedbackAndResubmit(data.eventId, data.note);
    this.selectedEventForFeedback.set(null);
    this.showToast('Clarification submitted. Event returned to review queue.');
  }

  // Invite Team & Event Participants (§ 5.0 - § 6.0)
  openInviteTeamModal() {
    this.showInviteTeamModal.set(true);
  }

  async removeMember(memberId: string, memberName: string) {
    await this.eventTeamService.removeMember(memberId);
    this.showToast(`Removed ${memberName} from the event team.`);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 5: OWNERSHIP & GOVERNANCE METHODS (§ 11.0, § 12.0, § 14.0)
  // ═══════════════════════════════════════════════════════════

  openAddOwnerModal() {
    this.showAddOwnerModal.set(true);
  }

  async updateStake(stakeId: string, newPercentage: number) {
    const res = await this.ownershipService.updateStakePercentage(stakeId, newPercentage);
    this.showToast(res.message);
  }

  async removeOwnerStake(stake: EventOwnerStake) {
    if (stake.isPrimaryOwner) {
      this.showToast('Primary owner cannot be removed from event.');
      return;
    }
    const ok = await this.ownershipService.removeCoOwnerStake(stake.id);
    if (ok) {
      this.showToast(`Removed ${stake.userName} from event equity pool.`);
    }
  }

  openAssignManagerModal() {
    this.showAssignManagerModal.set(true);
  }

  async toggleMgrDelegation(mgr: EventManagerAssignment) {
    const next = !mgr.delegationActive;
    await this.ownershipService.toggleManagerDelegation(mgr.id, next);
    this.showToast(
      next
        ? `Management delegation active for ${mgr.userName}.`
        : `Management authority paused for ${mgr.userName}.`
    );
  }

  async removeManagerAssignment(mgr: EventManagerAssignment) {
    await this.ownershipService.removeManager(mgr.id);
    this.showToast(`Removed manager assignment for ${mgr.userName}.`);
  }

  openAddParticipantModal(category: 'speaker' | 'artist' | 'sponsor' = 'speaker') {
    this.newParticipantForm = { category };
    this.showAddParticipantModal.set(true);
  }

  async removeParticipantItem(part: EventParticipantProfile) {
    await this.ownershipService.removeParticipant(part.id);
    this.showToast(`Removed ${part.name} from event participants.`);
  }

  // Notifications
  markAllNotificationsRead() {
    this.dashboardService.markAllNotificationsRead();
  }

  // Toast System
  showToast(msg: string) {
    this.toastMessage.set(msg);
    this.toastService.info(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  // Helpers
  getStatusBadgeClass(status: HostEventStatus): string {
    switch (status) {
      case 'published':
        return 'badge-published';
      case 'pending_review':
        return 'badge-pending';
      case 'changes_requested':
        return 'badge-changes';
      case 'approved':
        return 'badge-approved';
      case 'draft':
        return 'badge-draft';
      case 'rejected':
        return 'badge-rejected';
      default:
        return '';
    }
  }

  getStatusLabel(status: HostEventStatus): string {
    switch (status) {
      case 'published':
        return 'Published';
      case 'pending_review':
        return 'Pending Review';
      case 'changes_requested':
        return 'Action Required';
      case 'approved':
        return 'Approved';
      case 'draft':
        return 'Draft';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/discover']);
  }
}

// Alias export for backward compatibility
export { HostLayoutComponent as HostDashboardComponent };
