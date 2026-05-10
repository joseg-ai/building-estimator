import { useEffect, useRef, useState } from 'react';
import {
  apiListCustomers,
  apiCreateCustomer,
  apiUpdateCustomer,
  apiDeleteCustomer,
  type Customer,
  type CustomerWritable,
} from '../api';

// ---- Form state ----

interface FormData {
  name: string;
  company: string;
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
  defaultLaborRate: string;
  defaultOverheadPct: string;
  defaultProfitPct: string;
  defaultCommissionPct: string;
}

function emptyForm(): FormData {
  return {
    name: '',
    company: '',
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
    defaultLaborRate: '',
    defaultOverheadPct: '',
    defaultProfitPct: '',
    defaultCommissionPct: '',
  };
}

function customerToForm(c: Customer): FormData {
  return {
    name: c.name,
    company: c.company ?? '',
    contactName: c.contactName ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    addressLine1: c.addressLine1 ?? '',
    addressLine2: c.addressLine2 ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    postalCode: c.postalCode ?? '',
    country: c.country ?? 'USA',
    notes: c.notes ?? '',
    defaultLaborRate: c.defaultLaborRate != null ? String(c.defaultLaborRate) : '',
    defaultOverheadPct: c.defaultOverheadPct != null ? String(c.defaultOverheadPct) : '',
    defaultProfitPct: c.defaultProfitPct != null ? String(c.defaultProfitPct) : '',
    defaultCommissionPct: c.defaultCommissionPct != null ? String(c.defaultCommissionPct) : '',
  };
}

function formToWritable(f: FormData): CustomerWritable {
  const parseNum = (s: string): number | null => {
    const n = parseFloat(s);
    return s.trim() !== '' && !isNaN(n) ? n : null;
  };
  return {
    name: f.name.trim(),
    company: f.company.trim() || null,
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
    defaultLaborRate: parseNum(f.defaultLaborRate),
    defaultOverheadPct: parseNum(f.defaultOverheadPct),
    defaultProfitPct: parseNum(f.defaultProfitPct),
    defaultCommissionPct: parseNum(f.defaultCommissionPct),
  };
}

// ---- Delete confirm state ----

interface DeleteConfirm {
  customer: Customer;
  force: boolean;
}

// ---- Main component ----

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Per-row async spinner
  const [pendingId, setPendingId] = useState<number | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce timer
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const list = await apiListCustomers(q);
      setCustomers(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load customers';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void load(q || undefined), 300);
  }

  // ---- Modal ----

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm(customerToForm(customer));
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError(null);
  }

  function setField(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const body = formToWritable(form);
    try {
      if (editingId != null) {
        // Optimistic update
        let prev: Customer[] = [];
        setCustomers((cs) => {
          prev = cs;
          return cs.map((c) =>
            c.id === editingId ? { ...c, ...body, updatedAt: Date.now() } : c
          );
        });
        setPendingId(editingId);
        try {
          const updated = await apiUpdateCustomer(editingId, body);
          setCustomers((cs) => cs.map((c) => (c.id === editingId ? updated : c)));
        } catch {
          setCustomers(prev); // rollback
          throw new Error('Failed to update customer');
        } finally {
          setPendingId(null);
        }
      } else {
        const created = await apiCreateCustomer(body);
        setCustomers((cs) => [...cs, created]);
      }
      closeModal();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Delete ----

  function initiateDelete(customer: Customer) {
    setDeleteConfirm({ customer, force: false });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    const { customer, force } = deleteConfirm;
    setDeleting(true);
    setPendingId(customer.id);
    // Optimistic remove
    let prev: Customer[] = [];
    setCustomers((cs) => {
      prev = cs;
      return cs.filter((c) => c.id !== customer.id);
    });
    try {
      await apiDeleteCustomer(customer.id, force);
      setDeleteConfirm(null);
    } catch (e) {
      setCustomers(prev); // rollback
      const err = e as Error & { code?: string };
      if (err.code === 'IN_USE') {
        // Shouldn't happen if quoteCount was accurate, but handle gracefully
        setDeleteConfirm({ customer, force: true });
      } else {
        setError(err.message || 'Delete failed');
        setDeleteConfirm(null);
      }
    } finally {
      setDeleting(false);
      setPendingId(null);
    }
  }

  // ---- Render helpers ----

  function textInput(label: string, key: keyof FormData, opts?: { required?: boolean; type?: string; placeholder?: string }) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-0.5">
          {label}{opts?.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          type={opts?.type ?? 'text'}
          value={form[key]}
          onChange={(e) => setField(key, e.target.value)}
          placeholder={opts?.placeholder}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer master records. Select a customer on a quote to auto-fill defaults.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          + New Customer
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 underline ml-2 shrink-0">dismiss</button>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or company..."
          value={search}
          onChange={handleSearch}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">
            {search ? 'No customers match your search.' : 'No customers yet.'}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="bg-blue-600 text-white text-sm font-medium px-6 py-2 rounded hover:bg-blue-700"
            >
              Add Your First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Company</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Phone</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Quotes</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const isPending = pendingId === c.id;
                return (
                  <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isPending ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                        )}
                        {c.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{c.company || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{c.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{c.phone || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${c.quoteCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.quoteCount}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openEdit(c)}
                          disabled={isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-40"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => initiateDelete(c)}
                          disabled={isPending}
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Create / Edit Modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId != null ? 'Edit Customer' : 'New Customer'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
              {/* Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {textInput('Customer Name', 'name', { required: true, placeholder: 'e.g. Acme Steel' })}
                {textInput('Company', 'company', { placeholder: 'e.g. Acme Steel LLC' })}
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {textInput('Contact Name', 'contactName', { placeholder: 'Primary contact' })}
                {textInput('Email', 'email', { type: 'email', placeholder: 'contact@example.com' })}
                {textInput('Phone', 'phone', { placeholder: '555-0100' })}
              </div>

              {/* Address */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Address (optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {textInput('Address Line 1', 'addressLine1', { placeholder: '123 Main St' })}
                  {textInput('Address Line 2', 'addressLine2', { placeholder: 'Suite 100' })}
                  {textInput('City', 'city')}
                  <div className="grid grid-cols-2 gap-2">
                    {textInput('State', 'state', { placeholder: 'TX' })}
                    {textInput('ZIP', 'postalCode', { placeholder: '77001' })}
                  </div>
                  {textInput('Country', 'country')}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none"
                  placeholder="Internal notes about this customer"
                />
              </div>

              {/* Default overheads */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Default Overheads
                  <span className="ml-1 font-normal normal-case text-gray-400">(prefill new quotes — leave blank to use project defaults)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Labor Rate ($/lb)</label>
                    <input
                      type="number" min={0} step={0.01}
                      value={form.defaultLaborRate}
                      onChange={(e) => setField('defaultLaborRate', e.target.value)}
                      placeholder="e.g. 1.25"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Overhead %</label>
                    <input
                      type="number" min={0} step={0.1}
                      value={form.defaultOverheadPct}
                      onChange={(e) => setField('defaultOverheadPct', e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Profit %</label>
                    <input
                      type="number" min={0} step={0.1}
                      value={form.defaultProfitPct}
                      onChange={(e) => setField('defaultProfitPct', e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Commission %</label>
                    <input
                      type="number" min={0} step={0.1}
                      value={form.defaultCommissionPct}
                      onChange={(e) => setField('defaultCommissionPct', e.target.value)}
                      placeholder="e.g. 4"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Form error */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : editingId != null ? 'Save Changes' : 'Create Customer'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation Modal ---- */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Delete {deleteConfirm.customer.name}?
            </h2>

            {deleteConfirm.customer.quoteCount > 0 ? (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  This customer has{' '}
                  <strong>{deleteConfirm.customer.quoteCount} quote{deleteConfirm.customer.quoteCount !== 1 ? 's' : ''}</strong>.
                  Deleting will unlink those quotes (they won't be deleted, but the customer reference will be cleared).
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteConfirm.force}
                    onChange={(e) =>
                      setDeleteConfirm((d) => d ? { ...d, force: e.target.checked } : d)
                    }
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-sm text-gray-700">
                    I understand — unlink quotes and delete this customer
                  </span>
                </label>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                This cannot be undone.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => void confirmDelete()}
                disabled={
                  deleting ||
                  (deleteConfirm.customer.quoteCount > 0 && !deleteConfirm.force)
                }
                className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
