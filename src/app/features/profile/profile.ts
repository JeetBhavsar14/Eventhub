import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';
import { ProfileFormComponent } from '@shared/forms';
import { AuthService } from '@core/auth';
import { HostApplicationService, ToastService } from '@core/state';
import { ApiClient } from '@core/api';
import { UserProfileUpdate, Booking } from '@core/models';
import { IconComponent } from '@shared/components';

export type ProfileTab = 'dashboard' | 'bookings' | 'personal' | 'preferences' | 'payments' | 'favorites';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ProfileFormComponent, IconComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  activeTab = signal<ProfileTab>('dashboard');
  
  private authService = inject(AuthService);
  private hostAppService = inject(HostApplicationService);
  private apiClient = inject(ApiClient);
  private toastService = inject(ToastService);

  readonly currentUser = this.authService.currentUser;
  readonly hostStatus = this.hostAppService.status;
  readonly applicationData = this.hostAppService.applicationData;

  // Bookings Data
  readonly bookings = signal<Booking[]>([]);
  readonly isLoadingBookings = signal(false);

  // Favorites / Saved Events
  readonly savedEvents = signal<any[]>([]);

  // QR Modal State
  readonly selectedBookingForQr = signal<Booking | null>(null);
  readonly qrModalUrl = signal<string>('');

  // Preference selections
  selectedGenres = signal<string[]>(['Festivals', 'Concerts', 'Conferences']);
  readonly availableGenres = [
    'Festivals',
    'Concerts',
    'Conferences',
    'Shows & Entertainment',
    'Sports',
    'Workshops',
    'Movies & Cinema'
  ];

  readonly isApprovedHost = computed(() => {
    return this.hostStatus() === 'approved' || this.currentUser()?.isHost === true;
  });

  readonly isHostApplied = computed(() => {
    return this.hostStatus() !== 'guest' && this.hostStatus() !== 'not_applied';
  });

  readonly isStaffUser = computed(() => {
    const role = this.currentUser()?.platformRole;
    return role === 'staff' || role === 'management' || role === 'admin';
  });

  // Upcoming Bookings Filter
  readonly upcomingBookings = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.bookings().filter(b => b.status === 'confirmed' && b.eventDate >= today);
  });

  // Past Bookings Filter
  readonly pastBookings = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.bookings().filter(b => b.eventDate < today || b.status !== 'confirmed');
  });

  // Total Active Tickets Count
  readonly activeTicketsCount = computed(() => {
    return this.upcomingBookings().reduce((sum, b) => {
      const ticketsInBooking = b.tickets.reduce((cnt, t) => cnt + t.quantity, 0);
      return sum + ticketsInBooking;
    }, 0);
  });

  // Nearest Upcoming Spotlight Booking
  readonly nextUpcomingBooking = computed(() => {
    const upcoming = this.upcomingBookings();
    if (upcoming.length === 0) return null;
    return [...upcoming].sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0];
  });

  readonly isSaving = signal(false);
  readonly saveMessage = signal('');
  readonly saveError = signal(false);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadUserBookings(),
      this.loadSavedEvents()
    ]);
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async loadUserBookings(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    this.isLoadingBookings.set(true);

    try {
      const res = await this.apiClient.get<Booking[]>('/bookings', { userId: user.id });
      if (res.data) {
        this.bookings.set([...res.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
    } catch (e) {
      console.error('Failed to load bookings', e);
    } finally {
      this.isLoadingBookings.set(false);
    }
  }

  async loadSavedEvents(): Promise<void> {
    try {
      const res = await this.apiClient.get<any[]>('/events');
      if (res.data && res.data.length > 0) {
        // Take top 3 events as sample favorites
        this.savedEvents.set(res.data.slice(0, 3));
      }
    } catch (e) {
      console.error('Failed to load saved events', e);
    }
  }

  // Open Quick QR Pass Modal
  async openQrPass(booking: Booking): Promise<void> {
    this.selectedBookingForQr.set(booking);
    const code = booking.bookingReference || booking.id;
    try {
      const url = await QRCode.toDataURL(code, { width: 220, margin: 1 });
      this.qrModalUrl.set(url);
    } catch {
      this.qrModalUrl.set('');
    }
  }

  closeQrPass(): void {
    this.selectedBookingForQr.set(null);
    this.qrModalUrl.set('');
  }

  getBookingTicketsCount(booking: Booking): number {
    return booking.tickets.reduce((acc, t) => acc + t.quantity, 0);
  }

  toggleGenre(genre: string): void {
    const current = this.selectedGenres();
    if (current.includes(genre)) {
      this.selectedGenres.set(current.filter(g => g !== genre));
    } else {
      this.selectedGenres.set([...current, genre]);
    }
    this.toastService.success(`Updated favorite genres`);
  }

  async saveProfile(changes: UserProfileUpdate): Promise<void> {
    this.isSaving.set(true);
    this.saveMessage.set('');
    const result = await this.authService.updateProfile(changes);
    this.saveError.set(!result.success);
    this.saveMessage.set(result.message);
    if (result.success) {
      this.toastService.success('Profile updated successfully');
    } else {
      this.toastService.error(result.message || 'Failed to update profile');
    }
    this.isSaving.set(false);
  }

  printTicket(): void {
    window.print();
  }
}
