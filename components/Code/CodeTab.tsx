'use client';

import { useState, useEffect } from 'react';
import { GitBranch, Loader2 } from 'lucide-react';
import type { BranchesResponse } from '@/lib/types';
import { BranchSelector } from './BranchSelector';
import { TreeView } from './TreeView';
import { ErrorState } from '@/components/ui/ErrorState';

interface CodeTabProps {
  repoFullName: string;
  defaultBranch: string;
}

export function CodeTab({ repoFullName, defaultBranch }: CodeTabProps) {
  const [branchData, setBranchData] = useState<BranchesResponse | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/branches?repo=${encodeURIComponent(repoFullName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setRateLimited(data.rateLimited ?? false);
        } else {
          setBranchData(data);
          setSelectedBranch(data.defaultBranch ?? defaultBranch);
        }
      })
      .catch(() => setError('Failed to load branches.'))
      .finally(() => setLoading(false));
  }, [repoFullName, defaultBranch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-[#8b949e]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading branches…</span>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} rateLimited={rateLimited} />;
  }

  return (
    <div className="space-y-4">
      {/* Branch selector + stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {branchData && (
          <BranchSelector
            branches={branchData.branches}
            selected={selectedBranch}
            total={branchData.total}
            onChange={setSelectedBranch}
          />
        )}

        {branchData && (
          <div className="flex items-center gap-2 text-sm text-[#8b949e] bg-[#161b22] border border-[#21262d] rounded-lg px-3 py-2">
            <GitBranch className="w-4 h-4 text-[#3fb950]" />
            <span>
              <span className="text-[#e6edf3] font-semibold">{branchData.total}</span>
              {' '}branch{branchData.total !== 1 ? 'es' : ''} total
            </span>
          </div>
        )}
      </div>

      {/* Tree view */}
      <TreeView
        key={selectedBranch}
        repoFullName={repoFullName}
        branch={selectedBranch}
      />
    </div>
  );
}
