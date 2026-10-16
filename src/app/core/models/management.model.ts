export interface ManagementApprovalItem {
  id: string;
  title: string;
  hostName: string;
  organization: string;
  category: string;
  eventDate: string;
  venue: string;
  capacity: number;
  ticketPrice: number;
  status: 'under_review' | 'approved' | 'changes_requested' | 'published';
  documentClearance: boolean;
  urgency: 'high' | 'normal' | 'low';
  assignedManager: string;
  submittedAt: string;
  // § 4.1 Major Change Re-approval
  isModificationReview?: boolean;
  previousApprovedDate?: string;
}

export interface ManagementHostReviewItem {
  id: string;
  applicantName: string;
  email?: string;
  phone?: string;
  organizationName: string;
  organizationType?: string;
  city: string;
  scale?: string;
  expectedScale?: string;
  experience?: string;
  pastExperience?: string;
  status: 'under_review' | 'approved' | 'changes_requested' | 'rejected';
  docStatus: 'verified' | 'pending' | 'rejected';
  idDocName?: string;
  assignedReviewer: string;
  submittedAt?: string;
  submittedDate: string;
  reapplicationAttempts?: number;
  maxAttempts?: number;
}

export interface ManagementLiveEvent {
  id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  capacity: number;
  bookedCount: number;
  status: string;
  thumbnailUrl: string;
  settlementStatus?: 'in_escrow' | 'under_review' | 'released';
}

export interface ManagementStaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  assignedEvent: string;
  assignedGate: string;
  status: 'on_duty' | 'break' | 'off_duty';
}
