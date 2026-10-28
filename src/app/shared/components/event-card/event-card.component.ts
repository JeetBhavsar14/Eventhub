import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { EventItem } from '@core/models';
import { formatStartingPrice, getStartingPrice } from '@core/utils';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventCardComponent {
  @Input({ required: true }) event!: EventItem;

  get formattedStartingPrice(): string {
    return formatStartingPrice(this.event, 'Free Entry');
  }

  get startingPrice(): number {
    return getStartingPrice(this.event, 0);
  }
}
