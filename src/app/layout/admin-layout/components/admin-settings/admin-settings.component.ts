import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['../../admin-shared.css', './admin-settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSettingsComponent {}

