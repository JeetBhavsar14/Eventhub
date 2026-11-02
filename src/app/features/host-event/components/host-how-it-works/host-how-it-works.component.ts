import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessStep } from '../../models/host-event.models';

@Component({
  selector: 'app-host-how-it-works',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-how-it-works.component.html',
  styleUrl: './host-how-it-works.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostHowItWorksComponent {
  @Input({ required: true }) steps: ProcessStep[] = [];
}

