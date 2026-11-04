import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components';
import { AppNotification } from '@core/models';

@Component({
  selector: 'app-header-notifications',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './header-notifications.component.html',
  styleUrl: './header-notifications.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderNotificationsComponent {
  @Input() isOpen = false;

  private _notifications = signal<AppNotification[]>([]);

  @Input() set notifications(val: AppNotification[] | null | undefined) {
    this._notifications.set(val || []);
  }
  get notifications(): AppNotification[] {
    return this._notifications();
  }

  @Input() unreadCount = 0;

  @Output() toggleOpened = new EventEmitter<MouseEvent>();
  @Output() notificationClicked = new EventEmitter<AppNotification>();
  @Output() markAllRead = new EventEmitter<MouseEvent>();
  @Output() acceptInvitation = new EventEmitter<{ notification: AppNotification; event: MouseEvent }>();
  @Output() declineInvitation = new EventEmitter<{ notification: AppNotification; event: MouseEvent }>();
  @Output() dismissNotification = new EventEmitter<{ id: string; event: MouseEvent }>();
  @Output() openWorkspace = new EventEmitter<{ notification: AppNotification; event: MouseEvent }>();

  notificationFilter = signal<'all' | 'action_required' | 'activity' | 'unread'>('all');

  // Computed signals accurately tracking reactive _notifications signal
  readonly allNotifications = computed(() => this._notifications());
  readonly totalCount = computed(() => this._notifications().length);

  readonly actionRequiredNotifications = computed(() =>
    this._notifications().filter(n => n.type === 'invitation' && (!n.invitationStatus || n.invitationStatus === 'pending'))
  );

  readonly activityNotifications = computed(() =>
    this._notifications().filter(n => !(n.type === 'invitation' && (!n.invitationStatus || n.invitationStatus === 'pending')))
  );

  readonly unreadNotificationsList = computed(() =>
    this._notifications().filter(n => !n.read)
  );

  readonly displayedNotifications = computed(() => {
    const filter = this.notificationFilter();
    if (filter === 'action_required') {
      return this.actionRequiredNotifications();
    }
    if (filter === 'activity') {
      return this.activityNotifications();
    }
    if (filter === 'unread') {
      return this.unreadNotificationsList();
    }
    return this._notifications();
  });

  setFilter(filter: 'all' | 'action_required' | 'activity' | 'unread', event: MouseEvent) {
    event.stopPropagation();
    this.notificationFilter.set(filter);
  }

  onToggle(event: MouseEvent) {
    this.toggleOpened.emit(event);
  }

  onNotificationClick(notif: AppNotification) {
    this.notificationClicked.emit(notif);
  }

  onMarkAllRead(event: MouseEvent) {
    this.markAllRead.emit(event);
  }

  onAccept(notif: AppNotification, event: MouseEvent) {
    this.acceptInvitation.emit({ notification: notif, event });
  }

  onDecline(notif: AppNotification, event: MouseEvent) {
    this.declineInvitation.emit({ notification: notif, event });
  }

  onDismiss(id: string, event: MouseEvent) {
    this.dismissNotification.emit({ id, event });
  }

  onWorkspace(notif: AppNotification, event: MouseEvent) {
    this.openWorkspace.emit({ notification: notif, event });
  }

  formatTimeAgo(isoString: string): string {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'booking': return 'ticket';
      case 'invitation': return 'mail';
      case 'event_status': return 'check-circle';
      case 'reminder': return 'calendar';
      case 'host_application': return 'shield';
      default: return 'bell';
    }
  }
}
