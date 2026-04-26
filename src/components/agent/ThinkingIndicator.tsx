'use client';

import { BrainCircuit, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface ThinkingIndicatorProps {
    isThinking: boolean;
    currentAction?: string;
}

const THINKING_MESSAGES = [
    "Analyzing code structure...",
    "Checking for edge cases...",
    "Evaluating complexity...",
    "Running semantic analysis...",
    "Verifying best practices...",
];

export function ThinkingIndicator({ isThinking, currentAction }: ThinkingIndicatorProps) {
    const [messageIndex, setMessageIndex] = useState(0);
    const [dots, setDots] = useState("");

    useEffect(() => {
        if (!isThinking) return;

        const messageInterval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
        }, 2000);

        const dotsInterval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);

        return () => {
            clearInterval(messageInterval);
            clearInterval(dotsInterval);
        };
    }, [isThinking]);

    if (!isThinking) return null;

    return (
        <div className="relative flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-purple-500/5 animate-gradient-x" />

            {/* Pulsing glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur-xl opacity-20 animate-pulse" />

            {/* Icon with rotation */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-md opacity-50 animate-pulse" />
                <BrainCircuit className="relative w-6 h-6 text-purple-400 animate-spin-slow" />
            </div>

            {/* Text content */}
            <div className="relative flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-purple-300">
                        {currentAction || THINKING_MESSAGES[messageIndex]}
                    </span>
                    <span className="text-purple-400 w-4 inline-block">{dots}</span>
                </div>
            </div>

            {/* Sparkle effect */}
            <Sparkles className="relative w-4 h-4 text-blue-400 animate-pulse" />
        </div>
    );
}
