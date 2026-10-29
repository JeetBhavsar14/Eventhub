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
