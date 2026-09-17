export interface Room {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  capacity: number;
  location: string;
  color: {
    primary: string;
    bg: string;
    border: string;
    text: string;
    light: string;
    badge: string;
  };
  amenities: {
    iconName: string;
    label: string;
  }[];
  description: string;
  recommendedFor: string;
}

export type MeetingCategory =
  | 'team'
  | 'client'
  | 'tech'
  | 'interview'
  | 'brainstorm'
  | 'emergency'
  | 'other';

export interface Booking {
  id: string;
  roomId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  organizerName: string;
  organizerEmail: string;
  attendeesCount: number;
  attendeesList?: string[];
  category: MeetingCategory;
  notes?: string;
  createdAt: string;
  provider?: 'google' | 'microsoft' | 'local';
  userAvatar?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'google' | 'microsoft';
  title?: string;
}

export type ViewMode = 'month' | 'week' | 'day' | 'my-bookings';

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingBooking?: Booking;
  message?: string;
}
