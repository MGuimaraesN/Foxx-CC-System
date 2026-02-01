import { UserProfile } from '../types';
import api from './api';

const STORAGE_KEY_AUTH = 'cc_expense_auth_token';

// Default Admin credentials (hashed for simulation)
// Now unused, but kept for type compatibility if needed
export const hashPassword = (password: string): string => {
  return password;
};

// Authentication
export const login = async (email: string, password: string): Promise<boolean> => {
  try {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem(STORAGE_KEY_AUTH, response.data.token);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Login failed", error);
    return false;
  }
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY_AUTH);
  window.location.reload(); // Force refresh to clear state
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(STORAGE_KEY_AUTH);
  if (!token) return false;
  // Basic check, real validation happens on API calls
  return true;
};

// User Profile Management
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    return { name: 'Guest', email: '', avatarUrl: '' };
  }
};

export const updateUserProfile = (profile: UserProfile, newPassword?: string) => {
    // Implement API update if needed
    console.warn("Update profile not implemented in backend yet");
};

// Data Backup & Restore (Deprecated/Disabled for now as we moved to DB)
export const generateBackup = () => {
  console.warn("Backup not supported in DB mode yet");
};

export const restoreBackup = (jsonContent: string): boolean => {
  console.warn("Restore not supported in DB mode yet");
  return false;
};
