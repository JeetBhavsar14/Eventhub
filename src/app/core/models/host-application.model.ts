export type HostApplicationStatus =
  | 'guest'
  | 'not_applied'
  | 'submitted'
  | 'under_review'
  | 'info_required'
  | 'approved'
  | 'rejected';

export interface HostApplicationData {
  id: string;
  userId: string;
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
  sampleDocumentName?: string;
  additionalInfoResponse?: string;
  status: HostApplicationStatus;
  statusMessage?: string;
  submittedAt: string;
  updatedAt: string;
}
