import { Injectable } from '@angular/core';
import { ApiError } from '@core/models';
import { axiosInstance } from './axios-instance';
import { handleApiError } from './api-error.handler';
import { 
  adaptDjangoEvent, 
  adaptDjangoEventList, 
  adaptDjangoBooking, 
  adaptDjangoBookingList,
  adaptDjangoHostApplication,
  adaptDjangoHostApplicationList,
  adaptDjangoAdminHostApplication,
  adaptDjangoAdminHostApplicationList
} from './django-adapter';

const PROTOTYPE_MOCK_ENDPOINTS = [
  '/hostActivities',
  '/hostNotifications',
  '/eventMemberships',
  '/eventInvitations',
  '/eventOwnerStakes',
  '/eventManagerAssignments',
  '/eventParticipants',
  '/broadcasts',
  '/settlements',
  '/offers',
  '/giftCards',
  '/giftCardPurchases',
  '/notifications',
  '/users',
  '/staffRoster',
  '/staffIncidents',
  '/attendees'
];

function isPrototypeEndpoint(url: string): boolean {
  return PROTOTYPE_MOCK_ENDPOINTS.some(ep => url === ep || url.startsWith(ep + '/') || url.startsWith(ep + '?'));
}

export type ApiResult<T> = { data: T; error?: null } | { data: null; error: ApiError };

@Injectable({ providedIn: 'root' })
export class ApiClient {

  async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResult<T>> {
    try {
      let targetUrl = url;
      const queryParams = { ...params };

      // Return empty list/null for endpoints not yet provided by backend
      if (isPrototypeEndpoint(targetUrl)) {
        return { data: [] as unknown as T, error: null };
      }

      // Map '/bookings' queries to Django's '/bookings/my-bookings/'
      if (targetUrl === '/bookings' || targetUrl === '/bookings/' || targetUrl.startsWith('/bookings?')) {
        targetUrl = '/bookings/my-bookings/';
        delete queryParams['userId'];
      }

      // Map '/hostApplications' queries to Django's host endpoints
      let isHostAppUserQuery = false;
      let isHostAppAdminQuery = false;
      if (targetUrl === '/hostApplications' || targetUrl === '/hostApplications/' || targetUrl.startsWith('/hostApplications?')) {
        if (queryParams['email'] || targetUrl.includes('email=')) {
          // Regular user querying their own application status
          targetUrl = '/hosts/my-applications/';
          delete queryParams['email'];
          isHostAppUserQuery = true;
        } else {
          // Admin querying pending applications
          targetUrl = '/hosts/applications/pending/';
          isHostAppAdminQuery = true;
        }
      }

      // If fetching the events collection without an explicit page_size, request 100 items
      // so Django's backend default (10) does not truncate events intended for client-side pagination
      const isEventsList = (targetUrl.startsWith('/events') || targetUrl.startsWith('events')) &&
        !targetUrl.includes('ticket-types') &&
        !targetUrl.match(/\/events\/[0-9a-fA-F-]{10,}\/?(\?.*)?$/);

      if (isEventsList && !queryParams['page_size'] && !targetUrl.includes('page_size=')) {
        queryParams['page_size'] = 100;
      }

      const response = await axiosInstance.get(targetUrl, { params: queryParams });
      let data = response.data;

      // Transparently unpack ticket-types endpoint without running event or booking adapter
      if (targetUrl.includes('ticket-types')) {
        if (data && typeof data === 'object' && Array.isArray(data.results)) {
          data = data.results;
        }
        return { data: data as T, error: null };
      }

      // Transparently adapt Django REST events format to EventHub frontend models
      if ((targetUrl.startsWith('/events') || targetUrl.startsWith('events')) && !targetUrl.includes('ticket-types')) {
        if (Array.isArray(data) || (data && Array.isArray(data.results))) {
          data = adaptDjangoEventList(data);
        } else if (data && typeof data === 'object' && ('start_at' in data || 'event_type' in data)) {
          data = adaptDjangoEvent(data);
        }
      } else if (targetUrl.includes('/bookings')) {
        // Transparently adapt Django REST bookings format to EventHub frontend models
        if (Array.isArray(data) || (data && Array.isArray(data.results))) {
          data = adaptDjangoBookingList(data);
        } else if (data && typeof data === 'object' && ('booking_reference' in data || 'booked_at' in data || 'ticket_type' in data)) {
          data = adaptDjangoBooking(data);
        }
      }

      // Transparently adapt Django REST host applications
      if (isHostAppUserQuery || targetUrl.includes('/hosts/my-applications')) {
        data = adaptDjangoHostApplicationList(data);
      } else if (isHostAppAdminQuery || targetUrl.includes('/hosts/applications/pending')) {
        data = adaptDjangoAdminHostApplicationList(data);
      }

      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }

  async post<T>(url: string, body?: any): Promise<ApiResult<T>> {
    try {
      let targetUrl = url;
      let requestBody = body;

      if (isPrototypeEndpoint(targetUrl)) {
        return { data: (body || {}) as T, error: null };
      }

      // Map '/bookings' creation to Django's '/bookings/create/'
      if (targetUrl === '/bookings' || targetUrl === '/bookings/') {
        targetUrl = '/bookings/create/';
        if (body && typeof body === 'object' && body.eventId && body.tickets) {
          const firstTicket = body.tickets[0];
          const totalQty = body.tickets.reduce((sum: number, t: any) => sum + (t.quantity || 1), 0);
          const primaryName = body.attendee?.name || 'Attendee';
          const primaryEmail = body.attendee?.email || '';

          const attendeesList = [];
          for (let i = 0; i < totalQty; i++) {
            attendeesList.push({
              attendee_name: i === 0 ? primaryName : `${primaryName} (Guest ${i + 1})`,
              attendee_email: primaryEmail
            });
          }

          requestBody = {
            event: body.eventId,
            ticket_type: firstTicket?.ticketTypeId || body.ticketTypeId,
            quantity: totalQty,
            attendees: attendeesList
          };
        }
      }

      // Map '/hostApplications' creation to Django's '/hosts/apply/'
      let isHostApply = false;
      if (targetUrl === '/hostApplications' || targetUrl === '/hostApplications/' || targetUrl === '/hosts/apply' || targetUrl === '/hosts/apply/') {
        targetUrl = '/hosts/apply/';
        isHostApply = true;
        if (body && typeof body === 'object') {
          requestBody = {
            business_name: body.organizationName || body.applicantName || body.business_name || 'Independent Host',
            reason: body.pastEventDescription || body.reason || body.pastExperience || 'Organizing curated events on EventHub.'
          };
        }
      }

      const response = await axiosInstance.post(targetUrl, requestBody);
      let data = response.data;

      if ((targetUrl.startsWith('/events') || targetUrl.startsWith('events')) && data && typeof data === 'object' && ('start_at' in data || 'event_type' in data)) {
        data = adaptDjangoEvent(data);
      }

      if (targetUrl.includes('create-payment-intent')) {
        // Do not adapt payment intent response so client_secret and keys remain intact
      } else if (targetUrl.includes('/bookings') && !targetUrl.includes('/cancel') && data && typeof data === 'object') {
        if (data.booking) {
          const adapted = adaptDjangoBooking(data.booking);
          data = {
            ...adapted,
            booking: { ...adapted, ...data.booking },
            message: data.message
          };
        } else {
          data = adaptDjangoBooking(data);
        }
      }

      if (isHostApply || targetUrl.includes('/hosts/apply')) {
        data = adaptDjangoHostApplication(data);
      }

      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }

  async put<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
    try {
      if (isPrototypeEndpoint(url)) {
        return { data: (body || {}) as T, error: null };
      }
      const response = await axiosInstance.put(url, body);
      return { data: response.data as T, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }

  async patch<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
    try {
      if (isPrototypeEndpoint(url)) {
        return { data: (body || {}) as T, error: null };
      }

      // Map '/hostApplications/:id' admin review patch to Django's review POST endpoint
      if (url.startsWith('/hostApplications/')) {
        const appId = url.replace('/hostApplications/', '').replace('/', '');
        const payloadObj = (body && typeof body === 'object') ? (body as Record<string, any>) : {};
        const decision = (payloadObj['status'] === 'approved' || payloadObj['decision'] === 'approved') ? 'approved' : 'rejected';
        return this.post<T>(`/hosts/applications/${appId}/review/`, {
          decision,
          admin_notes: payloadObj['admin_notes'] || ''
        });
      }

      const response = await axiosInstance.patch(url, body);
      let data = response.data;
      if ((url.startsWith('/events') || url.startsWith('events')) && data && typeof data === 'object' && ('start_at' in data || 'event_type' in data)) {
        data = adaptDjangoEvent(data);
      }
      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }

  async delete<T>(url: string): Promise<ApiResult<T>> {
    try {
      if (isPrototypeEndpoint(url)) {
        return { data: {} as T, error: null };
      }
      const response = await axiosInstance.delete(url);
      return { data: response.data as T, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  }
}
