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
  status: 'pending_review' | 'approved' | 'changes_requested' | 'rejected';
  imageUrl: string;
  isFeatured?: boolean;
  requiresReapproval?: boolean;
  settlementStatus?: 'in_escrow' | 'under_review' | 'released';
  payoutReleased?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'attendee' | 'host' | 'staff' | 'management' | 'admin' | 'user';
  status: 'active' | 'suspended' | 'pending';
  joinedDate: string;
  totalSpent: number;
  totalBookings: number;
  avatar: string;
  isHost?: boolean;
}

export interface AdminBroadcast {
  id: string;
  title: string;
  body: string;
  audience: string;
  sentAt: string;
}

export interface AdminSettlement {
  id: string;
  eventId: string;
  eventTitle: string;
  hostName: string;
  organization: string;
  grossAmount: number;
  platformCommission: number;
  netPayout: number;
  status: 'pending' | 'settled' | 'on_hold';
  bankAccount: string;
  requestedDate: string;
  settledDate?: string;
}
