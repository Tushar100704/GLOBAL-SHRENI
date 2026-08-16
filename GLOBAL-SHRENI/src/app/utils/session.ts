import { UserRole } from '../types';

const USER_ROLE_KEY = 'userRole';
const SESSION_TOKEN_KEY = 'sessionToken';
const SESSION_USER_KEY = 'sessionUser';

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email?: string;
  marketplaceRole?: 'worker' | 'client';
  ratings?: number;
  walletBalance?: number;
  location?: string;
  skills?: string[];
  rank?: number;
  partnerId?: string;
}

export function getUserRole(): UserRole {
  const role = localStorage.getItem(USER_ROLE_KEY);
  return role === 'partner' ? 'partner' : 'customer';
}

export function setUserRole(role: UserRole): void {
  localStorage.setItem(USER_ROLE_KEY, role);
}

export function setSession(token: string, user: SessionUser): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

export function getSessionToken(): string {
  return localStorage.getItem(SESSION_TOKEN_KEY) || '';
}

export function getSessionUser(): SessionUser | null {
  const rawUser = localStorage.getItem(SESSION_USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

export function getCustomerId(): string {
  return getSessionUser()?.id || 'u-customer-1';
}

export function getPartnerId(): string {
  return getSessionUser()?.partnerId || '1';
}
