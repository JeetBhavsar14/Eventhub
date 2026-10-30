import { Component, signal, computed, HostListener, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth';
import { ManagementService, ToastService } from '@core/state';

export type ManagementView =
  | 'overview'
  | 'event_operations'
  | 'staff_teams'
  | 'gates'
  | 'bookings'
  | 'reports'
  | 'notifications'
  | 'settings';

@Component({
  selector: 'app-management-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './management-layout.component.html',
  styleUrl: './management-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManagementLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly mgmtService = inject(ManagementService);
  private readonly toastService = inject(ToastService);

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

  // Confirmation Dialog System
  showConfirmationDialog = signal(false);
  confirmDialogData = {
    title: '',
    message: '',
    actionBtnText: '',
    isDestructive: false
  };
  pendingConfirmAction: (() => void) | null = null;

  // Filter States
  selectedCategoryFilter = signal('all');
  selectedLocationFilter = signal('all');

  // Expose signals from ManagementService
  readonly monitoredEvents = this.mgmtService.monitoredEvents;
  readonly staffRoster = this.mgmtService.staffRoster;
  readonly gateStatuses = this.mgmtService.gateStatuses;

  // Computed Delegated Operational KPIs
  operationalKPIs = computed(() => {
    const monitored = this.monitoredEvents();
    const staff = this.staffRoster();
    const gates = this.gateStatuses();

    const activeLiveEvents = monitored.length;
    const totalBookedTickets = monitored.reduce((sum, e) => sum + e.bookedCount, 0);
    const onDutyStaffCount = staff.filter(s => s.status === 'on_duty').length;
    const totalGatesActive = gates.length;
    const crowdedGatesCount = gates.filter(g => g.status === 'crowded').length;

    return {
      activeLiveEvents,
      totalBookedTickets,
      onDutyStaffCount,
      totalGatesActive,
      crowdedGatesCount
    };
  });

  // Filtered Events Managed Under Delegation
  filteredMonitoredEvents = computed(() => {
    const list = this.monitoredEvents();
    const q = this.searchQuery().toLowerCase().trim();
    return list.filter(e =>
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      e.hostName.toLowerCase().includes(q)
    );
  });

  // Filtered Staff Rosters
  filteredStaff = computed(() => {
    const list = this.staffRoster();
    const q = this.searchQuery().toLowerCase().trim();
    return list.filter(s =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.assignedGate.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    );
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

  async reassignStaffGate(staffId: string, newGate: string) {
    const success = await this.mgmtService.updateStaffAssignment(staffId, newGate, 'on_duty');
    if (!success) {
      this.showToast('Failed to update staff gate deployment. Please try again.');
      return;
    }
    this.showToast('Staff gate deployment updated.');
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
    this.toastService.info(msg);
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
