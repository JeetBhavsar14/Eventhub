import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components';
import { AdminView } from '../../admin.models';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminHeaderComponent {
  @Input() currentView: AdminView = 'overview';

  @Output() toggleMobile = new EventEmitter<void>();
  @Output() openBroadcast = new EventEmitter<void>();
  @Output() signOut = new EventEmitter<void>();
}

