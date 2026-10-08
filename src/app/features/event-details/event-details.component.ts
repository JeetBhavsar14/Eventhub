import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiClient } from '@core/api';
import { AuthService } from '@core/auth';
import { ButtonComponent } from '@shared/components';
import { SVGS } from '@shared/assets';

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './event-details.component.html',
  styleUrl: './event-details.component.css'
})
export class EventDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiClient = inject(ApiClient);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  event = signal<any>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  
  isBookingModalOpen = signal(false);
  currentUser = this.authService.currentUser;

  calendarSvg: SafeHtml;
  mapPinSvg: SafeHtml;
  ticketSvg: SafeHtml;

  constructor() {
    this.calendarSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.calendar);
    this.mapPinSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.mapPin);
    this.ticketSvg = this.sanitizer.bypassSecurityTrustHtml(SVGS.ticket);
  }

  ngOnInit() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      if (id) {
        await this.loadEvent(id);
      }
    });
  }

  async loadEvent(id: string) {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const res = await this.apiClient.get<any>(`/events/${id}`);
      if (res.data) {
        this.event.set(res.data);
      } else {
        this.error.set('Event not found.');
      }
    } catch (err) {
      console.error(err);
      this.error.set('Failed to load event details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  bookTicket() {
    if (!this.currentUser()) {
      alert('Please log in first to book tickets.');
      this.router.navigate(['/auth/login']);
      return;
    }
    this.router.navigate(['/checkout', this.event().id]);
  }
}
