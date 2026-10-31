import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HostDashboardService } from '@core/state/host-dashboard.service';
import { EventTeamService } from '@core/state/event-team.service';
import { EventOwnershipService } from '@core/state/event-ownership.service';
import { ToastService, AdminService } from '@core/state';
import { AuthService } from '@core/auth';
import {
  HostEventItem,
  HostDashboardView,
  EventOwnerStake,
  EventManagerAssignment,
  EventParticipantProfile
} from '@core/models';
import { IconComponent, ConfirmDialogComponent } from '@shared/components';
import { HostSidebarComponent } from './components/host-sidebar/host-sidebar.component';
import { HostHeaderComponent } from './components/host-header/host-header.component';
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
    IconComponent,
    ConfirmDialogComponent,
    HostSidebarComponent,
    HostHeaderComponent,
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
  showHelpModal = signal(false);

  // Active View
  currentView = this.dashboardService.currentView;
  hostInfo = this.dashboardService.hostInfo;

  // Selected Reporting Period
  selectedPeriod = this.dashboardService.selectedPeriod;

  // Modals & Drawers State
  selectedEventForDetails = signal<HostEventItem | null>(null);
  selectedEventForFeedback = signal<HostEventItem | null>(null);
  showCreateEventModal = signal(false);
  toastMessage = signal<string | null>(null);

  // Computed Properties from Service
  stats = this.dashboardService.stats;
  events = this.dashboardService.events;
  filteredEvents = this.events;
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

  // Navigation Methods
  switchView(view: HostDashboardView): void {
    this.dashboardService.currentView.set(view);
    this.isMobileSidebarOpen.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(v => !v);
  }

  setPeriod(period: '7d' | '30d' | '90d'): void {
    this.dashboardService.selectedPeriod.set(period);
  }

  openEventDetails(event: HostEventItem, startInEditMode = false): void {
    this.selectedEventForDetails.set(event);
  }

  openFeedbackModal(event: HostEventItem): void {
    this.selectedEventForFeedback.set(event);
  }

  submitDraftForReview(eventId: string): void {
    this.dashboardService.submitEventForReview(eventId);
    this.showToast('Event submitted for curation review!');
  }

  publishApprovedEvent(eventId: string): void {
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

  triggerConfirm(title: string, message: string, actionBtnText: string, isDestructive: boolean, action: () => void): void {
    this.confirmDialogData.set({ title, message, actionBtnText, isDestructive });
    this.pendingConfirmAction = action;
    this.showConfirmDialog.set(true);
  }

  executeConfirm(): void {
    if (this.pendingConfirmAction) {
      this.pendingConfirmAction();
      this.pendingConfirmAction = null;
    }
    this.showConfirmDialog.set(false);
  }

  cancelConfirm(): void {
    this.pendingConfirmAction = null;
    this.showConfirmDialog.set(false);
  }

  deleteDraftEvent(eventId: string): void {
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

  openCreateWizard(): void {
    this.showCreateEventModal.set(true);
  }

  finishCreateEventFromWizard(payload: NewEventPayload): void {
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
  }): void {
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

  handleFeedbackResubmit(data: { eventId: string; note: string }): void {
    this.dashboardService.resolveFeedbackAndResubmit(data.eventId, data.note);
    this.selectedEventForFeedback.set(null);
    this.showToast('Clarification submitted. Event returned to review queue.');
  }

  // Invite Team & Event Participants (§ 5.0 - § 6.0)
  openInviteTeamModal(): void {
    this.showInviteTeamModal.set(true);
  }

  async removeMember(memberId: string, memberName: string): Promise<void> {
    await this.eventTeamService.removeMember(memberId);
    this.showToast(`Removed ${memberName} from the event team.`);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 5: OWNERSHIP & GOVERNANCE METHODS (§ 11.0, § 12.0, § 14.0)
  // ═══════════════════════════════════════════════════════════

  openAddOwnerModal(): void {
    this.showAddOwnerModal.set(true);
  }

  async updateStake(stakeId: string, newPercentage: number): Promise<void> {
    const res = await this.ownershipService.updateStakePercentage(stakeId, newPercentage);
    this.showToast(res.message);
  }

  async removeOwnerStake(stake: EventOwnerStake): Promise<void> {
    if (stake.isPrimaryOwner) {
      this.showToast('Primary owner cannot be removed from event.');
      return;
    }
    const ok = await this.ownershipService.removeCoOwnerStake(stake.id);
    if (ok) {
      this.showToast(`Removed ${stake.userName} from event equity pool.`);
    }
  }

  openAssignManagerModal(): void {
    this.showAssignManagerModal.set(true);
  }

  async toggleMgrDelegation(mgr: EventManagerAssignment): Promise<void> {
    const next = !mgr.delegationActive;
    await this.ownershipService.toggleManagerDelegation(mgr.id, next);
    this.showToast(
      next
        ? `Management delegation active for ${mgr.userName}.`
        : `Management authority paused for ${mgr.userName}.`
    );
  }

  async removeManagerAssignment(mgr: EventManagerAssignment): Promise<void> {
    await this.ownershipService.removeManager(mgr.id);
    this.showToast(`Removed manager assignment for ${mgr.userName}.`);
  }

  openAddParticipantModal(category: 'speaker' | 'artist' | 'sponsor' = 'speaker'): void {
    this.newParticipantForm = { category };
    this.showAddParticipantModal.set(true);
  }

  async removeParticipantItem(part: EventParticipantProfile): Promise<void> {
    await this.ownershipService.removeParticipant(part.id);
    this.showToast(`Removed ${part.name} from event participants.`);
  }

  markAllNotificationsRead(): void {
    this.dashboardService.markAllNotificationsRead();
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    this.toastService.info(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  signOut(): void {
    this.authService.logout();
    this.router.navigate(['/discover']);
  }
}

// Alias export for backward compatibility
export { HostLayoutComponent as HostDashboardComponent };
