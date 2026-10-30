import { Injectable, computed, inject, signal, effect, untracked } from '@angular/core';
import { AuthService } from '@core/auth';
import { ApiClient } from '@core/api';
import { HostApplicationData, HostApplicationStatus, User } from '@core/models';
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

  private _lastUserId: string | null | undefined = undefined;

  private readonly _prototypeOverride = signal<HostApplicationStatus | null>(null);
  private readonly _storedApplication = signal<HostApplicationData | null>(null);

  constructor() {
    // Initial sync with currently active auth state
    this.syncUserApplication(this.authService.currentUser());

    // Reactive sync whenever currentUser signal changes (register, login, logout)
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => {
        this.syncUserApplication(user);
      });
    });
  }

  /**
   * Synchronizes host application state strictly for the given user.
   * Ensures new users or attendee accounts never inherit stale application data or prototype flags.
   */
  private syncUserApplication(user: User | null): void {
    const currentId = user ? user.id : null;
    if (this._lastUserId === currentId) {
      return;
    }
    this._lastUserId = currentId;

    // Reset prototype override on any auth user transition
    this._prototypeOverride.set(null);
    this.localStorage.remove(PROTOTYPE_OVERRIDE_KEY);

    if (!user) {
      this._storedApplication.set(null);
      this.localStorage.remove(HOST_APP_KEY);
      return;
    }

    if (user.isHost || user.platformRole === 'host') {
      this._storedApplication.set(null);
      return;
    }

    // Check user-specific storage key
    const userKey = `${HOST_APP_KEY}_${user.id}`;
    const userApp = this.localStorage.get<HostApplicationData>(userKey);
    if (userApp && (userApp.userId === user.id || (userApp.email && user.email && userApp.email.toLowerCase() === user.email.toLowerCase()))) {
      this._storedApplication.set(userApp);
      return;
    }

    // Check legacy key; if it matches this user, migrate it to user-specific key, otherwise discard
    const legacyApp = this.localStorage.get<HostApplicationData>(HOST_APP_KEY);
    if (legacyApp && (legacyApp.userId === user.id || (legacyApp.email && user.email && legacyApp.email.toLowerCase() === user.email.toLowerCase()))) {
      this._storedApplication.set(legacyApp);
      this.localStorage.set(userKey, legacyApp);
      return;
    } else {
      this.localStorage.remove(HOST_APP_KEY);
    }

    // Default for clean newly registered users
    this._storedApplication.set(null);

    // Optional asynchronous lookup on backend in case application was submitted previously on another device
    if (user.email) {
      this.api.get<HostApplicationData[]>(`/hostApplications?email=${encodeURIComponent(user.email.toLowerCase())}`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            const found = res.data[0];
            if (this.authService.currentUser()?.id === user.id) {
              this._storedApplication.set(found);
              this.localStorage.set(userKey, found);
            }
          }
        })
        .catch(() => {});
    }
  }

  /**
   * Computed effective status based on natural auth & application status
   */
  readonly status = computed<HostApplicationStatus>(() => {
    // 1. Check auth
    if (!this.authService.isAuthenticated()) {
      return 'guest';
    }

    const user = this.authService.currentUser();
    if (!user) {
      return 'guest';
    }

    // 2. Approved hosts bypass application checks
    if (user.isHost || user.platformRole === 'host') {
      return 'approved';
    }

    // 3. Check stored application strictly belonging to current user
    const app = this._storedApplication();
    if (app && (app.userId === user.id || (app.email && user.email && app.email.toLowerCase() === user.email.toLowerCase()))) {
      return app.status;
    }

    // 4. If prototype override was explicitly invoked in the active session
    const override = this._prototypeOverride();
    if (override) {
      return override;
    }

    return 'not_applied';
  });

  readonly applicationData = computed<HostApplicationData | null>(() => {
    const currentStatus = this.status();
    const user = this.authService.currentUser();

    if (!user || currentStatus === 'guest' || currentStatus === 'not_applied') {
      return null;
    }

    const stored = this._storedApplication();
    if (stored && (stored.userId === user.id || (stored.email && user.email && stored.email.toLowerCase() === user.email.toLowerCase()))) {
      return { ...stored, status: currentStatus };
    }

    // If an explicit override is active for simulation purposes
    if (this._prototypeOverride()) {
      return {
        ...DEFAULT_SAMPLE_APPLICATION,
        applicantName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone || DEFAULT_SAMPLE_APPLICATION.phone,
        status: currentStatus,
        statusMessage: this.getStatusMessageFor(currentStatus)
      };
    }

    return null;
  });

  readonly isOverrideActive = computed(() => this._prototypeOverride() !== null);

  /**
   * Clears any local host application cache and prototype override state
   */
  clearApplication(): void {
    const user = this.authService.currentUser();
    this._prototypeOverride.set(null);
    this._storedApplication.set(null);
    if (user?.id) {
      this.localStorage.remove(`${HOST_APP_KEY}_${user.id}`);
    }
    this.localStorage.remove(HOST_APP_KEY);
    this.localStorage.remove(PROTOTYPE_OVERRIDE_KEY);
  }

  /**
   * Allows prototype switcher to force test any state in current session
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
      if (user?.id) {
        this.localStorage.set(`${HOST_APP_KEY}_${user.id}`, app);
      }
      this.localStorage.set(HOST_APP_KEY, app);
    }

    // If state is not_applied, clear stored applications
    if (state === 'not_applied') {
      const user = this.authService.currentUser();
      if (user?.id) {
        this.localStorage.remove(`${HOST_APP_KEY}_${user.id}`);
      }
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
      applicantName: formData.applicantName || (user ? `${user.firstName} ${user.lastName}`.trim() : 'Applicant'),
      email: formData.email || user?.email || '',
      phone: formData.phone || user?.phone || '',
      organizationType: formData.organizationType || 'individual',
      organizationName: formData.organizationName || 'Independent Organizer',
      websiteOrSocial: formData.websiteOrSocial || '',
      experienceLevel: formData.experienceLevel || 'beginner',
      primaryCategories: formData.primaryCategories || ['Workshops'],
      expectedAttendeeScale: formData.expectedAttendeeScale || '100 - 500 attendees',
      city: formData.city || 'Mumbai',
      pastEventDescription: formData.pastEventDescription || 'Organizing local community gatherings and events.',
      idType: formData.idType || 'national_id',
      sampleDocumentName: formData.sampleDocumentName || 'host_verification_doc.pdf',
      status: 'submitted',
      statusMessage: 'Your application has been received! Our verification team is queued to review your credentials.',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this._storedApplication.set(newApp);
    if (user?.id) {
      this.localStorage.set(`${HOST_APP_KEY}_${user.id}`, newApp);
    }
    this.localStorage.set(HOST_APP_KEY, newApp);

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
    const user = this.authService.currentUser();
    if (current) {
      const updated: HostApplicationData = {
        ...current,
        additionalInfoResponse: responseNotes,
        status: 'under_review',
        statusMessage: 'Additional clarification submitted. Our curation board has resumed evaluation.',
        updatedAt: new Date().toISOString()
      };
      this._storedApplication.set(updated);
      if (user?.id) {
        this.localStorage.set(`${HOST_APP_KEY}_${user.id}`, updated);
      }
      this.localStorage.set(HOST_APP_KEY, updated);
    }
  }

  /**
   * Resets or restarts application flow for current user
   */
  resetApplication(): void {
    const user = this.authService.currentUser();
    this._storedApplication.set(null);
    this._prototypeOverride.set(null);
    if (user?.id) {
      this.localStorage.remove(`${HOST_APP_KEY}_${user.id}`);
    }
    this.localStorage.remove(HOST_APP_KEY);
    this.localStorage.remove(PROTOTYPE_OVERRIDE_KEY);
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
