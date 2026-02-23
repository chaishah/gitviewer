'use client';

import { useEffect, useState } from 'react';
import { GitBranch, GitMerge } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  authorAvatar: string | null;
  date: string;
  parents: string[];
  refs: string[];
}

interface CommitNode {
  commit: GraphCommit;
  row: number;
  lane: number;
  color: string;
}

interface Edge {
  fromRow: number;
  fromLane: number;
  toRow: number;
  toLane: number;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LANE_COLORS = [
  '#58a6ff', // blue
  '#bc8cff', // purple
  '#3fb950', // green
  '#f78166', // red-orange
  '#ffa657', // orange
  '#79c0ff', // sky
  '#ff7b72', // coral
  '#d2a8ff', // lavender
];

const ROW_H = 40;
const LANE_W = 18;
const DOT_R = 5;
const PAD = 10;

// ─── Layout algorithm ─────────────────────────────────────────────────────────
// Classic git-graph lane assignment: process commits newest→oldest,
// each lane "reserves" the SHA it's waiting for next.

function computeLayout(commits: GraphCommit[]): { nodes: CommitNode[]; edges: Edge[] } {
  const nodes: CommitNode[] = [];
  const edges: Edge[] = [];
  // lanes[i] = SHA this lane is waiting for, or null if the lane is free
  const lanes: (string | null)[] = [];
  const shaToRow = new Map<string, number>();
  const shaToLane = new Map<string, number>();

  function laneOf(sha: string) {
    return lanes.indexOf(sha);
  }
  function freeLane() {
    const i = lanes.indexOf(null);
    if (i !== -1) return i;
    lanes.push(null);
    return lanes.length - 1;
  }

  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row];

    // Find the lane already expecting this commit, or open a new one
    let lane = laneOf(commit.sha);
    if (lane === -1) lane = freeLane();

    lanes[lane] = null; // consume the reservation
    shaToRow.set(commit.sha, row);
    shaToLane.set(commit.sha, lane);

    if (commit.parents.length > 0) {
      const firstParent = commit.parents[0];
      if (laneOf(firstParent) !== -1) {
        // Another lane already tracks the first parent → free our lane;
        // the edge will still merge into the right lane visually
        lanes[lane] = null;
      } else {
        lanes[lane] = firstParent; // continue this lane toward the parent
      }

      // Additional parents (merge commits) get their own lanes if unclaimed
      for (let i = 1; i < commit.parents.length; i++) {
        if (laneOf(commit.parents[i]) === -1) {
          const nl = freeLane();
          lanes[nl] = commit.parents[i];
        }
      }
    }

    nodes.push({ commit, row, lane, color: LANE_COLORS[lane % LANE_COLORS.length] });
  }

  // Build edges now that every commit has a definite row + lane
  for (const node of nodes) {
    for (const parentSha of node.commit.parents) {
      const pRow = shaToRow.get(parentSha);
      const pLane = shaToLane.get(parentSha);
      if (pRow !== undefined && pLane !== undefined) {
        edges.push({
          fromRow: node.row,
          fromLane: node.lane,
          toRow: pRow,
          toLane: pLane,
          color: node.color,
        });
      }
    }
  }

  return { nodes, edges };
}

// ─── SVG path helper ──────────────────────────────────────────────────────────

function edgePath(e: Edge): string {
  const x1 = PAD + e.fromLane * LANE_W + LANE_W / 2;
  const y1 = e.fromRow * ROW_H + ROW_H / 2;
  const x2 = PAD + e.toLane * LANE_W + LANE_W / 2;
  const y2 = e.toRow * ROW_H + ROW_H / 2;

  if (e.fromLane === e.toLane) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  // S-curve: both control points sit at the vertical midpoint
  const mid = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CommitGraphProps {
  repo: string;
}

export default function CommitGraph({ repo }: CommitGraphProps) {
  const [commits, setCommits] = useState<GraphCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/graph?repo=${encodeURIComponent(repo)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCommits(data.commits ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repo]);

  // ── Loading / error / empty states ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-[#8b949e]">
        <div className="w-5 h-5 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Building commit graph…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[#f78166] text-sm">{error}</p>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="text-center py-20 text-[#8b949e] text-sm">No commits found.</div>
    );
  }

  // ── Layout ──────────────────────────────────────────────────────────────────
  const { nodes, edges } = computeLayout(commits);
  const maxLane = nodes.length > 0 ? Math.max(...nodes.map((n) => n.lane)) : 0;
  const svgW = PAD * 2 + (maxLane + 1) * LANE_W;
  const svgH = nodes.length * ROW_H;

  function cx(lane: number) {
    return PAD + lane * LANE_W + LANE_W / 2;
  }
  function cy(row: number) {
    return row * ROW_H + ROW_H / 2;
  }

  const mergeCommits = new Set(
    commits.filter((c) => c.parents.length > 1).map((c) => c.sha)
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="border border-[#30363d] rounded-lg overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] text-xs text-[#8b949e]">
        <GitBranch className="w-3.5 h-3.5" />
        <span>{commits.length} commits</span>
        <span className="text-[#484f58]">·</span>
        <span>scroll to explore</span>
      </div>

      {/* Column headers */}
      <div
        className="flex items-center bg-[#161b22] border-b border-[#21262d] text-xs text-[#484f58] select-none"
        style={{ paddingLeft: svgW }}
      >
        <span className="flex-1 px-3 py-1.5">Message</span>
        <span className="w-28 px-3 py-1.5 hidden sm:block">Author</span>
        <span className="w-28 px-3 py-1.5 hidden md:block">When</span>
        <span className="w-16 px-3 py-1.5">SHA</span>
      </div>

      {/* Scrollable graph body */}
      <div className="overflow-auto bg-[#0d1117]" style={{ maxHeight: '68vh' }}>
        <div className="flex" style={{ minWidth: 'max-content', width: '100%' }}>
          {/* ── SVG graph column ── */}
          <svg
            width={svgW}
            height={svgH}
            className="shrink-0"
            style={{ background: '#0d1117', display: 'block' }}
          >
            {/* Edges first (drawn behind dots) */}
            {edges.map((edge, i) => (
              <path
                key={i}
                d={edgePath(edge)}
                stroke={edge.color}
                strokeWidth={1.5}
                fill="none"
                opacity={0.65}
              />
            ))}

            {/* Commit dots */}
            {nodes.map((node) => {
              const isSelected = selectedSha === node.commit.sha;
              const isMerge = mergeCommits.has(node.commit.sha);
              return (
                <g
                  key={node.commit.sha}
                  onClick={() =>
                    setSelectedSha(isSelected ? null : node.commit.sha)
                  }
                  className="cursor-pointer"
                >
                  {isMerge ? (
                    // Diamond shape for merge commits
                    <polygon
                      points={[
                        `${cx(node.lane)},${cy(node.row) - DOT_R - 1}`,
                        `${cx(node.lane) + DOT_R + 1},${cy(node.row)}`,
                        `${cx(node.lane)},${cy(node.row) + DOT_R + 1}`,
                        `${cx(node.lane) - DOT_R - 1},${cy(node.row)}`,
                      ].join(' ')}
                      fill={isSelected ? '#fff' : node.color}
                      stroke={node.color}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <circle
                      cx={cx(node.lane)}
                      cy={cy(node.row)}
                      r={DOT_R}
                      fill={isSelected ? '#fff' : node.color}
                      stroke={node.color}
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* ── Commit info column ── */}
          <div className="flex-1 min-w-0">
            {nodes.map((node) => {
              const isSelected = selectedSha === node.commit.sha;
              const isMerge = mergeCommits.has(node.commit.sha);

              return (
                <div key={node.commit.sha}>
                  {/* Main row */}
                  <div
                    style={{ height: ROW_H }}
                    className={`flex items-center gap-2 px-3 cursor-pointer border-b border-[#21262d] transition-colors ${
                      isSelected ? 'bg-[#1c2128]' : 'hover:bg-[#161b22]'
                    }`}
                    onClick={() =>
                      setSelectedSha(isSelected ? null : node.commit.sha)
                    }
                  >
                    {/* Merge icon */}
                    {isMerge && (
                      <GitMerge
                        className="w-3 h-3 shrink-0"
                        style={{ color: node.color }}
                      />
                    )}

                    {/* Branch ref badges */}
                    {node.commit.refs.map((ref) => (
                      <span
                        key={ref}
                        className="shrink-0 text-[10px] px-1.5 py-px rounded border font-mono leading-tight"
                        style={{ borderColor: node.color, color: node.color }}
                      >
                        {ref}
                      </span>
                    ))}

                    {/* Commit message */}
                    <span
                      className="flex-1 truncate text-sm"
                      style={{ color: isSelected ? '#e6edf3' : '#c9d1d9' }}
                    >
                      {node.commit.message}
                    </span>

                    {/* Author */}
                    <span className="shrink-0 w-28 truncate text-xs text-[#8b949e] hidden sm:block">
                      {node.commit.author}
                    </span>

                    {/* Date */}
                    <span className="shrink-0 w-28 text-xs text-[#484f58] hidden md:block">
                      {node.commit.date
                        ? formatDistanceToNow(new Date(node.commit.date), {
                            addSuffix: true,
                          })
                        : ''}
                    </span>

                    {/* SHA link */}
                    <a
                      href={`https://github.com/${repo}/commit/${node.commit.sha}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 w-16 text-xs font-mono text-[#58a6ff] hover:underline text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {node.commit.shortSha}
                    </a>
                  </div>

                  {/* Expanded detail panel */}
                  {isSelected && (
                    <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-3 text-xs text-[#8b949e] space-y-1.5">
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[#e6edf3] font-mono">{node.commit.sha}</span>
                        {node.commit.parents.length > 1 && (
                          <span
                            className="px-1.5 py-px rounded text-[10px]"
                            style={{ background: node.color + '22', color: node.color }}
                          >
                            merge commit
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[#484f58]">Author: </span>
                        {node.commit.author}
                      </div>
                      {node.commit.parents.length > 0 && (
                        <div>
                          <span className="text-[#484f58]">Parents: </span>
                          {node.commit.parents.map((p) => (
                            <span key={p} className="font-mono mr-2">
                              {p.substring(0, 7)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
