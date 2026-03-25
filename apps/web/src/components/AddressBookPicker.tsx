import { useState, useMemo } from 'react';
import { useAddressBookStore, type AddressBookEntry } from '@gravytos/state';

interface AddressBookPickerProps {
  chainFamily: 'bitcoin' | 'evm' | 'solana';
  onSelect: (address: string) => void;
  onClose: () => void;
}

export function AddressBookPicker({ chainFamily, onSelect, onClose }: AddressBookPickerProps) {
  const [search, setSearch] = useState('');
  const entries = useAddressBookStore((s) => s.entries);
  const markUsed = useAddressBookStore((s) => s.markUsed);

  const filtered = useMemo(() => {
    let list = entries.filter(e => e.chainFamily === chainFamily);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.label.toLowerCase().includes(q) || e.address.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  }, [entries, chainFamily, search]);

  const handleSelect = (entry: AddressBookEntry) => {
    markUsed(entry.id);
    onSelect(entry.address);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="glass-card max-w-md w-full mx-4 p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-light text-white">Address Book</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl">&times;</button>
        </div>

        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm font-light focus:border-purple-500/50 focus:outline-none mb-4"
        />

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {filtered.map(entry => (
            <button
              key={entry.id}
              onClick={() => handleSelect(entry)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-xs font-semibold text-white/70">
                {entry.label.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/90">{entry.label}</div>
                <div className="text-xs text-white/30 font-mono truncate">{entry.address}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-white/20 text-sm font-light">
              {entries.length === 0 ? 'No saved addresses' : 'No matches'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
