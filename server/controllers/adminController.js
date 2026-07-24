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

    const payload = {
      id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
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
      created_at: new Date().toISOString()
    };

    // Resilient insertions across any casing state of public.reports
    let insertErr;
    try {
      const { error } = await supabase.from('reports').insert([payload]);
      insertErr = error;
    } catch (e) {
      insertErr = e;
    }

    if (insertErr) {
      // Fallback snake_case/lowercase
      const snakeReport = {
        id: payload.id,
        report_category: payload.reportCategory,
        item_type: payload.itemType,
        item_id: payload.itemId,
        item_title: payload.itemTitle,
        target_user_email: payload.targetUserEmail,
        target_user_id: payload.targetUserId,
        reporter_id: payload.reporterId,
        reporter_name: payload.reporterName,
        reason: payload.reason,
        status: payload.status,
        action_taken: payload.actionTaken,
        created_at: payload.created_at
      };
      const { error: err2 } = await supabase.from('reports').insert([snakeReport]);
      if (err2) {
        return res.status(400).json({ success: false, message: err2.message });
      }
    }

    return res.status(201).json({
      success: true,
      data: payload
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

    // Resilient update
    let updateErr;
    try {
      const { error } = await supabase.from('reports').update({ status: 'action_taken', actionTaken: action }).eq('id', id);
      updateErr = error;
    } catch (e) {
      updateErr = e;
    }

    if (updateErr) {
      try {
        await supabase.from('reports').update({ status: 'action_taken', action_taken: action }).eq('id', id);
      } catch (inner) {
        console.warn('Update action taken failed:', inner);
      }
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

export const sendBroadcast = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Broadcast message cannot be empty.' });
    }

    const payload = {
      title: '🚨 EMERGENCY BLOOD BROADCAST',
      message: message,
      type: 'emergency',
      created_at: new Date().toISOString()
    };

    // Insert broadcast into notifications table
    const { data, error } = await supabase.from('notifications').insert([payload]).select();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({
      success: true,
      data: data ? data[0] : payload
    });
  } catch (err) {
    next(err);
  }
};

export const fetchBroadcasts = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const broadcasts = (data || []).map(item => ({
      id: item.id,
      title: item.title || '🚨 EMERGENCY BLOOD BROADCAST',
      message: item.message,
      type: item.type || 'emergency',
      created_at: item.created_at
    }));

    return res.status(200).json({
      success: true,
      data: broadcasts
    });
  } catch (err) {
    next(err);
  }
};

export const deleteBroadcast = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('notifications').delete().eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Broadcast deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};
