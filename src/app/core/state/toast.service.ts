import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number; // in ms
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  show(message: string, type: ToastType = 'info', title?: string, duration = 4000): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = {
      id,
      type,
      title,
      message,
      duration,
      createdAt: Date.now()
    };

    // Add to front of list (max 4 concurrent toasts)
    this.toasts.update(list => [newToast, ...list.slice(0, 3)]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  success(message: string, title: string = 'Success', duration = 4000): string {
    return this.show(message, 'success', title, duration);
  }

  error(message: string, title: string = 'Error', duration = 5000): string {
    return this.show(message, 'error', title, duration);
  }

  info(message: string, title: string = 'Information', duration = 4000): string {
    return this.show(message, 'info', title, duration);
  }

  warning(message: string, title: string = 'Notice', duration = 4500): string {
    return this.show(message, 'warning', title, duration);
  }

  dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
