'use client';

import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, AlertCircle } from 'lucide-react';

interface Props {
    className?: string;
    onFrame?: (jpegBase64: string) => void;
    onCameraStateChange?: (live: boolean) => void;
}

type State = 'idle' | 'requesting' | 'live' | 'off' | 'error';

export function SelfView({ className, onFrame, onCameraStateChange }: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [state, setState] = useState<State>('idle');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        if (!enabled) {
            stopStream();
            setState('off');
            return;
        }
        let cancelled = false;

        async function start() {
            setState('requesting');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setState('live');
            } catch (err) {
                const e = err as DOMException;
                const msg =
                    e.name === 'NotAllowedError' ? 'Camera permission denied'
                    : e.name === 'NotFoundError' ? 'No camera found'
                    : e.name === 'NotReadableError' ? 'Camera in use by another app'
                    : `Camera error: ${e.message || e.name}`;
                setErrorMsg(msg);
                setState('error');
            }
        }

        start();
        return () => {
            cancelled = true;
            stopStream();
        };
    }, [enabled]);

    useEffect(() => {
        onCameraStateChange?.(state === 'live');
    }, [state, onCameraStateChange]);

    useEffect(() => {
        if (!onFrame || state !== 'live') return;

        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const intervalId = setInterval(() => {
            const video = videoRef.current;
            if (!video || video.readyState < 2 || video.videoWidth === 0) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
            onFrame(base64);
        }, 3000);

        return () => clearInterval(intervalId);
    }, [onFrame, state]);

    function stopStream() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }

    return (
        <div className={`relative ${className ?? 'w-full h-32 rounded-xl bg-zinc-900 overflow-hidden'}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
            />
            {state !== 'live' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-zinc-400 gap-1">
                    {state === 'requesting' && <span>Requesting camera…</span>}
                    {state === 'off' && (
                        <>
                            <VideoOff className="w-5 h-5" />
                            <span>Camera off</span>
                        </>
                    )}
                    {state === 'error' && (
                        <>
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-300 px-2 text-center">{errorMsg}</span>
                        </>
                    )}
                </div>
            )}
            <button
                type="button"
                onClick={() => setEnabled((v) => !v)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white backdrop-blur"
                aria-label={enabled ? 'Turn camera off' : 'Turn camera on'}
            >
                {enabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
}
