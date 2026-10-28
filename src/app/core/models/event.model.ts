export interface EventTicketType {
  id: string;
  name: string;
  price: number;
  capacity?: number;
  available?: number;
  description?: string;
}

export interface EventLocation {
  venue: string;
  city: string;
  state?: string;
  country?: string;
  address?: string;
  pincode?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  format?: 'In-Person' | 'Online' | 'Hybrid';
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  isFeatured?: boolean;
  isPopular?: boolean;
  testingNote?: string;
  thumbnailUrl: string;
  imageUrl?: string;
  date: string;
  time?: string;
  location?: EventLocation;
  capacity?: number;
  ticketTypes: EventTicketType[];
  maxTicketsPerBooking?: number;
  hostId?: string;
  createdAt?: string;
}
