import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiListCustomers, type Customer } from '../api';

export interface CustomerPickerProps {
  /** Controlled value — the customer name text */
  value: string;
  /** Currently linked customer ID (shows a badge when set) */
  customerId?: number | null;
  className?: string;
  /** Called on every keystroke for plain-text edits (clears customerId in parent) */
  onChangeName: (name: string) => void;
  /** Called when user picks a customer from the dropdown */
  onSelect: (customer: Customer) => void;
}

/** Debounced customer search combobox with "+ New Customer" shortcut. */
export default function CustomerPicker({
  value,
  customerId,
  className = '',
  onChangeName,
  onSelect,
}: CustomerPickerProps) {
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    onChangeName(q); // text-only edit clears customerId in parent
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await apiListCustomers(q);
        setResults(list);
        setOpen(true);
      } catch {
        // ignore search errors silently
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(customer: Customer) {
    setOpen(false);
    setResults([]);
    onSelect(customer);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          placeholder="Customer"
          value={value}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm pr-6"
          autoComplete="off"
        />
        {customerId != null && (
          <span
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"
            title="Linked to customer record"
          />
        )}
        {loading && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg text-sm max-h-48 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-gray-400 text-xs">No results</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onPointerDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-baseline gap-2"
              >
                <span className="font-medium truncate">{c.name}</span>
                {c.company && (
                  <span className="text-gray-400 text-xs truncate">{c.company}</span>
                )}
                {c.quoteCount > 0 && (
                  <span className="ml-auto text-xs text-gray-400 shrink-0">
                    {c.quoteCount} quote{c.quoteCount !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            ))
          )}
          <div className="border-t border-gray-100 px-3 py-1.5">
            <Link
              to="/customers"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => setOpen(false)}
            >
              + New Customer
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
