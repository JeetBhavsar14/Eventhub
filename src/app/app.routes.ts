import { Routes } from '@angular/router';
import { authGuard, adminGuard, managementGuard, staffGuard, hostGuard } from '@core/auth';
import { ShellComponent, MainLayoutComponent } from './layout';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      
      // 1. HOST WORKSPACE (Canonical Entry: /host/dashboard - Lazy Loaded)
      { 
        path: 'host/dashboard', 
        loadComponent: () => import('./layout/host-layout/host-layout.component').then(m => m.HostLayoutComponent),
        canActivate: [hostGuard]
      },
      // Host Legacy Aliases (Redirect to Canonical Workspace)
      { path: 'host/workspace', redirectTo: 'host/dashboard', pathMatch: 'full' },
      { path: 'host/layout', redirectTo: 'host/dashboard', pathMatch: 'full' },
      { path: 'host-dashboard', redirectTo: 'host/dashboard', pathMatch: 'full' },

      // 2. MANAGEMENT WORKSPACE (Canonical Entry: /management - Lazy Loaded)
      {
        path: 'management',
        loadComponent: () => import('./layout/management-layout/management-layout').then(m => m.ManagementLayoutComponent),
        canActivate: [managementGuard]
      },
      // Management Legacy Aliases & Sub-Paths (Redirect to Canonical Workspace)
      { path: 'management/overview', redirectTo: 'management', pathMatch: 'full' },
      { path: 'management/approvals', redirectTo: 'management', pathMatch: 'full' },
      { path: 'management/hosts', redirectTo: 'management', pathMatch: 'full' },
      { path: 'management/operations', redirectTo: 'management', pathMatch: 'full' },
      { path: 'manage', redirectTo: 'management', pathMatch: 'full' },
      { path: 'manage/:eventId', redirectTo: 'management', pathMatch: 'full' },

      // 3. EVENT-STAFF WORKSPACE (Canonical Entry: /staff - Lazy Loaded)
      {
        path: 'staff',
        loadComponent: () => import('./layout/staff-layout/staff-layout').then(m => m.StaffLayoutComponent),
        canActivate: [staffGuard]
      },
      // Staff Legacy Aliases & Sub-Paths (Redirect to Canonical Workspace)
      { path: 'staff/scanner', redirectTo: 'staff', pathMatch: 'full' },
      { path: 'staff/checkin', redirectTo: 'staff', pathMatch: 'full' },
      { path: 'staff/today', redirectTo: 'staff', pathMatch: 'full' },
      { path: 'staff/issues', redirectTo: 'staff', pathMatch: 'full' },

      // 4. PLATFORM SUPER ADMIN WORKSPACE (Canonical Entry: /admin - Lazy Loaded)
      {
        path: 'admin',
        loadComponent: () => import('./layout/admin-layout/admin-layout').then(m => m.AdminLayoutComponent),
        canActivate: [adminGuard]
      },
      // Admin Legacy Aliases & Sub-Paths (Redirect to Canonical Workspace)
      { path: 'admin/dashboard', redirectTo: 'admin', pathMatch: 'full' },
      { path: 'admin/curation', redirectTo: 'admin', pathMatch: 'full' },
      { path: 'admin/hosts', redirectTo: 'admin', pathMatch: 'full' },
      { path: 'admin/applications', redirectTo: 'admin', pathMatch: 'full' },
      { path: 'admin/users', redirectTo: 'admin', pathMatch: 'full' },

      // 5. MAIN PUBLIC & USER LAYOUT (With Header & Footer - Features Lazy Loaded)
      {
        path: '',
        component: MainLayoutComponent,
        children: [
          // Public Features (Lazy Loaded)
          { 
            path: '', 
            loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) 
          },
          { 
            path: 'discover', 
            loadComponent: () => import('./features/discover/discover.component').then(m => m.DiscoverComponent) 
          },
          { 
            path: 'events/:id', 
            loadComponent: () => import('./features/event-details/event-details.component').then(m => m.EventDetailsComponent) 
          },
          { 
            path: 'offers', 
            loadComponent: () => import('./features/offers/offers.component').then(m => m.OffersComponent) 
          },
          { 
            path: 'gift-cards', 
            loadComponent: () => import('./features/gift-cards/gift-cards.component').then(m => m.GiftCardsComponent) 
          },
          { 
            path: 'help', 
            loadComponent: () => import('./features/info-page/info-page.component').then(m => m.InfoPageComponent), 
            data: { title: 'Help Center', intro: 'Find answers about booking, tickets and account support.', sections: [{ heading: 'Your bookings', body: 'Open My Bookings to view confirmed tickets, QR codes and event information.' }, { heading: 'Need support?', body: 'For this demo application, booking and payment records are stored in the local mock API.' }] } 
          },
          { 
            path: 'terms', 
            loadComponent: () => import('./features/info-page/info-page.component').then(m => m.InfoPageComponent), 
            data: { title: 'Terms of Service', intro: 'The rules for using the EventHub demonstration application.', sections: [{ heading: 'Demo service', body: 'EventHub currently runs with a local mock API. Payments, authentication and ticket availability are demonstration features only.' }, { heading: 'Tickets', body: 'A confirmed booking creates a ticket record for the signed-in user.' }] } 
          },
          { 
            path: 'privacy', 
            loadComponent: () => import('./features/info-page/info-page.component').then(m => m.InfoPageComponent), 
            data: { title: 'Privacy Policy', intro: 'How this demonstration app handles your local data.', sections: [{ heading: 'Local data', body: 'Profile, booking and gift-card records are stored in the local json-server database used by this project.' }, { heading: 'Payment details', body: 'Card number and CVV are validated for the mock checkout but are not stored with bookings or gift cards.' }] } 
          },
          { 
            path: 'cancellation', 
            loadComponent: () => import('./features/info-page/info-page.component').then(m => m.InfoPageComponent), 
            data: { title: 'Cancellation & Refunds', intro: 'Information about ticket cancellation in this demo.', sections: [{ heading: 'Booking support', body: 'Cancellation and refund processing is not yet implemented in the mock backend.' }, { heading: 'Gift cards', body: 'Gift cards are created as active records once the mock payment succeeds.' }] } 
          },
          { 
            path: 'contact', 
            loadComponent: () => import('./features/info-page/info-page.component').then(m => m.InfoPageComponent), 
            data: { title: 'Contact Us', intro: 'We are here to help with your EventHub experience.', sections: [{ heading: 'Customer support', body: 'For this demonstration, use the Help Center and inspect the local mock data for booking support.' }] } 
          },
          { 
            path: 'host', 
            loadComponent: () => import('./features/host-event/host-event.component').then(m => m.HostEventComponent) 
          },
          { 
            path: 'host/apply', 
            loadComponent: () => import('./features/host-event/host-event.component').then(m => m.HostEventComponent) 
          },
          { 
            path: 'corporate', 
            loadComponent: () => import('./features/info-page/info-page.component').then(m => m.InfoPageComponent), 
            data: { title: 'Corporate Ticketing', intro: 'Simplify event experiences for your team.', sections: [{ heading: 'Corporate plans', body: 'Corporate ticketing is planned and is not yet available in this demo.' }] } 
          },
          { 
            path: 'pricing', 
            loadComponent: () => import('./features/info-page/info-page.component').then(m => m.InfoPageComponent), 
            data: { title: 'Pricing & Plans', intro: 'Simple options for event organizers.', sections: [{ heading: 'Plans', body: 'Organizer plan management will be available with the event-management feature.' }] } 
          },
          { 
            path: 'sitemap', 
            loadComponent: () => import('./features/info-page/info-page.component').then(m => m.InfoPageComponent), 
            data: { title: 'EventHub Sitemap', intro: 'Quick links to the main EventHub experiences.', sections: [{ heading: 'Explore', body: 'Discover events, browse offers, purchase gift cards, and manage your account from the header navigation.' }] } 
          },
          { 
            path: 'auth/login', 
            loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) 
          },
          { 
            path: 'auth/register', 
            loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) 
          },

          // Protected User Routes (Lazy Loaded)
          { 
            path: 'checkout/:eventId', 
            loadComponent: () => import('./features/checkout/checkout').then(m => m.Checkout), 
            canActivate: [authGuard] 
          },
          {
            path: 'payment-gateway',
            loadComponent: () => import('./features/payment-gateway/payment-gateway.component').then(m => m.PaymentGatewayComponent),
            canActivate: [authGuard]
          },
          { 
            path: 'gift-card-checkout/:id', 
            loadComponent: () => import('./features/gift-card-checkout/gift-card-checkout.component').then(m => m.GiftCardCheckoutComponent), 
            canActivate: [authGuard] 
          },
          { 
            path: 'bookings', 
            loadComponent: () => import('./features/bookings/bookings.component').then(m => m.BookingsComponent), 
            canActivate: [authGuard] 
          },
          { 
            path: 'my-gift-cards', 
            loadComponent: () => import('./features/my-gift-cards/my-gift-cards.component').then(m => m.MyGiftCardsComponent), 
            canActivate: [authGuard] 
          },
          { 
            path: 'profile', 
            loadComponent: () => import('./features/profile/profile').then(m => m.Profile), 
            canActivate: [authGuard] 
          }
        ]
      }

    ]
  }
];

