import { NextRequest, NextResponse } from 'next/server';
import { getTimeline, handleGitHubError } from '@/lib/github';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const repo = searchParams.get('repo');
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  if (!repo || !repo.includes('/')) {
    return NextResponse.json({ error: 'Missing or invalid repo parameter (expected owner/repo)' }, { status: 400 });
  }

  const [owner, repoName] = repo.split('/');

  try {
    const events = await getTimeline(owner, repoName, page);
    return NextResponse.json({ events, page });
  } catch (err) {
    const { status, message, rateLimited } = handleGitHubError(err);
    return NextResponse.json({ error: message, rateLimited }, { status });
  }
}
