import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionStorageService {

  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error(`[SessionStorage] Failed to set key: ${key}`);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      console.error(`[SessionStorage] Failed to get key: ${key}`);
      return null;
    }
  }

  remove(key: string): void {
    sessionStorage.removeItem(key);
  }

  clear(): void {
    sessionStorage.clear();
  }

  has(key: string): boolean {
    return sessionStorage.getItem(key) !== null;
  }
}
