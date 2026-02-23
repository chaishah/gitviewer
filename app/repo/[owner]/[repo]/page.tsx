'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Code2, Loader2, Github } from 'lucide-react';
import type { RepoInfo, BranchesResponse } from '@/lib/types';
import { RepoHeader } from '@/components/Repo/RepoHeader';
import { TimelineView } from '@/components/Timeline/TimelineView';
import { CodeTab } from '@/components/Code/CodeTab';
import { ErrorState } from '@/components/ui/ErrorState';
import { RepoHeaderSkeleton } from '@/components/ui/Skeleton';

type Tab = 'timeline' | 'code';

interface PageParams {
  owner: string;
  repo: string;
}

export default function RepoPage({ params }: { params: Promise<PageParams> }) {
  const { owner, repo } = use(params);
  const repoFullName = `${owner}/${repo}`;

  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [branchCount, setBranchCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('timeline');

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch repo info
    fetch(`/api/repo?repo=${encodeURIComponent(repoFullName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setRateLimited(data.rateLimited ?? false);
        } else {
          setRepoInfo(data);
        }
      })
      .catch(() => setError('Failed to load repository info.'))
      .finally(() => setLoading(false));

    // Fetch branch count separately (non-blocking)
    fetch(`/api/branches?repo=${encodeURIComponent(repoFullName)}`)
      .then((r) => r.json())
      .then((data: BranchesResponse & { error?: string }) => {
        if (!data.error) setBranchCount(data.total);
      })
      .catch(() => {});
  }, [repoFullName]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
    { id: 'code', label: 'Code', icon: <Code2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Top nav */}
      <nav className="border-b border-[#30363d] px-4 py-3 bg-[#161b22] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#8b949e] hover:text-[#e6edf3] text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="flex items-center gap-2 text-sm font-medium">
            <Github className="w-4 h-4 text-[#8b949e]" />
            <span className="text-[#8b949e]">{owner}</span>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#e6edf3]">{repo}</span>
          </div>
        </div>
      </nav>

      {/* Repo header */}
      {loading ? (
        <div className="border-b border-[#30363d] px-4 sm:px-6 py-5 bg-[#161b22]">
          <div className="max-w-6xl mx-auto">
            <RepoHeaderSkeleton />
          </div>
        </div>
      ) : error ? (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <ErrorState message={error} rateLimited={rateLimited} />
        </div>
      ) : repoInfo ? (
        <RepoHeader repo={repoInfo} branchCount={branchCount} />
      ) : null}

      {!error && (
        <>
          {/* Tab bar */}
          <div className="border-b border-[#30363d] bg-[#161b22] px-4 sm:px-6">
            <div className="max-w-6xl mx-auto flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.id
                      ? 'border-[#f78166] text-[#e6edf3]'
                      : 'border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:border-[#484f58]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[#8b949e]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : (
              <>
                {activeTab === 'timeline' && (
                  <div className="animate-fade-in">
                    <TimelineView repoFullName={repoFullName} />
                  </div>
                )}
                {activeTab === 'code' && repoInfo && (
                  <div className="animate-fade-in">
                    <CodeTab
                      repoFullName={repoFullName}
                      defaultBranch={repoInfo.defaultBranch}
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </>
      )}
    </div>
  );
}
