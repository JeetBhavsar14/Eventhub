import { Routes } from '@angular/router';
import { authGuard, adminGuard, managementGuard, staffGuard, hostGuard } from '@core/auth';
import { 
  ShellComponent, 
  MainLayoutComponent, 
  ManagementLayoutComponent, 
  AdminLayoutComponent,
  StaffLayoutComponent,
  HostLayoutComponent 
} from './layout';
import { Component } from '@angular/core';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DiscoverComponent } from './features/discover/discover.component';
import { EventDetailsComponent } from './features/event-details/event-details.component';
import { Profile } from './features/profile/profile';
import { Checkout } from './features/checkout/checkout';
import { BookingsComponent } from './features/bookings/bookings.component';
import { OffersComponent } from './features/offers/offers.component';
import { GiftCardsComponent } from './features/gift-cards/gift-cards.component';
import { MyGiftCardsComponent } from './features/my-gift-cards/my-gift-cards.component';
import { GiftCardCheckoutComponent } from './features/gift-card-checkout/gift-card-checkout.component';
import { InfoPageComponent } from './features/info-page/info-page.component';
import { HostEventComponent } from './features/host-event/host-event.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      
      // 1. HOST WORKSPACE / DASHBOARD LAYOUT
      { 
        path: 'host/dashboard', 
        component: HostLayoutComponent,
        canActivate: [hostGuard]
      },
      { 
        path: 'host/workspace', 
        component: HostLayoutComponent,
        canActivate: [hostGuard]
      },
      { 
        path: 'host/layout', 
        component: HostLayoutComponent,
        canActivate: [hostGuard]
      },
      { 
        path: 'host-dashboard', 
        component: HostLayoutComponent,
        canActivate: [hostGuard]
      },

      // 2. MANAGEMENT WORKSPACE (Operations Center & Approvals Workflow)
      {
        path: 'management',
        component: ManagementLayoutComponent,
        canActivate: [managementGuard]
      },
      {
        path: 'management/overview',
        component: ManagementLayoutComponent,
        canActivate: [managementGuard]
      },
      {
        path: 'management/approvals',
        component: ManagementLayoutComponent,
        canActivate: [managementGuard]
      },
      {
        path: 'management/hosts',
        component: ManagementLayoutComponent,
        canActivate: [managementGuard]
      },
      {
        path: 'management/operations',
        component: ManagementLayoutComponent,
        canActivate: [managementGuard]
      },
      {
        path: 'manage',
        component: ManagementLayoutComponent,
        canActivate: [managementGuard],
        children: [
          { path: ':eventId', component: ManagementLayoutComponent }
        ]
      },

      // 3. EVENT-STAFF WORKSPACE (Mobile-First Venue Check-in & Ground Operations)
      {
        path: 'staff',
        component: StaffLayoutComponent,
        canActivate: [staffGuard]
      },
      {
        path: 'staff/scanner',
        component: StaffLayoutComponent,
        canActivate: [staffGuard]
      },
      {
        path: 'staff/checkin',
        component: StaffLayoutComponent,
        canActivate: [staffGuard]
      },
      {
        path: 'staff/today',
        component: StaffLayoutComponent,
        canActivate: [staffGuard]
      },
      {
        path: 'staff/issues',
        component: StaffLayoutComponent,
        canActivate: [staffGuard]
      },

      // 4. PLATFORM SUPER ADMIN WORKSPACE (Platform Governance, Verification & Finance)
      {
        path: 'admin',
        component: AdminLayoutComponent,
        canActivate: [adminGuard]
      },
      {
        path: 'admin/dashboard',
        component: AdminLayoutComponent,
        canActivate: [adminGuard]
      },
      {
        path: 'admin/curation',
        component: AdminLayoutComponent,
        canActivate: [adminGuard]
      },
      {
        path: 'admin/hosts',
        component: AdminLayoutComponent,
        canActivate: [adminGuard]
      },

      // 3. MAIN PUBLIC & USER LAYOUT (With Public Navigation Header & Footer)
      {
        path: '',
        component: MainLayoutComponent,
        children: [
          // Public
          { path: '', component: DiscoverComponent },
          { path: 'discover', component: DiscoverComponent },
          { path: 'events/:id', component: EventDetailsComponent },
          { path: 'offers', component: OffersComponent },
          { path: 'gift-cards', component: GiftCardsComponent },
          { path: 'help', component: InfoPageComponent, data: { title: 'Help Center', intro: 'Find answers about booking, tickets and account support.', sections: [{ heading: 'Your bookings', body: 'Open My Bookings to view confirmed tickets, QR codes and event information.' }, { heading: 'Need support?', body: 'For this demo application, booking and payment records are stored in the local mock API.' }] } },
          { path: 'terms', component: InfoPageComponent, data: { title: 'Terms of Service', intro: 'The rules for using the EventHub demonstration application.', sections: [{ heading: 'Demo service', body: 'EventHub currently runs with a local mock API. Payments, authentication and ticket availability are demonstration features only.' }, { heading: 'Tickets', body: 'A confirmed booking creates a ticket record for the signed-in user.' }] } },
          { path: 'privacy', component: InfoPageComponent, data: { title: 'Privacy Policy', intro: 'How this demonstration app handles your local data.', sections: [{ heading: 'Local data', body: 'Profile, booking and gift-card records are stored in the local json-server database used by this project.' }, { heading: 'Payment details', body: 'Card number and CVV are validated for the mock checkout but are not stored with bookings or gift cards.' }] } },
          { path: 'cancellation', component: InfoPageComponent, data: { title: 'Cancellation & Refunds', intro: 'Information about ticket cancellation in this demo.', sections: [{ heading: 'Booking support', body: 'Cancellation and refund processing is not yet implemented in the mock backend.' }, { heading: 'Gift cards', body: 'Gift cards are created as active records once the mock payment succeeds.' }] } },
          { path: 'contact', component: InfoPageComponent, data: { title: 'Contact Us', intro: 'We are here to help with your EventHub experience.', sections: [{ heading: 'Customer support', body: 'For this demonstration, use the Help Center and inspect the local mock data for booking support.' }] } },
          { path: 'host', component: HostEventComponent },
          { path: 'host/apply', component: HostEventComponent },
          { path: 'corporate', component: InfoPageComponent, data: { title: 'Corporate Ticketing', intro: 'Simplify event experiences for your team.', sections: [{ heading: 'Corporate plans', body: 'Corporate ticketing is planned and is not yet available in this demo.' }] } },
          { path: 'pricing', component: InfoPageComponent, data: { title: 'Pricing & Plans', intro: 'Simple options for event organizers.', sections: [{ heading: 'Plans', body: 'Organizer plan management will be available with the event-management feature.' }] } },
          { path: 'sitemap', component: InfoPageComponent, data: { title: 'EventHub Sitemap', intro: 'Quick links to the main EventHub experiences.', sections: [{ heading: 'Explore', body: 'Discover events, browse offers, purchase gift cards, and manage your account from the header navigation.' }] } },
          { path: 'auth/login', component: LoginComponent },
          { path: 'auth/register', component: RegisterComponent },

          // Protected (Notice the authGuard!)
          { path: 'checkout/:eventId', component: Checkout, canActivate: [authGuard] },
          { path: 'gift-card-checkout/:id', component: GiftCardCheckoutComponent, canActivate: [authGuard] },
          { path: 'bookings', component: BookingsComponent, canActivate: [authGuard] },
          { path: 'my-gift-cards', component: MyGiftCardsComponent, canActivate: [authGuard] },
          { path: 'profile', component: Profile, canActivate: [authGuard] }
        ]
      }

    ]
  }
];
