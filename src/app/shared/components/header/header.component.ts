import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '@core/auth';
import { LocationService } from '@core/state';
import { SVGS } from '@shared/assets';

export interface NavCategory {
  label: string;
  icon: SafeHtml;
  route: string;
  active?: boolean;
}

export interface NavSecondaryLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private locationService = inject(LocationService);

  /**
   * Pass a COMPLETE Lucide/custom SVG string.
   * Just ensure stroke/fill uses "currentColor" (not a hardcoded hex).
   * Width/height will be overridden by CSS class .cat-icon svg
   */
  private svg(fullSvg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(fullSvg);
  }

  @Input() categories: NavCategory[] = [
    {
      label: 'Events',
      icon: this.svg(SVGS.events),
      route: '/discover'
    },
    {
      label: 'Concerts',
      icon: this.svg(SVGS.concerts),
      route: '/discover?category=Concerts'
    },
    {
      label: 'Sports',
      icon: this.svg(SVGS.sports),
      route: '/discover?category=Sports'
    },
    {
      label: 'Conferences',
      icon: this.svg(SVGS.conferences),
      route: '/discover?category=Conferences'
    },
    {
      label: 'Workshops',
      icon: this.svg(SVGS.workshops),
      route: '/discover?category=Workshops'
    },
    {
      label: 'Festivals',
      icon: this.svg(SVGS.festivals),
      route: '/discover?category=Festivals'
    },
    {
      label: 'Others',
      icon: this.svg(SVGS.others),
      route: '/discover?category=Others'
    },
  ];

  @Input() secondaryLinks: NavSecondaryLink[] = [
    { label: 'Host an Event', route: '/host/apply' },
    { label: 'Corporates',    route: '/corporate' },
    { label: 'Offers',        route: '/offers' },
    { label: 'Gift Cards',    route: '/gift-cards' },
  ];

  isAuthenticated = this.authService.isAuthenticated;
  currentUser     = this.authService.currentUser;
  selectedCity    = this.locationService.selectedCity;

  showUserMenu = false;
  showCityMenu = false;
  searchQuery  = '';
  citySearchQuery = '';

  popularCities = [
    'Mumbai', 'Ahmedabad', 'Delhi-NCR', 'Bengaluru', 'Pune', 
    'Hyderabad', 'Chennai', 'Kolkata', 'Chandigarh', 'Jaipur'
  ];
  
  get filteredCities(): string[] {
    if (!this.citySearchQuery.trim()) {
      return this.popularCities;
    }
    const lowerQuery = this.citySearchQuery.toLowerCase();
    return this.popularCities.filter(city => 
      city.toLowerCase().includes(lowerQuery)
    );
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) this.showCityMenu = false;
  }

  toggleCityMenu() {
    this.showCityMenu = !this.showCityMenu;
    if (this.showCityMenu) this.showUserMenu = false;
  }

  selectCity(city: string) {
    this.locationService.setCity(city);
    this.showCityMenu = false;
    this.citySearchQuery = '';
  }

  detectLocation() {
    this.selectCity('Ahmedabad');
  }

  logout() {
    this.showUserMenu = false;
    this.authService.logout();
  }

  getInitials(): string {
    const user = this.currentUser();
    if (!user) return '?';
    return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  }

  scrollToEvents() {
    setTimeout(() => {
      const el = document.getElementById('discover-events-section');
      if (el) {
        // Offset for the sticky header
        const y = el.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  }
}
