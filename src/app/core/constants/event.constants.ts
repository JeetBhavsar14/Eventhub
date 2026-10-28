/**
 * Centralized Event Domain Constants
 * Shared across Discover, Home, Event Filter, and Host workspaces
 */

export const EVENT_CATEGORIES = [
  'All',
  'Concerts',
  'Festivals',
  'Sports',
  'Conferences',
  'Workshops',
  'Shows & Entertainment',
  'Activities',
  'Technology',
  'Arts & Culture',
  'Food & Lifestyle',
  'Comedy & Theater',
  'Health & Wellness',
  'Parties & Nightlife'
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];

export const CATEGORY_TYPES: Record<string, string[]> = {
  'Sports': ['All Sports', 'Cricket', 'Football', 'Basketball', 'Tennis', 'Marathon'],
  'Concerts': ['All Concerts', 'Rock', 'Pop', 'Classical', 'Jazz', 'EDM', 'Indie'],
  'Workshops': ['All Workshops', 'Design', 'Coding', 'Photography', 'Cooking', 'Business'],
  'Technology': ['All Tech', 'AI & ML', 'Web Dev', 'Cybersecurity', 'Blockchain', 'Cloud Computing'],
  'Shows & Entertainment': ['All Shows', 'Standup Comedy', 'Magic Show', 'Live Drama', 'Circus'],
  'Activities': ['All Activities', 'Trekking', 'Escape Room', 'Camping', 'Paintball', 'Gaming'],
  'Arts & Culture': ['All Arts', 'Art Exhibition', 'Museum Tour', 'Pottery', 'Painting Workshop'],
  'Food & Lifestyle': ['All Food', 'Food Fest', 'Wine Tasting', 'Baking', 'Coffee Brewing'],
  'Comedy & Theater': ['All Comedy', 'Stand-up', 'Improv', 'Musical Theater', 'Open Mic'],
  'Health & Wellness': ['All Wellness', 'Yoga', 'Meditation', 'Fitness Bootcamp', 'Zumba'],
  'Parties & Nightlife': ['All Parties', 'Club Night', 'DJ Night', 'Rooftop Party', 'Pool Party'],
  'Festivals': ['All Festivals', 'Music Fest', 'Cultural Fest', 'Film Fest', 'Food Fest'],
  'Conferences': ['All Conferences', 'Tech Summit', 'Business Expo', 'Medical Conf', 'Leadership']
};

export const DATE_FILTER_OPTIONS = [
  'Any Date',
  'Today',
  'Tomorrow',
  'This Weekend',
  'Next Week',
  'Specific Range'
] as const;

export const PRICE_FILTER_OPTIONS = [
  'Any Price',
  'Free',
  'Under ₹500',
  '₹500 - ₹1500',
  '₹1500 - ₹3000',
  '₹3000+',
  'Custom Range'
] as const;

export const MOBILE_PRICE_FILTER_OPTIONS = [
  'Any Range',
  'Free',
  'Under ₹500',
  '₹500 - ₹1500',
  '₹1500 - ₹3000',
  '₹3000+',
  'Custom Range'
] as const;

export const POPULAR_CITIES = [
  'Mumbai',
  'Ahmedabad',
  'Delhi-NCR',
  'Bengaluru',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Kolkata'
] as const;

export type PopularCity = typeof POPULAR_CITIES[number];

export const DEFAULT_RECENT_SEARCHES = [
  'Festivals',
  'Concerts',
  'Mumbai',
  'Comedy',
  'Workshop'
] as const;

export const STARTING_PRICE_FALLBACK = 0;
