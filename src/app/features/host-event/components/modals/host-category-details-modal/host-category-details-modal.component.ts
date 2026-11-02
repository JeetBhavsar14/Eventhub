import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventCategoryItem } from '../../../models/host-event.models';

@Component({
  selector: 'app-host-category-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-category-details-modal.component.html',
  styleUrl: './host-category-details-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostCategoryDetailsModalComponent {
  @Input() category: EventCategoryItem | null = null;
  @Input() selectedCity: string = 'Mumbai';

  @Output() close = new EventEmitter<void>();
  @Output() explore = new EventEmitter<EventCategoryItem>();
}

