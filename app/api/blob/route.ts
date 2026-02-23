import { NextRequest, NextResponse } from 'next/server';
import { getBlob, handleGitHubError } from '@/lib/github';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const repo = searchParams.get('repo');
  const ref = searchParams.get('ref') ?? 'HEAD';
  const path = searchParams.get('path') ?? '';

  if (!repo || !repo.includes('/')) {
    return NextResponse.json({ error: 'Missing or invalid repo parameter (expected owner/repo)' }, { status: 400 });
  }

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const [owner, repoName] = repo.split('/');

  try {
    const data = await getBlob(owner, repoName, ref, path);
    return NextResponse.json(data);
  } catch (err) {
    const { status, message, rateLimited } = handleGitHubError(err);
    return NextResponse.json({ error: message, rateLimited }, { status });
  }
}
