import { supabase } from '../config/supabase.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bloodbridge_jwt_secret_key_prod_1002';

const checkIsAdmin = (email, metadata = {}, existingRole = '') => {
  if (existingRole === 'admin') return true;
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return (
    e === 'wasinahmed805@gmail.com' ||
    e === 'wasinahmed807@gmail.com' ||
    e.startsWith('wasinahmed') ||
    e.includes('admin') ||
    metadata?.role === 'admin'
  );
};

export const register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    // Sign up via Supabase Auth on the backend
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const user = data.user;
    if (!user) {
      return res.status(400).json({ success: false, message: 'Registration failed.' });
    }

    const nameToStore = fullName.trim();
    const isAdmin = checkIsAdmin(email, user.user_metadata);
    const assignedRole = isAdmin ? 'admin' : 'user';

    // Ensure they have a record in the public.users table
    try {
      await supabase.from('users').upsert([{
        id: user.id,
        email: user.email || email,
        full_name: nameToStore,
        role: assignedRole,
        created_at: new Date().toISOString()
      }], { onConflict: 'id' });
    } catch (err) {
      console.warn('Backend warning upserting public user details:', err);
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: assignedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: nameToStore,
        role: assignedRole
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const user = data.user;
    if (!user) {
      return res.status(400).json({ success: false, message: 'Login failed.' });
    }

    // Fetch user profile to get exact role
    let role = 'user';
    let fullName = user.user_metadata?.full_name || '';

    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (dbUser) {
        role = dbUser.role || 'user';
        fullName = dbUser.full_name || fullName;
      }
    } catch (err) {
      console.warn('Could not fetch user profile details on login, resorting to auth metadata:', err);
    }

    // Double check admin check logic
    const isAdmin = checkIsAdmin(user.email, user.user_metadata, role);
    if (isAdmin) {
      role = 'admin';
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: fullName,
        role
      }
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    await supabase.auth.signOut();
    res.clearCookie('token');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    next(err);
  }
};

export const getSessionUser = async (req, res, next) => {
  try {
    // req.user has { id, email, role } from decode token
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: profile.full_name,
        role: profile.role || req.user.role,
        avatar_url: profile.avatar_url
      }
    });
  } catch (err) {
    next(err);
  }
};
