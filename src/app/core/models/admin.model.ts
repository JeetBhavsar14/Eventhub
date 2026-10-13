export interface AdminHostApplication {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  organizationName: string;
  organizationType: string;
  city: string;
  expectedScale: string;
  primaryCategories: string[];
  pastExperience: string;
  idDocName: string;
  status: 'under_review' | 'approved' | 'rejected' | 'changes_requested';
  submittedDate: string;
  submittedAt?: string;
  // § 3.0 Host Lifecycle & Policy
  applicationFee?: number;
  reapplicationAttempts?: number;
  maxAttempts?: number;
  refundAmount?: number;
  refundIssued?: boolean;
}

export interface AdminCurationEvent {
  id: string;
  title: string;
  hostName: string;
  organization: string;
  city: string;
  venue: string;
  date: string;
  capacity: number;
  ticketPrice: number;
  soundPermitUploaded: boolean;
  venuePermitUploaded: boolean;
  status: 'pending_review' | 'approved' | 'changes_requested';
  imageUrl: string;
  // § 4.1 & 8.1 Event Lifecycle & Settlement
  requiresReapproval?: boolean;
  settlementStatus?: 'in_escrow' | 'under_review' | 'released';
  payoutReleased?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'attendee' | 'host' | 'staff' | 'management' | 'admin' | 'user';
  status: 'active' | 'suspended' | 'pending';
  joinedDate: string;
  totalSpent: number;
  totalBookings: number;
  avatar: string;
}

export interface AdminBroadcast {
  id: string;
  title: string;
  body: string;
  audience: string;
  sentAt: string;
}
