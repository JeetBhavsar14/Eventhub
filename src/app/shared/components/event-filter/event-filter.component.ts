import { Component, EventEmitter, Output, Input, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectComponent } from '../select/select.component';
import { IconComponent } from '../icon/icon.component';
import { EventFilter } from '@core/models/event-membership.model';

export interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelectedStart: boolean;
  isSelectedEnd: boolean;
  isInRange: boolean;
}

@Component({
  selector: 'app-event-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent, IconComponent],
  templateUrl: './event-filter.component.html',
  styleUrl: './event-filter.component.css',
})
export class EventFilterComponent implements OnInit, OnDestroy {
  @Output() filterChange = new EventEmitter<EventFilter>();

  categories = [
    'All',
    'Concerts',
    'Festivals',
    'Sports',
    'Conferences',
    'Workshops',
    'Shows & Entertainment',
    'Activities',
    'Technology',
    'Arts & Culture',
    'Food & Lifestyle',
    'Comedy & Theater',
    'Health & Wellness',
    'Parties & Nightlife'
  ];
  
  categoryTypes: Record<string, string[]> = {
    'Sports': ['All Sports', 'Cricket', 'Football', 'Basketball', 'Tennis', 'Marathon'],
    'Concerts': ['All Concerts', 'Rock', 'Pop', 'Classical', 'Jazz', 'EDM', 'Indie'],
    'Workshops': ['All Workshops', 'Design', 'Coding', 'Photography', 'Cooking', 'Business'],
    'Technology': ['All Tech', 'AI & ML', 'Web Dev', 'Cybersecurity', 'Blockchain', 'Cloud Computing'],
    'Shows & Entertainment': ['All Shows', 'Standup Comedy', 'Magic Show', 'Live Drama', 'Circus'],
    'Activities': ['All Activities', 'Trekking', 'Escape Room', 'Camping', 'Paintball', 'Gaming'],
    'Arts & Culture': ['All Arts', 'Art Exhibition', 'Museum Tour', 'Pottery', 'Painting Workshop'],
    'Food & Lifestyle': ['All Food', 'Food Fest', 'Wine Tasting', 'Baking', 'Coffee Brewing'],
    'Comedy & Theater': ['All Comedy', 'Stand-up', 'Improv', 'Musical Theater', 'Open Mic'],
    'Health & Wellness': ['All Wellness', 'Yoga', 'Meditation', 'Fitness Bootcamp', 'Zumba'],
    'Parties & Nightlife': ['All Parties', 'Club Night', 'DJ Night', 'Rooftop Party', 'Pool Party'],
    'Festivals': ['All Festivals', 'Music Fest', 'Cultural Fest', 'Film Fest', 'Food Fest'],
    'Conferences': ['All Conferences', 'Tech Summit', 'Business Expo', 'Medical Conf', 'Leadership']
  };

  dateOptions = ['Any Date', 'Today', 'Tomorrow', 'This Weekend', 'Next Week', 'Specific Range'];
  priceOptions = ['Any Price', 'Free', 'Under ₹500', '₹500 - ₹1500', '₹1500 - ₹3000', '₹3000+', 'Custom Range'];

  @Input() currentFilter: EventFilter = {
    category: 'All',
    date: 'Any Date',
    price: 'Any Price'
  };

  // Price Limits
  readonly minPriceLimit = 0;
  readonly maxPriceLimit = 50000;

  // Custom Styled Calendar State
  isCalendarOpen = false;
  activePickingField: 'start' | 'end' = 'start';
  viewYear = 2026;
  viewMonth = 9; // 0-indexed: 9 = October
  calendarDays: CalendarDay[] = [];

  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  readonly weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  ngOnInit(): void {
    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();
    this.generateCalendarDays();
  }

  ngOnDestroy(): void {
    if (this.priceDebounceTimer) {
      clearTimeout(this.priceDebounceTimer);
    }
  }

  get currentMonthLabel(): string {
    return `${this.monthNames[this.viewMonth]} ${this.viewYear}`;
  }

  getTypeOptions(): string[] {
    const list = this.categoryTypes[this.currentFilter.category];
    if (!list) return [];
    return ['All types', ...list];
  }

  onCategoryChange(newCategory?: string): void {
    if (newCategory !== undefined) {
      this.currentFilter.category = newCategory;
    }
    this.currentFilter.type = undefined;
    this.emitChange();
  }

  onTypeChange(newType?: string): void {
    this.currentFilter.type = (newType === 'All types' || !newType) ? undefined : newType;
    this.emitChange();
  }

  onDateChange(newDate?: string): void {
    if (newDate !== undefined) {
      this.currentFilter.date = newDate;
    }
    if (this.currentFilter.date !== 'Specific Range') {
      this.currentFilter.startDate = undefined;
      this.currentFilter.endDate = undefined;
      this.currentFilter.customDate = undefined;
      this.isCalendarOpen = false;
    }
    this.emitChange();
  }

  onPriceChange(newPrice?: string): void {
    if (newPrice !== undefined) {
      this.currentFilter.price = newPrice;
    }
    if (this.currentFilter.price !== 'Custom Range') {
      this.currentFilter.minPrice = undefined;
      this.currentFilter.maxPrice = undefined;
    }
    this.emitChange();
  }

  // ── Custom Styled Calendar Methods ──────────────────────────
  toggleCalendar(field: 'start' | 'end', event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (this.isCalendarOpen && this.activePickingField === field) {
      this.isCalendarOpen = false;
    } else {
      this.activePickingField = field;
      this.isCalendarOpen = true;

      const activeDate = field === 'start' ? this.currentFilter.startDate : this.currentFilter.endDate;
      if (activeDate) {
        const parts = activeDate.split('-');
        if (parts.length === 3) {
          this.viewYear = parseInt(parts[0], 10);
          this.viewMonth = parseInt(parts[1], 10) - 1;
        }
      }
      this.generateCalendarDays();
    }
  }

  setPickingField(field: 'start' | 'end', event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.activePickingField = field;
    this.generateCalendarDays();
  }

  closeCalendar(): void {
    this.isCalendarOpen = false;
  }

  prevMonth(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.viewMonth--;
    if (this.viewMonth < 0) {
      this.viewMonth = 11;
      this.viewYear--;
    }
    this.generateCalendarDays();
  }

  nextMonth(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.viewMonth++;
    if (this.viewMonth > 11) {
      this.viewMonth = 0;
      this.viewYear++;
    }
    this.generateCalendarDays();
  }

  generateCalendarDays(): void {
    const days: CalendarDay[] = [];
    const firstDayOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInCurrentMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();

    const todayStr = this.formatDate(new Date());
    const startStr = this.currentFilter.startDate;
    const endStr = this.currentFilter.endDate;

    // Previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(this.viewYear, this.viewMonth - 1, daysInPrevMonth - i);
      const dateStr = this.formatDate(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelectedStart: dateStr === startStr,
        isSelectedEnd: dateStr === endStr,
        isInRange: this.isDateInRange(dateStr, startStr, endStr)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(this.viewYear, this.viewMonth, i);
      const dateStr = this.formatDate(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelectedStart: dateStr === startStr,
        isSelectedEnd: dateStr === endStr,
        isInRange: this.isDateInRange(dateStr, startStr, endStr)
      });
    }

    // Next month leading days (fill up grid)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(this.viewYear, this.viewMonth + 1, i);
      const dateStr = this.formatDate(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelectedStart: dateStr === startStr,
        isSelectedEnd: dateStr === endStr,
        isInRange: this.isDateInRange(dateStr, startStr, endStr)
      });
    }

    this.calendarDays = days;
  }

  onSelectDay(day: CalendarDay): void {
    const str = day.dateStr;

    if (!day.isCurrentMonth) {
      this.viewYear = day.date.getFullYear();
      this.viewMonth = day.date.getMonth();
    }

    if (this.activePickingField === 'start') {
      this.currentFilter.startDate = str;
      // If end date exists and is earlier than start date, sync end date to match
      if (this.currentFilter.endDate && this.currentFilter.endDate < str) {
        this.currentFilter.endDate = str;
      }
      // Automatically switch to picking End Date next
      this.activePickingField = 'end';
    } else {
      // Picking end date
      if (this.currentFilter.startDate && str < this.currentFilter.startDate) {
        // Clicked date is earlier than start date: set start date to this date
        this.currentFilter.startDate = str;
        this.activePickingField = 'end';
      } else {
        this.currentFilter.endDate = str;
      }
    }

    this.currentFilter.date = 'Specific Range';
    this.emitChange();
    this.generateCalendarDays();
  }

  clearSingleDate(field: 'start' | 'end', event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (field === 'start') {
      this.currentFilter.startDate = undefined;
    } else {
      this.currentFilter.endDate = undefined;
    }
    this.emitChange();
    this.generateCalendarDays();
  }

  clearDateRange(): void {
    this.currentFilter.startDate = undefined;
    this.currentFilter.endDate = undefined;
    this.emitChange();
    this.generateCalendarDays();
  }

  applyPreset(preset: 'today' | 'weekend' | 'next7' | 'thisMonth'): void {
    this.currentFilter.date = 'Specific Range';
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();

    if (preset === 'today') {
      const todayStr = this.formatDate(today);
      this.currentFilter.startDate = todayStr;
      this.currentFilter.endDate = todayStr;
    } else if (preset === 'weekend') {
      const dayOfWeek = today.getDay();
      const daysUntilSat = (6 - dayOfWeek + 7) % 7;
      const sat = new Date(y, m, d + (daysUntilSat === 0 ? 0 : daysUntilSat));
      const sun = new Date(y, m, sat.getDate() + 1);
      this.currentFilter.startDate = this.formatDate(sat);
      this.currentFilter.endDate = this.formatDate(sun);
    } else if (preset === 'next7') {
      const next7 = new Date(y, m, d + 7);
      this.currentFilter.startDate = this.formatDate(today);
      this.currentFilter.endDate = this.formatDate(next7);
    } else if (preset === 'thisMonth') {
      const startOfMonth = new Date(y, m, 1);
      const endOfMonth = new Date(y, m + 1, 0);
      this.currentFilter.startDate = this.formatDate(startOfMonth);
      this.currentFilter.endDate = this.formatDate(endOfMonth);
    }

    if (this.currentFilter.startDate) {
      const parts = this.currentFilter.startDate.split('-');
      if (parts.length === 3) {
        this.viewYear = parseInt(parts[0], 10);
        this.viewMonth = parseInt(parts[1], 10) - 1;
      }
    }

    this.emitChange();
    this.generateCalendarDays();
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private isDateInRange(dateStr: string, startStr?: string, endStr?: string): boolean {
    if (!startStr || !endStr) return false;
    return dateStr > startStr && dateStr < endStr;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.date-range-container')) {
      this.isCalendarOpen = false;
    }
  }

  private priceDebounceTimer: any;

  // ── Price Input Range Limits (Debounced to prevent screen flicker) ──────
  onMinPriceChange(val: any): void {
    let num = val !== null && val !== '' ? Number(val) : undefined;
    if (num !== undefined) {
      if (num < this.minPriceLimit) num = this.minPriceLimit;
      if (num > this.maxPriceLimit) num = this.maxPriceLimit;
      if (this.currentFilter.maxPrice !== undefined && num > this.currentFilter.maxPrice) {
        this.currentFilter.maxPrice = num;
      }
    }
    this.currentFilter.minPrice = num;

    clearTimeout(this.priceDebounceTimer);
    this.priceDebounceTimer = setTimeout(() => {
      this.emitChange();
    }, 220);
  }

  onMaxPriceChange(val: any): void {
    let num = val !== null && val !== '' ? Number(val) : undefined;
    if (num !== undefined) {
      if (num < this.minPriceLimit) num = this.minPriceLimit;
      if (num > this.maxPriceLimit) num = this.maxPriceLimit;
      if (this.currentFilter.minPrice !== undefined && num < this.currentFilter.minPrice) {
        this.currentFilter.minPrice = num;
      }
    }
    this.currentFilter.maxPrice = num;

    clearTimeout(this.priceDebounceTimer);
    this.priceDebounceTimer = setTimeout(() => {
      this.emitChange();
    }, 220);
  }

  setPricePreset(min?: number, max?: number): void {
    this.currentFilter.price = 'Custom Range';
    this.currentFilter.minPrice = min;
    this.currentFilter.maxPrice = max;
    this.emitChange();
  }

  clearFilters(): void {
    this.currentFilter = {
      category: 'All',
      date: 'Any Date',
      price: 'Any Price'
    };
    this.isCalendarOpen = false;
    this.emitChange();
  }

  hasActiveFilters(): boolean {
    return this.currentFilter.category !== 'All' || 
      !!this.currentFilter.type ||
      this.currentFilter.date !== 'Any Date' || 
      this.currentFilter.price !== 'Any Price' ||
      !!this.currentFilter.startDate ||
      !!this.currentFilter.endDate ||
      this.currentFilter.minPrice !== undefined ||
      this.currentFilter.maxPrice !== undefined;
  }

  private emitChange(): void {
    this.filterChange.emit({ ...this.currentFilter });
  }
}

