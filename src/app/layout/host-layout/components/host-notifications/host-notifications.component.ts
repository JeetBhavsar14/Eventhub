import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostNotificationItem } from '@core/models';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-host-notifications',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './host-notifications.component.html',
  styleUrl: './host-notifications.component.css'
})
export class HostNotificationsComponent {
  @Input({ required: true }) notifications: HostNotificationItem[] = [];
  @Input({ required: true }) unreadCount: number = 0;

  @Output() markAllRead = new EventEmitter<void>();
}
