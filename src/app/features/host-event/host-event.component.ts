import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '@core/auth';
import { LocationService, HostApplicationService } from '@core/state';
import { POPULAR_CITIES } from '@core/constants';
import {
  BenefitItem,
  ProcessStep,
  EventCategoryItem,
  RequirementItem,
  FaqItem,
  HostWizardFormData
} from './models/host-event.models';
import { HostHowItWorksComponent } from './components/host-how-it-works/host-how-it-works.component';
import { HostRequirementsComponent } from './components/host-requirements/host-requirements.component';
import { HostDashboardPreviewComponent } from './components/host-dashboard-preview/host-dashboard-preview.component';
import { HostFaqComponent } from './components/host-faq/host-faq.component';
import {
  HostApplicationWizardModalComponent,
  HostApplicationStatusModalComponent,
  HostAdditionalInfoModalComponent,
  HostGuestAuthModalComponent,
  HostCategoryDetailsModalComponent
} from './components/modals';

@Component({
  selector: 'app-host-event',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HostHowItWorksComponent,
    HostRequirementsComponent,
    HostDashboardPreviewComponent,
    HostFaqComponent,
    HostApplicationWizardModalComponent,
    HostApplicationStatusModalComponent,
    HostAdditionalInfoModalComponent,
    HostGuestAuthModalComponent,
    HostCategoryDetailsModalComponent
  ],
  templateUrl: './host-event.component.html',
  styleUrl: './host-event.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostEventComponent implements OnInit {
  private authService = inject(AuthService);
  private hostService = inject(HostApplicationService);
  private locationService = inject(LocationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Droplist options
  readonly organizationTypeOptions = [
    { label: 'Independent Creator / Solo Curator', value: 'individual' },
    { label: 'Event Management Agency', value: 'agency' },
    { label: 'Registered Enterprise / Company', value: 'company' },
    { label: 'Non-Profit / Community Organization', value: 'non_profit' }
  ];

  readonly expectedAttendeeScaleOptions = [
    { label: 'Intimate (Up to 100 attendees)', value: 'Up to 100 attendees' },
    { label: 'Medium (100 - 500 attendees)', value: '100 - 500 attendees' },
    { label: 'Large (500 - 2,500 attendees)', value: '500 - 2,500 attendees' },
    { label: 'Massive Festival (2,500+ attendees)', value: '2,500+ festival scale' }
  ];

  readonly cityOptions: string[] = [...POPULAR_CITIES];

  readonly idTypeOptions = [
    { label: 'Government Photo ID (Passport / National ID)', value: 'national_id' },
    { label: 'Business / Organization Registration Certificate', value: 'business_reg' },
    { label: 'Authorized Representative Identification', value: 'passport' }
  ];

  // Core signals
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;
  readonly selectedCity = this.locationService.selectedCity;
  readonly appStatus = this.hostService.status;
  readonly appData = this.hostService.applicationData;

  // UI state signals
  showApplicationModal = signal(false);
  showStatusModal = signal(false);
  showGuestAuthModal = signal(false);
  showAdditionalInfoModal = signal(false);
  showCategoryDetailsModal = signal<EventCategoryItem | null>(null);

  // Application Wizard Form State
  wizardForm: HostWizardFormData = {
    applicantName: '',
    email: '',
    phone: '',
    organizationType: 'individual',
    organizationName: '',
    websiteOrSocial: '',
    experienceLevel: 'beginner',
    primaryCategories: ['Workshops'],
    expectedAttendeeScale: '100 - 500 attendees',
    city: 'Mumbai',
    pastEventDescription: '',
    idType: 'national_id',
    documentFileName: 'host_verification_doc.pdf',
    termsAccepted: true
  };

  // Additional info response state
  additionalInfoNote = signal('');
  isSubmittingAdditionalInfo = signal(false);

  // Why Host Benefits
  readonly benefits: BenefitItem[] = [
    {
      icon: 'users',
      badge: 'Discovery',
      title: 'Reach Your Audience',
      description: 'Help interested attendees discover your events with city-wide discovery, targeted categories, and prominent event banners.'
    },
    {
      icon: 'calendar',
      badge: 'Organization',
      title: 'Manage Your Events',
      description: 'Organize schedule dates, venue directions, seating layouts, and monitor publishing status from a unified organizer portal.'
    },
    {
      icon: 'ticket',
      badge: 'Revenue',
      title: 'Flexible Ticketing',
      description: 'Define multiple ticket tiers, early bird pricing, VIP packages, and manage real-time inventory capacity seamlessly.'
    },
    {
      icon: 'shield-check',
      badge: 'Security',
      title: 'Team Collaboration',
      description: 'Organize event responsibilities, assign staff roles, and securely grant on-ground QR code scanner access for check-ins.'
    },
    {
      icon: 'user-check',
      badge: 'Operations',
      title: 'Attendee Management',
      description: 'Keep registration rosters, digital ticket deliveries, attendee inquiries, and participant check-in statuses neatly organized.'
    },
    {
      icon: 'trending-up',
      badge: 'Analytics',
      title: 'Event Insights',
      description: 'Review sample event performance, daily sales velocity, ticket tier breakdown, and real-time attendance summaries.'
    }
  ];

  // How Hosting Works Timeline
  readonly timelineSteps: ProcessStep[] = [
    {
      stepNumber: '01',
      title: 'Apply Online',
      badge: '5-Minute Setup',
      description: 'Provide your basic details, contact information, and background about your hosting organization or past event experience.',
      highlights: ['Basic organizer profile', 'Primary event niches', 'Contact verification']
    },
    {
      stepNumber: '02',
      title: 'Verification & Review',
      badge: 'Trust & Safety',
      description: 'Submit supporting identification or organization documents required for EventHub host eligibility and credibility assessment.',
      highlights: ['Prototype ID submission', 'Organizer compliance check', 'Quality vetting']
    },
    {
      stepNumber: '03',
      title: 'Get Approved',
      badge: 'Status Tracking',
      description: 'Track your application status in real-time. Respond to any clarification requests directly if additional information is needed.',
      highlights: ['Transparent status tracker', 'Direct clarification portal', 'Instant onboarding notice']
    },
    {
      stepNumber: '04',
      title: 'Create Your Event',
      badge: 'Go Live',
      description: 'Access the host workspace to draft your event, set up ticket tiers, and submit it for individual event listing publication.',
      highlights: ['Host workspace unlocked', 'Tiered ticket setup', 'Separate event review']
    }
  ];

  // Event Categories
  readonly eventCategories: EventCategoryItem[] = [
    {
      id: 'music',
      title: 'Music & Festivals',
      tag: 'Concerts & Gigs',
      description: 'From intimate acoustic gigs and indie showcases to multi-day music festivals and arena tours.',
      imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
      categoryQuery: 'Concerts',
      stats: '120+ Active Hosts'
    },
    {
      id: 'sports',
      title: 'Sports & Tournaments',
      tag: 'Matches & Marathons',
      description: 'City marathons, amateur football tournaments, badminton leagues, and competitive esports showdowns.',
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
      categoryQuery: 'Sports',
      stats: '85+ Tournaments'
    },
    {
      id: 'workshops',
      title: 'Workshops & Masterclasses',
      tag: 'Hands-on Learning',
      description: 'Interactive bootcamps, pottery workshops, culinary experiences, photography walks, and skill masterclasses.',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
      categoryQuery: 'Workshops',
      stats: '240+ Monthly Sessions'
    },
    {
      id: 'conferences',
      title: 'Conferences & Summits',
      tag: 'Professional',
      description: 'Industry summits, founder panels, investor showcases, keynote lectures, and high-impact networking meetups.',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
      categoryQuery: 'Conferences',
      stats: '95+ Tech & Business Summits'
    },
    {
      id: 'tech',
      title: 'Technology & Hackathons',
      tag: 'Dev & AI',
      description: 'Developer meetups, 24-hour hackathons, AI demo days, open-source sprints, and product release keynotes.',
      imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
      categoryQuery: 'Conferences',
      stats: '150+ Tech Gatherings'
    },
    {
      id: 'arts',
      title: 'Arts & Culture',
      tag: 'Theater & Comedy',
      description: 'Stand-up comedy nights, theater plays, art gallery previews, poetry slams, and heritage cultural walks.',
      imageUrl: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=800&q=80',
      categoryQuery: 'Festivals',
      stats: '180+ Cultural Nights'
    },
    {
      id: 'food',
      title: 'Food & Lifestyle',
      tag: 'Culinary & Wellness',
      description: 'Food truck festivals, artisan bakery trails, wine tastings, yoga retreats, and sustainable lifestyle flea markets.',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      categoryQuery: 'Festivals',
      stats: '70+ Food & Lifestyle Fests'
    },
    {
      id: 'entertainment',
      title: 'Shows & Entertainment',
      tag: 'Live Spectacles',
      description: 'Magic & mentalism shows, outdoor movie screenings, celebrity meet-and-greets, and family variety spectacles.',
      imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
      categoryQuery: 'Others',
      stats: '110+ Live Shows'
    }
  ];

  // Requirements Checklist
  readonly requirements: RequirementItem[] = [
    {
      title: 'Applicant & Contact Information',
      category: 'Basic Identity',
      icon: 'contact',
      description: 'Primary organizer contact details to ensure seamless communication with EventHub administration.',
      details: [
        'Full legal name of the primary applicant',
        'Official email address (with verification)',
        'Active mobile phone number for urgent event coordination'
      ]
    },
    {
      title: 'Individual or Organization Details',
      category: 'Entity Info',
      icon: 'building',
      description: 'Information regarding your hosting structure, whether an independent curator or a registered company.',
      details: [
        'Organization or brand display name',
        'Official website or active social media portfolios',
        'Brief description of your brand niche and audience focus'
      ]
    },
    {
      title: 'Hosting Experience & Past Events',
      category: 'Track Record',
      icon: 'award',
      description: 'Help us understand your history of creating engaging and safe attendee experiences.',
      details: [
        'Years of experience in organizing gatherings',
        'Estimated typical attendee size per event',
        'Links to photos, press coverage, or past ticketing references'
      ]
    },
    {
      title: 'Identity Verification Information',
      category: 'Trust & Safety',
      icon: 'shield',
      description: 'Prototype identification verification to build a trustworthy and safe platform ecosystem.',
      details: [
        'Government photo ID or national identification document',
        'Representative authority proof for organization applications',
        'Simulated prototype verification badge'
      ]
    },
    {
      title: 'Supporting Documentation',
      category: 'Compliance',
      icon: 'file-text',
      description: 'Documentation demonstrating organizer readiness and adherence to venue standards.',
      details: [
        'Business registration document (where applicable)',
        'Venue booking agreement or clearance proof',
        'Performer or speaker lineup overview'
      ]
    },
    {
      title: 'Acceptance of Host Terms',
      category: 'Legal & Policy',
      icon: 'check-square',
      description: 'Commitment to maintaining high standards of event safety, ticketing honesty, and attendee support.',
      details: [
        'Agreement to EventHub Host Guidelines & Service Terms',
        'Commitment to attendee refund & cancellation policies',
        'Adherence to accurate event representation standards'
      ]
    }
  ];

  // FAQs
  readonly faqs: FaqItem[] = [
    {
      question: 'Who can apply to become a host on EventHub?',
      answer: 'Anyone organizing quality experiences can apply — including solo workshop creators, college festival conveners, registered event management agencies, community groups, and enterprise summits.',
      category: 'eligibility',
      isOpen: true
    },
    {
      question: 'What is the difference between Host Approval and Event Approval?',
      answer: 'Host Approval verifies your organizer identity, compliance, and contact credibility once. Event Approval is a rapid per-event review that ensures your specific venue, schedule, ticket tiers, and pricing details meet attendee protection guidelines.',
      category: 'review',
      isOpen: false
    },
    {
      question: 'Are there any upfront or recurring fees to become a host?',
      answer: 'No. Registering as an EventHub host is completely free. We do not charge registration, subscription, or listing setup fees. Platform commission is deducted automatically only upon successful ticket sales.',
      category: 'eligibility',
      isOpen: false
    },
    {
      question: 'What documents are required during host verification?',
      answer: 'For individuals, a valid government photo ID (Passport / National ID) is verified. For organizations and enterprises, a company registration certificate or GST certificate along with an authorization letter for the primary coordinator is recommended.',
      category: 'application',
      isOpen: false
    },
    {
      question: 'How long does the host review process take?',
      answer: 'Our curation team reviews submitted applications within 24 to 48 business hours. If clarifying documentation is required, you will see a request banner right inside your tracker and can respond directly.',
      category: 'review',
      isOpen: false
    },
    {
      question: 'When can I start publishing ticketed events?',
      answer: 'Immediately upon host approval! Your Host Workspace unlocks instantly, giving you full access to the event creation wizard, tiered pricing controls, attendee rosters, and ticket check-in tools.',
      category: 'publishing',
      isOpen: false
    },
    {
      question: 'Can I host both free and paid ticketed events?',
      answer: 'Yes! EventHub supports completely free RSVP registrations, tiered paid tickets, early-bird passes, and VIP tables with custom per-tier capacities.',
      category: 'publishing',
      isOpen: false
    },
    {
      question: 'How do payouts and attendee ticket refunds work?',
      answer: 'Net ticket revenues are reconciled and settled directly to your verified bank account following the event cycle. Automatic attendee cancellation and refund windows can be configured per your organizer policy.',
      category: 'application',
      isOpen: false
    }
  ];

  ngOnInit() {
    // Check if user came with query param action
    this.route.queryParams.subscribe(params => {
      if (params['apply'] === 'true') {
        this.handleApplyClick();
      }
    });

    // Populate user info into wizard if signed in
    const user = this.currentUser();
    if (user) {
      this.wizardForm.applicantName = `${user.firstName} ${user.lastName}`.trim();
      this.wizardForm.email = user.email || '';
      this.wizardForm.phone = user.phone || '';
    }
  }

  // Primary CTA click router
  handleApplyClick() {
    const status = this.appStatus();

    switch (status) {
      case 'guest':
        this.showGuestAuthModal.set(true);
        break;

      case 'not_applied': {
        const user = this.currentUser();
        if (user) {
          this.wizardForm.applicantName = `${user.firstName} ${user.lastName}`.trim();
          this.wizardForm.email = user.email || '';
          this.wizardForm.phone = user.phone || '';
        }
        this.showApplicationModal.set(true);
        break;
      }

      case 'submitted':
      case 'under_review':
        this.showStatusModal.set(true);
        break;

      case 'info_required':
        this.showAdditionalInfoModal.set(true);
        break;

      case 'approved':
        this.navigateToHostWorkspace();
        break;

      case 'rejected':
        this.showStatusModal.set(true);
        break;
    }
  }

  // Smooth scroll to section
  scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  // Category click handler
  handleCategoryClick(cat: EventCategoryItem) {
    this.router.navigate(['/discover'], { queryParams: { category: cat.categoryQuery } });
  }

  // Category details modal
  openCategoryDetails(cat: EventCategoryItem, event: MouseEvent) {
    event.stopPropagation();
    this.showCategoryDetailsModal.set(cat);
  }

  // Submit Host Application
  submitHostApplication(formData?: HostWizardFormData) {
    const data = formData || this.wizardForm;
    this.hostService.submitApplication({
      applicantName: data.applicantName,
      email: data.email,
      phone: data.phone,
      organizationType: data.organizationType,
      organizationName: data.organizationName || 'Independent Host',
      websiteOrSocial: data.websiteOrSocial,
      experienceLevel: data.experienceLevel,
      primaryCategories: data.primaryCategories,
      expectedAttendeeScale: data.expectedAttendeeScale,
      city: data.city,
      pastEventDescription: data.pastEventDescription,
      idType: data.idType,
      sampleDocumentName: data.documentFileName
    });

    this.showApplicationModal.set(false);
    this.showStatusModal.set(true);
  }

  // Submit Additional Info
  submitAdditionalInfo(note?: string) {
    const info = (note !== undefined ? note : this.additionalInfoNote()).trim();
    if (!info) return;
    this.isSubmittingAdditionalInfo.set(true);

    setTimeout(() => {
      this.hostService.submitAdditionalInfo(info);
      this.isSubmittingAdditionalInfo.set(false);
      this.showAdditionalInfoModal.set(false);
      this.additionalInfoNote.set('');
      this.showStatusModal.set(true);
    }, 600);
  }

  // Reapply action
  handleReapply() {
    this.hostService.resetApplication();
    this.showStatusModal.set(false);
    this.showApplicationModal.set(true);
  }

  // Navigate to login with returnUrl
  navigateToLogin() {
    this.showGuestAuthModal.set(false);
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/host/apply' } });
  }

  // Navigate to register with returnUrl
  navigateToRegister() {
    this.showGuestAuthModal.set(false);
    this.router.navigate(['/auth/register'], { queryParams: { returnUrl: '/host/apply' } });
  }

  // Navigate to Host Workspace preview
  navigateToHostWorkspace() {
    this.router.navigate(['/host/dashboard']);
  }
}
