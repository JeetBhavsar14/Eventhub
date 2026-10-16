import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  // Global signal for the currently selected city
  readonly selectedCity = signal<string>('Mumbai');

  setCity(city: string) {
    this.selectedCity.set(city);
  }
}
