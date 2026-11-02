import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components';
import { EventItem } from '@core/models';
import { DEFAULT_RECENT_SEARCHES } from '@core/constants';

@Component({
  selector: 'app-header-search',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './header-search.component.html',
  styleUrl: './header-search.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderSearchComponent {
  @Input() allEvents: EventItem[] = [];
  @Input() isFocused = false;

  @Output() searchSubmitted = new EventEmitter<string>();
  @Output() eventSelected = new EventEmitter<string>();
  @Output() focusChanged = new EventEmitter<boolean>();

  searchQuery = signal('');
  recentSearches = signal<string[]>([...DEFAULT_RECENT_SEARCHES]);

  readonly spotlightEvents = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const events = this.allEvents;

    if (!query) {
      return events.filter(e => e.isFeatured || e.isPopular || e.status === 'published').slice(0, 4);
    }

    return events.filter(e =>
      (e.title && e.title.toLowerCase().includes(query)) ||
      (e.category && e.category.toLowerCase().includes(query)) ||
      (e.location?.venue && e.location.venue.toLowerCase().includes(query)) ||
      (e.location?.city && e.location.city.toLowerCase().includes(query)) ||
      (e.description && e.description.toLowerCase().includes(query))
    ).slice(0, 6);
  });

  onSearchInputChange(val: string) {
    this.searchQuery.set(val || '');
  }

  onSearchFocus() {
    this.focusChanged.emit(true);
  }

  onSearchSubmit(event?: Event) {
    if (event) event.preventDefault();
    const q = this.searchQuery().trim();
    if (!q) return;

    this.recentSearches.update(list => [q, ...list.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 5));
    this.focusChanged.emit(false);
    this.searchSubmitted.emit(q);
  }

  selectSearchItem(eventId: string) {
    this.focusChanged.emit(false);
    this.eventSelected.emit(eventId);
  }

  selectRecentSearch(term: string) {
    this.searchQuery.set(term);
    this.onSearchSubmit();
  }

  clearSearch() {
    this.searchQuery.set('');
  }
}
