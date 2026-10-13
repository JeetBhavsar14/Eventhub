import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectComponent } from '../select/select.component';

export interface FilterState {
  category: string;
  type?: string;
  date: string;
  price: string;
  customDate?: string;
}

@Component({
  selector: 'app-event-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
  templateUrl: './event-filter.component.html',
  styleUrl: './event-filter.component.css',
})
export class EventFilterComponent {
  @Output() filterChange = new EventEmitter<FilterState>();

  categories = ['All', 'Concerts', 'Festivals', 'Sports', 'Conferences', 'Workshops', 'Shows & Entertainment', 'Activities', 'Technology', 'Arts & Culture', 'Food & Lifestyle'];
  
  categoryTypes: Record<string, string[]> = {
    'Sports': ['All Sports', 'Cricket', 'Football', 'Basketball', 'Tennis', 'Marathon'],
    'Concerts': ['All Concerts', 'Rock', 'Pop', 'Classical', 'Jazz', 'EDM', 'Indie'],
    'Workshops': ['All Workshops', 'Design', 'Coding', 'Photography', 'Cooking', 'Business'],
    'Technology': ['All Tech', 'AI & ML', 'Web Dev', 'Cybersecurity', 'Blockchain']
  };

  dateOptions = ['Any Date', 'Today', 'Tomorrow', 'This Weekend', 'Next Week', 'Custom Date'];
  priceOptions = ['Any Price', 'Free', 'Under ₹500', '₹500 - ₹1500', '₹1500 - ₹3000', '₹3000+'];

  @Input() currentFilter: FilterState = {
    category: 'All',
    date: 'Any Date',
    price: 'Any Price'
  };

  getTypeOptions(): string[] {
    const list = this.categoryTypes[this.currentFilter.category];
    if (!list) return [];
    return ['All types', ...list];
  }

  onCategoryChange(newCategory?: string) {
    if (newCategory !== undefined) {
      this.currentFilter.category = newCategory;
    }
    this.currentFilter.type = undefined; // Reset sub-type when category changes
    this.emitChange();
  }

  onTypeChange(newType?: string) {
    this.currentFilter.type = (newType === 'All types' || !newType) ? undefined : newType;
    this.emitChange();
  }

  onDateChange(newDate?: string) {
    if (newDate !== undefined) {
      this.currentFilter.date = newDate;
    }
    this.emitChange();
  }

  onPriceChange(newPrice?: string) {
    if (newPrice !== undefined) {
      this.currentFilter.price = newPrice;
    }
    this.emitChange();
  }

  clearFilters() {
    this.currentFilter = {
      category: 'All',
      date: 'Any Date',
      price: 'Any Price'
    };
    this.emitChange();
  }

  hasActiveFilters(): boolean {
    return this.currentFilter.category !== 'All' || !!this.currentFilter.type ||
      this.currentFilter.date !== 'Any Date' || this.currentFilter.price !== 'Any Price' ||
      !!this.currentFilter.customDate;
  }

  private emitChange() {
    this.filterChange.emit({ ...this.currentFilter });
  }
}
