import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, HostListener, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

export interface SelectOption<T = unknown> {
  label: string;
  value: T;
  icon?: string;
  badge?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './select.component.html',
  styleUrl: './select.component.css',
  host: {
    '[class.is-open]': 'isOpen()'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select an option';
  @Input() disabled = false;
  @Input() required = false;
  @Input() variant: 'default' | 'pill' | 'filter' = 'default';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() ariaLabel?: string;
  @Input() id?: string;

  private _options: SelectOption[] = [];

  static ngAcceptInputType_options: readonly (string | SelectOption)[] | undefined;

  get options(): readonly (string | SelectOption)[] {
    return this._options;
  }

  @Input()
  set options(opts: readonly (string | SelectOption)[] | undefined) {
    if (!opts) {
      this._options = [];
      return;
    }
    this._options = opts.map(opt => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      return opt;
    });
  }

  get normalizedOptions(): SelectOption[] {
    return this._options;
  }


  @Output() selectionChange = new EventEmitter<string>();

  isOpen = signal(false);
  openUpward = signal(false);
  selectedValue: unknown = null;

  onChange: (val: unknown) => void = () => {};
  onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {}

  get selectedOption(): SelectOption | undefined {
    return this._options.find(opt => opt.value === this.selectedValue);
  }

  get displayLabel(): string {
    const selected = this.selectedOption;
    if (selected) return selected.label;
    if (this.selectedValue !== undefined && this.selectedValue !== null && this.selectedValue !== '') {
      return String(this.selectedValue);
    }
    return this.placeholder;
  }

  toggleDropdown(event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (this.disabled) return;

    if (!this.isOpen()) {
      const triggerEl = this.elementRef.nativeElement.querySelector('.select-trigger');
      if (triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        const scrollContainer = triggerEl.closest('.popup-window-body, .drawer-scroll-body, .modal-body, .dialog-body');
        let spaceBelow = window.innerHeight - rect.bottom;
        let spaceAbove = rect.top;
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          spaceBelow = containerRect.bottom - rect.bottom;
          spaceAbove = rect.top - containerRect.top;
        }
        this.openUpward.set(spaceBelow < 220 && spaceAbove > 160);
      }
      this.isOpen.set(true);
      this.onTouched();
    } else {
      this.isOpen.set(false);
    }
  }

  selectOption(opt: SelectOption, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (opt.disabled) return;

    this.selectedValue = opt.value;
    this.onChange(this.selectedValue);
    this.selectionChange.emit(opt.value != null ? String(opt.value) : '');
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('keydown.escape')
  onEscape() {
    this.isOpen.set(false);
  }

  // --- ControlValueAccessor methods ---
  writeValue(val: unknown): void {
    this.selectedValue = val;
  }

  registerOnChange(fn: (val: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
