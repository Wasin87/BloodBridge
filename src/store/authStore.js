import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export function checkIsAdmin(email, metadata = {}, existingRole = '') {
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
}

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,
  
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user });
        await useAuthStore.getState().fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ user: session?.user || null });
      if (session?.user) {
        await useAuthStore.getState().fetchProfile(session.user.id);
      } else {
        set({ profile: null });
      }
    });
  },

  fetchProfile: async (userId) => {
    try {
      const sessionUser = useAuthStore.getState().user;
      const savedAvatar = localStorage.getItem(`user_avatar_${userId}`);
      const savedName = localStorage.getItem(`user_name_${userId}`);

      const metaName = sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name;
      const emailPrefix = sessionUser?.email ? sessionUser.email.split('@')[0] : '';
      const formattedEmailName = emailPrefix 
        ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) 
        : 'Campus Donor';

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const userEmail = sessionUser?.email || data?.email || '';
      const isAdmin = checkIsAdmin(userEmail, sessionUser?.user_metadata, data?.role);

      const realName = (data?.full_name && data.full_name !== 'User')
        ? data.full_name
        : (savedName || metaName || (isAdmin ? 'Wasin Ahmed' : formattedEmailName));

      // Save realName locally and sync to database if missing or 'User'
      if (realName) {
        localStorage.setItem(`user_name_${userId}`, realName);
      }

      const assignedRole = isAdmin ? 'admin' : (data?.role || 'user');

      if (realName && (!data || data.full_name !== realName || data.role !== assignedRole)) {
        try {
          await supabase.from('users').upsert([{
            id: userId,
            email: userEmail,
            full_name: realName,
            role: assignedRole,
            created_at: new Date().toISOString()
          }], { onConflict: 'id' });
        } catch (e) {
          console.warn('upsert user name notice:', e);
        }
      }

      set({ 
        profile: {
          ...(data || {}),
          id: userId,
          full_name: realName,
          email: userEmail,
          role: assignedRole,
          avatar_url: savedAvatar || data?.avatar_url || sessionUser?.user_metadata?.avatar_url || null
        } 
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      const sessionUser = useAuthStore.getState().user;
      const uid = sessionUser?.id || userId;
      const savedAvatar = localStorage.getItem(`user_avatar_${uid}`);
      const savedName = localStorage.getItem(`user_name_${uid}`);
      const metaName = sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name;
      const emailPrefix = sessionUser?.email ? sessionUser.email.split('@')[0] : '';
      const formattedEmailName = emailPrefix 
        ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) 
        : 'Campus Donor';

      const userEmail = sessionUser?.email || '';
      const isAdmin = checkIsAdmin(userEmail, sessionUser?.user_metadata);
      const realName = savedName || metaName || (isAdmin ? 'Wasin Ahmed' : formattedEmailName);

      set({
        profile: {
          id: uid,
          full_name: realName,
          email: userEmail,
          role: isAdmin ? 'admin' : 'user',
          avatar_url: savedAvatar || null
        }
      });
    }
  },

  updateProfileName: async (newName) => {
    const { user, profile } = useAuthStore.getState();
    if (!user || !newName?.trim()) return;

    const trimmedName = newName.trim();
    localStorage.setItem(`user_name_${user.id}`, trimmedName);

    const isAdmin = checkIsAdmin(user.email, user.user_metadata, profile?.role);
    const assignedRole = isAdmin ? 'admin' : (profile?.role || 'user');

    set({
      profile: {
        ...profile,
        full_name: trimmedName,
        role: assignedRole
      }
    });

    try {
      await supabase
        .from('users')
        .upsert([{ 
          id: user.id, 
          email: user.email || '', 
          full_name: trimmedName,
          role: assignedRole
        }], { onConflict: 'id' });
    } catch (err) {
      console.warn('Could not update name in users table:', err);
    }
  },

  updateAvatarUrl: async (avatarUrl) => {
    const { user, profile } = useAuthStore.getState();
    if (!user) return;
    
    // Save to local storage for instant offline / fallback persistence
    localStorage.setItem(`user_avatar_${user.id}`, avatarUrl);
    
    // Update local Zustand store
    set({
      profile: {
        ...profile,
        avatar_url: avatarUrl
      }
    });

    // Try updating Supabase database
    try {
      await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
    } catch (err) {
      console.warn('Could not update avatar in Supabase users table:', err);
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    
    if (error) throw error;
    
    if (data?.user) {
      const nameToStore = fullName?.trim() || (email ? email.split('@')[0] : 'Campus Donor');
      localStorage.setItem(`user_name_${data.user.id}`, nameToStore);

      try {
        await supabase.from('users').upsert([{
          id: data.user.id,
          email: data.user.email || email,
          full_name: nameToStore,
          role: 'user',
          created_at: new Date().toISOString()
        }], { onConflict: 'id' });
      } catch (err) {
        console.warn('Could not insert user in public users:', err);
      }

      set({
        user: data.user,
        profile: {
          id: data.user.id,
          full_name: nameToStore,
          email: data.user.email || email,
          avatar_url: null
        }
      });
    }
    
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, profile: null });
  }
}));
