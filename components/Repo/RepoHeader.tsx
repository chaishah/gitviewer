'use client';

import { Star, GitFork, Eye, ExternalLink, Code2, Globe } from 'lucide-react';
import type { RepoInfo } from '@/lib/types';

interface RepoHeaderProps {
  repo: RepoInfo;
  branchCount?: number;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function RepoHeader({ repo, branchCount }: RepoHeaderProps) {
  const [owner, repoName] = repo.fullName.split('/');

  return (
    <div className="border-b border-[#30363d] px-4 sm:px-6 py-5 bg-[#161b22]">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm mb-3">
          <Code2 className="w-4 h-4 text-[#8b949e]" />
          <a
            href={`https://github.com/${owner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#58a6ff] hover:underline"
          >
            {owner}
          </a>
          <span className="text-[#8b949e]">/</span>
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#58a6ff] hover:underline font-semibold"
          >
            {repoName}
          </a>
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-[#484f58] hover:text-[#8b949e]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Description */}
        {repo.description && (
          <p className="text-[#8b949e] text-sm mb-3 max-w-2xl">{repo.description}</p>
        )}

        {/* Topics */}
        {repo.topics && repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {repo.topics.slice(0, 8).map((topic) => (
              <span
                key={topic}
                className="px-2.5 py-0.5 bg-[#1f2d3d] text-[#58a6ff] text-xs rounded-full border border-[#1f4073]"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-[#8b949e]">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4" />
            <span className="text-[#e6edf3] font-medium">{formatNumber(repo.stars)}</span>
            <span>stars</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitFork className="w-4 h-4" />
            <span className="text-[#e6edf3] font-medium">{formatNumber(repo.forks)}</span>
            <span>forks</span>
          </div>
          {branchCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span className="text-[#e6edf3] font-medium">{branchCount}</span>
              <span>branch{branchCount !== 1 ? 'es' : ''}</span>
            </div>
          )}
          {repo.language && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#58a6ff]" />
              <span>{repo.language}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
