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

export const updateUserSettings = async (settings: { currency?: string, language?: string }): Promise<UserProfile | null> => {
  try {
    const response = await api.patch('/auth/settings', settings);

    // Update local storage as fallback/cache
    if (settings.currency) localStorage.setItem('cc_currency', settings.currency);
    if (settings.language) localStorage.setItem('cc_language', settings.language);

    return response.data;
  } catch (error) {
    console.error("Failed to update settings", error);
    return null;
  }
};

// Data Backup & Restore
export const generateBackup = async () => {
  try {
    const response = await api.get('/api/data/export');
    const data = response.data;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `foxx-cc-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Backup generation failed", error);
  }
};

export const restoreBackup = async (jsonContent: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonContent);
    await api.post('/api/data/import', data);
    return true;
  } catch (error) {
    console.error("Backup restore failed", error);
    return false;
  }
};
