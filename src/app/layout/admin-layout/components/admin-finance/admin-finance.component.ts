import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AdminSettlement } from '@core/state';
import { IconComponent } from '@shared/components';
import { PlatformStats } from '../../admin.models';

@Component({
  selector: 'app-admin-finance',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './admin-finance.component.html',
  styleUrls: ['../../admin-shared.css', './admin-finance.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminFinanceComponent {
  private readonly adminService = inject(AdminService);

  @Input({ required: true }) platformStats!: PlatformStats;

  readonly settlements = this.adminService.settlements;

  @Output() releasePayout = new EventEmitter<AdminSettlement>();

  onReleasePayout(settlement: AdminSettlement) {
    this.releasePayout.emit(settlement);
  }
}
