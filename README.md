# GitViewer

An interactive web app to explore any public GitHub repository — featuring a unified timeline, branch explorer, and file tree viewer. No login required.

## Features

- **Timeline Tab** — unified feed of commits, pull requests, and releases with filters for type, date range, and search by title/author
- **Code Tab** — branch selector with count, file tree navigation, breadcrumbs, and in-app file preview
- **No auth required** — works with GitHub's public API out of the box (60 req/hr unauthenticated)
- **Optional GITHUB_TOKEN** — raises rate limit to 5,000 req/hr (server-side only, never exposed to client)
- **In-memory caching** — short TTL cache reduces redundant API calls
- **Vercel-ready** — zero-config deployment

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS v4
- Octokit (GitHub REST API)
- date-fns

## Local Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone <repo-url>
cd gitviewer
npm install
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: GitHub Token

Without a token, GitHub's public API is limited to **60 requests/hour** per IP. To increase this to **5,000/hour**, add a personal access token:

1. Go to [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Create a token with **no scopes** (read-only public data is sufficient)
3. Create a `.env.local` file in the project root:

```env
GITHUB_TOKEN=ghp_your_token_here
```

The token is only used server-side in API routes and is never sent to the browser.

## Vercel Deployment

### Manual deploy

1. Push the project to a GitHub/GitLab repository
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variable (optional):
   - Key: `GITHUB_TOKEN`
   - Value: your GitHub personal access token
5. Click **Deploy**

## Project Structure

```
.
├── app/
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page (URL input)
│   ├── globals.css           # Global styles + animations
│   ├── api/
│   │   ├── repo/route.ts     # GET /api/repo?repo=owner/repo
│   │   ├── timeline/route.ts # GET /api/timeline?repo=...&page=...
│   │   ├── branches/route.ts # GET /api/branches?repo=...
│   │   ├── tree/route.ts     # GET /api/tree?repo=...&ref=...&path=...
│   │   └── blob/route.ts     # GET /api/blob?repo=...&ref=...&path=...
│   └── repo/[owner]/[repo]/
│       └── page.tsx          # Repo explorer page
├── components/
│   ├── Repo/RepoHeader.tsx   # Stars, forks, language, topics
│   ├── Timeline/
│   │   └── TimelineView.tsx  # Full timeline with filters
│   ├── Code/
│   │   ├── CodeTab.tsx       # Branch loading + layout
│   │   ├── BranchSelector.tsx# Searchable branch dropdown
│   │   ├── TreeView.tsx      # Directory tree navigation
│   │   ├── Breadcrumb.tsx    # Path breadcrumb
│   │   └── FilePreview.tsx   # Modal file viewer
│   └── ui/
│       ├── Skeleton.tsx      # Loading skeletons
│       └── ErrorState.tsx    # Error + empty states
└── lib/
    ├── github.ts             # Octokit wrappers + URL parser
    ├── cache.ts              # In-memory TTL cache
    └── types.ts              # Shared TypeScript types
```

## API Endpoints

| Endpoint | Parameters | Description |
|----------|-----------|-------------|
| `GET /api/repo` | `repo=owner/repo` | Repository metadata |
| `GET /api/timeline` | `repo=owner/repo`, `page=1` | Commits, PRs, releases |
| `GET /api/branches` | `repo=owner/repo` | All branches + default |
| `GET /api/tree` | `repo`, `ref`, `path` | Directory listing |
| `GET /api/blob` | `repo`, `ref`, `path` | File content |

## Rate Limits

| Mode | Limit |
|------|-------|
| Unauthenticated | 60 req/hr |
| With GITHUB_TOKEN | 5,000 req/hr |

The app shows a friendly error with instructions when rate-limited.
