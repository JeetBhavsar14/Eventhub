import { Component, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent, SelectComponent, SelectOption } from '@shared/components';
import { EVENT_CATEGORIES, POPULAR_CITIES } from '@core/constants';

export interface NewEventPayload {
  title: string;
  category: string;
  type: string;
  description: string;
  date: string;
  city: string;
  timeStart: string;
  timeEnd: string;
  venue: string;
  priceType: 'paid' | 'free';
  price: number;
  capacity: number;
  imageUrl: string;
  status: 'draft' | 'pending_review';
}

@Component({
  selector: 'app-create-event-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, SelectComponent],
  templateUrl: './create-event-wizard.component.html',
  styleUrls: ['../host-modal-shared.css', './create-event-wizard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateEventWizardComponent {
  createWizardStep = signal<number>(1);

  readonly categoryOptions: SelectOption[] = EVENT_CATEGORIES.map(c => ({ label: c, value: c }));
  readonly formatOptions: SelectOption[] = [
    { label: 'In-Person Live Event', value: 'in_person' },
    { label: 'Online Virtual Webinar', value: 'virtual' },
    { label: 'Hybrid (Live + Stream)', value: 'hybrid' }
  ];
  readonly cityOptions: SelectOption[] = POPULAR_CITIES.map(city => ({ label: city, value: city }));

  newEventForm = {
    title: '',
    category: 'Festivals',
    type: 'in_person',
    description: '',
    date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    city: 'Ahmedabad',
    timeStart: '18:00',
    timeEnd: '22:00',
    venue: '',
    priceType: 'paid' as 'paid' | 'free',
    price: 499,
    capacity: 250,
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80'
  };

  @Output() close = new EventEmitter<void>();
  @Output() finish = new EventEmitter<NewEventPayload>();

  nextStep() {
    if (this.createWizardStep() < 4) {
      this.createWizardStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.createWizardStep() > 1) {
      this.createWizardStep.update(s => s - 1);
    }
  }

  onFinish(status: 'draft' | 'pending_review') {
    this.finish.emit({
      ...this.newEventForm,
      status
    });
  }

  onClose() {
    this.close.emit();
  }
}

