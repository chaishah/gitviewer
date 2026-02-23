'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Folder, FolderOpen, File, FileText, FileCode,
  ChevronRight, Loader2, ExternalLink
} from 'lucide-react';
import type { TreeItem } from '@/lib/types';
import { TreeSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Breadcrumb } from './Breadcrumb';
import { FilePreview } from './FilePreview';

interface TreeViewProps {
  repoFullName: string;
  branch: string;
}

const CODE_EXTS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'cpp', 'c', 'cs',
  'php', 'swift', 'kt', 'sh', 'bash', 'yaml', 'yml', 'json', 'toml', 'md',
  'mdx', 'html', 'css', 'scss', 'sql', 'xml', 'graphql', 'gql', 'tf',
]);

const TEXT_EXTS = new Set([
  'txt', 'log', 'env', 'gitignore', 'gitattributes', 'editorconfig',
  'dockerfile', 'makefile', 'license', 'readme',
]);

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const lower = name.toLowerCase();

  if (CODE_EXTS.has(ext)) return <FileCode className="w-4 h-4 text-[#58a6ff]" />;
  if (TEXT_EXTS.has(ext) || TEXT_EXTS.has(lower)) return <FileText className="w-4 h-4 text-[#8b949e]" />;
  return <File className="w-4 h-4 text-[#8b949e]" />;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function isPreviewable(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const lower = name.toLowerCase();
  return CODE_EXTS.has(ext) || TEXT_EXTS.has(ext) || TEXT_EXTS.has(lower);
}

interface TreeRowProps {
  item: TreeItem;
  repoFullName: string;
  branch: string;
  onFolderClick: (path: string) => void;
  onFileClick: (item: TreeItem) => void;
}

function TreeRow({ item, repoFullName, branch, onFolderClick, onFileClick }: TreeRowProps) {
  const isDir = item.type === 'tree';
  const canPreview = !isDir && isPreviewable(item.name);
  const githubUrl = `https://github.com/${repoFullName}/${isDir ? 'tree' : 'blob'}/${branch}/${item.path}`;

  function handleClick() {
    if (isDir) onFolderClick(item.path);
    else if (canPreview) onFileClick(item);
  }

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 hover:bg-[#161b22] border-b border-[#21262d] last:border-0 transition-colors ${
        isDir || canPreview ? 'cursor-pointer' : ''
      }`}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className="shrink-0">
        {isDir ? (
          <Folder className="w-4 h-4 text-[#e3b341]" />
        ) : (
          getFileIcon(item.name)
        )}
      </div>

      {/* Name */}
      <span className={`flex-1 text-sm truncate ${
        isDir ? 'text-[#58a6ff] font-medium' : canPreview ? 'text-[#e6edf3]' : 'text-[#8b949e]'
      }`}>
        {item.name}
      </span>

      {/* Size */}
      {!isDir && item.size !== undefined && (
        <span className="text-xs text-[#484f58] shrink-0 hidden sm:block">
          {formatSize(item.size)}
        </span>
      )}

      {/* Chevron for dirs */}
      {isDir && (
        <ChevronRight className="w-3.5 h-3.5 text-[#484f58] shrink-0 group-hover:text-[#8b949e] transition-colors" />
      )}

      {/* GitHub link */}
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-[#484f58] hover:text-[#58a6ff] transition-all"
        title="Open on GitHub"
      >
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

export function TreeView({ repoFullName, branch }: TreeViewProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<TreeItem | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const loadPath = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    setRateLimited(false);

    try {
      const res = await fetch(
        `/api/tree?repo=${encodeURIComponent(repoFullName)}&ref=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to load directory');
        setRateLimited(data.rateLimited ?? false);
        return;
      }

      setItems(data.items ?? []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [repoFullName, branch]);

  useEffect(() => {
    setCurrentPath('');
    loadPath('');
  }, [branch, loadPath]);

  function navigateTo(path: string) {
    setCurrentPath(path);
    loadPath(path);
  }

  const repoName = repoFullName.split('/')[1];

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <Breadcrumb
        repoName={repoName}
        path={currentPath}
        onNavigate={navigateTo}
      />

      {/* Tree */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-2">
            <TreeSkeleton />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} rateLimited={rateLimited} onRetry={() => loadPath(currentPath)} />
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#484f58]">
            This directory is empty.
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <TreeRow
                key={item.sha + item.path}
                item={item}
                repoFullName={repoFullName}
                branch={branch}
                onFolderClick={navigateTo}
                onFileClick={setPreviewFile}
              />
            ))}
          </div>
        )}
      </div>

      {/* File preview modal */}
      {previewFile && (
        <FilePreview
          repoFullName={repoFullName}
          branch={branch}
          path={previewFile.path}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
