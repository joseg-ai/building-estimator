import { useCallback, useEffect, useRef, useState } from 'react';
import {
  apiListVendors,
  apiCreateVendor,
  apiUpdateVendor,
  apiDeleteVendor,
  apiListVendorPrices,
  apiUpsertVendorPrice,
  apiDeleteVendorPrice,
  apiBulkUpsertVendorPrices,
  type Vendor,
  type VendorWritable,
  type VendorPrice,
} from '../api';
import { useBuildingConfig } from '../context';

// ---- Form state ----

interface FormData {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
  isDefault: boolean;
}

function emptyForm(): FormData {
  return {
    name: '',
    contactName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
    notes: '',
    isDefault: false,
  };
}

function vendorToForm(v: Vendor): FormData {
  return {
    name: v.name,
    contactName: v.contactName ?? '',
    email: v.email ?? '',
    phone: v.phone ?? '',
    addressLine1: v.addressLine1 ?? '',
    addressLine2: v.addressLine2 ?? '',
    city: v.city ?? '',
    state: v.state ?? '',
    postalCode: v.postalCode ?? '',
    country: v.country ?? 'USA',
    notes: v.notes ?? '',
    isDefault: v.isDefault,
  };
}

function formToWritable(f: FormData): VendorWritable {
  return {
    name: f.name.trim(),
    contactName: f.contactName.trim() || null,
    email: f.email.trim() || null,
    phone: f.phone.trim() || null,
    addressLine1: f.addressLine1.trim() || null,
    addressLine2: f.addressLine2.trim() || null,
    city: f.city.trim() || null,
    state: f.state.trim() || null,
    postalCode: f.postalCode.trim() || null,
    country: f.country.trim() || 'USA',
    notes: f.notes.trim() || null,
    isDefault: f.isDefault,
  };
}

// ---- VendorPricesModal ----

interface VendorPricesModalProps {
  vendor: Vendor;
  onClose: () => void;
}

function VendorPricesModal({ vendor, onClose }: VendorPricesModalProps) {
  const { priceList } = useBuildingConfig();
  const [prices, setPrices] = useState<VendorPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seedingBulk, setSeedingBulk] = useState(false);
  // new price form
  const [newItemKey, setNewItemKey] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState('');
  const [adding, setAdding] = useState(false);
  // per-row editing
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editLead, setEditLead] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiListVendorPrices(vendor.id);
      setPrices(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load prices');
    } finally {
      setLoading(false);
    }
  }, [vendor.id]);

  useEffect(() => {
    void loadPrices();
  }, [vendor.id, loadPrices]);

  async function handleSeedFromPriceList() {
    if (!priceList.items.length) {
      setError('No active price list loaded. Please sync price list first.');
      return;
    }
    if (!confirm(`Seed ${priceList.items.length} prices from active price list into ${vendor.name}? This will overwrite any existing overrides.`)) return;
    setSeedingBulk(true);
    setError('');
    try {
      const items = priceList.items.map((it) => ({
        itemKey: it.item_key,
        unitPrice: it.unit_price,
        notes: `Seeded from active price list (v${priceList.activeVersionId})`,
      }));
      await apiBulkUpsertVendorPrices(vendor.id, items);
      await loadPrices();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to seed prices');
    } finally {
      setSeedingBulk(false);
    }
  }

  async function handleAddPrice(e: React.FormEvent) {
    e.preventDefault();
    const itemKey = newItemKey.trim();
    const unitPrice = parseFloat(newUnitPrice);
    if (!itemKey || isNaN(unitPrice) || unitPrice < 0) {
      setError('Item key and a valid non-negative unit price are required.');
      return;
    }
    setAdding(true);
    setError('');
    try {
      const created = await apiUpsertVendorPrice(vendor.id, itemKey, { unitPrice });
      setPrices((prev) => {
        const exists = prev.findIndex((p) => p.itemKey === itemKey);
        if (exists >= 0) {
          const next = [...prev];
          next[exists] = created;
          return next;
        }
        return [...prev, created];
      });
      setNewItemKey('');
      setNewUnitPrice('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add price');
    } finally {
      setAdding(false);
    }
  }

  function startEdit(p: VendorPrice) {
    setEditingKey(p.itemKey);
    setEditPrice(String(p.unitPrice));
    setEditLead(p.leadTimeDays != null ? String(p.leadTimeDays) : '');
    setEditNotes(p.notes ?? '');
  }

  async function handleSaveEdit(itemKey: string) {
    const unitPrice = parseFloat(editPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      setError('Unit price must be a non-negative number.');
      return;
    }
    const leadTimeDays = editLead.trim() !== '' ? parseInt(editLead) : null;
    setSavingKey(itemKey);
    setError('');
    try {
      const updated = await apiUpsertVendorPrice(vendor.id, itemKey, {
        unitPrice,
        leadTimeDays: leadTimeDays !== null && !isNaN(leadTimeDays) ? leadTimeDays : null,
        notes: editNotes.trim() || null,
      });
      setPrices((prev) => prev.map((p) => (p.itemKey === itemKey ? updated : p)));
      setEditingKey(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleDeletePrice(itemKey: string) {
    if (!confirm(`Remove price override for "${itemKey}"?`)) return;
    setDeletingKey(itemKey);
    setError('');
    try {
      await apiDeleteVendorPrice(vendor.id, itemKey);
      setPrices((prev) => prev.filter((p) => p.itemKey !== itemKey));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Price Overrides — {vendor.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{prices.length} override{prices.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedFromPriceList}
              disabled={seedingBulk}
              className="text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              {seedingBulk ? 'Seeding…' : '⬇ Seed from Active Price List'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
              <button onClick={() => setError('')} className="ml-2 text-red-500 underline">dismiss</button>
            </div>
          )}

          {/* Add price form */}
          <form onSubmit={handleAddPrice} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Item Key (e.g. MF-03)"
              value={newItemKey}
              onChange={(e) => setNewItemKey(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1"
            />
            <input
              type="number"
              placeholder="Unit Price"
              min="0"
              step="0.01"
              value={newUnitPrice}
              onChange={(e) => setNewUnitPrice(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32"
            />
            <button
              type="submit"
              disabled={adding}
              className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? 'Adding…' : '+ Add'}
            </button>
          </form>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading prices…</div>
          ) : prices.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No price overrides. Add one above or seed from the active price list.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Item Key</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Unit Price</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">Lead (days)</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Notes</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.itemKey} className="border-b border-gray-100 hover:bg-gray-50">
                    {editingKey === p.itemKey ? (
                      <>
                        <td className="py-1.5 px-3 font-mono text-xs font-semibold">{p.itemKey}</td>
                        <td className="py-1.5 px-3">
                          <input
                            type="number" min="0" step="0.0001"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-24 text-right"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <input
                            type="number" min="0" step="1"
                            value={editLead}
                            onChange={(e) => setEditLead(e.target.value)}
                            placeholder="—"
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-16 text-center"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Notes…"
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveEdit(p.itemKey)}
                              disabled={savingKey === p.itemKey}
                              className="text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50"
                            >
                              {savingKey === p.itemKey ? '…' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 font-mono text-xs font-semibold">{p.itemKey}</td>
                        <td className="py-2 px-3 text-right">${p.unitPrice.toFixed(4)}</td>
                        <td className="py-2 px-3 text-center text-gray-500">{p.leadTimeDays ?? '—'}</td>
                        <td className="py-2 px-3 text-gray-500 text-xs">{p.notes || '—'}</td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(p)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePrice(p.itemKey)}
                              disabled={deletingKey === p.itemKey}
                              className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingKey === p.itemKey ? '…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main VendorsPage ----

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [spinningIds, setSpinningIds] = useState<Set<number>>(new Set());
  const [priceCounts, setPriceCounts] = useState<Record<number, number>>({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [modalError, setModalError] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  // Prices modal
  const [pricesVendor, setPricesVendor] = useState<Vendor | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadVendors = useCallback(async (q?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiListVendors(q || undefined);
      setVendors(data);
      // Load price counts in background
      void loadPriceCounts(data);
    } catch (e) {
      if (!q) setError(e instanceof Error ? e.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => void loadVendors(search), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, loadVendors]);

  async function loadPriceCounts(vendorList: Vendor[]) {
    const results = await Promise.allSettled(
      vendorList.map((v) => apiListVendorPrices(v.id).then((prices) => ({ id: v.id, count: prices.length })))
    );
    const counts: Record<number, number> = {};
    for (const r of results) {
      if (r.status === 'fulfilled') counts[r.value.id] = r.value.count;
    }
    setPriceCounts(counts);
  }

  function openCreate() {
    setEditingVendor(null);
    setForm(emptyForm());
    setModalError('');
    setModalOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditingVendor(v);
    setForm(vendorToForm(v));
    setModalError('');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setModalError('Name is required.'); return; }
    setModalSaving(true);
    setModalError('');
    const body = formToWritable(form);
    try {
      if (editingVendor) {
        const updated = await apiUpdateVendor(editingVendor.id, body);
        setVendors((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        // If isDefault changed, refresh all (server clears others)
        if (form.isDefault) await loadVendors(search);
      } else {
        const created = await apiCreateVendor(body);
        if (form.isDefault) {
          await loadVendors(search);
        } else {
          setVendors((prev) => [...prev, created]);
        }
      }
      setModalOpen(false);
    } catch (e) {
      const err = e as Error & { code?: string };
      setModalError(err.code ? `[${err.code}] ${err.message}` : (err.message || 'Save failed'));
    } finally {
      setModalSaving(false);
    }
  }

  async function handleDelete(v: Vendor) {
    if (!confirm(`Delete vendor "${v.name}"? All price overrides will also be deleted.`)) return;
    setSpinningIds((s) => new Set(s).add(v.id));
    const prev = vendors;
    setVendors((list) => list.filter((x) => x.id !== v.id));
    try {
      await apiDeleteVendor(v.id);
    } catch (e) {
      setVendors(prev);
      setError(e instanceof Error ? e.message : 'Failed to delete vendor');
    } finally {
      setSpinningIds((s) => { const next = new Set(s); next.delete(v.id); return next; });
    }
  }

  const fieldCls = 'border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier vendors and their price overrides.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          + New Vendor
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-500 underline">dismiss</button>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search vendors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading vendors…</div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No vendors found.</p>
          <button onClick={openCreate} className="bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded hover:bg-blue-700">
            Add Your First Vendor
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Phone</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Default</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Overrides</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{v.name}</td>
                  <td className="py-3 px-4 text-gray-600">{v.contactName || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{v.email || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{v.phone || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    {v.isDefault ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">Default</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">
                    {priceCounts[v.id] != null ? priceCounts[v.id] : '…'}
                  </td>
                  <td className="py-3 px-4">
                    {spinningIds.has(v.id) ? (
                      <span className="text-xs text-gray-400">Deleting…</span>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPricesVendor(v)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
                        >
                          Prices
                        </button>
                        <button
                          onClick={() => openEdit(v)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editingVendor ? 'Edit Vendor' : 'New Vendor'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{modalError}</div>
              )}

              <div>
                <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Contact Name</label>
                  <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={fieldCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Address Line 1</label>
                <input type="text" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Address Line 2</label>
                <input type="text" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} className={fieldCls} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Postal Code</label>
                  <input type="text" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className={fieldCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={fieldCls} />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default vendor</label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {modalSaving ? 'Saving…' : editingVendor ? 'Save Changes' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Prices Modal */}
      {pricesVendor && (
        <VendorPricesModal
          vendor={pricesVendor}
          onClose={() => {
            setPricesVendor(null);
            // refresh price counts
            void loadPriceCounts(vendors);
          }}
        />
      )}
    </div>
  );
}
