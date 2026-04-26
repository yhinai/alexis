'use client';

import { useEffect, useRef } from 'react';
import {
    AvatarManager,
    AvatarSDK,
    AvatarView,
    DrivingServiceMode,
    Environment,
} from '@spatialwalk/avatarkit';
import { authFetch, initSession } from '@/lib/api-client';
import type { SpatialAudioBus } from '@/lib/spatial-audio-bus';

interface Props {
    audioBus: SpatialAudioBus | null | undefined;
    className?: string;
}

interface SessionResponse {
    success: boolean;
    data: {
        sessionToken: string;
        appId: string;
        avatarId: string;
        expireAt: number;
    };
}

const WASM_FILENAME = 'avatar_core_wasm-bd762669.wasm';
const WASM_PUBLIC_URL = '/spatialreal/avatar_core_wasm-bd762669.wasm';

// Next.js /_next/* paths bypass rewrites, so the SDK's fetch for the wasm
// next to its bundled JS chunk 404s. Intercept fetch only for that filename
// and redirect to the public-served copy.
let wasmShimInstalled = false;
function installWasmFetchShim() {
    if (wasmShimInstalled || typeof window === 'undefined') return;
    wasmShimInstalled = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
        const url =
            typeof input === 'string' ? input
            : input instanceof URL ? input.href
            : input instanceof Request ? input.url
            : '';
        if (url && url.includes(WASM_FILENAME)) {
            return originalFetch(WASM_PUBLIC_URL, init);
        }
        return originalFetch(input, init);
    };
}

export function SpatialRealAvatar({ audioBus, className }: Props) {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!audioBus || !mountRef.current) return;

        let cancelled = false;
        let view: AvatarView | null = null;
        let unsubscribe: (() => void) | null = null;

        async function setup() {
            try {
                installWasmFetchShim();
                await initSession();
                const res = await authFetch('/api/spatialreal/session');
                if (!res.ok) {
                    console.error('SpatialReal session fetch failed:', res.status);
                    return;
                }
                const tok = (await res.json()) as SessionResponse;
                if (cancelled) return;

                await AvatarSDK.initialize(tok.data.appId, {
                    environment: Environment.intl,
                    drivingServiceMode: DrivingServiceMode.sdk,
                    audioFormat: { channelCount: 1, sampleRate: 24000 },
                });
                if (cancelled) return;

                AvatarSDK.setSessionToken(tok.data.sessionToken);

                const avatar = await AvatarManager.shared.load(tok.data.avatarId);
                if (cancelled || !mountRef.current) return;

                view = new AvatarView(avatar, mountRef.current);
                view.onFirstRendering = () => console.log('[SpatialReal] first frame');
                view.controller.onConnectionState = (s) => console.log('[SpatialReal] connection:', s);
                view.controller.onConversationState = (s) => console.log('[SpatialReal] conversation:', s);
                view.controller.onError = (err) => console.error('[SpatialReal] error:', err);

                await view.controller.initializeAudioContext();
                if (cancelled) return;

                await view.controller.start();
                if (cancelled) return;

                unsubscribe = audioBus!.subscribe((chunk, end) => {
                    if (!view) return;
                    try {
                        view.controller.send(chunk, end);
                    } catch (err) {
                        console.error('SpatialReal send failed:', err);
                    }
                });
            } catch (err) {
                console.error('SpatialReal avatar setup failed:', err);
            }
        }

        setup();

        return () => {
            cancelled = true;
            if (unsubscribe) unsubscribe();
            if (view) {
                try {
                    view.controller.close();
                } catch {
                    // already closed
                }
                try {
                    view.dispose();
                } catch {
                    // already disposed
                }
            }
        };
    }, [audioBus]);

    return (
        <div
            ref={mountRef}
            className={className ?? 'w-full h-full rounded-xl bg-zinc-900 overflow-hidden'}
        />
    );
}
