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
