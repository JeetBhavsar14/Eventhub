export type AdminView = 'overview' | 'host_applications' | 'event_curation' | 'users' | 'revenue' | 'system' | 'finance' | 'settings';

export interface PlatformStats {
  totalGMV: string;
  platformCommission: string;
  pendingPayouts: string;
  settledPayouts: string;
  totalUsers: number;
  activeUsers: number;
  verifiedHosts: number;
  pendingAppsCount: number;
  pendingEventsCount: number;
  actionRequiredEvents: number;
  systemUptime: string;
}

