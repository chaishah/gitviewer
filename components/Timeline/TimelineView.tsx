'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import {
  GitCommit, GitPullRequest, Tag, ExternalLink,
  Search, Filter, ChevronDown, Loader2
} from 'lucide-react';
import type { TimelineEvent, EventType } from '@/lib/types';
import { TimelineSkeleton } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/ErrorState';

interface TimelineViewProps {
  repoFullName: string;
}

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  commit: <GitCommit className="w-4 h-4" />,
  pr: <GitPullRequest className="w-4 h-4" />,
  release: <Tag className="w-4 h-4" />,
};

const EVENT_COLORS: Record<EventType, string> = {
  commit: '#3fb950',
  pr: '#a371f7',
  release: '#e3b341',
};

const PR_STATE_COLORS: Record<string, string> = {
  open: '#3fb950',
  merged: '#a371f7',
  closed: '#f85149',
};

function EventIcon({ event }: { event: TimelineEvent }) {
  const color = event.type === 'pr' && event.prState
    ? PR_STATE_COLORS[event.prState]
    : EVENT_COLORS[event.type];

  return (
    <div
      className="flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0"
      style={{ color, borderColor: color, backgroundColor: `${color}18` }}
    >
      {EVENT_ICONS[event.type]}
    </div>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const date = parseISO(event.date);

  return (
    <div className="group flex gap-3 p-3 sm:p-4 bg-[#161b22] hover:bg-[#1c2128] border border-[#21262d] hover:border-[#30363d] rounded-lg transition-all animate-fade-in cursor-pointer"
      onClick={() => event.description && setExpanded(!expanded)}
    >
      <EventIcon event={event} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded uppercase tracking-wide"
                style={{
                  color: event.type === 'pr' && event.prState
                    ? PR_STATE_COLORS[event.prState]
                    : EVENT_COLORS[event.type],
                  backgroundColor: `${event.type === 'pr' && event.prState
                    ? PR_STATE_COLORS[event.prState]
                    : EVENT_COLORS[event.type]}18`,
                }}
              >
                {event.type === 'pr'
                  ? `PR ${event.prState}`
                  : event.type === 'release' && event.isPrerelease
                  ? 'Pre-release'
                  : event.type}
              </span>
              {event.sha && (
                <code className="text-xs text-[#8b949e] font-mono">{event.sha}</code>
              )}
              {event.tagName && (
                <code className="text-xs text-[#8b949e] font-mono">{event.tagName}</code>
              )}
              {event.prNumber && (
                <span className="text-xs text-[#8b949e]">#{event.prNumber}</span>
              )}
            </div>

            {/* Title */}
            <p className="text-sm text-[#e6edf3] font-medium leading-snug truncate pr-2">
              {event.title}
            </p>

            {/* Author + time */}
            <div className="flex items-center gap-2 mt-1">
              {event.authorAvatar && (
                <img
                  src={event.authorAvatar}
                  alt={event.author}
                  className="w-4 h-4 rounded-full"
                />
              )}
              <span className="text-xs text-[#8b949e]">{event.author}</span>
              <span className="text-[#484f58] text-xs">·</span>
              <time
                className="text-xs text-[#8b949e]"
                title={format(date, 'PPPp')}
              >
                {format(date, 'MMM d, yyyy')}
              </time>
            </div>

            {/* Expanded description */}
            {expanded && event.description && (
              <div className="mt-2 text-xs text-[#8b949e] bg-[#0d1117] rounded p-2 border border-[#21262d] whitespace-pre-wrap max-h-32 overflow-y-auto">
                {event.description}
              </div>
            )}
          </div>

          {/* Open link */}
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 p-1.5 rounded text-[#484f58] hover:text-[#58a6ff] hover:bg-[#21262d] transition-colors opacity-0 group-hover:opacity-100"
            title="Open on GitHub"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function TimelineView({ repoFullName }: TimelineViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchEvents = useCallback(async (p: number, append = false) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const res = await fetch(`/api/timeline?repo=${encodeURIComponent(repoFullName)}&page=${p}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to load timeline');
        setRateLimited(data.rateLimited ?? false);
        return;
      }

      const newEvents: TimelineEvent[] = data.events ?? [];
      if (newEvents.length < 10) setHasMore(false);

      setEvents((prev) => append ? [...prev, ...newEvents] : newEvents);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [repoFullName]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchEvents(1, false);
  }, [fetchEvents]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.title.toLowerCase().includes(q) &&
          !e.author.toLowerCase().includes(q)
        ) return false;
      }
      if (dateFrom) {
        try {
          if (isBefore(parseISO(e.date), parseISO(dateFrom))) return false;
        } catch { /* ignore */ }
      }
      if (dateTo) {
        try {
          if (isAfter(parseISO(e.date), parseISO(dateTo))) return false;
        } catch { /* ignore */ }
      }
      return true;
    });
  }, [events, typeFilter, search, dateFrom, dateTo]);

  if (loading) return <TimelineSkeleton />;
  if (error) return <ErrorState message={error} rateLimited={rateLimited} onRetry={() => fetchEvents(1)} />;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#484f58]" />
            <input
              type="text"
              placeholder="Search by title or author…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showFilters || dateFrom || dateTo
                ? 'bg-[#1f2d3d] border-[#58a6ff] text-[#58a6ff]'
                : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#484f58]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'commit', 'pr', 'release'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                typeFilter === t
                  ? 'bg-[#58a6ff] text-[#0d1117]'
                  : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'
              }`}
            >
              {t === 'all' ? 'All events' : t === 'pr' ? 'Pull Requests' : t === 'release' ? 'Releases' : 'Commits'}
              {t !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({events.filter((e) => e.type === t).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Date range */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 items-center bg-[#161b22] border border-[#30363d] rounded-lg p-3 animate-fade-in">
            <span className="text-xs text-[#8b949e] font-medium">Date range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
              />
              <span className="text-[#484f58] text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-[#f85149] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Events */}
      {filtered.length === 0 ? (
        <EmptyState message={search || typeFilter !== 'all' || dateFrom || dateTo
          ? 'No events match your filters.'
          : 'No events found in this repository.'
        } />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[#484f58]">
            Showing {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            {events.length !== filtered.length && ` (filtered from ${events.length})`}
          </p>
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-lg text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading more…
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Load more events
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
