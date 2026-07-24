import { api } from './api';

// Helper to check if error is table missing in Supabase schema cache
export function isTableMissingError(error) {
  return false;
}

// Helper to ensure public.users entry exists for foreign keys
export async function ensureUserInPublicUsers(user) {
  return;
}

// 1. DONOR PROFILES
export async function upsertDonorProfile(profileData, user) {
  try {
    const res = await api.post('/donors/upsert', profileData);
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('upsertDonorProfile error:', err);
    return { data: null, error: err.response?.data?.message || err.message };
  }
}

export async function fetchDonorProfiles(filters = {}) {
  try {
    const res = await api.get('/donors', { params: filters });
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('fetchDonorProfiles error:', err);
    return { data: [], error: err.response?.data?.message || err.message };
  }
}

// 2. BLOOD REQUESTS
export async function createBloodRequest(requestData, user) {
  try {
    const res = await api.post('/requests', requestData);
    return { data: [res.data.data], error: null };
  } catch (err) {
    console.error('createBloodRequest error:', err);
    return { data: null, error: err.response?.data?.message || err.message };
  }
}

export async function fetchBloodRequests(filters = {}, currentUserId = null, excludeOwn = false) {
  try {
    const res = await api.get('/requests', {
      params: {
        ...filters,
        excludeOwn: excludeOwn ? 'true' : 'false'
      }
    });
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('fetchBloodRequests error:', err);
    return { data: [], error: err.response?.data?.message || err.message };
  }
}

export async function deleteBloodRequest(requestId) {
  try {
    await api.delete(`/requests/${requestId}`);
    return { success: true };
  } catch (err) {
    console.error('deleteBloodRequest error:', err);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

export async function updateBloodRequestStatus(requestId, status) {
  try {
    await api.put(`/requests/${requestId}/status`, { status });
    return { success: true };
  } catch (err) {
    console.error('updateBloodRequestStatus error:', err);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

export async function fetchPlatformStats() {
  try {
    const res = await api.get('/admin/stats');
    return res.data.data;
  } catch (err) {
    console.error('fetchPlatformStats error:', err);
    return {
      totalDonors: 0,
      totalRequests: 0,
      livesSaved: 0,
      avgResponseTime: 'N/A'
    };
  }
}

export async function fetchMyDonorProfile(userId) {
  try {
    const res = await api.get('/donors/me');
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('fetchMyDonorProfile error:', err);
    return { data: null, error: err.response?.data?.message || err.message };
  }
}

export async function acceptBloodRequest(requestId, donorUser, donorProfile = null) {
  try {
    const res = await api.post(`/requests/${requestId}/accept`, { donorProfile });
    return { data: [res.data.data], error: null };
  } catch (err) {
    console.error('acceptBloodRequest error:', err);
    return { data: null, error: err.response?.data?.message || err.message };
  }
}

export async function completeBloodRequest(requestId, user) {
  try {
    const res = await api.post(`/requests/${requestId}/complete`);
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('completeBloodRequest error:', err);
    return { data: null, error: err.response?.data?.message || err.message };
  }
}

export async function fetchUserNotifications(userId) {
  try {
    const res = await api.get('/users/notifications');
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('fetchUserNotifications error:', err);
    return { data: [], error: err.response?.data?.message || err.message };
  }
}

export async function fetchDonationHistory(userId) {
  try {
    const res = await api.get('/users/history');
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('fetchDonationHistory error:', err);
    return { data: [], error: err.response?.data?.message || err.message };
  }
}

export async function updateDonorAvailability(profileId, userId, isAvailable) {
  try {
    await api.put('/donors/availability', { isAvailable });
    return { error: null };
  } catch (err) {
    console.error('updateDonorAvailability error:', err);
    return { error: err.response?.data?.message || err.message };
  }
}

// Reports & Admin helpers
export function normalizeReport(item) {
  return item;
}

export async function createReport(reportData) {
  try {
    const res = await api.post('/admin/reports', reportData);
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('createReport error:', err);
    return { data: null, error: err.response?.data?.message || err.message };
  }
}

export async function fetchReports() {
  try {
    const res = await api.get('/admin/reports');
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('fetchReports error:', err);
    return { data: [], error: err.response?.data?.message || err.message };
  }
}

export async function dismissReport(reportId) {
  try {
    await api.put(`/admin/reports/${reportId}/dismiss`);
    return { success: true };
  } catch (err) {
    console.error('dismissReport error:', err);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

export async function takeReportAction({ reportId, action, targetUserId, targetUserEmail, targetItemId, itemType }) {
  try {
    await api.post(`/admin/reports/${reportId}/action`, { action, targetUserId, targetUserEmail, targetItemId, itemType });
    return { success: true };
  } catch (err) {
    console.error('takeReportAction error:', err);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

export async function deleteDonorProfile(donorId, userId) {
  try {
    await api.delete('/donors/me');
    return { success: true };
  } catch (err) {
    console.error('deleteDonorProfile error:', err);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

export async function sendBroadcastNotification(message, durationHours = 24) {
  try {
    const res = await api.post('/admin/broadcast', { message, durationHours });
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('sendBroadcastNotification error:', err);
    return { data: null, error: err.response?.data?.message || err.message };
  }
}

export async function updateBroadcastNotification(broadcastId, message, durationHours) {
  try {
    const res = await api.put(`/admin/broadcast/${broadcastId}`, { message, durationHours });
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('updateBroadcastNotification error:', err);
    return { data: null, error: err.response?.data?.message || err.message };
  }
}

export async function fetchBroadcasts() {
  try {
    const res = await api.get('/admin/broadcasts');
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('fetchBroadcasts error:', err);
    return { data: [], error: err.response?.data?.message || err.message };
  }
}

export async function deleteBroadcast(broadcastId) {
  try {
    await api.delete(`/admin/broadcast/${broadcastId}`);
    return { success: true };
  } catch (err) {
    console.error('deleteBroadcast error:', err);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

export async function fetchAllUsers() {
  try {
    const res = await api.get('/admin/users');
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('fetchAllUsers error:', err);
    return { data: [], error: err.response?.data?.message || err.message };
  }
}

export async function suspendUserDirect(userId) {
  try {
    const res = await api.put(`/admin/users/${userId}/suspend`);
    return { success: true };
  } catch (err) {
    console.error('suspendUserDirect error:', err);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

export async function unsuspendUserDirect(userId) {
  try {
    const res = await api.put(`/admin/users/${userId}/unsuspend`);
    return { success: true };
  } catch (err) {
    console.error('unsuspendUserDirect error:', err);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

export async function deleteUserDirect(userId) {
  try {
    const res = await api.delete(`/admin/users/${userId}`);
    return { success: true };
  } catch (err) {
    console.error('deleteUserDirect error:', err);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

export async function fetchAcceptedRequests() {
  try {
    const res = await api.get('/admin/accepted-requests');
    return { data: res.data.data, error: null };
  } catch (err) {
    console.error('fetchAcceptedRequests error:', err);
    return { data: [], error: err.response?.data?.message || err.message };
  }
}
