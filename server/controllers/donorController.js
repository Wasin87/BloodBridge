import { supabase } from '../config/supabase.js';

export const upsertProfile = async (req, res, next) => {
  try {
    const { bloodGroup, phone, gender, dob, university, department, district, upazila, area, weight, lastDonation, emergencyContact, medicalNotes } = req.body;
    const userId = req.user.id;

    const payload = {
      user_id: userId,
      blood_group: bloodGroup,
      phone: phone,
      gender: gender,
      date_of_birth: dob,
      university: university || 'General Donor',
      department: department || 'General',
      district: district,
      upazila: upazila,
      area: area || '',
      weight: parseFloat(weight) || 50,
      last_donation_date: lastDonation || null,
      is_available: true,
      emergency_contact: emergencyContact,
      medical_notes: medicalNotes || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('donor_profiles').upsert([payload], { onConflict: 'user_id' }).select();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data ? data[0] : null
    });
  } catch (err) {
    next(err);
  }
};

export const fetchProfiles = async (req, res, next) => {
  try {
    const { bloodGroup, search } = req.query;

    let query = supabase.from('donor_profiles').select(`
      *,
      users (
        full_name,
        email,
        avatar_url
      )
    `).eq('is_available', true);

    if (bloodGroup) {
      query = query.eq('blood_group', bloodGroup);
    }
    if (search) {
      query = query.ilike('district', `%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const enriched = (data || []).map(d => ({
      ...d,
      avatar_url: d.users?.avatar_url || null
    }));

    return res.status(200).json({
      success: true,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
};

export const fetchMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('donor_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || null
    });
  } catch (err) {
    next(err);
  }
};

export const toggleAvailability = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { isAvailable } = req.body;

    const { error } = await supabase
      .from('donor_profiles')
      .update({ is_available: isAvailable })
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Availability updated successfully to ${isAvailable}`
    });
  } catch (err) {
    next(err);
  }
};

export const deleteProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase.from('donor_profiles').delete().eq('user_id', userId);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Donor profile deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};
