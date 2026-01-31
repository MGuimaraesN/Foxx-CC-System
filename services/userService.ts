import { UserProfile } from '../types';
import CryptoJS from 'crypto-js';

const STORAGE_KEY_USER = 'cc_expense_user_profile';
const STORAGE_KEY_AUTH = 'cc_expense_auth_token';

// Default Admin credentials (hashed for simulation)
// "123456" hash
const DEFAULT_PASS_HASH = CryptoJS.SHA256("123456").toString();

const DEFAULT_USER: UserProfile = {
  name: 'Admin User',
  email: 'admin@corp.com',
  avatarUrl: '',
  passwordHash: DEFAULT_PASS_HASH
};

// Helper to hash passwords
export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

// Authentication
export const login = async (email: string, password: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
  
  const user = getUserProfile();
  const inputHash = hashPassword(password);

  // Check against stored user profile (or default fallback)
  if (email === user.email && inputHash === (user.passwordHash || DEFAULT_PASS_HASH)) {
    // Create a mock token with expiry
    const tokenPayload = {
      email: user.email,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    // Encrypt the token to look professional
    const token = CryptoJS.AES.encrypt(JSON.stringify(tokenPayload), 'secret-key').toString();
    localStorage.setItem(STORAGE_KEY_AUTH, token);
    return true;
  }
  return false;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY_AUTH);
  window.location.reload(); // Force refresh to clear state
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(STORAGE_KEY_AUTH);
  if (!token) return false;

  try {
    const bytes = CryptoJS.AES.decrypt(token, 'secret-key');
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    
    if (decryptedData.expiresAt < Date.now()) {
      logout(); // Token expired
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

// User Profile Management
export const getUserProfile = (): UserProfile => {
  const stored = localStorage.getItem(STORAGE_KEY_USER);
  return stored ? JSON.parse(stored) : DEFAULT_USER;
};

export const updateUserProfile = (profile: UserProfile, newPassword?: string) => {
  const updatedProfile = { ...profile };
  if (newPassword) {
    updatedProfile.passwordHash = hashPassword(newPassword);
  }
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedProfile));
};

// Data Backup & Restore
export const generateBackup = () => {
  const data = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    user: getUserProfile(),
    transactions: JSON.parse(localStorage.getItem('cc_expense_transactions') || '[]'),
    cards: JSON.parse(localStorage.getItem('cc_expense_cards') || '[]'), // Fix: parse cards too
    budgets: JSON.parse(localStorage.getItem('cc_expense_budgets') || '[]')
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `cc-expense-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const restoreBackup = (jsonContent: string): boolean => {
  try {
    const data = JSON.parse(jsonContent);
    
    // Structure Validation
    if (!data.transactions || !Array.isArray(data.transactions)) {
      throw new Error("Invalid Transactions data");
    }
    if (!data.user || !data.user.email) {
       throw new Error("Invalid User data");
    }

    // Restore
    if (data.transactions) localStorage.setItem('cc_expense_transactions', JSON.stringify(data.transactions));
    if (data.user) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    if (data.cards) localStorage.setItem('cc_expense_cards', JSON.stringify(data.cards)); // Restore Cards logic if implemented storage
    if (data.budgets) localStorage.setItem('cc_expense_budgets', JSON.stringify(data.budgets));

    return true;
  } catch (e) {
    console.error("Backup restore failed", e);
    return false;
  }
};