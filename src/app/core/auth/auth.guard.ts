/**
 * ============================================================================
 * ⚠️ SECURITY ARCHITECTURE NOTICE: CLIENT-SIDE AUTHENTICATION GUARD
 * ============================================================================
 * This Angular `CanActivateFn` guard prevents unauthenticated users from accessing
 * private routes in the browser application and redirects them to `/auth/login`.
 *
 * NOTE: Client-side route guards are for UX workflow and screen navigation.
 * Production security must always be enforced server-side per API request.
 * ============================================================================
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;  // Logged in — let them through
  }

  // Not logged in — redirect to login page
  return router.createUrlTree(['/auth/login']);
};

/**
 * Redirects authenticated users (such as normal users and host users)
 * visiting the root URL (localhost:4200 / '') to the '/discover' page
 * instead of the unauthenticated landing page.
 */
export const homeRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.currentUser();
    const role = (user?.platformRole || 'user').toLowerCase();

    if (role === 'admin' || role === 'super_admin') {
      return router.createUrlTree(['/admin']);
    }
    if (role === 'management') {
      return router.createUrlTree(['/management']);
    }
    if (role === 'staff') {
      return router.createUrlTree(['/staff']);
    }

    // Normal login user and host login user -> redirect to discover
    return router.createUrlTree(['/discover']);
  }

  // Unauthenticated guest user sees the landing page
  return true;
};
