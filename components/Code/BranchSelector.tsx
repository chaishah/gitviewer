'use client';

import { useState, useRef, useEffect } from 'react';
import { GitBranch, ChevronDown, Search, Check } from 'lucide-react';
import type { BranchInfo } from '@/lib/types';

interface BranchSelectorProps {
  branches: BranchInfo[];
  selected: string;
  total: number;
  onChange: (branch: string) => void;
}

export function BranchSelector({ branches, selected, total, onChange }: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] transition-colors min-w-[160px] max-w-[240px]"
      >
        <GitBranch className="w-4 h-4 text-[#8b949e] shrink-0" />
        <span className="truncate flex-1 text-left">{selected}</span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-[#484f58] bg-[#161b22] px-1.5 py-0.5 rounded-full">
            {total}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#484f58] transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* Search */}
          <div className="p-2 border-b border-[#21262d]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" />
              <input
                type="text"
                placeholder="Find a branch…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-8 py-1.5 text-xs text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>

          {/* Branch list */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#484f58]">No branches found</div>
            ) : (
              filtered.map((b) => (
                <button
                  key={b.name}
                  onClick={() => { onChange(b.name); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#21262d] transition-colors text-left"
                >
                  <Check
                    className={`w-4 h-4 shrink-0 ${b.name === selected ? 'text-[#58a6ff]' : 'opacity-0'}`}
                  />
                  <span className={`truncate ${b.name === selected ? 'text-[#58a6ff]' : 'text-[#e6edf3]'}`}>
                    {b.name}
                  </span>
                  {b.isDefault && (
                    <span className="ml-auto text-xs bg-[#21262d] text-[#8b949e] px-1.5 py-0.5 rounded shrink-0">
                      default
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
