import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastItem } from '@core/state';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="toast-viewport" *ngIf="toasts().length > 0" aria-live="polite">
      <div 
        *ngFor="let toast of toasts()" 
        class="toast-card" 
        [ngClass]="'toast-' + toast.type"
        role="alert">
        
        <div class="toast-icon-aura">
          <app-icon [name]="getToastIcon(toast.type)" [size]="18"></app-icon>
        </div>

        <div class="toast-body">
          <div class="toast-title" *ngIf="toast.title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>

        <button 
          class="toast-dismiss" 
          (click)="dismiss(toast.id)" 
          title="Dismiss notice">
          <app-icon name="close" [size]="13"></app-icon>
        </button>

        <div 
          class="toast-timer-bar" 
          [style.animation-duration.ms]="toast.duration"
          *ngIf="toast.duration > 0">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-viewport {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 420px;
      width: calc(100vw - 32px);
    }

    .toast-card {
      pointer-events: auto;
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      border-radius: var(--radius-lg, 14px);
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 
        0 12px 30px -4px rgba(15, 23, 42, 0.18),
        0 4px 12px rgba(15, 23, 42, 0.08),
        0 0 0 1px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      animation: toastSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      transition: transform var(--transition-fast), opacity var(--transition-fast);
    }

    @keyframes toastSlideUp {
      0% {
        opacity: 0;
        transform: translateY(16px) scale(0.96);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .toast-icon-aura {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .toast-success .toast-icon-aura {
      background: #dcfce7;
      color: #15803d;
      box-shadow: 0 0 12px rgba(22, 163, 74, 0.25);
    }

    .toast-error .toast-icon-aura {
      background: #fee2e2;
      color: #b91c1c;
      box-shadow: 0 0 12px rgba(220, 38, 38, 0.25);
    }

    .toast-warning .toast-icon-aura {
      background: #fef3c7;
      color: #d97706;
      box-shadow: 0 0 12px rgba(217, 119, 6, 0.25);
    }

    .toast-info .toast-icon-aura {
      background: #eff6ff;
      color: #2563eb;
      box-shadow: 0 0 12px rgba(37, 99, 235, 0.25);
    }

    .toast-body {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--gray-900, #0f172a);
      margin-bottom: 2px;
      line-height: 1.25;
    }

    .toast-message {
      font-size: 0.82rem;
      color: var(--gray-600, #475569);
      line-height: 1.35;
      word-break: break-word;
    }

    .toast-dismiss {
      background: transparent;
      border: none;
      color: var(--gray-400);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-sm);
      margin-top: -2px;
      margin-right: -4px;
      transition: color var(--transition-fast), background var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toast-dismiss:hover {
      color: var(--gray-700);
      background: var(--gray-100);
    }

    .toast-timer-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      animation: toastProgress linear forwards;
    }

    .toast-success .toast-timer-bar { background: #16a34a; }
    .toast-error .toast-timer-bar { background: #dc2626; }
    .toast-warning .toast-timer-bar { background: #f59e0b; }
    .toast-info .toast-timer-bar { background: #3b82f6; }

    @keyframes toastProgress {
      0% { width: 100%; }
      100% { width: 0%; }
    }

    @media (max-width: 640px) {
      .toast-viewport {
        bottom: auto;
        top: 16px;
        left: 16px;
        right: 16px;
        width: auto;
      }
    }
  `]
})
export class ToastContainerComponent {
  private toastService = inject(ToastService);
  toasts = this.toastService.toasts;

  dismiss(id: string) {
    this.toastService.dismiss(id);
  }

  getToastIcon(type: string): string {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'close';
      case 'warning': return 'alert-circle';
      default: return 'bell';
    }
  }
}
