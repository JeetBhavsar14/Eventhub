import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface SelectOption {
  label: string;
  value: any;
  icon?: string;
  badge?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  ]
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

  @Input()
  set options(opts: Array<string | SelectOption> | undefined) {
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

  @Output() selectionChange = new EventEmitter<any>();

  isOpen = signal(false);
  openUpward = signal(false);
  selectedValue: any = null;

  onChange: any = () => {};
  onTouched: any = () => {};

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
        const spaceBelow = window.innerHeight - rect.bottom;
        this.openUpward.set(spaceBelow < 250 && rect.top > 200);
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
    this.selectionChange.emit(this.selectedValue);
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
  writeValue(val: any): void {
    this.selectedValue = val;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
