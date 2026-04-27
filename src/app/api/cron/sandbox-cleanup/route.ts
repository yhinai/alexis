import { NextRequest, NextResponse } from 'next/server';
import { Daytona, Sandbox } from '@daytonaio/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sandboxes older than this are considered stale and reaped.
const ONE_HOUR_MS = 60 * 60 * 1000;

// KNOWN COUPLING POINT: This route instantiates a raw Daytona SDK client
// directly because `src/lib/daytona.ts` (the `daytonaService` singleton)
// does not yet expose a list-by-label / bulk-delete API surface. Once that
// service grows methods like `listWorkspacesByLabel({ app: 'alexis' })` and
// `cleanupWorkspace(id)` (the latter exists), this should be migrated to
// call the service so we have a single authoritative entry point and
// preserve the service's mock-mode + retry behavior.
function getDaytonaClient(): Daytona {
  const apiKey = process.env.DAYTONA_API_KEY;
  const apiUrl = process.env.DAYTONA_API_URL;
  if (!apiKey || !apiUrl) {
    throw new Error(
      'Daytona credentials missing: DAYTONA_API_KEY and DAYTONA_API_URL must be set'
    );
  }
  return new Daytona({ apiKey, apiUrl });
}

interface CleanupSummary {
  ok: boolean;
  listed: number;
  deleted: number;
  errors: Array<{ id?: string; message: string }>;
}

function parseSandboxAgeMs(sandbox: {
  createdAt?: string;
  labels?: Record<string, string>;
}): number | null {
  // Prefer Sandbox.createdAt (ISO timestamp from API); fall back to the
  // `createdAt` label set by DaytonaService.createWorkspace (ms epoch string).
  if (sandbox.createdAt) {
    const t = Date.parse(sandbox.createdAt);
    if (!Number.isNaN(t)) return Date.now() - t;
  }
  const labelTs = sandbox.labels?.createdAt;
  if (labelTs) {
    const n = Number(labelTs);
    if (Number.isFinite(n)) return Date.now() - n;
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse<CleanupSummary>> {
  // Misconfiguration guard: if CRON_SECRET is unset, the literal compared
  // against would be 'Bearer undefined' — and any caller sending exactly that
  // would be accepted. Refuse to operate at all.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, listed: 0, deleted: 0, errors: [{ message: 'CRON_SECRET not configured' }] },
      { status: 500 }
    );
  }

  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, listed: 0, deleted: 0, errors: [{ message: 'Unauthorized' }] },
      { status: 401 }
    );
  }

  const summary: CleanupSummary = { ok: true, listed: 0, deleted: 0, errors: [] };

  let daytona: Daytona;
  try {
    daytona = getDaytonaClient();
  } catch (error) {
    summary.ok = false;
    summary.errors.push({
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(summary, { status: 500 });
  }

  // 1. List sandboxes labeled app=alexis. We page through results so we don't
  // miss anything if there are more than the default page size.
  const allSandboxes: Sandbox[] = [];

  try {
    let page = 1;
    const limit = 100;
    // Hard cap on pages to avoid runaway loops if pagination metadata is off.
    const maxPages = 50;
    while (page <= maxPages) {
      const result = await daytona.list({ app: 'alexis' }, page, limit);
      for (const sb of result.items) {
        allSandboxes.push(sb);
      }
      if (page >= (result.totalPages ?? page)) break;
      page += 1;
    }
  } catch (error) {
    summary.ok = false;
    summary.errors.push({
      message: `list failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return NextResponse.json(summary, { status: 500 });
  }

  summary.listed = allSandboxes.length;

  // 2. Filter to sandboxes older than 1 hour.
  const stale = allSandboxes.filter(sb => {
    const age = parseSandboxAgeMs(sb);
    return age !== null && age > ONE_HOUR_MS;
  });

  // 3. Delete each, swallowing per-sandbox errors so one failure doesn't block the rest.
  for (const sb of stale) {
    try {
      await daytona.delete(sb);
      summary.deleted += 1;
    } catch (error) {
      summary.errors.push({
        id: sb.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json(summary);
}
