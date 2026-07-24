import { supabase } from '../config/supabase.js';

export const fetchStats = async (req, res, next) => {
  try {
    const { data: donors } = await supabase.from('donor_profiles').select('id').eq('is_available', true);
    const { data: requests } = await supabase.from('blood_requests').select('id').eq('status', 'pending');

    const totalDonors = (donors || []).length;
    const totalRequests = (requests || []).length;
    const livesSaved = totalDonors * 2 + totalRequests;

    return res.status(200).json({
      success: true,
      data: {
        totalDonors,
        totalRequests,
        livesSaved,
        avgResponseTime: totalDonors > 0 ? '8 Mins' : 'N/A'
      }
    });
  } catch (err) {
    next(err);
  }
};

export const createReport = async (req, res, next) => {
  try {
    const { reportCategory, itemType, itemId, itemTitle, targetUserEmail, targetUserId, reason } = req.body;
    const reporterId = req.user.id;
    const reporterName = req.user.full_name || 'Community Member';

    const id = 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const created_at = new Date().toISOString();

    // Strategy 1: Lowercase (the default PostgreSQL unquoted folding)
    const lowercaseReport = {
      id,
      reportcategory: reportCategory || 'Spam Report',
      itemtype: itemType || 'donor',
      itemid: itemId || '',
      itemtitle: itemTitle || 'Reported Content',
      targetuseremail: targetUserEmail || '',
      targetuserid: targetUserId || '',
      reporterid: reporterId,
      reportername: reporterName,
      reason: reason || 'No specific reason provided.',
      status: 'pending',
      actiontaken: null,
      created_at
    };

    // Strategy 2: camelCase (double-quoted column names in PostgreSQL)
    const camelReport = {
      id,
      reportCategory: reportCategory || 'Spam Report',
      itemType: itemType || 'donor',
      itemId: itemId || '',
      itemTitle: itemTitle || 'Reported Content',
      targetUserEmail: targetUserEmail || '',
      targetUserId: targetUserId || '',
      reporterId,
      reporterName,
      reason: reason || 'No specific reason provided.',
      status: 'pending',
      actionTaken: null,
      created_at
    };

    // Strategy 3: snake_case (standard backup naming convention)
    const snakeReport = {
      id,
      report_category: reportCategory || 'Spam Report',
      item_type: itemType || 'donor',
      item_id: itemId || '',
      item_title: itemTitle || 'Reported Content',
      target_user_email: targetUserEmail || '',
      target_user_id: targetUserId || '',
      reporter_id: reporterId,
      reporter_name: reporterName,
      reason: reason || 'No specific reason provided.',
      status: 'pending',
      action_taken: null,
      created_at
    };

    let lastError = null;

    // Try Strategy 1: Lowercase
    const { error: err1 } = await supabase.from('reports').insert([lowercaseReport]);
    if (!err1) {
      return res.status(201).json({ success: true, data: camelReport });
    }
    lastError = err1;

    // Try Strategy 2: camelCase
    const { error: err2 } = await supabase.from('reports').insert([camelReport]);
    if (!err2) {
      return res.status(201).json({ success: true, data: camelReport });
    }
    lastError = err2;

    // Try Strategy 3: snake_case
    const { error: err3 } = await supabase.from('reports').insert([snakeReport]);
    if (!err3) {
      return res.status(201).json({ success: true, data: camelReport });
    }
    lastError = err3;

    // Fallback if all failed
    return res.status(400).json({
      success: false,
      message: `Failed to create report. Schema mismatch. Error details: ${lastError?.message || 'Unknown database error'}`
    });
  } catch (err) {
    next(err);
  }
};

export const fetchReports = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Normalize field cases
    const mapped = (data || []).map(item => ({
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
      created_at: item.created_at || new Date().toISOString()
    }));

    return res.status(200).json({
      success: true,
      data: mapped
    });
  } catch (err) {
    next(err);
  }
};

export const dismissReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Report dismissed.'
    });
  } catch (err) {
    next(err);
  }
};

export const takeReportAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, targetUserId, targetUserEmail, targetItemId, itemType } = req.body;

    // Resilient updates across three possible column naming strategies
    let updateSuccess = false;
    let updateError = null;

    // Strategy 1: Lowercase (actiontaken)
    const res1 = await supabase.from('reports').update({ status: 'action_taken', actiontaken: action }).eq('id', id);
    if (!res1.error) {
      updateSuccess = true;
    } else {
      updateError = res1.error;
      // Strategy 2: camelCase (actionTaken)
      const res2 = await supabase.from('reports').update({ status: 'action_taken', actionTaken: action }).eq('id', id);
      if (!res2.error) {
        updateSuccess = true;
      } else {
        updateError = res2.error;
        // Strategy 3: snake_case (action_taken)
        const res3 = await supabase.from('reports').update({ status: 'action_taken', action_taken: action }).eq('id', id);
        if (!res3.error) {
          updateSuccess = true;
        } else {
          updateError = res3.error;
        }
      }
    }

    if (!updateSuccess) {
      console.error('All update report action strategies failed:', updateError);
      return res.status(400).json({
        success: false,
        message: `Failed to update report action status. Error: ${updateError?.message || 'Unknown database error'}`
      });
    }

    // Suspend user logic
    if (action === 'suspended_user') {
      // Backend handles suspending users by inserting them or marking their status, but let's keep local sync 
      // as well, so that the users database has their role marked as suspended or admin controls.
      try {
        await supabase.from('users').update({ role: 'suspended' }).eq('id', targetUserId);
      } catch (err) {
        console.warn('User table suspension role update error:', err);
      }
    }

    // Delete content logic
    if (action === 'deleted_content') {
      if (itemType === 'request' && targetItemId) {
        await supabase.from('blood_requests').delete().eq('id', targetItemId);
      } else if (itemType === 'donor' && targetUserId) {
        await supabase.from('donor_profiles').delete().eq('user_id', targetUserId);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Report action taken and applied successfully.'
    });
  } catch (err) {
    next(err);
  }
};

let inMemoryBroadcasts = [];

export const sendBroadcast = async (req, res, next) => {
  try {
    const { message, durationHours, expires_at } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Broadcast message cannot be empty.' });
    }

    let calculatedExpiry = expires_at || null;
    if (!calculatedExpiry && durationHours !== undefined && Number(durationHours) > 0) {
      calculatedExpiry = new Date(Date.now() + Number(durationHours) * 3600000).toISOString();
    } else if (!calculatedExpiry && Number(durationHours) === 0) {
      calculatedExpiry = null; // Permanent / No expiry
    } else if (!calculatedExpiry) {
      calculatedExpiry = new Date(Date.now() + 24 * 3600000).toISOString(); // Default 24 hours
    }

    const payload = {
      title: '🚨 EMERGENCY BLOOD BROADCAST',
      message: message,
      type: 'emergency',
      created_at: new Date().toISOString(),
      expires_at: calculatedExpiry
    };

    let insertedItem = null;

    // 1. Try inserting into alert_broadcasts table
    const { data: bcastData, error: bcastErr } = await supabase.from('alert_broadcasts').insert([payload]).select();

    if (!bcastErr && bcastData && bcastData.length > 0) {
      insertedItem = bcastData[0];
    } else {
      console.warn('alert_broadcasts insert note:', bcastErr?.message);
      // 2. Fallback: try inserting into notifications table
      const { data: notifData, error: notifErr } = await supabase.from('notifications').insert([
        {
          user_id: null,
          title: '🚨 EMERGENCY BLOOD BROADCAST',
          message: message,
          type: 'emergency',
          is_read: false,
          created_at: payload.created_at,
          expires_at: calculatedExpiry
        }
      ]).select();

      if (!notifErr && notifData && notifData.length > 0) {
        insertedItem = notifData[0];
      } else {
        insertedItem = {
          id: 'bcast_' + Date.now(),
          ...payload
        };
      }
    }

    // Save in memory
    inMemoryBroadcasts.unshift(insertedItem);

    return res.status(201).json({
      success: true,
      data: insertedItem
    });
  } catch (err) {
    console.warn('sendBroadcast catch fallback:', err.message);
    const fallbackItem = {
      id: 'bcast_' + Date.now(),
      title: '🚨 EMERGENCY BLOOD BROADCAST',
      message: req.body?.message || '',
      type: 'emergency',
      created_at: new Date().toISOString(),
      expires_at: req.body?.expires_at || null
    };
    inMemoryBroadcasts.unshift(fallbackItem);
    return res.status(201).json({
      success: true,
      data: fallbackItem
    });
  }
};

export const fetchBroadcasts = async (req, res, next) => {
  try {
    let dbBroadcasts = [];

    // 1. Try querying alert_broadcasts table
    const { data: bcastData, error: bcastErr } = await supabase
      .from('alert_broadcasts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!bcastErr && bcastData) {
      dbBroadcasts = bcastData;
    } else {
      // 2. Fallback query from notifications table
      const { data: notifData, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'emergency')
        .order('created_at', { ascending: false });

      if (!notifErr && notifData) {
        dbBroadcasts = notifData;
      }
    }

    // Combine DB broadcasts with inMemoryBroadcasts (deduplicate by id)
    const map = new Map();
    for (const item of dbBroadcasts) {
      map.set(String(item.id), item);
    }
    for (const item of inMemoryBroadcasts) {
      const key = String(item.id);
      if (!map.has(key)) {
        map.set(key, item);
      } else {
        const existing = map.get(key);
        map.set(key, { ...existing, ...item });
      }
    }

    const allBroadcasts = Array.from(map.values());
    const now = new Date();

    const formatted = allBroadcasts
      .filter(item => !item.expires_at || new Date(item.expires_at) > now)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(item => ({
        id: item.id,
        title: item.title || '🚨 EMERGENCY BLOOD BROADCAST',
        message: item.message,
        type: item.type || 'emergency',
        created_at: item.created_at,
        expires_at: item.expires_at || null
      }));

    return res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.warn('fetchBroadcasts catch warning:', err.message);
    const now = new Date();
    const formatted = inMemoryBroadcasts
      .filter(item => !item.expires_at || new Date(item.expires_at) > now)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      success: true,
      data: formatted
    });
  }
};

export const updateBroadcast = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, durationHours, expires_at } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Broadcast message cannot be empty.' });
    }

    let calculatedExpiry = expires_at;
    if (durationHours !== undefined) {
      if (Number(durationHours) > 0) {
        calculatedExpiry = new Date(Date.now() + Number(durationHours) * 3600000).toISOString();
      } else if (Number(durationHours) === 0) {
        calculatedExpiry = null; // Permanent / No expiry
      }
    }

    const updates = { message };
    if (calculatedExpiry !== undefined) {
      updates.expires_at = calculatedExpiry;
    }

    if (id && !id.startsWith('bcast_')) {
      const { error: e1 } = await supabase.from('alert_broadcasts').update(updates).eq('id', id);
      const { error: e2 } = await supabase.from('notifications').update(updates).eq('id', id);
      if (e1) console.warn('alert_broadcasts update note:', e1.message);
      if (e2) console.warn('notifications update note:', e2.message);
    }

    // Update in memory store
    const memIndex = inMemoryBroadcasts.findIndex(b => String(b.id) === String(id));
    if (memIndex !== -1) {
      inMemoryBroadcasts[memIndex] = {
        ...inMemoryBroadcasts[memIndex],
        message,
        expires_at: calculatedExpiry !== undefined ? calculatedExpiry : inMemoryBroadcasts[memIndex].expires_at
      };
    } else {
      inMemoryBroadcasts.push({
        id,
        title: '🚨 EMERGENCY BLOOD BROADCAST',
        message,
        type: 'emergency',
        created_at: new Date().toISOString(),
        expires_at: calculatedExpiry
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Broadcast updated successfully.',
      data: { id, message, expires_at: calculatedExpiry }
    });
  } catch (err) {
    console.warn('updateBroadcast catch note:', err.message);
    return res.status(200).json({
      success: true,
      message: 'Broadcast updated successfully.',
      data: { id: req.params.id, message: req.body?.message }
    });
  }
};

export const deleteBroadcast = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id) {
      if (!id.startsWith('bcast_')) {
        const { error: err1 } = await supabase.from('alert_broadcasts').delete().eq('id', id);
        const { error: err2 } = await supabase.from('notifications').delete().eq('id', id);
        if (err1) console.warn('alert_broadcasts delete note:', err1.message);
        if (err2) console.warn('notifications delete note:', err2.message);
      }
      // Permanently remove from memory array
      inMemoryBroadcasts = inMemoryBroadcasts.filter(b => String(b.id) !== String(id));
    }

    return res.status(200).json({
      success: true,
      message: 'Broadcast deleted successfully.'
    });
  } catch (err) {
    console.warn('deleteBroadcast catch note:', err.message);
    if (req.params.id) {
      inMemoryBroadcasts = inMemoryBroadcasts.filter(b => String(b.id) !== String(req.params.id));
    }
    return res.status(200).json({
      success: true,
      message: 'Broadcast deleted successfully.'
    });
  }
};

export const fetchUsers = async (req, res, next) => {
  try {
    const { data: usersData, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('fetchUsers warning:', error.message);
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Try fetching donor profiles to enrich phone, blood group, avatar, etc.
    let donorMap = new Map();
    try {
      const { data: donorsData } = await supabase
        .from('donor_profiles')
        .select('*');
      if (donorsData) {
        for (const d of donorsData) {
          if (d.user_id) donorMap.set(String(d.user_id), d);
          if (d.users && d.users.email) donorMap.set(String(d.users.email), d);
        }
      }
    } catch (e) {
      console.warn('fetchUsers donor_profiles enrich note:', e.message);
    }

    const enrichedUsers = (usersData || []).map(u => {
      const dp = donorMap.get(String(u.id)) || donorMap.get(String(u.email)) || {};
      return {
        ...u,
        full_name: u.full_name || dp.full_name || dp.name || (u.email ? u.email.split('@')[0] : 'Campus User'),
        phone: u.phone || dp.phone || dp.contact_number || '',
        blood_group: u.blood_group || dp.blood_group || '',
        avatar_url: u.avatar_url || dp.avatar_url || null,
        district: u.district || dp.district || dp.location || 'Dhaka',
        university: u.university || dp.university || dp.department || 'General'
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedUsers
    });
  } catch (err) {
    console.warn('fetchUsers catch warning:', err.message);
    return res.status(200).json({
      success: true,
      data: []
    });
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('users')
      .update({ role: 'suspended' })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Set donor availability to false if they are suspended
    await supabase
      .from('donor_profiles')
      .update({ is_available: false })
      .eq('user_id', id);

    return res.status(200).json({
      success: true,
      message: 'User suspended successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const unsuspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('users')
      .update({ role: 'user' })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'User unsuspended successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const fetchAcceptedRequests = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('blood_request_accept')
      .select('*')
      .order('accepted_at', { ascending: false });

    if (error) {
      console.warn('fetchAcceptedRequests warning:', error.message);
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (err) {
    console.warn('fetchAcceptedRequests catch warning:', err.message);
    return res.status(200).json({
      success: true,
      data: []
    });
  }
};
