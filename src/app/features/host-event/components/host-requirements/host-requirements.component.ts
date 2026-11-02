import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequirementItem } from '../../models/host-event.models';

@Component({
  selector: 'app-host-requirements',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-requirements.component.html',
  styleUrl: './host-requirements.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostRequirementsComponent {
  @Input({ required: true }) requirements: RequirementItem[] = [];
}

