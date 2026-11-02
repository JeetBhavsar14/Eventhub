export interface BenefitItem {
  icon: string;
  badge: string;
  title: string;
  description: string;
}

export interface ProcessStep {
  stepNumber: string;
  title: string;
  description: string;
  badge: string;
  highlights: string[];
}

export interface EventCategoryItem {
  id: string;
  title: string;
  tag: string;
  description: string;
  imageUrl: string;
  categoryQuery: string;
  stats: string;
}

export interface RequirementItem {
  title: string;
  category: string;
  description: string;
  details: string[];
  icon: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  category: string;
  isOpen?: boolean;
}

export interface HostWizardFormData {
  applicantName: string;
  email: string;
  phone: string;
  organizationType: 'individual' | 'agency' | 'company' | 'non_profit';
  organizationName: string;
  websiteOrSocial: string;
  experienceLevel: 'beginner' | '1-3-years' | '3-5-years' | '5+-years';
  primaryCategories: string[];
  expectedAttendeeScale: string;
  city: string;
  pastEventDescription: string;
  idType: 'national_id' | 'passport' | 'business_reg';
  documentFileName: string;
  termsAccepted: boolean;
}

