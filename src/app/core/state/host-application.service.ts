import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth';
import { ApiClient } from '@core/api';
import { HostApplicationData, HostApplicationStatus } from '@core/models';
import { LocalStorageService } from '@core/storage';

const HOST_APP_KEY = 'eventhub_host_application';
const PROTOTYPE_OVERRIDE_KEY = 'eventhub_host_prototype_override';

const DEFAULT_SAMPLE_APPLICATION: HostApplicationData = {
  id: 'EH-APP-7829',
  userId: 'user-001',
  applicantName: 'Jeet Bhavsar',
  email: 'jeet@eventhub.com',
  phone: '+91 98765 43210',
  organizationType: 'agency',
  organizationName: 'Starlight Live Experiences',
  websiteOrSocial: 'https://instagram.com/starlightlive',
  experienceLevel: '3-5-years',
  primaryCategories: ['Music and Festivals', 'Conferences', 'Workshops'],
  expectedAttendeeScale: '500 - 2,500 attendees',
  city: 'Mumbai',
  pastEventDescription: 'Organized Indie Vibe Fest 2025 (1,200 attendees) and annual UX Design Summit.',
  idType: 'national_id',
  sampleDocumentName: 'identity_doc_verified_sample.pdf',
  status: 'under_review',
  statusMessage: 'Your application is currently being reviewed by the EventHub curation board. Typical verification turnaround is 24-48 business hours.',
  submittedAt: '2026-10-08T14:30:00.000Z',
  updatedAt: '2026-10-09T09:15:00.000Z'
};

@Injectable({
  providedIn: 'root'
})
export class HostApplicationService {
  private authService = inject(AuthService);
  private localStorage = inject(LocalStorageService);
  private api = inject(ApiClient);

  private readonly _prototypeOverride = signal<HostApplicationStatus | null>(
    this.localStorage.get<HostApplicationStatus | null>(PROTOTYPE_OVERRIDE_KEY) || null
  );

  private readonly _storedApplication = signal<HostApplicationData | null>(
    this.localStorage.get<HostApplicationData>(HOST_APP_KEY) || null
  );

  /**
   * Computed effective status based on prototype override or natural auth & application status
   */
  readonly status = computed<HostApplicationStatus>(() => {
    // 1. If prototype switcher override is active, respect it
    const override = this._prototypeOverride();
    if (override) return override;

    // 2. Check auth
    if (!this.authService.isAuthenticated()) {
      return 'guest';
    }

    const user = this.authService.currentUser();
    if (user?.isHost) {
      return 'approved';
    }

    // 3. Check stored application
    const app = this._storedApplication();
    if (app) {
      return app.status;
    }

    return 'not_applied';
  });

  readonly applicationData = computed<HostApplicationData | null>(() => {
    const currentStatus = this.status();
    const stored = this._storedApplication();

    if (stored) {
      return { ...stored, status: currentStatus };
    }

    if (currentStatus !== 'guest' && currentStatus !== 'not_applied') {
      const user = this.authService.currentUser();
      return {
        ...DEFAULT_SAMPLE_APPLICATION,
        applicantName: user ? `${user.firstName} ${user.lastName}` : DEFAULT_SAMPLE_APPLICATION.applicantName,
        email: user?.email || DEFAULT_SAMPLE_APPLICATION.email,
        phone: user?.phone || DEFAULT_SAMPLE_APPLICATION.phone,
        status: currentStatus,
        statusMessage: this.getStatusMessageFor(currentStatus)
      };
    }

    return null;
  });

  readonly isOverrideActive = computed(() => this._prototypeOverride() !== null);

  /**
   * Allows prototype switcher to force test any state
   */
  setPrototypeState(state: HostApplicationStatus | 'auto'): void {
    if (state === 'auto') {
      this._prototypeOverride.set(null);
      this.localStorage.remove(PROTOTYPE_OVERRIDE_KEY);
      return;
    }

    this._prototypeOverride.set(state);
    this.localStorage.set(PROTOTYPE_OVERRIDE_KEY, state);

    // If state is approved and no stored application exists, initialize approved application for user
    if (state === 'approved' && !this._storedApplication()) {
      const user = this.authService.currentUser();
      const app: HostApplicationData = {
        ...DEFAULT_SAMPLE_APPLICATION,
        applicantName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Jeet Bhavsar',
        email: user?.email || 'jeet@eventhub.com',
        phone: user?.phone || '+91 98765 43210',
        status: 'approved',
        statusMessage: 'Congratulations! Your application has been approved. You have full organizer access.'
      };
      this._storedApplication.set(app);
      this.localStorage.set(HOST_APP_KEY, app);
    }

    // If state is not_applied or guest, handle appropriately
    if (state === 'not_applied') {
      this.localStorage.remove(HOST_APP_KEY);
      this._storedApplication.set(null);
    }
  }

  /**
   * Submits a host application (simulated mock persistence)
   */
  submitApplication(formData: Partial<HostApplicationData>): HostApplicationData {
    const user = this.authService.currentUser();
    const newApp: HostApplicationData = {
      id: `EH-APP-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user?.id || 'guest-session',
      applicantName: formData.applicantName || (user ? `${user.firstName} ${user.lastName}`.trim() : 'Jeet Bhavsar'),
      email: formData.email || user?.email || 'jeet@eventhub.com',
      phone: formData.phone || user?.phone || '+91 98765 43210',
      organizationType: formData.organizationType || 'individual',
      organizationName: formData.organizationName || 'Starlight Live Experiences',
      websiteOrSocial: formData.websiteOrSocial || '',
      experienceLevel: formData.experienceLevel || 'beginner',
      primaryCategories: formData.primaryCategories || ['Workshops'],
      expectedAttendeeScale: formData.expectedAttendeeScale || '100 - 500 attendees',
      city: formData.city || 'Mumbai',
      pastEventDescription: formData.pastEventDescription || 'Organizing local events and community meetups.',
      idType: formData.idType || 'national_id',
      sampleDocumentName: formData.sampleDocumentName || 'host_verification_doc.pdf',
      status: 'submitted',
      statusMessage: 'Your application has been received! Our verification team is queued to review your credentials.',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this._storedApplication.set(newApp);
    this.localStorage.set(HOST_APP_KEY, newApp);
    this._prototypeOverride.set('submitted');
    this.localStorage.set(PROTOTYPE_OVERRIDE_KEY, 'submitted');

    // Asynchronously sync to backend json-server
    this.api.post('/hostApplications', {
      id: newApp.id,
      applicantName: newApp.applicantName,
      email: newApp.email,
      phone: newApp.phone,
      organizationName: newApp.organizationName,
      organizationType: newApp.organizationType,
      city: newApp.city,
      scale: newApp.expectedAttendeeScale,
      expectedScale: newApp.expectedAttendeeScale,
      primaryCategories: newApp.primaryCategories,
      experience: newApp.pastEventDescription,
      pastExperience: newApp.pastEventDescription,
      docStatus: 'verified',
      idDocName: newApp.sampleDocumentName,
      assignedReviewer: 'Operations Lead (You)',
      status: 'under_review',
      submittedDate: new Date().toISOString().split('T')[0],
      submittedAt: newApp.submittedAt
    }).catch(() => {});

    return newApp;
  }

  /**
   * Responds to additional info request
   */
  submitAdditionalInfo(responseNotes: string): void {
    const current = this.applicationData();
    if (current) {
      const updated: HostApplicationData = {
        ...current,
        additionalInfoResponse: responseNotes,
        status: 'under_review',
        statusMessage: 'Additional clarification submitted. Our curation board has resumed evaluation.',
        updatedAt: new Date().toISOString()
      };
      this._storedApplication.set(updated);
      this.localStorage.set(HOST_APP_KEY, updated);
      this._prototypeOverride.set('under_review');
      this.localStorage.set(PROTOTYPE_OVERRIDE_KEY, 'under_review');
    }
  }

  /**
   * Resets or restarts application flow
   */
  resetApplication(): void {
    this._storedApplication.set(null);
    this.localStorage.remove(HOST_APP_KEY);
    this._prototypeOverride.set('not_applied');
    this.localStorage.set(PROTOTYPE_OVERRIDE_KEY, 'not_applied');
  }

  private getStatusMessageFor(status: HostApplicationStatus): string {
    switch (status) {
      case 'submitted':
        return 'Application submitted successfully. Our team will review your organization details shortly.';
      case 'under_review':
        return 'Your credentials and past event history are currently under evaluation by our host verification panel.';
      case 'info_required':
        return 'Action Required: Please provide clarification on your venue safety documentation or past event links.';
      case 'approved':
        return 'Congratulations! Your host profile is verified and approved. You now have full access to create events.';
      case 'rejected':
        return 'Application Not Approved. Your submission did not satisfy current verification criteria at this time. You may reapply with updated credentials.';
      default:
        return '';
    }
  }
}
