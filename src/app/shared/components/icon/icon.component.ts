import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICON_REGISTRY } from './icon.registry';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.viewBox]="viewBox()"
      [attr.width]="size"
      [attr.height]="size"
      [attr.stroke-width]="strokeWidth"
      [attr.fill]="fill()"
      [attr.stroke]="stroke()"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="app-icon"
      [class.app-icon-spin]="spin"
      [innerHTML]="svgContent()">
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 0;
    }
    .app-icon {
      display: inline-block;
      vertical-align: middle;
      flex-shrink: 0;
      transition: transform 0.2s ease, stroke 0.2s ease;
    }
    .app-icon-spin {
      animation: icon-spin 1s linear infinite;
    }
    @keyframes icon-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() size: number | string = 16;
  @Input() strokeWidth: number | string = 2;
  @Input() customFill?: string;
  @Input() customStroke?: string;
  @Input() spin = false;

  constructor(private sanitizer: DomSanitizer) {}

  private iconData = computed(() => {
    return ICON_REGISTRY[this.name] || null;
  });

  viewBox = computed(() => {
    return this.iconData()?.viewBox || '0 0 24 24';
  });

  fill = computed(() => {
    if (this.customFill) return this.customFill;
    return this.iconData()?.fill || 'none';
  });

  stroke = computed(() => {
    if (this.customStroke) return this.customStroke;
    return this.iconData()?.stroke || 'currentColor';
  });

  svgContent = computed<SafeHtml>(() => {
    const data = this.iconData();
    if (!data) {
      // Fallback dot or empty
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    return this.sanitizer.bypassSecurityTrustHtml(data.body);
  });
}
