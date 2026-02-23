// Unified event types for the timeline
export type EventType = 'commit' | 'pr' | 'release';

export interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  author: string;
  authorAvatar?: string;
  date: string; // ISO string
  url: string;
  description?: string;
  // PR-specific
  prState?: 'open' | 'merged' | 'closed';
  prNumber?: number;
  // Release-specific
  tagName?: string;
  isPrerelease?: boolean;
  // Commit-specific
  sha?: string;
}

export interface BranchInfo {
  name: string;
  isDefault: boolean;
  sha: string;
}

export interface BranchesResponse {
  branches: BranchInfo[];
  defaultBranch: string;
  total: number;
}

export interface TreeItem {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url?: string;
}

export interface TreeResponse {
  items: TreeItem[];
  path: string;
  ref: string;
}

export interface BlobResponse {
  content: string;
  encoding: string;
  path: string;
  size: number;
  language?: string;
}

export interface RepoInfo {
  name: string;
  fullName: string;
  description?: string;
  stars: number;
  forks: number;
  language?: string;
  defaultBranch: string;
  isPrivate: boolean;
  url: string;
  topics?: string[];
  updatedAt: string;
}

export interface APIError {
  error: string;
  status?: number;
  rateLimited?: boolean;
}

export interface GraphCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  authorAvatar: string | null;
  date: string;
  parents: string[];
  refs: string[];
}

export interface GraphResponse {
  commits: GraphCommit[];
}
