import { supabase } from '../config/supabase.js';

export const createRequest = async (req, res, next) => {
  try {
    const { patientName, bloodGroup, unitsNeeded, hospitalName, district, upazila, area, requiredDate, urgency, contactPerson, contactNumber, description } = req.body;
    const userId = req.user.id;

    const payload = {
      user_id: userId,
      patient_name: patientName,
      blood_group: bloodGroup,
      units_needed: parseInt(unitsNeeded) || 1,
      hospital_name: hospitalName,
      district: district,
      upazila: upazila,
      area: area || '',
      required_date: requiredDate,
      urgency: (urgency || 'normal').toLowerCase(),
      contact_person: contactPerson,
      contact_number: contactNumber,
      description: description || '',
      status: 'pending'
    };

    const { data, error } = await supabase.from('blood_requests').insert([payload]).select();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({
      success: true,
      data: data ? data[0] : null
    });
  } catch (err) {
    next(err);
  }
};

export const fetchRequests = async (req, res, next) => {
  try {
    const { bloodGroup, search, excludeOwn } = req.query;
    const currentUserId = req.user?.id;

    let query = supabase.from('blood_requests').select('*').eq('status', 'pending');

    if (currentUserId && excludeOwn === 'true') {
      query = query.neq('user_id', currentUserId);
    }
    if (bloodGroup) {
      query = query.eq('blood_group', bloodGroup);
    }
    if (search) {
      query = query.ilike('district', `%${search}%`);
    }

    const { data: requestsData, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const requests = requestsData || [];
    const userIds = [...new Set(requests.map(r => r.user_id).filter(Boolean))];

    let usersMap = {};
    if (userIds.length > 0) {
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (!usersErr && usersData) {
        usersData.forEach(u => {
          usersMap[u.id] = u;
        });
      }
    }

    const enriched = requests.map(r => ({
      ...r,
      users: usersMap[r.user_id] || null,
      avatar_url: usersMap[r.user_id]?.avatar_url || null
    }));

    return res.status(200).json({
      success: true,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Verify ownership or admin privileges
    const { data: request } = await supabase.from('blood_requests').select('user_id').eq('id', id).single();
    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found.' });
    }

    if (request.user_id !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this request.' });
    }

    const { error } = await supabase.from('blood_requests').delete().eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Blood request deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Verify ownership or admin privileges
    const { data: request } = await supabase.from('blood_requests').select('user_id').eq('id', id).single();
    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found.' });
    }

    if (request.user_id !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this request.' });
    }

    const { error } = await supabase.from('blood_requests').update({ status }).eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Blood request status updated to ${status}`
    });
  } catch (err) {
    next(err);
  }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const donorUser = req.user; // contains id, email, role
    const { donorProfile } = req.body;

    const donorName = donorUser.fullName || donorUser.full_name || donorUser.email?.split('@')[0] || 'Campus Donor';
    const donorAvatar = donorProfile?.avatar_url || null;

    const acceptedDonorInfo = {
      user_id: donorUser.id,
      name: donorName,
      blood_group: donorProfile?.blood_group || 'O+',
      phone: donorProfile?.phone || '',
      email: donorUser.email || '',
      district: donorProfile?.district || 'Campus',
      university: donorProfile?.university || 'General',
      department: donorProfile?.department || '',
      last_donation_date: donorProfile?.last_donation_date || null,
      avatar_url: donorAvatar,
      accepted_at: new Date().toISOString()
    };

    const { data: currentReq, error: reqErr } = await supabase.from('blood_requests').select('*').eq('id', id).single();
    if (reqErr || !currentReq) {
      return res.status(404).json({ success: false, message: 'Blood request not found.' });
    }

    // Update the blood request
    const { data, error } = await supabase
      .from('blood_requests')
      .update({
        status: 'accepted',
        accepted_donor_id: donorUser.id,
        accepted_donor_info: acceptedDonorInfo
      })
      .eq('id', id)
      .select();

    if (error) {
      const errMsg = error.message || '';
      if (errMsg.includes('accepted_donor_id') || errMsg.includes('column')) {
        return res.status(400).json({
          success: false,
          message: `Database Schema Out of Sync! Your Supabase database is missing tracking columns. Please COPY and RUN this query in your Supabase SQL Editor:\n\nALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS accepted_donor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;\nALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS accepted_donor_info JSONB;`
        });
      }
      return res.status(400).json({ success: false, message: error.message });
    }

    // Save into blood_request_accept table
    try {
      const acceptPayload = {
        request_id: currentReq.id,
        donor_id: donorUser.id,
        patient_name: currentReq.patient_name,
        blood_group: currentReq.blood_group,
        hospital_name: currentReq.hospital_name,
        units: currentReq.units_needed || 1,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      };
      await supabase.from('blood_request_accept').insert([acceptPayload]);
    } catch (acceptErr) {
      console.warn('Failed to log to blood_request_accept table:', acceptErr.message);
    }

    // Create Notification for request creator (receiver)
    const targetUserId = currentReq.user_id;
    if (targetUserId) {
      try {
        await supabase.from('notifications').insert([{
          user_id: targetUserId,
          title: '🩸 Donor Matched for Your Blood Request!',
          message: `${donorName} (${acceptedDonorInfo.blood_group}) has accepted your request for ${currentReq.patient_name || 'Patient'}.`,
          type: 'donor_accepted'
        }]);
      } catch (notifErr) {
        console.warn('Backend notifications insert failed:', notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: data ? data[0] : null
    });
  } catch (err) {
    next(err);
  }
};

export const completeRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const { data: request, error: fetchErr } = await supabase.from('blood_requests').select('*').eq('id', id).single();
    if (fetchErr || !request) {
      return res.status(404).json({ success: false, message: 'Blood request not found.' });
    }

    // Update request status to completed
    const { error: updateErr } = await supabase.from('blood_requests').update({ status: 'completed' }).eq('id', id);
    if (updateErr) {
      return res.status(400).json({ success: false, message: updateErr.message });
    }

    // Update status in blood_request_accept table
    try {
      await supabase
        .from('blood_request_accept')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('request_id', id);
    } catch (acceptUpdErr) {
      console.warn('Failed to update blood_request_accept status:', acceptUpdErr.message);
    }

    // Save into donations history table
    try {
      const payload = {
        donor_id: request.accepted_donor_id || user.id,
        request_id: id,
        patient_name: request.patient_name,
        hospital_name: request.hospital_name,
        units: request.units_needed || 1,
        donation_date: new Date().toISOString().split('T')[0]
      };
      await supabase.from('donations').insert([payload]);
    } catch (donErr) {
      console.warn('Backend donations insert warning:', donErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Blood request completed and moved to history.'
    });
  } catch (err) {
    next(err);
  }
};
