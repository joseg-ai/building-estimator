const API_BASE = 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

function clearToken() {
  localStorage.removeItem('auth_token');
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

// ---- Auth ----

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function apiLogin(username: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function apiRegister(username: string, password: string, displayName: string): Promise<AuthResponse> {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, displayName }),
  });
  setToken(data.token);
  return data;
}

export async function apiGetMe(): Promise<AuthUser> {
  return apiFetch('/auth/me');
}

export function apiLogout() {
  clearToken();
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ---- Quotes ----

import type { BuildingConfig } from './types';

export interface QuoteListItem {
  id: string;
  project_name: string;
  customer_name: string;
  job_location: string;
  grand_total: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface QuoteDetail {
  id: string;
  projectName: string;
  customerName: string;
  jobLocation: string;
  config: BuildingConfig;
  grandTotal: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function apiListQuotes(): Promise<QuoteListItem[]> {
  return apiFetch('/quotes');
}

export async function apiGetQuote(id: string): Promise<QuoteDetail> {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`);
}

export async function apiCreateQuote(config: BuildingConfig, grandTotal: number): Promise<{ id: string }> {
  return apiFetch('/quotes', {
    method: 'POST',
    body: JSON.stringify({ config, grandTotal }),
  });
}

export async function apiUpdateQuote(id: string, config: BuildingConfig, grandTotal: number, status?: string): Promise<{ id: string }> {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ config, grandTotal, status }),
  });
}

export async function apiDeleteQuote(id: string): Promise<void> {
  await apiFetch(`/quotes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
