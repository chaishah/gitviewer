import { Octokit } from '@octokit/rest';
import { cache } from './cache';
import type {
  TimelineEvent,
  BranchesResponse,
  TreeResponse,
  BlobResponse,
  RepoInfo,
  BranchInfo,
} from './types';

function getOctokit(): Octokit {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
  });
}

export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  if (!input) return null;
  // Strip whitespace
  input = input.trim();

  // Handle "owner/repo" shorthand
  if (/^[\w.-]+\/[\w.-]+$/.test(input)) {
    const [owner, repo] = input.split('/');
    return { owner, repo };
  }

  // Handle full GitHub URLs
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    if (!url.hostname.includes('github.com')) return null;
    const parts = url.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

export async function getRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  const cacheKey = `repo:${owner}/${repo}`;
  const cached = cache.get<RepoInfo>(cacheKey);
  if (cached) return cached;

  const octokit = getOctokit();
  const { data } = await octokit.repos.get({ owner, repo });

  const result: RepoInfo = {
    name: data.name,
    fullName: data.full_name,
    description: data.description ?? undefined,
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language ?? undefined,
    defaultBranch: data.default_branch,
    isPrivate: data.private,
    url: data.html_url,
    topics: data.topics ?? [],
    updatedAt: data.updated_at,
  };

  cache.set(cacheKey, result, 300);
  return result;
}

export async function getTimeline(
  owner: string,
  repo: string,
  page = 1
): Promise<TimelineEvent[]> {
  const cacheKey = `timeline:${owner}/${repo}:${page}`;
  const cached = cache.get<TimelineEvent[]>(cacheKey);
  if (cached) return cached;

  const octokit = getOctokit();

  const [commitsRes, prsRes, releasesRes] = await Promise.allSettled([
    octokit.repos.listCommits({ owner, repo, per_page: 30, page }),
    octokit.pulls.list({ owner, repo, state: 'all', per_page: 30, page }),
    octokit.repos.listReleases({ owner, repo, per_page: 20 }),
  ]);

  const events: TimelineEvent[] = [];

  // Process commits
  if (commitsRes.status === 'fulfilled') {
    for (const commit of commitsRes.value.data) {
      events.push({
        id: commit.sha,
        type: 'commit',
        title: commit.commit.message.split('\n')[0],
        author: commit.author?.login ?? commit.commit.author?.name ?? 'Unknown',
        authorAvatar: commit.author?.avatar_url,
        date: commit.commit.author?.date ?? commit.commit.committer?.date ?? new Date().toISOString(),
        url: commit.html_url,
        sha: commit.sha.substring(0, 7),
        description: commit.commit.message.split('\n').slice(1).join('\n').trim() || undefined,
      });
    }
  }

  // Process PRs
  if (prsRes.status === 'fulfilled') {
    for (const pr of prsRes.value.data) {
      let prState: 'open' | 'merged' | 'closed' = 'open';
      if (pr.merged_at) prState = 'merged';
      else if (pr.state === 'closed') prState = 'closed';

      events.push({
        id: `pr-${pr.number}`,
        type: 'pr',
        title: pr.title,
        author: pr.user?.login ?? 'Unknown',
        authorAvatar: pr.user?.avatar_url,
        date: pr.created_at,
        url: pr.html_url,
        prState,
        prNumber: pr.number,
        description: pr.body?.substring(0, 200) || undefined,
      });
    }
  }

  // Process releases (only page 1)
  if (page === 1 && releasesRes.status === 'fulfilled') {
    for (const release of releasesRes.value.data) {
      events.push({
        id: `release-${release.id}`,
        type: 'release',
        title: release.name || release.tag_name,
        author: release.author?.login ?? 'Unknown',
        authorAvatar: release.author?.avatar_url,
        date: release.published_at ?? release.created_at,
        url: release.html_url,
        tagName: release.tag_name,
        isPrerelease: release.prerelease,
        description: release.body?.substring(0, 300) || undefined,
      });
    }
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  cache.set(cacheKey, events, 120); // 2 min TTL for timeline
  return events;
}

export async function getBranches(owner: string, repo: string): Promise<BranchesResponse> {
  const cacheKey = `branches:${owner}/${repo}`;
  const cached = cache.get<BranchesResponse>(cacheKey);
  if (cached) return cached;

  const octokit = getOctokit();

  // Fetch repo info for default branch
  const repoInfo = await getRepoInfo(owner, repo);

  // Fetch branches (up to 100)
  const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 100 });

  const branches: BranchInfo[] = data.map((b) => ({
    name: b.name,
    isDefault: b.name === repoInfo.defaultBranch,
    sha: b.commit.sha,
  }));

  // Sort: default first, then alphabetically
  branches.sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });

  const result: BranchesResponse = {
    branches,
    defaultBranch: repoInfo.defaultBranch,
    total: branches.length,
  };

  cache.set(cacheKey, result, 300);
  return result;
}

export async function getTree(
  owner: string,
  repo: string,
  ref: string,
  path: string
): Promise<TreeResponse> {
  const cacheKey = `tree:${owner}/${repo}:${ref}:${path}`;
  const cached = cache.get<TreeResponse>(cacheKey);
  if (cached) return cached;

  const octokit = getOctokit();

  if (path === '' || path === '/') {
    // Root level - use getContent
    const { data } = await octokit.repos.getContent({ owner, repo, path: '', ref });
    if (!Array.isArray(data)) throw new Error('Not a directory');

    const items = data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type as 'blob' | 'tree',
      sha: item.sha,
      size: item.type === 'file' ? item.size : undefined,
    }));

    // Sort: directories first, then files
    items.sort((a, b) => {
      if (a.type === 'tree' && b.type !== 'tree') return -1;
      if (a.type !== 'tree' && b.type === 'tree') return 1;
      return a.name.localeCompare(b.name);
    });

    const result: TreeResponse = { items, path: '', ref };
    cache.set(cacheKey, result, 300);
    return result;
  } else {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
    if (!Array.isArray(data)) throw new Error('Not a directory');

    const items = data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type as 'blob' | 'tree',
      sha: item.sha,
      size: item.type === 'file' ? item.size : undefined,
    }));

    items.sort((a, b) => {
      if (a.type === 'tree' && b.type !== 'tree') return -1;
      if (a.type !== 'tree' && b.type === 'tree') return 1;
      return a.name.localeCompare(b.name);
    });

    const result: TreeResponse = { items, path, ref };
    cache.set(cacheKey, result, 300);
    return result;
  }
}

export async function getBlob(
  owner: string,
  repo: string,
  ref: string,
  path: string
): Promise<BlobResponse> {
  const cacheKey = `blob:${owner}/${repo}:${ref}:${path}`;
  const cached = cache.get<BlobResponse>(cacheKey);
  if (cached) return cached;

  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref });

  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error('Not a file');
  }

  // Get language from extension
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const language = getLanguageFromExt(ext);

  // Decode base64 content
  const content = Buffer.from(data.content, 'base64').toString('utf-8');

  const result: BlobResponse = {
    content,
    encoding: 'utf-8',
    path,
    size: data.size,
    language,
  };

  cache.set(cacheKey, result, 600); // 10 min for file content
  return result;
}

function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yaml: 'yaml',
    yml: 'yaml',
    json: 'json',
    toml: 'toml',
    md: 'markdown',
    mdx: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sql: 'sql',
    xml: 'xml',
    dockerfile: 'dockerfile',
    tf: 'hcl',
    graphql: 'graphql',
    gql: 'graphql',
  };
  return map[ext] ?? 'plaintext';
}

export function handleGitHubError(err: unknown): { status: number; message: string; rateLimited: boolean } {
  if (err && typeof err === 'object' && 'status' in err) {
    const e = err as { status: number; message?: string };
    if (e.status === 404) return { status: 404, message: 'Repository not found or is private', rateLimited: false };
    if (e.status === 403) return { status: 403, message: 'API rate limit exceeded. Set GITHUB_TOKEN to increase limits.', rateLimited: true };
    if (e.status === 401) return { status: 401, message: 'Unauthorized. Check your GITHUB_TOKEN.', rateLimited: false };
    return { status: e.status, message: e.message ?? 'GitHub API error', rateLimited: false };
  }
  return { status: 500, message: 'Internal server error', rateLimited: false };
}
