import { Component, Input, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICON_REGISTRY } from './icon.registry';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.viewBox]="viewBox"
      [style.width]="formattedSize"
      [style.height]="formattedSize"
      [attr.width]="numericSize"
      [attr.height]="numericSize"
      [attr.stroke-width]="strokeWidth"
      [attr.fill]="resolvedFill"
      [attr.stroke]="resolvedStroke"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="app-icon"
      [class.app-icon-spin]="spin"
      [innerHTML]="svgContent">
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
    }
    .app-icon {
      display: block;
      flex-shrink: 0;
      width: 100%;
      height: 100%;
      transition: transform 0.2s ease, stroke 0.2s ease;
    }
    .app-icon-spin {
      animation: icon-spin 1s linear infinite;
    }
    @keyframes icon-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  @Input({ required: true }) name!: string;
  @Input() size: number | string = 16;
  @Input() strokeWidth: number | string = 2;
  @Input() customFill?: string;
  @Input() customStroke?: string;
  @Input() spin = false;

  get iconData() {
    return ICON_REGISTRY[this.name] || null;
  }

  get viewBox(): string {
    return this.iconData?.viewBox || '0 0 24 24';
  }

  get numericSize(): number {
    const parsed = parseFloat(String(this.size));
    return isNaN(parsed) || parsed <= 4 ? 16 : parsed;
  }

  get formattedSize(): string {
    if (!this.size) return '16px';
    const s = String(this.size).trim();
    if (s.endsWith('px') || s.endsWith('rem') || s.endsWith('em') || s.endsWith('%')) {
      return s;
    }
    const num = parseFloat(s);
    if (!isNaN(num) && num <= 4) {
      // If someone passed 2 or 2.5 (from stroke-width mixup), fallback to standard 16px or 18px
      return '16px';
    }
    return `${s}px`;
  }

  get resolvedFill(): string {
    if (this.customFill) return this.customFill;
    return this.iconData?.fill || 'none';
  }

  get resolvedStroke(): string {
    if (this.customStroke) return this.customStroke;
    return this.iconData?.stroke || 'currentColor';
  }

  get svgContent(): SafeHtml {
    const data = this.iconData;
    if (!data) {
      return '';
    }
    return this.sanitizer.bypassSecurityTrustHtml(data.body);
  }
}

