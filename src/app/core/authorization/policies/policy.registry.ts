//currently hard coded list of the default policies and later i make this as dynamic
import { Policy } from '@core/models';

export const POLICY_REGISTRY: Record<string, Policy> = {
  attendee: {
    id: 'attendee',
    name: 'Attendee Policy',
    description: 'Basic access for registered attendees',
    permissions: ['event.view', 'ticket.view', 'booking.view']
  },
  registration_staff: {
    id: 'registration_staff',
    name: 'Registration Staff',
    description: 'Can view events and check-in bookings',
    responsibility: 'registration',
    permissions: ['event.view', 'booking.view', 'booking.checkin']
  },
  event_manager: {
    id: 'event_manager',
    name: 'Event Manager',
    description: 'Full operational control of an event',
    permissions: [
      'event.view', 'event.edit', 'ticket.view', 'ticket.manage', 
      'booking.view', 'booking.manage', 'staff.view', 'staff.invite', 'staff.assign'
    ]
  }
};
