import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() errorMessage = '';
  @Input() required = false;
  @Input() maxLength?: number;
  @Input() minLength?: number;
  @Input() pattern?: string;

  value: string = '';

  onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  // Called when input value changes
  onInputChange(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.value = target?.value ?? '';
    this.onChange(this.value);
  }

  // Called when input loses focus
  onBlur() {
    this.onTouched();
  }

  // --- ControlValueAccessor methods ---
  writeValue(value: string | number | null): void {
    this.value = value != null ? String(value) : '';
  }
  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
