/**
 * ============================================================================
 * ⚠️ SECURITY ARCHITECTURE NOTICE: CLIENT-SIDE ROLE ROUTE GUARDS
 * ============================================================================
 * These Angular route guards (`adminGuard`, `managementGuard`, `staffGuard`, `hostGuard`)
 * provide UI routing convenience, role-specific redirections, and navigation protection.
 *
 * IMPORTANT: Client-side route guards are NEVER a real backend security barrier.
 * In any web application, client-side code can be inspected or bypassed by a determined user.
 *
 * Production Security Requirements:
 * 1. Every API endpoint must independently authenticate the caller via verified JWT
 *    or secure HTTP-only session cookies.
 * 2. Every mutating or privileged backend operation must evaluate RBAC/ABAC permissions
 *    on the server before returning data or committing changes.
 * ============================================================================
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: '/admin' } });
  }

  const role = auth.currentUser()?.platformRole;
  if (role === 'admin' || role === 'super_admin') {
    return true;
  }

  return router.createUrlTree(['/discover']);
};

export const managementGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: '/management' } });
  }

  const role = auth.currentUser()?.platformRole;
  if (role === 'management' || role === 'admin' || role === 'super_admin') {
    return true;
  }

  return router.createUrlTree(['/discover']);
};

export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: '/staff' } });
  }

  const role = auth.currentUser()?.platformRole;
  if (role === 'staff' || role === 'management' || role === 'admin' || role === 'super_admin') {
    return true;
  }

  return router.createUrlTree(['/discover']);
};

export const hostGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: '/host/dashboard' } });
  }

  const user = auth.currentUser();
  const role = user?.platformRole;
  if (user?.isHost || role === 'host' || role === 'management' || role === 'admin' || role === 'super_admin') {
    return true;
  }

  return router.createUrlTree(['/host-event']);
};
