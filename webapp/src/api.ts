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

  // 204 No Content or empty body
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    // New error envelope: { error: { code, message } }
    if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'object' && (data as { error: { message?: string; code?: string } }).error !== null) {
      const errObj = (data as { error: { code?: string; message?: string } }).error;
      const e = new Error(errObj.message || 'API error') as Error & { code?: string; status?: number };
      e.code = errObj.code;
      e.status = res.status;
      throw e;
    }
    // Legacy: { error: 'string' }
    let msg = 'API error';
    if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
      msg = (data as { error: string }).error;
    } else if (typeof data === 'string' && data) {
      msg = data;
    }
    const e = new Error(msg) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
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
  projectName: string;
  customerName: string;
  jobLocation: string;
  grandTotal: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  /** FK to customers.id — present on Phase-2+ quotes */
  customerId?: number | null;
}

export interface QuoteDetail {
  id: string;
  projectName: string;
  customerName: string;
  customerId?: number | null;
  jobLocation: string;
  config: BuildingConfig;
  grandTotal: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  priceListVersionId?: number | null;
}

export async function apiListQuotes(): Promise<QuoteListItem[]> {
  return apiFetch('/quotes');
}

export async function apiGetQuote(id: string): Promise<QuoteDetail> {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`);
}

export async function apiCreateQuote(config: BuildingConfig, grandTotal: number, priceListVersionId: number | null = null, customerId?: number | null): Promise<{ id: string }> {
  return apiFetch('/quotes', {
    method: 'POST',
    body: JSON.stringify({ config, grandTotal, priceListVersionId, ...(customerId != null ? { customerId } : {}) }),
  });
}

export async function apiUpdateQuote(id: string, config: BuildingConfig, grandTotal: number, status?: string, priceListVersionId: number | null = null, customerId?: number | null): Promise<{ id: string }> {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ config, grandTotal, status, priceListVersionId, ...(customerId != null ? { customerId } : {}) }),
  });
}

export async function apiDeleteQuote(id: string): Promise<void> {
  await apiFetch(`/quotes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---- Price List ----

export interface PriceListVersionMeta {
  id: number;
  name: string;
  supplier: string;
  is_active: 0 | 1;
  created_at: string;
  created_by?: string | null;
  notes?: string | null;
  item_count: number;
}

export interface PriceListServerItem {
  id: number;
  item_key: string;
  description: string;
  unit: string;
  unit_price: number;
  category: string;
}

export interface PriceListVersionFull {
  version: Omit<PriceListVersionMeta, 'item_count'>;
  items: PriceListServerItem[];
}

export interface CreatePriceListVersionInput {
  name: string;
  supplier?: string;
  notes?: string;
  items: Array<Pick<PriceListServerItem, 'item_key' | 'description' | 'unit' | 'unit_price' | 'category'>>;
}

export async function apiListPriceListVersions(): Promise<PriceListVersionMeta[]> {
  return apiFetch('/price-list/versions');
}

export async function apiGetPriceListVersion(id: number): Promise<PriceListVersionFull> {
  return apiFetch(`/price-list/versions/${id}`);
}

export async function apiGetActivePriceList(): Promise<PriceListVersionFull> {
  return apiFetch('/price-list/active');
}

export async function apiCreatePriceListVersion(payload: CreatePriceListVersionInput): Promise<PriceListVersionMeta> {
  return apiFetch('/price-list/versions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiUpdatePriceListItem(
  versionId: number,
  itemKey: string,
  body: { unit_price: number; description?: string; unit?: string; category?: string }
): Promise<PriceListServerItem> {
  return apiFetch(`/price-list/versions/${versionId}/items/${encodeURIComponent(itemKey)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiActivatePriceListVersion(id: number): Promise<PriceListVersionMeta> {
  return apiFetch(`/price-list/versions/${id}/activate`, { method: 'PUT' });
}

// ---- Catalog ----

export interface CatalogVersionMeta {
  id: number;
  name: string;
  is_active: 0 | 1;
  created_at: string;
  created_by?: string | null;
  notes?: string | null;
  item_count: number;
}

export interface CatalogServerItem<P = unknown> {
  id: number;
  category: string;
  item_key: string;
  payload: P;
}

export interface CatalogVersionFull<P = unknown> {
  version: Omit<CatalogVersionMeta, 'item_count'>;
  items: CatalogServerItem<P>[];
}

export interface CreateCatalogVersionInput<P = unknown> {
  name: string;
  notes?: string;
  items: Array<{ category: string; item_key: string; payload: P }>;
}

export async function apiListCatalogVersions(): Promise<CatalogVersionMeta[]> {
  return apiFetch('/catalog/versions');
}

export async function apiGetCatalogVersion<P = unknown>(id: number): Promise<CatalogVersionFull<P>> {
  return apiFetch(`/catalog/versions/${id}`);
}

export async function apiGetActiveCatalog<P = unknown>(): Promise<CatalogVersionFull<P>> {
  return apiFetch('/catalog/active');
}

export async function apiCreateCatalogVersion<P = unknown>(payload: CreateCatalogVersionInput<P>): Promise<CatalogVersionMeta> {
  return apiFetch('/catalog/versions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateCatalogItem<P = unknown>(
  versionId: number,
  itemKey: string,
  body: { payload: P; category?: string }
): Promise<CatalogServerItem<P>> {
  return apiFetch(`/catalog/versions/${versionId}/items/${encodeURIComponent(itemKey)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiActivateCatalogVersion(id: number): Promise<CatalogVersionMeta> {
  return apiFetch(`/catalog/versions/${id}/activate`, { method: 'PUT' });
}

// ---- Customers ----

export interface Customer {
  id: number;
  userId: string;
  name: string;
  company: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  notes: string | null;
  defaultLaborRate: number | null;
  defaultOverheadPct: number | null;
  defaultProfitPct: number | null;
  defaultCommissionPct: number | null;
  createdAt: number;
  updatedAt: number;
  quoteCount: number;
}

export type CustomerWritable = {
  name: string;
  company?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  notes?: string | null;
  defaultLaborRate?: number | null;
  defaultOverheadPct?: number | null;
  defaultProfitPct?: number | null;
  defaultCommissionPct?: number | null;
};

export interface CustomerDeleteResult {
  deleted: boolean;
  id: number;
  quotesUnlinked: number;
}

export async function apiListCustomers(search?: string): Promise<Customer[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch(`/customers${qs}`);
}

export async function apiGetCustomer(id: number): Promise<Customer> {
  return apiFetch(`/customers/${id}`);
}

export async function apiCreateCustomer(body: CustomerWritable): Promise<Customer> {
  return apiFetch('/customers', { method: 'POST', body: JSON.stringify(body) });
}

export async function apiUpdateCustomer(id: number, body: Partial<CustomerWritable>): Promise<Customer> {
  return apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiDeleteCustomer(id: number, force = false): Promise<CustomerDeleteResult> {
  const qs = force ? '?force=true' : '';
  return apiFetch(`/customers/${id}${qs}`, { method: 'DELETE' });
}

export async function apiListCustomerQuotes(id: number): Promise<QuoteListItem[]> {
  return apiFetch(`/customers/${id}/quotes`);
}

// ---- Vendors ----

export interface Vendor {
  id: number;
  userId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  notes: string | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export type VendorWritable = {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  notes?: string | null;
  isDefault?: boolean;
};

export interface VendorPrice {
  id: number;
  vendorId: number;
  itemKey: string;
  unitPrice: number;
  currency: string;
  leadTimeDays: number | null;
  notes: string | null;
  updatedAt: number;
}

export interface VendorDeleteResult {
  deleted: boolean;
  id: number;
}

export async function apiListVendors(search?: string): Promise<Vendor[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch(`/vendors${qs}`);
}

export async function apiGetVendor(id: number): Promise<Vendor> {
  return apiFetch(`/vendors/${id}`);
}

export async function apiCreateVendor(body: VendorWritable): Promise<Vendor> {
  return apiFetch('/vendors', { method: 'POST', body: JSON.stringify(body) });
}

export async function apiUpdateVendor(id: number, body: Partial<VendorWritable>): Promise<Vendor> {
  return apiFetch(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiDeleteVendor(id: number): Promise<VendorDeleteResult> {
  return apiFetch(`/vendors/${id}`, { method: 'DELETE' });
}

export async function apiListVendorPrices(vendorId: number): Promise<VendorPrice[]> {
  return apiFetch(`/vendors/${vendorId}/prices`);
}

export async function apiUpsertVendorPrice(
  vendorId: number,
  itemKey: string,
  body: { unitPrice: number; currency?: string; leadTimeDays?: number | null; notes?: string | null }
): Promise<VendorPrice> {
  return apiFetch(`/vendors/${vendorId}/prices/${encodeURIComponent(itemKey)}`, {
    method: 'PUT',
    body: JSON.stringify({ unitPrice: body.unitPrice, currency: body.currency, leadTimeDays: body.leadTimeDays, notes: body.notes }),
  });
}

export async function apiDeleteVendorPrice(vendorId: number, itemKey: string): Promise<{ deleted: boolean; vendorId: number; itemKey: string }> {
  return apiFetch(`/vendors/${vendorId}/prices/${encodeURIComponent(itemKey)}`, { method: 'DELETE' });
}

export async function apiBulkUpsertVendorPrices(
  vendorId: number,
  items: Array<{ itemKey: string; unitPrice: number; leadTimeDays?: number | null; notes?: string | null }>
): Promise<{ upserted: number; vendorId: number }> {
  return apiFetch(`/vendors/${vendorId}/prices/bulk`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}
