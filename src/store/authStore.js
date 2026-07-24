import { create } from 'zustand';
import { api } from '../lib/api';

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
      const token = localStorage.getItem('bloodbridge_token');
      if (token) {
        const { data } = await api.get('/auth/me');
        if (data && data.success && data.user) {
          const cachedAvatar = data.user.id ? localStorage.getItem(`user_avatar_${data.user.id}`) : null;
          const mergedUser = {
            ...data.user,
            avatar_url: data.user.avatar_url || cachedAvatar || null
          };
          set({ user: mergedUser, profile: mergedUser });
        } else {
          localStorage.removeItem('bloodbridge_token');
        }
      }
    } catch (error) {
      console.warn('Error fetching backend auth session:', error);
      localStorage.removeItem('bloodbridge_token');
      set({ user: null, profile: null });
    } finally {
      set({ loading: false });
    }
  },

  fetchProfile: async (userId) => {
    try {
      const { data } = await api.get('/auth/me');
      if (data && data.success && data.user) {
        const cachedAvatar = data.user.id ? localStorage.getItem(`user_avatar_${data.user.id}`) : null;
        const mergedUser = {
          ...data.user,
          avatar_url: data.user.avatar_url || cachedAvatar || null
        };
        set({ profile: mergedUser, user: mergedUser });
      }
    } catch (error) {
      console.error('Error fetching backend user profile:', error);
    }
  },

  updateProfileName: async (newName) => {
    const { user, profile } = useAuthStore.getState();
    if (!user || !newName?.trim()) return;

    try {
      await api.put('/users/profile/name', { fullName: newName.trim() });
      if (user.id) {
        localStorage.setItem(`user_name_${user.id}`, newName.trim());
      }
      set({
        user: {
          ...user,
          full_name: newName.trim()
        },
        profile: {
          ...profile,
          full_name: newName.trim()
        }
      });
    } catch (err) {
      console.warn('Could not update profile name on backend:', err);
    }
  },

  updateAvatarUrl: async (avatarUrl) => {
    const { user, profile } = useAuthStore.getState();
    if (!user) return { success: false, error: 'User not logged in' };
    
    try {
      const res = await api.put('/users/profile/avatar', { avatarUrl });
      const finalAvatar = (res.data && res.data.avatar_url) ? res.data.avatar_url : avatarUrl;

      if (user.id) {
        localStorage.setItem(`user_avatar_${user.id}`, finalAvatar);
      }

      set({
        user: {
          ...user,
          avatar_url: finalAvatar
        },
        profile: {
          ...profile,
          avatar_url: finalAvatar
        }
      });

      return { success: true, avatar_url: finalAvatar };
    } catch (err) {
      console.warn('Could not update avatar URL on backend, falling back to client cache:', err);
      if (user.id) {
        localStorage.setItem(`user_avatar_${user.id}`, avatarUrl);
      }
      set({
        user: { ...user, avatar_url: avatarUrl },
        profile: { ...profile, avatar_url: avatarUrl }
      });
      return { success: true, avatar_url: avatarUrl, fallback: true };
    }
  },

  signIn: async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data && data.success) {
        const { token, user } = data;
        localStorage.setItem('bloodbridge_token', token);
        const cachedAvatar = user.id ? localStorage.getItem(`user_avatar_${user.id}`) : null;
        const mergedUser = {
          ...user,
          avatar_url: user.avatar_url || cachedAvatar || null
        };
        set({ user: mergedUser, profile: mergedUser });
        return mergedUser;
      }
      throw new Error('Sign in returned unsuccessful.');
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed.');
    }
  },

  signUp: async (email, password, fullName) => {
    try {
      const { data } = await api.post('/auth/register', { email, password, fullName });
      if (data && data.success) {
        const { token, user } = data;
        localStorage.setItem('bloodbridge_token', token);
        set({ user, profile: user });
        return user;
      }
      throw new Error('Registration returned unsuccessful.');
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Registration failed.');
    }
  },

  signOut: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Sign out call failed, continuing cleanup:', err);
    }
    localStorage.removeItem('bloodbridge_token');
    set({ user: null, profile: null });
  }
}));
