import { HostApplicationData, AdminHostApplication } from '@core/models';

/**
 * Normalizes a Django REST Framework HostApplication record into frontend HostApplicationData.
 */
export function adaptDjangoHostApplication(item: any): HostApplicationData {
  if (!item) return item;
  if (item.applicantName && item.organizationType) {
    return item as HostApplicationData;
  }

  const rawStatus = (item.status || 'pending').toLowerCase();
  const status: HostApplicationData['status'] =
    rawStatus === 'approved' ? 'approved' :
    rawStatus === 'rejected' ? 'rejected' :
    rawStatus === 'changes_requested' ? 'changes_requested' :
    'under_review';

  return {
    id: String(item.id),
    userId: String(item.user || ''),
    applicantName: item.business_name || 'Host Applicant',
    email: item.email || item.user_email || '',
    phone: item.phone || '',
    organizationType: (item.organization_type || 'agency') as HostApplicationData['organizationType'],
    organizationName: item.business_name || 'Independent Host',
    websiteOrSocial: item.website || '',
    experienceLevel: (item.experience_level || '1-3-years') as HostApplicationData['experienceLevel'],
    primaryCategories: item.primary_categories || ['Workshops', 'Conferences'],
    expectedAttendeeScale: item.expected_scale || '100 - 500 attendees',
    city: item.city || 'Indore',
    pastEventDescription: item.reason || '',
    idType: 'business_reg',
    status,
    statusMessage: item.admin_notes || (
      status === 'approved' ? 'Your host application has been approved! You have full organizer privileges.' :
      status === 'rejected' ? 'Your host application was rejected by curation.' :
      'Your application is currently under review by the EventHub curation board.'
    ),
    submittedAt: item.created_at || new Date().toISOString(),
    updatedAt: item.updated_at || new Date().toISOString()
  };
}

/**
 * Normalizes DRF paginated or list host application responses into HostApplicationData[].
 */
export function adaptDjangoHostApplicationList(data: any): HostApplicationData[] {
  if (!data) return [];
  const rawList = Array.isArray(data) ? data : (data.results && Array.isArray(data.results) ? data.results : []);
  return rawList.map(adaptDjangoHostApplication);
}

/**
 * Normalizes a Django REST Framework HostApplication record into AdminHostApplication.
 */
export function adaptDjangoAdminHostApplication(item: any): AdminHostApplication {
  if (!item) return item;
  if (item.applicantName && item.expectedScale) {
    return item as AdminHostApplication;
  }

  const rawStatus = (item.status || 'pending').toLowerCase();
  const status: AdminHostApplication['status'] =
    rawStatus === 'approved' ? 'approved' :
    rawStatus === 'rejected' ? 'rejected' :
    rawStatus === 'changes_requested' ? 'changes_requested' :
    'under_review';

  const createdAt = item.created_at || new Date().toISOString();

  return {
    id: String(item.id),
    applicantName: item.business_name || 'Host Applicant',
    email: item.email || item.user_email || 'applicant@eventhub.com',
    phone: item.phone || '+91 98000 00000',
    organizationName: item.business_name || 'Independent Host',
    organizationType: item.organization_type || 'agency',
    city: item.city || 'Indore',
    expectedScale: item.expected_scale || '100 - 500 attendees',
    primaryCategories: item.primary_categories || ['Workshops', 'Conferences'],
    pastExperience: item.reason || '',
    idDocName: 'business_verification.pdf',
    status,
    submittedDate: createdAt.split('T')[0],
    submittedAt: createdAt
  };
}

/**
 * Normalizes DRF paginated or list host application responses into AdminHostApplication[].
 */
export function adaptDjangoAdminHostApplicationList(data: any): AdminHostApplication[] {
  if (!data) return [];
  const rawList = Array.isArray(data) ? data : (data.results && Array.isArray(data.results) ? data.results : []);
  return rawList.map(adaptDjangoAdminHostApplication);
}

