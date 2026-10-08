import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { Permission } from '@core/models';
import { PermissionService } from './permission.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private permissionService = inject(PermissionService);
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  
  private _permission: Permission | null = null;
  private hasView = false;

  @Input() set appHasPermission(permission: Permission) {
    this._permission = permission;
    this.updateView();
  }

  constructor() {
    // Re-evaluate whenever permissions change (e.g. user logs out, or event context changes)
    effect(() => {
      // Reading the signal forces the effect to track it
      this.permissionService.effectivePermissions(); 
      this.updateView();
    });
  }

  private updateView() {
    if (!this._permission) return;
    
    const hasPerm = this.permissionService.has(this._permission);
    
    if (hasPerm && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPerm && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
