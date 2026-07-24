import { supabase } from '../config/supabase.js';

export const updateProfileName = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullName } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name cannot be empty.' });
    }

    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim() })
      .eq('id', userId);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Name updated successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const updateAvatarUrl = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({ success: false, message: 'Avatar URL is required.' });
    }

    const { error } = await supabase
      .from('users')
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Database error updating avatar in users:', error.message);
      return res.status(400).json({ success: false, message: error.message });
    }

    // Touch donor_profiles if user has a profile record
    try {
      await supabase
        .from('donor_profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (e) {
      console.warn('Note updating donor_profiles for avatar:', e.message);
    }

    return res.status(200).json({
      success: true,
      avatar_url: avatarUrl,
      message: 'Avatar updated successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const fetchNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (err) {
    next(err);
  }
};

export const fetchDonationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch requests created by user or accepted by user
    let requests;
    let queryResult = await supabase
      .from('blood_requests')
      .select('*')
      .or(`user_id.eq.${userId},accepted_donor_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (queryResult.error) {
      const errMessage = queryResult.error.message || '';
      if (errMessage.includes('accepted_donor_id') || errMessage.includes('column')) {
        console.warn('Database fallback: accepted_donor_id column is missing. Querying only user_id.');
        const fallbackResult = await supabase
          .from('blood_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (fallbackResult.error) {
          return res.status(400).json({ success: false, message: fallbackResult.error.message });
        }
        requests = fallbackResult.data;
      } else {
        return res.status(400).json({ success: false, message: queryResult.error.message });
      }
    } else {
      requests = queryResult.data;
    }

    // Format like local storage histories
    const formatted = (requests || []).map(r => ({
      id: r.id,
      request_id: r.id,
      patient_name: r.patient_name,
      blood_group: r.blood_group,
      units: r.units_needed || 1,
      hospital: r.hospital_name,
      receiver_id: r.user_id,
      donor_id: r.accepted_donor_id,
      donor_info: r.accepted_donor_info || { name: 'Campus Donor' },
      completed_at: r.updated_at,
      status: r.status
    }));

    return res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};
