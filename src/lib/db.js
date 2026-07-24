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

const LOCAL_BROADCASTS_KEY = 'bloodbridge_local_broadcasts';

export async function sendBroadcastNotification(message, durationHours = 24) {
  let createdItem = null;
  try {
    const res = await api.post('/admin/broadcast', { message, durationHours });
    if (res.data && res.data.data) {
      createdItem = res.data.data;
    }
  } catch (err) {
    console.error('sendBroadcastNotification API error:', err);
  }

  if (!createdItem) {
    const expiresAt = durationHours > 0 ? new Date(Date.now() + durationHours * 3600000).toISOString() : null;
    createdItem = {
      id: 'bcast_' + Date.now(),
      title: '🚨 EMERGENCY BLOOD BROADCAST',
      message,
      type: 'emergency',
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };
  }

  // Save to local storage for Vercel serverless resilience
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_BROADCASTS_KEY) || '[]');
    const filtered = stored.filter(b => String(b.id) !== String(createdItem.id));
    filtered.unshift(createdItem);
    localStorage.setItem(LOCAL_BROADCASTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('LocalStorage broadcast save note:', e);
  }

  return { data: createdItem, error: null };
}

export async function updateBroadcastNotification(broadcastId, message, durationHours) {
  let updatedItem = null;
  try {
    const res = await api.put(`/admin/broadcast/${broadcastId}`, { message, durationHours });
    if (res.data && res.data.data) {
      updatedItem = res.data.data;
    }
  } catch (err) {
    console.error('updateBroadcastNotification API error:', err);
  }

  // Sync edit to local storage
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_BROADCASTS_KEY) || '[]');
    const expiresAt = durationHours !== undefined 
      ? (durationHours > 0 ? new Date(Date.now() + durationHours * 3600000).toISOString() : null)
      : undefined;

    const updated = stored.map(b => {
      if (String(b.id) === String(broadcastId)) {
        return {
          ...b,
          message,
          expires_at: expiresAt !== undefined ? expiresAt : b.expires_at
        };
      }
      return b;
    });
    localStorage.setItem(LOCAL_BROADCASTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('LocalStorage broadcast update note:', e);
  }

  return { data: updatedItem || { id: broadcastId, message }, error: null };
}

export async function fetchBroadcasts() {
  let remoteBroadcasts = [];
  try {
    const res = await api.get('/admin/broadcasts');
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      remoteBroadcasts = res.data.data;
    }
  } catch (err) {
    console.error('fetchBroadcasts API error:', err);
  }

  // Merge with local storage cache
  let localBroadcasts = [];
  try {
    localBroadcasts = JSON.parse(localStorage.getItem(LOCAL_BROADCASTS_KEY) || '[]');
  } catch (e) {
    localBroadcasts = [];
  }

  const map = new Map();
  const now = new Date();

  // 1. Add remote broadcasts
  for (const b of remoteBroadcasts) {
    if (!b.expires_at || new Date(b.expires_at) > now) {
      map.set(String(b.id), b);
    }
  }

  // 2. Add local broadcasts (so any broadcasts created locally on Vercel are preserved across navigation)
  for (const b of localBroadcasts) {
    if (!b.expires_at || new Date(b.expires_at) > now) {
      if (!map.has(String(b.id))) {
        map.set(String(b.id), b);
      } else {
        const existing = map.get(String(b.id));
        map.set(String(b.id), { ...existing, ...b });
      }
    }
  }

  const combined = Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Sync back valid non-expired broadcasts to local storage
  try {
    localStorage.setItem(LOCAL_BROADCASTS_KEY, JSON.stringify(combined));
  } catch (e) {}

  return { data: combined, error: null };
}

export async function deleteBroadcast(broadcastId) {
  try {
    await api.delete(`/admin/broadcast/${broadcastId}`);
  } catch (err) {
    console.error('deleteBroadcast API error:', err);
  }

  // Remove permanently from local storage
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_BROADCASTS_KEY) || '[]');
    const filtered = stored.filter(b => String(b.id) !== String(broadcastId));
    localStorage.setItem(LOCAL_BROADCASTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('LocalStorage broadcast delete note:', e);
  }

  return { success: true };
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
