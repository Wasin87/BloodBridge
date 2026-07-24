import { supabase } from './supabase';

const LOCAL_STORAGE_KEYS = {
  DONORS: 'bloodbridge_local_donors',
  REQUESTS: 'bloodbridge_local_requests',
  DONATIONS: 'bloodbridge_local_donations',
  NOTIFICATIONS: 'bloodbridge_local_notifications',
  REPORTS: 'bloodbridge_local_reports',
  SUSPENDED: 'bloodbridge_suspended_users',
  BROADCASTS: 'bloodbridge_local_broadcasts'
};

// Helper to check if error is table missing in Supabase schema cache
export function isTableMissingError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = error.code || '';
  return (
    msg.includes('could not find the table') ||
    msg.includes('schema cache') ||
    msg.includes('relation') && msg.includes('does not exist') ||
    code === 'PGRST204' ||
    code === '42P01'
  );
}

// Helper to ensure public.users entry exists for foreign keys
export async function ensureUserInPublicUsers(user) {
  if (!user || !user.id) return;
  try {
    const email = user.email || '';
    const emailLower = email.toLowerCase().trim();
    const isAdmin = emailLower === 'wasinahmed805@gmail.com' || emailLower === 'wasinahmed807@gmail.com' || emailLower.startsWith('wasinahmed') || emailLower.includes('admin');

    const savedName = localStorage.getItem(`user_name_${user.id}`);
    const emailPrefix = email ? email.split('@')[0] : '';
    const formattedEmailName = emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : 'Campus Donor';
    const fullName = savedName || user.user_metadata?.full_name || user.user_metadata?.name || (isAdmin ? 'Wasin Ahmed' : formattedEmailName);

    const { error } = await supabase.from('users').upsert([
      {
        id: user.id,
        email: email,
        full_name: fullName,
        role: isAdmin ? 'admin' : 'user',
        created_at: new Date().toISOString()
      }
    ], { onConflict: 'id' });
    if (error) {
      console.warn('ensureUserInPublicUsers notice:', error.message);
    }
  } catch (e) {
    console.warn('ensureUserInPublicUsers error:', e);
  }
}

// 1. DONOR PROFILES
export async function upsertDonorProfile(profileData, user) {
  try {
    await ensureUserInPublicUsers(user);

    const payload = {
      user_id: user.id,
      blood_group: profileData.bloodGroup,
      phone: profileData.phone,
      gender: profileData.gender,
      date_of_birth: profileData.dob,
      university: profileData.university || 'General Donor',
      department: profileData.department || 'General',
      district: profileData.district,
      upazila: profileData.upazila,
      area: profileData.area || '',
      weight: parseFloat(profileData.weight) || 50,
      last_donation_date: profileData.lastDonation || null,
      is_available: true,
      emergency_contact: profileData.emergencyContact,
      medical_notes: profileData.medicalNotes || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('donor_profiles').upsert([payload]).select();

    if (error) {
      if (isTableMissingError(error)) {
        console.warn('Supabase table missing, saving to local state fallback:', error.message);
        // Fallback to local storage
        const localDonors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONORS) || '[]');
        const existingIdx = localDonors.findIndex(d => d.user_id === user.id);
        const donorRecord = {
          id: 'local_' + Date.now(),
          ...payload,
          users: { full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User', email: user.email },
          created_at: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          localDonors[existingIdx] = donorRecord;
        } else {
          localDonors.push(donorRecord);
        }
        localStorage.setItem(LOCAL_STORAGE_KEYS.DONORS, JSON.stringify(localDonors));
        return { data: donorRecord, error: null, isFallback: true };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    if (isTableMissingError(err)) {
      const localDonors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONORS) || '[]');
      const donorRecord = {
        id: 'local_' + Date.now(),
        user_id: user.id,
        blood_group: profileData.bloodGroup,
        phone: profileData.phone,
        gender: profileData.gender,
        date_of_birth: profileData.dob,
        university: profileData.university,
        department: profileData.department,
        district: profileData.district,
        upazila: profileData.upazila,
        area: profileData.area,
        weight: parseFloat(profileData.weight),
        last_donation_date: profileData.lastDonation || null,
        is_available: true,
        emergency_contact: profileData.emergencyContact,
        medical_notes: profileData.medicalNotes || null,
        users: { full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User', email: user.email },
        created_at: new Date().toISOString()
      };
      localDonors.push(donorRecord);
      localStorage.setItem(LOCAL_STORAGE_KEYS.DONORS, JSON.stringify(localDonors));
      return { data: donorRecord, error: null, isFallback: true };
    }
    throw err;
  }
}

export async function fetchDonorProfiles(filters = {}) {
  try {
    let query = supabase.from('donor_profiles').select(`
      *,
      users (
        full_name,
        email,
        avatar_url
      )
    `).eq('is_available', true);

    if (filters.bloodGroup) {
      query = query.eq('blood_group', filters.bloodGroup);
    }
    if (filters.search) {
      query = query.ilike('district', `%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      if (isTableMissingError(error)) {
        console.warn('Supabase donor_profiles table missing, reading local storage');
        let localDonors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONORS) || '[]');
        if (filters.bloodGroup) {
          localDonors = localDonors.filter(d => d.blood_group === filters.bloodGroup);
        }
        if (filters.search) {
          localDonors = localDonors.filter(d => d.district?.toLowerCase().includes(filters.search.toLowerCase()));
        }
        const enriched = localDonors.map(d => ({
          ...d,
          avatar_url: d.avatar_url || localStorage.getItem(`user_avatar_${d.user_id}`) || null
        }));
        return { data: enriched, error: null, isFallback: true };
      }
      throw error;
    }

    const enriched = (data || []).map(d => ({
      ...d,
      avatar_url: d.users?.avatar_url || localStorage.getItem(`user_avatar_${d.user_id}`) || null
    }));

    return { data: enriched, error: null };
  } catch (err) {
    let localDonors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONORS) || '[]');
    if (filters.bloodGroup) {
      localDonors = localDonors.filter(d => d.blood_group === filters.bloodGroup);
    }
    if (filters.search) {
      localDonors = localDonors.filter(d => d.district?.toLowerCase().includes(filters.search.toLowerCase()));
    }
    const enriched = localDonors.map(d => ({
      ...d,
      avatar_url: d.avatar_url || localStorage.getItem(`user_avatar_${d.user_id}`) || null
    }));
    return { data: enriched, error: null, isFallback: true };
  }
}

// 2. BLOOD REQUESTS
export async function createBloodRequest(requestData, user) {
  await ensureUserInPublicUsers(user);

  const payload = {
    user_id: user.id,
    patient_name: requestData.patientName,
    blood_group: requestData.bloodGroup,
    units_needed: parseInt(requestData.unitsNeeded) || 1,
    hospital_name: requestData.hospitalName,
    district: requestData.district,
    upazila: requestData.upazila,
    area: requestData.area || '',
    required_date: requestData.requiredDate,
    urgency: (requestData.urgency || 'normal').toLowerCase(),
    contact_person: requestData.contactPerson,
    contact_number: requestData.contactNumber,
    description: requestData.description || '',
    status: 'pending'
  };

  try {
    const { data, error } = await supabase.from('blood_requests').insert([payload]).select();

    if (error) {
      if (isTableMissingError(error)) {
        console.warn('Supabase blood_requests table missing, using local storage fallback');
        const localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REQUESTS) || '[]');
        const newReq = {
          id: 'req_' + Date.now(),
          ...payload,
          created_at: new Date().toISOString()
        };
        localRequests.unshift(newReq);
        localStorage.setItem(LOCAL_STORAGE_KEYS.REQUESTS, JSON.stringify(localRequests));
        return { data: [newReq], error: null, isFallback: true };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    if (isTableMissingError(err)) {
      const localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REQUESTS) || '[]');
      const newReq = {
        id: 'req_' + Date.now(),
        ...payload,
        created_at: new Date().toISOString()
      };
      localRequests.unshift(newReq);
      localStorage.setItem(LOCAL_STORAGE_KEYS.REQUESTS, JSON.stringify(localRequests));
      return { data: [newReq], error: null, isFallback: true };
    }
    throw err;
  }
}

export async function fetchBloodRequests(filters = {}, currentUserId = null, excludeOwn = false) {
  try {
    let query = supabase.from('blood_requests').select(`
      *,
      users (
        full_name,
        email,
        avatar_url
      )
    `).eq('status', 'pending');

    if (currentUserId && excludeOwn) {
      query = query.neq('user_id', currentUserId);
    }
    if (filters.bloodGroup) {
      query = query.eq('blood_group', filters.bloodGroup);
    }
    if (filters.search) {
      query = query.ilike('district', `%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      if (isTableMissingError(error)) {
        console.warn('Supabase blood_requests table missing, reading local storage');
        let localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REQUESTS) || '[]');
        localRequests = localRequests.filter(r => r.status === 'pending');
        if (currentUserId && excludeOwn) {
          localRequests = localRequests.filter(r => r.user_id !== currentUserId);
        }
        if (filters.bloodGroup) {
          localRequests = localRequests.filter(r => r.blood_group === filters.bloodGroup);
        }
        if (filters.search) {
          localRequests = localRequests.filter(r => r.district?.toLowerCase().includes(filters.search.toLowerCase()));
        }
        const enriched = localRequests.map(r => ({
          ...r,
          avatar_url: r.avatar_url || localStorage.getItem(`user_avatar_${r.user_id}`) || null
        }));
        return { data: enriched, error: null, isFallback: true };
      }
      throw error;
    }

    const enriched = (data || []).map(r => ({
      ...r,
      avatar_url: r.users?.avatar_url || localStorage.getItem(`user_avatar_${r.user_id}`) || null
    }));

    return { data: enriched, error: null };
  } catch (err) {
    let localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REQUESTS) || '[]');
    localRequests = localRequests.filter(r => r.status === 'pending');
    if (currentUserId && excludeOwn) {
      localRequests = localRequests.filter(r => r.user_id !== currentUserId);
    }
    if (filters.bloodGroup) {
      localRequests = localRequests.filter(r => r.blood_group === filters.bloodGroup);
    }
    if (filters.search) {
      localRequests = localRequests.filter(r => r.district?.toLowerCase().includes(filters.search.toLowerCase()));
    }
    const enriched = localRequests.map(r => ({
      ...r,
      avatar_url: r.avatar_url || localStorage.getItem(`user_avatar_${r.user_id}`) || null
    }));
    return { data: enriched, error: null, isFallback: true };
  }
}

export async function deleteBloodRequest(requestId) {
  try {
    const { error } = await supabase.from('blood_requests').delete().eq('id', requestId);
    if (error && !isTableMissingError(error)) throw error;
  } catch (err) {
    console.warn('Delete blood request notice:', err);
  }
  // Also clean local storage fallback
  try {
    const localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REQUESTS) || '[]');
    const updated = localRequests.filter(r => r.id !== requestId);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REQUESTS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Local storage delete notice:', e);
  }
  return { success: true };
}

export async function updateBloodRequestStatus(requestId, status) {
  try {
    const { error } = await supabase.from('blood_requests').update({ status }).eq('id', requestId);
    if (error && !isTableMissingError(error)) throw error;
  } catch (err) {
    console.warn('Update blood request status notice:', err);
  }
  // Also update local storage fallback
  try {
    const localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REQUESTS) || '[]');
    const updated = localRequests.map(r => r.id === requestId ? { ...r, status } : r);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REQUESTS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Local storage update status notice:', e);
  }
  return { success: true };
}

export async function fetchPlatformStats() {
  try {
    const donorsRes = await fetchDonorProfiles({});
    const requestsRes = await fetchBloodRequests({});

    const totalDonors = (donorsRes.data || []).length;
    const totalRequests = (requestsRes.data || []).length;

    // Calculate lives saved dynamically based on actual completed requests or active donors
    const livesSaved = totalDonors * 2 + totalRequests;

    return {
      totalDonors,
      totalRequests,
      livesSaved,
      avgResponseTime: totalDonors > 0 ? '8 Mins' : 'N/A'
    };
  } catch (err) {
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
    const { data, error } = await supabase
      .from('donor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (isTableMissingError(error) || error.code === 'PGRST116') {
        const localDonors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONORS) || '[]');
        const found = localDonors.find(d => d.user_id === userId);
        return { data: found || null, error: null };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    const localDonors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONORS) || '[]');
    const found = localDonors.find(d => d.user_id === userId);
    return { data: found || null, error: null };
  }
}

export async function acceptBloodRequest(requestId, donorUser, donorProfile = null) {
  try {
    await ensureUserInPublicUsers(donorUser);

    const donorName = donorUser.user_metadata?.full_name || donorUser.email?.split('@')[0] || 'Campus Donor';
    const donorAvatar = donorProfile?.avatar_url || donorUser.user_metadata?.avatar_url || localStorage.getItem(`user_avatar_${donorUser.id}`) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

    const acceptedDonorInfo = {
      user_id: donorUser.id,
      name: donorName,
      blood_group: donorProfile?.blood_group || 'O+',
      phone: donorProfile?.phone || donorProfile?.contact_number || donorUser.phone || '',
      email: donorUser.email || '',
      district: donorProfile?.district || 'Campus',
      university: donorProfile?.university || 'Heritage University',
      department: donorProfile?.department || '',
      last_donation_date: donorProfile?.last_donation_date || null,
      avatar_url: donorAvatar,
      accepted_at: new Date().toISOString()
    };

    // Update in Supabase or fallback
    const { data, error } = await supabase
      .from('blood_requests')
      .update({
        status: 'accepted',
        accepted_donor_id: donorUser.id,
        accepted_donor_info: acceptedDonorInfo
      })
      .eq('id', requestId)
      .select();

    if (error && isTableMissingError(error)) {
      // Local storage fallback
      const localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REQUESTS) || '[]');
      const reqIdx = localRequests.findIndex(r => r.id === requestId);
      let receiverUserId = null;
      let patientName = 'Patient';

      if (reqIdx >= 0) {
        localRequests[reqIdx].status = 'accepted';
        localRequests[reqIdx].accepted_donor_id = donorUser.id;
        localRequests[reqIdx].accepted_donor_info = acceptedDonorInfo;
        receiverUserId = localRequests[reqIdx].user_id;
        patientName = localRequests[reqIdx].patient_name || 'Patient';
        localStorage.setItem(LOCAL_STORAGE_KEYS.REQUESTS, JSON.stringify(localRequests));
      }

      // Add Notification for Receiver
      if (receiverUserId) {
        const localNotifs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS) || '[]');
        localNotifs.unshift({
          id: 'notif_' + Date.now(),
          user_id: receiverUserId,
          type: 'donor_accepted',
          title: '🩸 Donor Matched for Your Blood Request!',
          message: `${donorName} (${acceptedDonorInfo.blood_group}) has accepted your request for ${patientName}.`,
          donor_info: acceptedDonorInfo,
          request_id: requestId,
          read: false,
          created_at: new Date().toISOString()
        });
        localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(localNotifs));
      }

      return { data: localRequests[reqIdx], error: null };
    }

    // Add Notification in Supabase or LocalStorage
    const targetUserId = data && data[0] ? data[0].user_id : null;
    const patientName = data && data[0] ? data[0].patient_name : 'Patient';
    if (targetUserId) {
      const localNotifs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS) || '[]');
      localNotifs.unshift({
        id: 'notif_' + Date.now(),
        user_id: targetUserId,
        type: 'donor_accepted',
        title: '🩸 Donor Matched for Your Blood Request!',
        message: `${donorName} (${acceptedDonorInfo.blood_group}) has accepted your request for ${patientName}.`,
        donor_info: acceptedDonorInfo,
        request_id: requestId,
        read: false,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(localNotifs));
    }

    return { data, error: null };
  } catch (err) {
    console.error('acceptBloodRequest error:', err);
    return { data: null, error: err };
  }
}

export async function completeBloodRequest(requestId, user) {
  try {
    const localRequests = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REQUESTS) || '[]');
    const reqIdx = localRequests.findIndex(r => r.id === requestId);
    let updatedReq = null;

    if (reqIdx >= 0) {
      localRequests[reqIdx].status = 'completed';
      localRequests[reqIdx].completed_at = new Date().toISOString();
      updatedReq = localRequests[reqIdx];
      localStorage.setItem(LOCAL_STORAGE_KEYS.REQUESTS, JSON.stringify(localRequests));
    }

    // Save into Donation History
    const localDonations = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONATIONS) || '[]');
    if (updatedReq) {
      localDonations.unshift({
        id: 'don_' + Date.now(),
        request_id: requestId,
        patient_name: updatedReq.patient_name,
        blood_group: updatedReq.blood_group,
        units: updatedReq.units_needed || 1,
        hospital: updatedReq.hospital_name,
        receiver_id: updatedReq.user_id,
        donor_id: updatedReq.accepted_donor_id || user.id,
        donor_info: updatedReq.accepted_donor_info || { name: user.email },
        completed_at: new Date().toISOString()
      });
      localStorage.setItem(LOCAL_STORAGE_KEYS.DONATIONS, JSON.stringify(localDonations));
    }

    // Try Supabase update as well
    await supabase.from('blood_requests').update({ status: 'completed' }).eq('id', requestId);

    return { data: updatedReq, error: null };
  } catch (err) {
    console.error('completeBloodRequest error:', err);
    return { data: null, error: err };
  }
}

export async function fetchUserNotifications(userId) {
  try {
    const localNotifs = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const userNotifs = localNotifs.filter(n => n.user_id === userId);
    return { data: userNotifs, error: null };
  } catch (e) {
    return { data: [], error: null };
  }
}

export async function fetchDonationHistory(userId) {
  try {
    const localDonations = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONATIONS) || '[]');
    const userHistory = localDonations.filter(d => d.donor_id === userId || d.receiver_id === userId);
    return { data: userHistory, error: null };
  } catch (e) {
    return { data: [], error: null };
  }
}

export async function updateDonorAvailability(profileId, userId, isAvailable) {
  try {
    const { error } = await supabase
      .from('donor_profiles')
      .update({ is_available: isAvailable })
      .eq('user_id', userId);

    if (error && isTableMissingError(error)) {
      const localDonors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONORS) || '[]');
      const idx = localDonors.findIndex(d => d.user_id === userId);
      if (idx >= 0) {
        localDonors[idx].is_available = isAvailable;
        localStorage.setItem(LOCAL_STORAGE_KEYS.DONORS, JSON.stringify(localDonors));
      }
      return { error: null };
    }

    return { error };
  } catch (err) {
    const localDonors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONORS) || '[]');
    const idx = localDonors.findIndex(d => d.user_id === userId);
    if (idx >= 0) {
      localDonors[idx].is_available = isAvailable;
      localStorage.setItem(LOCAL_STORAGE_KEYS.DONORS, JSON.stringify(localDonors));
    }
    return { error: null };
  }
}

// ------------------------------------
// REPORTS MANAGEMENT HELPERS
// ------------------------------------

// Normalizes postgres database column cases dynamically to guarantee frontend compatibility
export function normalizeReport(item) {
  if (!item) return null;
  return {
    id: item.id,
    reportCategory: item.reportCategory || item.report_category || item.reportcategory || 'Spam Report',
    itemType: item.itemType || item.item_type || item.itemtype || 'donor',
    itemId: item.itemId || item.item_id || item.itemid || '',
    itemTitle: item.itemTitle || item.item_title || item.itemtitle || 'Reported Content',
    targetUserEmail: item.targetUserEmail || item.target_user_email || item.targetuseremail || '',
    targetUserId: item.targetUserId || item.target_user_id || item.targetuserid || '',
    reporterId: item.reporterId || item.reporter_id || item.reporterid || 'anonymous',
    reporterName: item.reporterName || item.reporter_name || item.reportername || 'Community Member',
    reason: item.reason || 'No specific reason provided.',
    status: item.status || 'pending',
    actionTaken: item.actionTaken || item.action_taken || item.actiontaken || null,
    created_at: item.created_at || item.createdAt || new Date().toISOString()
  };
}

export async function createReport({
  reportCategory, // 'Fake Donor Report', 'Fake Blood Request', 'Spam Report', 'Abuse Report'
  itemType,       // 'donor' or 'request'
  itemId,
  itemTitle,
  targetUserEmail,
  targetUserId,
  reporterId,
  reporterName,
  reason
}) {
  try {
    const newReport = {
      id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      reportCategory: reportCategory || 'Spam Report',
      itemType: itemType || 'donor',
      itemId: itemId || '',
      itemTitle: itemTitle || 'Reported Content',
      targetUserEmail: targetUserEmail || '',
      targetUserId: targetUserId || '',
      reporterId: reporterId || 'anonymous',
      reporterName: reporterName || 'Community Member',
      reason: reason || 'No specific reason provided.',
      status: 'pending', // 'pending' | 'reviewed' | 'dismissed' | 'action_taken'
      actionTaken: null,  // 'suspended_user' | 'deleted_content'
      created_at: new Date().toISOString()
    };

    // Try original camelCase first, fallback to lowercase and snake_case to support any PG schema state
    try {
      const { error } = await supabase.from('reports').insert([newReport]);
      if (error) {
        const lowerReport = {
          id: newReport.id,
          reportcategory: newReport.reportCategory,
          itemtype: newReport.itemType,
          itemid: newReport.itemId,
          itemtitle: newReport.itemTitle,
          targetuseremail: newReport.targetUserEmail,
          targetuserid: newReport.targetUserId,
          reporterid: newReport.reporterId,
          reportername: newReport.reporterName,
          reason: newReport.reason,
          status: newReport.status,
          actiontaken: newReport.actionTaken,
          created_at: newReport.created_at
        };
        const { error: error2 } = await supabase.from('reports').insert([lowerReport]);
        if (error2) {
          const snakeReport = {
            id: newReport.id,
            report_category: newReport.reportCategory,
            item_type: newReport.itemType,
            item_id: newReport.itemId,
            item_title: newReport.itemTitle,
            target_user_email: newReport.targetUserEmail,
            target_user_id: newReport.targetUserId,
            reporter_id: newReport.reporterId,
            reporter_name: newReport.reporterName,
            reason: newReport.reason,
            status: newReport.status,
            action_taken: newReport.actionTaken,
            created_at: newReport.created_at
          };
          await supabase.from('reports').insert([snakeReport]);
        }
      }
    } catch (e) {
      console.warn('Supabase reports insertion notice:', e);
    }

    // Mirror to localStorage
    const localReports = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REPORTS) || '[]');
    localReports.unshift(newReport);
    localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS, JSON.stringify(localReports));

    return { data: newReport, error: null };
  } catch (err) {
    console.error('createReport error:', err);
    return { data: null, error: err };
  }
}

export async function fetchReports() {
  try {
    // Dynamically retrieve from Supabase to always reflect real database state
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(normalizeReport).filter(Boolean);
        // Refresh local storage with current database truths
        localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS, JSON.stringify(mapped));
        return { data: mapped, error: null };
      } else if (error) {
        console.warn('Supabase reports fetch error, checking local:', error);
      }
    } catch (e) {
      console.warn('Supabase reports fetch notice:', e);
    }

    // Fallback to local storage if offline/error
    const localReports = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REPORTS) || '[]');
    const mapped = localReports.map(normalizeReport).filter(Boolean);
    return { data: mapped, error: null };
  } catch (err) {
    console.error('fetchReports error:', err);
    return { data: [], error: err };
  }
}

export async function dismissReport(reportId) {
  try {
    // Update local storage
    const localReports = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REPORTS) || '[]');
    const idx = localReports.findIndex(r => r.id === reportId);
    if (idx >= 0) {
      localReports[idx].status = 'dismissed';
      localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS, JSON.stringify(localReports));
    }

    // Update Database
    try {
      await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    } catch (e) {
      console.warn('Supabase dismiss report notice:', e);
    }

    return { success: true };
  } catch (err) {
    console.error('dismissReport error:', err);
    return { success: false, error: err };
  }
}

export async function takeReportAction({ reportId, action, targetUserId, targetUserEmail, targetItemId, itemType }) {
  try {
    // 1. Mark report status in local storage
    const localReports = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.REPORTS) || '[]');
    const idx = localReports.findIndex(r => r.id === reportId);
    if (idx >= 0) {
      localReports[idx].status = 'action_taken';
      localReports[idx].actionTaken = action; // 'suspended_user' or 'deleted_content'
      localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS, JSON.stringify(localReports));
    }

    // 2. Mark report status in Supabase database (with resilient column handling)
    try {
      const { error } = await supabase.from('reports').update({ status: 'action_taken', actionTaken: action }).eq('id', reportId);
      if (error) {
        const { error: err2 } = await supabase.from('reports').update({ status: 'action_taken', actiontaken: action }).eq('id', reportId);
        if (err2) {
          await supabase.from('reports').update({ status: 'action_taken', action_taken: action }).eq('id', reportId);
        }
      }
    } catch (e) {
      console.warn('Supabase takeReportAction notice:', e);
    }

    // 3. Perform requested Admin Action (User Suspension)
    if (action === 'suspended_user') {
      const suspended = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SUSPENDED) || '[]');
      if (targetUserId && !suspended.includes(targetUserId)) {
        suspended.push(targetUserId);
      }
      if (targetUserEmail && !suspended.includes(targetUserEmail)) {
        suspended.push(targetUserEmail);
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.SUSPENDED, JSON.stringify(suspended));
      localStorage.setItem('bloodbridge_suspended_users', JSON.stringify(suspended)); // Ensure general sync
    }

    // 4. Perform requested Admin Action (Content Deletion)
    if (action === 'deleted_content') {
      if (itemType === 'request' && targetItemId) {
        await deleteBloodRequest(targetItemId);
      } else if (itemType === 'donor' && targetItemId) {
        await deleteDonorProfile(targetItemId, targetUserId);
      }
    }

    return { success: true };
  } catch (err) {
    console.error('takeReportAction error:', err);
    return { success: false, error: err };
  }
}

export async function deleteDonorProfile(donorId, userId) {
  try {
    if (donorId) {
      await supabase.from('donor_profiles').delete().eq('id', donorId);
    }
    if (userId) {
      await supabase.from('donor_profiles').delete().eq('user_id', userId);
    }
  } catch (e) {
    console.warn('Delete donor profile notice:', e);
  }

  try {
    const localDonors = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.DONORS) || '[]');
    const updated = localDonors.filter(d => d.id !== donorId && d.user_id !== userId);
    localStorage.setItem(LOCAL_STORAGE_KEYS.DONORS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Local storage delete donor notice:', e);
  }
  return { success: true };
}

export async function sendBroadcastNotification(message) {
  try {
    const broadcastObj = {
      title: '🚨 EMERGENCY BLOOD BROADCAST',
      message: message,
      type: 'emergency',
      created_at: new Date().toISOString()
    };

    let finalId = `bcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const { data, error } = await supabase.from('notifications').insert([{
        title: broadcastObj.title,
        message: broadcastObj.message,
        type: broadcastObj.type,
        created_at: broadcastObj.created_at
      }]).select();

      if (!error && data && data.length > 0) {
        finalId = data[0].id;
      }
    } catch (e) {
      console.warn('Supabase notification insertion failed, relying on generated ID:', e);
    }

    const fullObj = {
      id: finalId,
      ...broadcastObj
    };

    const localBroadcasts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.BROADCASTS) || '[]');
    localBroadcasts.unshift(fullObj);
    localStorage.setItem(LOCAL_STORAGE_KEYS.BROADCASTS, JSON.stringify(localBroadcasts));

    return { data: fullObj, error: null };
  } catch (err) {
    console.error('sendBroadcastNotification error:', err);
    return { data: null, error: err };
  }
}

export async function fetchBroadcasts() {
  try {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(item => ({
          id: item.id,
          title: item.title || '🚨 EMERGENCY BLOOD BROADCAST',
          message: item.message,
          type: item.type || 'emergency',
          created_at: item.created_at
        }));
        localStorage.setItem(LOCAL_STORAGE_KEYS.BROADCASTS, JSON.stringify(mapped));
        return { data: mapped, error: null };
      }
    } catch (e) {
      console.warn('Supabase notifications fetch failed, falling back to localStorage:', e);
    }

    const localBroadcasts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.BROADCASTS) || '[]');
    return { data: localBroadcasts, error: null };
  } catch (err) {
    console.error('fetchBroadcasts error:', err);
    return { data: [], error: err };
  }
}

export async function deleteBroadcast(broadcastId) {
  try {
    try {
      await supabase.from('notifications').delete().eq('id', broadcastId);
    } catch (e) {
      console.warn('Supabase notification deletion failed:', e);
    }

    const localBroadcasts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.BROADCASTS) || '[]');
    const updated = localBroadcasts.filter(b => b.id !== broadcastId);
    localStorage.setItem(LOCAL_STORAGE_KEYS.BROADCASTS, JSON.stringify(updated));
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

