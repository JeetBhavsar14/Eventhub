import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
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
  ManagerResponsibilityArea
} from '@core/models';
import { SelectComponent, SelectOption, IconComponent, ConfirmDialogComponent } from '@shared/components';
import { HostMyEventsComponent } from './components/host-my-events/host-my-events.component';
import { HostBookingsComponent } from './components/host-bookings/host-bookings.component';
import { HostOverviewComponent } from './components/host-overview/host-overview.component';
import { HostTeamComponent } from './components/host-team/host-team.component';
import { HostAnalyticsComponent } from './components/host-analytics/host-analytics.component';
import { HostNotificationsComponent } from './components/host-notifications/host-notifications.component';
import { HostSettingsComponent } from './components/host-settings/host-settings.component';

@Component({
  selector: 'app-host-layout',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    SelectComponent, 
    IconComponent, 
    ConfirmDialogComponent,
    HostMyEventsComponent,
    HostBookingsComponent,
    HostOverviewComponent,
    HostTeamComponent,
    HostAnalyticsComponent,
    HostNotificationsComponent,
    HostSettingsComponent
  ],
  templateUrl: './host-layout.component.html',
  styleUrl: './host-layout.component.css'
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

  maxCoOwnerCanHold(stakeId: string): number {
    const primary = this.primaryOwner();
    const target = this.ownerStakes().find(s => s.id === stakeId);
    if (!primary || !target) return 99;
    return target.percentage + Math.max(0, primary.percentage - 1);
  }

  // Modals for Phase 5
  showAddOwnerModal = signal(false);
  showAssignManagerModal = signal(false);
  showAddParticipantModal = signal(false);

  newOwnerForm = {
    userName: '',
    userEmail: '',
    organizationName: '',
    percentage: 10
  };

  newManagerForm = {
    userName: '',
    userEmail: '',
    responsibilityArea: 'venue_logistics' as ManagerResponsibilityArea,
    customTitle: ''
  };

  newParticipantForm = {
    category: 'speaker' as 'speaker' | 'artist' | 'sponsor',
    name: '',
    designationOrCompany: '',
    bio: '',
    email: ''
  };

  readonly managerAreaOptions: SelectOption[] = [
    { label: 'Overall Operations & Show Director', value: 'overall_operations' },
    { label: 'Venue & Floor Logistics Lead', value: 'venue_logistics' },
    { label: 'Sponsorships & Brand Partnerships', value: 'sponsorships' },
    { label: 'Production, Stage & Audio-Visual Lead', value: 'production_technical' },
    { label: 'Chief Safety & Incident Officer', value: 'security_safety' },
    { label: 'Admissions & Box Office Supervisor', value: 'registration_ticketing' }
  ];

  readonly participantCategoryOptions: SelectOption[] = [
    { label: 'Keynote Speaker', value: 'speaker' },
    { label: 'Headline Artist / Performer', value: 'artist' },
    { label: 'Brand Sponsor', value: 'sponsor' }
  ];

  // Event Team & Delegation State
  readonly operationalTeam = this.eventTeamService.operationalTeam;
  readonly participantMembers = this.eventTeamService.participantMembers;
  readonly pendingInvitations = this.eventTeamService.pendingInvitations;

  inviteForm = {
    name: '',
    email: '',
    role: 'staff' as MembershipRole,
    roleCategory: 'operational' as 'operational' | 'participant',
    customRoleName: '',
    designationPreset: 'gate_scanner',
    designation: 'Gate & Barcode Scanner',
    responsibility: 'ticketing',
    permissions: ['scan_tickets', 'view_attendees', 'view_duty'] as string[]
  };

  readonly operationalRoleOptions: SelectOption[] = [
    { label: 'Field & Gate Staff (Check-in / Safety / Concierge)', value: 'staff' },
    { label: 'Event Manager (Delegated Operations)', value: 'event_manager' },
    { label: 'Event Volunteer (Guest Support)', value: 'volunteer' },
    { label: 'Custom Operational Role', value: 'custom_role' }
  ];

  readonly staffDesignationOptions: SelectOption[] = [
    { label: 'Gate & Barcode Scanner (Admissions & Wristbands)', value: 'gate_scanner' },
    { label: 'Security & Incident Officer (Safety & Escalations)', value: 'security_officer' },
    { label: 'Guest Relations & Info Desk (Concierge & Roster)', value: 'guest_relations' },
    { label: 'Venue Operations Supervisor (All Access & Control)', value: 'venue_supervisor' },
    { label: 'Custom Staff Specialist', value: 'custom_role' }
  ];

  readonly participantRoleOptions: SelectOption[] = [
    { label: 'Keynote Speaker / Artist', value: 'speaker' },
    { label: 'Brand Sponsor', value: 'sponsor' }
  ];

  onDesignationPresetChange(preset: string) {
    this.inviteForm.designationPreset = preset;
    switch (preset) {
      case 'gate_scanner':
        this.inviteForm.designation = 'Gate & Barcode Scanner';
        this.inviteForm.responsibility = 'ticketing';
        this.inviteForm.permissions = ['scan_tickets', 'view_attendees', 'view_duty'];
        break;
      case 'security_officer':
        this.inviteForm.designation = 'Security & Incident Officer';
        this.inviteForm.responsibility = 'security_safety';
        this.inviteForm.permissions = ['log_incidents', 'view_duty'];
        break;
      case 'guest_relations':
        this.inviteForm.designation = 'Guest Relations & Info Desk';
        this.inviteForm.responsibility = 'registration';
        this.inviteForm.permissions = ['view_attendees', 'view_duty'];
        break;
      case 'venue_supervisor':
        this.inviteForm.designation = 'Venue Operations Supervisor';
        this.inviteForm.responsibility = 'venue_operations';
        this.inviteForm.permissions = ['scan_tickets', 'view_attendees', 'log_incidents', 'view_duty'];
        break;
      case 'custom_role':
        this.inviteForm.designation = this.inviteForm.customRoleName || 'Custom Operational Staff';
        this.inviteForm.responsibility = 'volunteer';
        break;
    }
  }

  toggleInvitePermission(perm: string) {
    const idx = this.inviteForm.permissions.indexOf(perm);
    if (idx > -1) {
      this.inviteForm.permissions.splice(idx, 1);
    } else {
      this.inviteForm.permissions.push(perm);
    }
  }

  hasInvitePermission(perm: string): boolean {
    return this.inviteForm.permissions.includes(perm);
  }

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
  hoveredChartPoint = signal<BookingDataPoint | null>(null);

  // Events Table Filtering
  eventSearchTerm = signal('');
  selectedStatusFilter = signal<'all' | 'published' | 'pending' | 'draft' | 'action_required'>('all');
  activeActionMenuId = signal<string | null>(null);

  // Modals & Drawers State
  selectedEventForDetails = signal<HostEventItem | null>(null);
  selectedEventForFeedback = signal<HostEventItem | null>(null);
  feedbackResponseNote = signal('');
  showCreateEventModal = signal(false);
  showInviteTeamModal = signal(false);
  toastMessage = signal<string | null>(null);

  // Create Event Wizard State
  createWizardStep = signal(1);
  newEventForm = {
    title: '',
    category: 'Music & Concerts',
    type: 'In-person Concert',
    description: '',
    date: '2026-11-28',
    timeStart: '18:00',
    timeEnd: '22:00',
    venue: '',
    city: 'Ahmedabad',
    capacity: 250,
    priceType: 'paid' as 'free' | 'paid',
    price: 499,
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
  };

  // Invite Team Form State
  newTeamMember = {
    name: '',
    email: '',
    role: 'Event Manager' as 'Event Manager' | 'Check-in Staff' | 'Marketing Lead'
  };

  // Categories for Select Component
  readonly categoryOptions: SelectOption[] = [
    { label: 'Music & Concerts', value: 'Music & Concerts' },
    { label: 'Technology & Startups', value: 'Technology & Startups' },
    { label: 'Art & Culture', value: 'Art & Culture' },
    { label: 'Sports & Fitness', value: 'Sports & Fitness' },
    { label: 'Food & Drinks', value: 'Food & Drinks' },
    { label: 'Film & Media', value: 'Film & Media' },
    { label: 'Workshops & Education', value: 'Workshops & Education' }
  ];

  readonly formatOptions: SelectOption[] = [
    { label: 'In-person Concert / Gig', value: 'In-person Concert' },
    { label: 'Hands-on Workshop', value: 'Hands-on Workshop' },
    { label: 'Conference / Keynote', value: 'Conference' },
    { label: 'Community Meetup / Networking', value: 'Community Meetup' },
    { label: 'Outdoor Festival', value: 'Outdoor Festival' },
    { label: 'Sports Tournament', value: 'Sports Tournament' }
  ];

  readonly cityOptions: SelectOption[] = [
    { label: 'Ahmedabad', value: 'Ahmedabad' },
    { label: 'Mumbai', value: 'Mumbai' },
    { label: 'Bengaluru', value: 'Bengaluru' },
    { label: 'Delhi NCR', value: 'Delhi NCR' },
    { label: 'Pune', value: 'Pune' }
  ];

  readonly teamRoleOptions: SelectOption[] = [
    { label: 'Event Manager (Full editing access)', value: 'Event Manager' },
    { label: 'Check-in Staff (QR Scanner & Gate check-in only)', value: 'Check-in Staff' },
    { label: 'Marketing Lead (Analytics & Promotion)', value: 'Marketing Lead' }
  ];

  readonly periodOptions: SelectOption[] = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' }
  ];

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
    const statusTab = this.selectedStatusFilter();

    return list.filter(event => {
      // Search filter
      const matchesSearch =
        !search ||
        event.title.toLowerCase().includes(search) ||
        event.category.toLowerCase().includes(search) ||
        event.venue.toLowerCase().includes(search);

      // Status tab filter
      let matchesStatus = true;
      if (statusTab === 'published') {
        matchesStatus = event.status === 'published';
      } else if (statusTab === 'pending') {
        matchesStatus = event.status === 'pending_review';
      } else if (statusTab === 'draft') {
        matchesStatus = event.status === 'draft';
      } else if (statusTab === 'action_required') {
        matchesStatus = event.status === 'changes_requested';
      }

      return matchesSearch && matchesStatus;
    });
  });

  // Smooth scroll to top of target section on page change
  scrollToSection(elementId: string) {
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        const yOffset = -90; // offset for fixed header
        const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 50);
  }

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
    if (!target.closest('.relative-action-menu')) {
      this.activeActionMenuId.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.showSearchDropdown.set(false);
    this.showTopUserMenu.set(false);
    this.showSidebarUserMenu.set(false);
    this.showNotificationsDropdown.set(false);
    this.activeActionMenuId.set(null);
  }

  setFilterStatus(status: 'all' | 'published' | 'pending' | 'draft' | 'action_required') {
    this.selectedStatusFilter.set(status);
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

  toggleActionMenu(eventId: string, event: MouseEvent) {
    event.stopPropagation();
    if (this.activeActionMenuId() === eventId) {
      this.activeActionMenuId.set(null);
    } else {
      this.activeActionMenuId.set(eventId);
    }
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

  // Event Details Drawer & Edit State
  isEditingEventDetails = signal(false);
  editEventForm = {
    title: '',
    category: 'Music & Concerts',
    date: '',
    time: '',
    venue: '',
    city: '',
    capacity: 100,
    price: 0,
    description: '',
    imageUrl: '',
    changeReason: ''
  };

  // Action Menu Commands
  openEventDetails(event: HostEventItem, startInEditMode = false) {
    this.selectedEventForDetails.set(event);
    this.activeActionMenuId.set(null);
    this.populateEditForm(event);
    this.isEditingEventDetails.set(startInEditMode);
  }

  populateEditForm(event: HostEventItem) {
    this.editEventForm = {
      title: event.title,
      category: event.category || 'Music & Concerts',
      date: event.date,
      time: event.time,
      venue: event.venue,
      city: event.city,
      capacity: event.capacity,
      price: event.price,
      description: event.description || '',
      imageUrl: event.imageUrl,
      changeReason: ''
    };
  }

  startEditingEvent() {
    const current = this.selectedEventForDetails();
    if (current) {
      this.populateEditForm(current);
      this.isEditingEventDetails.set(true);
    }
  }

  cancelEditingEvent() {
    this.isEditingEventDetails.set(false);
  }

  saveEventChanges(requestApproval: boolean) {
    const current = this.selectedEventForDetails();
    if (!current) return;

    if (!this.editEventForm.title.trim()) {
      this.showToast('Please enter an event title.');
      return;
    }

    const changes: Partial<HostEventItem> = {
      title: this.editEventForm.title.trim(),
      category: this.editEventForm.category,
      date: this.editEventForm.date,
      time: this.editEventForm.time,
      venue: this.editEventForm.venue,
      city: this.editEventForm.city,
      capacity: Number(this.editEventForm.capacity) || 100,
      price: Number(this.editEventForm.price) || 0,
      description: this.editEventForm.description,
      imageUrl: this.editEventForm.imageUrl || current.imageUrl
    };

    // Update in Host Dashboard State
    this.dashboardService.updateEvent(current.id, changes, requestApproval, this.editEventForm.changeReason);

    // Sync with Admin Curation queue if requesting approval or non-draft
    if (requestApproval || current.status !== 'draft') {
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

    // Refresh selected event drawer
    const updated = this.dashboardService.events().find(e => e.id === current.id);
    if (updated) {
      this.selectedEventForDetails.set(updated);
    }

    this.isEditingEventDetails.set(false);

    if (requestApproval || current.status !== 'draft') {
      this.showToast('Changes submitted to Admin! Review request is pending curation approval.');
    } else {
      this.showToast('Draft event saved successfully.');
    }
  }

  openFeedbackModal(event: HostEventItem) {
    this.selectedEventForFeedback.set(event);
    this.feedbackResponseNote.set('');
    this.activeActionMenuId.set(null);
  }

  submitDraftForReview(eventId: string) {
    this.dashboardService.submitEventForReview(eventId);
    this.activeActionMenuId.set(null);
    this.showToast('Event submitted for curation review!');
  }

  publishApprovedEvent(eventId: string) {
    this.dashboardService.publishEvent(eventId);
    this.activeActionMenuId.set(null);
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
    this.activeActionMenuId.set(null);
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

  submitFeedbackClarification() {
    const event = this.selectedEventForFeedback();
    if (event) {
      this.dashboardService.resolveFeedbackAndResubmit(event.id, this.feedbackResponseNote());
      this.selectedEventForFeedback.set(null);
      this.showToast('Clarification submitted. Event returned to review queue.');
    }
  }

  // Wizard Handling
  openCreateWizard() {
    this.createWizardStep.set(1);
    this.newEventForm = {
      title: '',
      category: 'Music & Concerts',
      type: 'In-person Concert',
      description: '',
      date: '2026-11-28',
      timeStart: '18:00',
      timeEnd: '22:00',
      venue: '',
      city: 'Ahmedabad',
      capacity: 250,
      priceType: 'paid',
      price: 499,
      imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
    };
    this.showCreateEventModal.set(true);
  }

  nextWizardStep() {
    if (this.createWizardStep() < 4) {
      this.createWizardStep.update(s => s + 1);
    }
  }

  prevWizardStep() {
    if (this.createWizardStep() > 1) {
      this.createWizardStep.update(s => s - 1);
    }
  }

  finishCreateEvent(asStatus: HostEventStatus) {
    const timeString = `${this.newEventForm.timeStart} – ${this.newEventForm.timeEnd}`;
    const dateFormatted = new Date(this.newEventForm.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    this.dashboardService.createNewEvent({
      title: this.newEventForm.title || 'New Event Showcase',
      category: this.newEventForm.category,
      type: this.newEventForm.type,
      description: this.newEventForm.description,
      date: dateFormatted,
      time: timeString,
      venue: this.newEventForm.venue || 'Ahmedabad Main Arena',
      city: this.newEventForm.city,
      capacity: this.newEventForm.capacity,
      price: this.newEventForm.priceType === 'paid' ? this.newEventForm.price : 0,
      imageUrl: this.newEventForm.imageUrl,
      status: asStatus
    });

    this.showCreateEventModal.set(false);
    this.showToast(asStatus === 'pending_review' ? 'Event submitted for review!' : 'Event saved to Drafts.');
  }

  // Invite Team & Event Participants (§ 5.0 - § 6.0)
  openInviteTeamModal() {
    this.inviteForm = {
      name: '',
      email: '',
      role: 'staff',
      roleCategory: 'operational',
      customRoleName: '',
      designationPreset: 'gate_scanner',
      designation: 'Gate & Barcode Scanner',
      responsibility: 'ticketing',
      permissions: ['scan_tickets', 'view_attendees', 'view_duty']
    };
    this.showInviteTeamModal.set(true);
  }

  async submitTeamInvite() {
    if (!this.inviteForm.email) {
      this.showToast('Please enter the invitee email address.');
      return;
    }

    const hostId = this.authService.currentUser()?.id || 'user-003';
    const result = await this.eventTeamService.sendInvitation(
      'evt-100',
      'Mumbai Festivals Showcase 1',
      hostId,
      this.inviteForm.email,
      this.inviteForm.name,
      this.inviteForm.role,
      this.inviteForm.roleCategory,
      this.inviteForm.customRoleName,
      {
        designation: this.inviteForm.designation || this.inviteForm.customRoleName || 'Event Staff',
        responsibility: this.inviteForm.responsibility,
        permissions: this.inviteForm.permissions
      }
    );

    if (result.success) {
      this.showInviteTeamModal.set(false);
      this.showToast(result.message);
    } else {
      this.showToast(result.message);
    }
  }

  async toggleDelegation(member: EventMembership) {
    const nextState = !member.delegationActive;
    await this.eventTeamService.toggleManagementDelegation(member.id, nextState);
    this.showToast(
      nextState
        ? `Management responsibilities delegated to ${member.name}.`
        : `Management delegation revoked from ${member.name}.`
    );
  }

  async removeMember(memberId: string, memberName: string) {
    await this.eventTeamService.removeMember(memberId);
    this.showToast(`Removed ${memberName} from the event team.`);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 5: OWNERSHIP & GOVERNANCE METHODS (§ 11.0, § 12.0, § 14.0)
  // ═══════════════════════════════════════════════════════════

  openAddOwnerModal() {
    const maxAvail = this.availableCoOwnerEquity();
    this.newOwnerForm = {
      userName: '',
      userEmail: '',
      organizationName: '',
      percentage: Math.min(10, Math.max(1, maxAvail))
    };
    this.showAddOwnerModal.set(true);
  }

  async submitAddOwner() {
    if (!this.newOwnerForm.userName || !this.newOwnerForm.userEmail) {
      this.showToast('Please enter the owner name and verified email.');
      return;
    }

    const res = await this.ownershipService.addCoOwnerStake(
      'evt-100',
      this.newOwnerForm.userName,
      this.newOwnerForm.userEmail,
      this.newOwnerForm.organizationName || 'Co-Owner Enterprise',
      this.newOwnerForm.percentage
    );

    this.showToast(res.message);
    if (res.success) {
      this.showAddOwnerModal.set(false);
    }
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
    this.newManagerForm = {
      userName: '',
      userEmail: '',
      responsibilityArea: 'venue_logistics',
      customTitle: ''
    };
    this.showAssignManagerModal.set(true);
  }

  async submitAssignManager() {
    if (!this.newManagerForm.userName || !this.newManagerForm.userEmail) {
      this.showToast('Please provide manager name and email.');
      return;
    }

    const res = await this.ownershipService.assignManager(
      'evt-100',
      this.newManagerForm.userName,
      this.newManagerForm.userEmail,
      this.newManagerForm.responsibilityArea,
      this.newManagerForm.customTitle
    );

    this.showToast(res.message);
    if (res.success) {
      this.showAssignManagerModal.set(false);
    }
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
    this.newParticipantForm = {
      category,
      name: '',
      designationOrCompany: '',
      bio: '',
      email: ''
    };
    this.showAddParticipantModal.set(true);
  }

  async submitAddParticipant() {
    if (!this.newParticipantForm.name) {
      this.showToast('Please enter the participant or sponsor name.');
      return;
    }

    const res = await this.ownershipService.addParticipant(
      'evt-100',
      this.newParticipantForm.category,
      this.newParticipantForm.name,
      this.newParticipantForm.designationOrCompany,
      this.newParticipantForm.bio,
      this.newParticipantForm.email
    );

    this.showToast(res.message);
    if (res.success) {
      this.showAddParticipantModal.set(false);
    }
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
