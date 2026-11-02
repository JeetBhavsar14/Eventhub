import { Component, Input, Output, EventEmitter, HostBinding, HostListener, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components';
import { AdminView, PlatformStats } from '../../admin.models';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSidebarComponent {
  @Input() currentView: AdminView = 'overview';
  @Input() platformStats: PlatformStats | null = null;
  @Input() @HostBinding('class.collapsed') isSidebarCollapsed = false;
  @Input() @HostBinding('class.mobile-open') isMobileNavOpen = false;

  @Output() navigate = new EventEmitter<AdminView>();
  @Output() closeMobile = new EventEmitter<void>();
  @Output() signOut = new EventEmitter<void>();

  showAdminMenu = signal(false);

  toggleAdminMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showAdminMenu.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.admin-sidebar-footer')) {
      this.showAdminMenu.set(false);
    }
  }

  onSelectView(view: AdminView) {
    this.navigate.emit(view);
    this.showAdminMenu.set(false);
  }

  onSignOut() {
    this.showAdminMenu.set(false);
    this.signOut.emit();
  }
}

