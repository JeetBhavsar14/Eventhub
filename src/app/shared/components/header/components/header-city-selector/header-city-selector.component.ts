import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { POPULAR_CITIES } from '@core/constants';

@Component({
  selector: 'app-header-city-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header-city-selector.component.html',
  styleUrl: './header-city-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderCitySelectorComponent {
  @Input() selectedCity = 'Mumbai';
  @Input() isOpen = false;

  @Output() citySelected = new EventEmitter<string>();
  @Output() toggleMenu = new EventEmitter<void>();
  @Output() detectLocationRequested = new EventEmitter<void>();

  citySearchQuery = signal('');

  popularCities: string[] = [
    ...POPULAR_CITIES,
    'Chandigarh',
    'Jaipur'
  ];

  get filteredCities(): string[] {
    const query = this.citySearchQuery().trim().toLowerCase();
    if (!query) {
      return this.popularCities;
    }
    return this.popularCities.filter(city =>
      city.toLowerCase().includes(query)
    );
  }

  onToggle(event: MouseEvent) {
    event.stopPropagation();
    this.toggleMenu.emit();
  }

  onSelectCity(city: string) {
    this.citySelected.emit(city);
    this.citySearchQuery.set('');
  }

  onDetectLocation() {
    this.detectLocationRequested.emit();
    this.citySearchQuery.set('');
  }
}

