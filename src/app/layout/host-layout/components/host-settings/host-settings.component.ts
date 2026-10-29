import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HostWorkspaceInfo } from '@core/models';
import { IconComponent } from '@shared/components';

@Component({
  selector: 'app-host-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './host-settings.component.html',
  styleUrl: './host-settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostSettingsComponent {
  @Input({ required: true }) hostInfo!: HostWorkspaceInfo;
}
