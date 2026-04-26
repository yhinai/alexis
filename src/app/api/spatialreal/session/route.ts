import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, getRateLimitConfig } from '@/lib/rate-limiter';
import { validateSession } from '@/lib/auth';

const SPATIALREAL_TOKEN_URL =
    'https://console.us-west.spatialwalk.cloud/v1/console/session-tokens';

export async function GET(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const config = getRateLimitConfig('/api/spatialreal/session');
    const rateLimitResult = rateLimiter.check(`${ip}:/api/spatialreal/session`, config);

    if (!rateLimitResult.success) {
        return NextResponse.json(
            {
                error: 'Too many requests',
                friendlyMessage: {
                    title: 'Rate Limit Exceeded',
                    message: `Please wait ${Math.ceil(rateLimitResult.resetTime / 1000)} seconds before requesting a new session.`,
                },
            },
            { status: 429 }
        );
    }

    if (!validateSession(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.SPATIALREAL_API_KEY;
    const appId = process.env.SPATIALREAL_APP_ID || process.env.NEXT_PUBLIC_SPATIALREAL_APP_ID;
    const avatarId = process.env.NEXT_PUBLIC_SPATIALREAL_AVATAR_ID;

    if (!apiKey || !appId || !avatarId) {
        return NextResponse.json(
            { error: 'SpatialReal not configured on server' },
            { status: 500 }
        );
    }

    const expireAt = Math.floor(Date.now() / 1000) + 3600;

    try {
        const upstream = await fetch(SPATIALREAL_TOKEN_URL, {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expireAt, modelVersion: '' }),
        });

        if (!upstream.ok) {
            const text = await upstream.text().catch(() => '');
            return NextResponse.json(
                {
                    error: 'Failed to obtain SpatialReal session token',
                    friendlyMessage: {
                        title: 'Avatar Service Unavailable',
                        message: 'Could not start the avatar session. Please try again shortly.',
                    },
                    upstreamStatus: upstream.status,
                    upstreamBody: text.slice(0, 500),
                },
                { status: 502 }
            );
        }

        const data = (await upstream.json()) as { sessionToken?: string };
        const sessionToken = data.sessionToken;

        if (!sessionToken) {
            return NextResponse.json(
                { error: 'SpatialReal returned no session token' },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { sessionToken, appId, avatarId, expireAt },
        });
    } catch (err) {
        return NextResponse.json(
            {
                error: 'SpatialReal session request failed',
                friendlyMessage: {
                    title: 'Avatar Service Unavailable',
                    message: 'Network error while contacting avatar service.',
                },
                detail: err instanceof Error ? err.message : 'Unknown error',
            },
            { status: 502 }
        );
    }
}
