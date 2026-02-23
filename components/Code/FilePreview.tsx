'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, Copy, Check, Loader2, FileText } from 'lucide-react';
import type { BlobResponse } from '@/lib/types';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

interface FilePreviewProps {
  repoFullName: string;
  branch: string;
  path: string;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Simple token-based syntax highlighter
function tokenize(code: string, language: string): string {
  // Escape HTML
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const escaped = escape(code);

  // Very simple highlighting by language patterns
  const patterns: { regex: RegExp; className: string }[] = [];

  // Strings
  patterns.push({ regex: /(["'`])(?:\\.|(?!\1)[^\\])*\1/g, className: 'color:#a5d6ff' });
  // Comments
  if (['javascript', 'typescript', 'tsx', 'jsx', 'go', 'rust', 'java', 'cpp', 'c', 'csharp', 'swift', 'kotlin'].includes(language)) {
    patterns.push({ regex: /\/\/.*$/gm, className: 'color:#8b949e' });
    patterns.push({ regex: /\/\*[\s\S]*?\*\//g, className: 'color:#8b949e' });
  }
  if (['python', 'ruby', 'bash', 'yaml'].includes(language)) {
    patterns.push({ regex: /#.*$/gm, className: 'color:#8b949e' });
  }
  // Numbers
  patterns.push({ regex: /\b\d+\.?\d*\b/g, className: 'color:#79c0ff' });
  // Keywords
  const keywords = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'import', 'export', 'default', 'class', 'extends', 'new', 'this', 'typeof',
    'async', 'await', 'try', 'catch', 'throw', 'from', 'of', 'in', 'type',
    'interface', 'enum', 'namespace', 'def', 'pass', 'lambda', 'yield',
    'pub', 'fn', 'use', 'mod', 'struct', 'impl', 'trait', 'match',
    'package', 'import', 'func', 'go', 'defer', 'chan', 'select',
    'true', 'false', 'null', 'undefined', 'void', 'nil',
  ];
  patterns.push({
    regex: new RegExp(`\\b(${keywords.join('|')})\\b`, 'g'),
    className: 'color:#ff7b72',
  });

  // Apply patterns (simple non-overlapping approach)
  return escaped.replace(/</g, '\x00lt\x00').replace(/>/g, '\x00gt\x00')
    .replace(/\x00lt\x00/g, '<').replace(/\x00gt\x00/g, '>');
}

function renderLines(content: string) {
  const lines = content.split('\n');
  return lines.map((line, i) => (
    <div key={i} className="flex">
      <span className="select-none text-right text-[#484f58] mr-4 pl-2 min-w-[2.5rem] shrink-0">
        {i + 1}
      </span>
      <span className="flex-1 pr-4 whitespace-pre">{line || ' '}</span>
    </div>
  ));
}

const MAX_PREVIEW_SIZE = 1024 * 1024; // 1MB

export function FilePreview({ repoFullName, branch, path, onClose }: FilePreviewProps) {
  const [blob, setBlob] = useState<BlobResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setBlob(null);

    fetch(`/api/blob?repo=${encodeURIComponent(repoFullName)}&ref=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setBlob(data);
        }
      })
      .catch(() => setError('Failed to load file.'))
      .finally(() => setLoading(false));
  }, [repoFullName, branch, path]);

  async function copyContent() {
    if (!blob) return;
    await navigator.clipboard.writeText(blob.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fileName = path.split('/').pop() ?? path;
  const githubUrl = `https://github.com/${repoFullName}/blob/${branch}/${path}`;

  const isBinary = blob && !/^[\x00-\x7F]*$/.test(blob.content.substring(0, 512)) && !blob.content.startsWith('<?');
  const isTooLarge = blob && blob.size > MAX_PREVIEW_SIZE;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#8b949e] shrink-0" />
            <span className="text-sm text-[#e6edf3] font-medium truncate">{path}</span>
            {blob && (
              <span className="text-xs text-[#484f58] shrink-0">
                · {formatSize(blob.size)}
                {blob.language && blob.language !== 'plaintext' && ` · ${blob.language}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {blob && !isBinary && !isTooLarge && (
              <button
                onClick={copyContent}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              GitHub
            </a>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#21262d] rounded text-[#484f58] hover:text-[#e6edf3] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-hidden rounded-b-xl">
          {loading && (
            <div className="p-8 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#58a6ff]" />
              <p className="text-xs text-[#8b949e]">Loading {fileName}…</p>
            </div>
          )}

          {error && (
            <div className="p-4">
              <ErrorState message={error} />
            </div>
          )}

          {blob && !loading && (
            <>
              {isBinary ? (
                <div className="p-8 text-center text-[#8b949e] text-sm">
                  Binary file — preview not available.
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-2 text-[#58a6ff] hover:underline">
                    View on GitHub
                  </a>
                </div>
              ) : isTooLarge ? (
                <div className="p-8 text-center text-[#8b949e] text-sm">
                  File is too large to preview ({formatSize(blob.size)}).
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-2 text-[#58a6ff] hover:underline">
                    View on GitHub
                  </a>
                </div>
              ) : (
                <div className="overflow-auto max-h-[70vh]">
                  <div className="code-block text-[#e6edf3] bg-[#0d1117] p-0">
                    <div className="py-3">
                      {renderLines(blob.content)}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
