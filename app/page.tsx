'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { parseRepoUrl } from '@/lib/github';
import { GitBranch, Search, Github, ExternalLink, Star, Clock } from 'lucide-react';

const EXAMPLE_REPOS = [
  { label: 'facebook/react', desc: 'The React library' },
  { label: 'vercel/next.js', desc: 'The Next.js framework' },
  { label: 'tailwindlabs/tailwindcss', desc: 'Tailwind CSS' },
  { label: 'microsoft/vscode', desc: 'VS Code editor' },
  { label: 'torvalds/linux', desc: 'Linux kernel' },
  { label: 'openai/openai-python', desc: 'OpenAI Python SDK' },
];

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!input.trim()) {
      setError('Please enter a GitHub repository URL or owner/repo.');
      return;
    }
    const parsed = parseRepoUrl(input.trim());
    if (!parsed) {
      setError('Invalid GitHub URL. Try formats like "owner/repo" or "https://github.com/owner/repo".');
      return;
    }
    router.push(`/repo/${parsed.owner}/${parsed.repo}`);
  }

  function handleExample(label: string) {
    setInput(label);
    setError('');
    const parsed = parseRepoUrl(label);
    if (parsed) router.push(`/repo/${parsed.owner}/${parsed.repo}`);
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#30363d] px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <Github className="w-6 h-6" />
            <span>GitViewer</span>
          </div>
          <span className="text-[#8b949e] text-sm">Explore public repositories</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-2xl w-full space-y-8">
          {/* Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-full px-4 py-1.5 text-sm text-[#8b949e] mb-2">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              No login required · Public repos only
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Explore any GitHub repo
              <br />
              <span className="text-[#58a6ff]">instantly</span>
            </h1>
            <p className="text-[#8b949e] text-lg">
              Interactive timeline, branch explorer, and file tree viewer
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-[#8b949e]" />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(''); }}
                placeholder="github.com/owner/repo or owner/repo"
                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-12 pr-4 py-4 text-[#e6edf3] placeholder-[#484f58] text-base focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-colors"
              />
            </div>

            {error && (
              <p className="text-[#f85149] text-sm pl-1 animate-fade-in">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Explore Repository
            </button>
          </form>

          {/* Example repos */}
          <div>
            <p className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider mb-3">
              Try an example
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_REPOS.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => handleExample(ex.label)}
                  className="flex items-center gap-3 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff] rounded-lg px-4 py-3 text-left transition-all group"
                >
                  <GitBranch className="w-4 h-4 text-[#8b949e] group-hover:text-[#58a6ff] shrink-0" />
                  <div>
                    <div className="text-sm text-[#e6edf3] font-medium">{ex.label}</div>
                    <div className="text-xs text-[#8b949e]">{ex.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#21262d]">
            {[
              { icon: Clock, label: 'Timeline', desc: 'Commits, PRs, releases' },
              { icon: GitBranch, label: 'Branches', desc: 'All branches at a glance' },
              { icon: Search, label: 'Code Tree', desc: 'Browse & preview files' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-center space-y-1.5">
                <div className="flex justify-center">
                  <Icon className="w-5 h-5 text-[#58a6ff]" />
                </div>
                <div className="text-sm font-medium text-[#e6edf3]">{label}</div>
                <div className="text-xs text-[#8b949e]">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#21262d] py-4 text-center text-xs text-[#484f58]">
        Uses the GitHub REST API · No authentication required ·
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#8b949e] ml-1"
        >
          github.com
        </a>
      </footer>
    </div>
  );
}
