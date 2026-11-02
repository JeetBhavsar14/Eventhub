import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectComponent } from '@shared/components';
import { EventCategoryItem, HostWizardFormData } from '../../../models/host-event.models';

@Component({
  selector: 'app-host-application-wizard-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
  templateUrl: './host-application-wizard-modal.component.html',
  styleUrl: './host-application-wizard-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostApplicationWizardModalComponent {
  @Input({ required: true }) show: boolean = false;
  @Input({ required: true }) wizardForm!: HostWizardFormData;
  @Input({ required: true }) eventCategories: EventCategoryItem[] = [];
  @Input({ required: true }) cityOptions: string[] = [];
  @Input({ required: true }) organizationTypeOptions: { label: string; value: string }[] = [];
  @Input({ required: true }) expectedAttendeeScaleOptions: { label: string; value: string }[] = [];
  @Input({ required: true }) idTypeOptions: { label: string; value: string }[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() submitApplication = new EventEmitter<HostWizardFormData>();

  currentWizardStep = signal(1);

  goToWizardStep(step: number): void {
    if (step >= 1 && step <= 4) {
      this.currentWizardStep.set(step);
    }
  }

  nextWizardStep(): void {
    if (this.currentWizardStep() < 4) {
      this.currentWizardStep.update(s => s + 1);
    }
  }

  prevWizardStep(): void {
    if (this.currentWizardStep() > 1) {
      this.currentWizardStep.update(s => s - 1);
    }
  }

  toggleCategorySelection(categoryName: string): void {
    const index = this.wizardForm.primaryCategories.indexOf(categoryName);
    if (index > -1) {
      if (this.wizardForm.primaryCategories.length > 1) {
        this.wizardForm.primaryCategories.splice(index, 1);
      }
    } else {
      this.wizardForm.primaryCategories.push(categoryName);
    }
  }

  isCategorySelected(cat: string): boolean {
    return this.wizardForm.primaryCategories.includes(cat);
  }

  onSubmit(): void {
    this.submitApplication.emit(this.wizardForm);
  }
}

