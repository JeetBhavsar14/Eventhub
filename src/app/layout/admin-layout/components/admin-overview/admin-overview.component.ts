import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminHostApplication, AdminCurationEvent } from '@core/state';
import { IconComponent } from '@shared/components';
import { AdminView, PlatformStats } from '../../admin.models';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './admin-overview.component.html',
  styleUrls: ['../../admin-shared.css', './admin-overview.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOverviewComponent {
  private readonly adminService = inject(AdminService);

  @Input({ required: true }) platformStats!: PlatformStats;

  readonly hostApplications = this.adminService.hostApplications;
  readonly curationEvents = this.adminService.curationEvents;

  @Output() navigate = new EventEmitter<AdminView>();
  @Output() inspectApp = new EventEmitter<AdminHostApplication>();
  @Output() inspectEvent = new EventEmitter<AdminCurationEvent>();

  goTo(view: AdminView) {
    this.navigate.emit(view);
  }

  onInspectApp(app: AdminHostApplication) {
    this.inspectApp.emit(app);
  }

  onInspectEvent(event: AdminCurationEvent) {
    this.inspectEvent.emit(event);
  }
}
