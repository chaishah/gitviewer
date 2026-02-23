'use client';

import { Home, ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
  repoName: string;
  path: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ repoName, path, onNavigate }: BreadcrumbProps) {
  const parts = path ? path.split('/').filter(Boolean) : [];

  return (
    <nav className="flex items-center gap-0.5 text-sm flex-wrap">
      <button
        onClick={() => onNavigate('')}
        className="flex items-center gap-1 text-[#58a6ff] hover:underline px-1 py-0.5 rounded hover:bg-[#21262d] transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>{repoName}</span>
      </button>

      {parts.map((part, i) => {
        const partPath = parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        return (
          <span key={partPath} className="flex items-center gap-0.5">
            <ChevronRight className="w-3.5 h-3.5 text-[#484f58]" />
            {isLast ? (
              <span className="text-[#e6edf3] px-1 py-0.5">{part}</span>
            ) : (
              <button
                onClick={() => onNavigate(partPath)}
                className="text-[#58a6ff] hover:underline px-1 py-0.5 rounded hover:bg-[#21262d] transition-colors"
              >
                {part}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
