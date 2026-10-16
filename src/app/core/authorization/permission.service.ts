import { Injectable, signal, computed, inject } from '@angular/core';
import { Permission, EventMembership } from '@core/models';
import { AuthService } from '@core/auth';
import { POLICY_REGISTRY } from './policies/policy.registry';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private authService = inject(AuthService);
  
  // The current active event context. 
  // Set this when a user navigates into an event management dashboard.
  private _activeMembership = signal<EventMembership | null>(null);

  // Dynamically calculates Effective Permissions (Policies + Direct)
  readonly effectivePermissions = computed<Set<Permission>>(() => {
    const user = this.authService.currentUser();
    const membership = this._activeMembership();
    const perms = new Set<Permission>();

    if (!user || !membership) return perms;

    // 1. Add Policy-derived permissions
    (membership.policyIds || []).forEach(policyId => {
      const policy = POLICY_REGISTRY[policyId];
      if (policy) {
        policy.permissions.forEach(p => perms.add(p));
      }
    });

    // 2. Add Direct (ad-hoc) permissions
    (membership.directPermissions || []).forEach(p => perms.add(p));

    return perms;
  });

  setActiveMembership(membership: EventMembership | null) {
    this._activeMembership.set(membership);
  }

  // The ONE method components call: permissionService.has('event.edit')
  has(permission: Permission): boolean {
    const user = this.authService.currentUser();
    // Super Admins automatically get permission to do everything
    if (user?.platformRole === 'super_admin') return true;
    
    return this.effectivePermissions().has(permission);
  }
}
