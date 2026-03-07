"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { LAST_TEN_WELCOME_KEY } from "@/lib/last-ten-content";
import { cn } from "@/lib/utils";

export default function LastTenWelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        try {
            const seen = window.localStorage.getItem(LAST_TEN_WELCOME_KEY);
            if (!seen) {
                setIsOpen(true);
            }
        } catch {
            // localStorage unavailable — skip modal
        }
    }, []);

    function dismiss() {
        setIsOpen(false);
        try {
            window.localStorage.setItem(LAST_TEN_WELCOME_KEY, "1");
        } catch {
            // Silently ignore persistence failure
        }
    }

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to the Checklist"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={dismiss}
                aria-hidden
            />

            {/* Modal content */}
            <div
                className={cn(
                    "relative z-10 mx-4 mb-4 w-full max-w-md rounded-3xl border border-white/12 p-6 shadow-2xl sm:mb-0",
                    "bg-gradient-to-br from-[#0F1D35] via-[#0A1128] to-[#162544]",
                    "animate-in slide-in-from-bottom-4 fade-in duration-300",
                )}
            >
                {/* Close button */}
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Close"
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380]"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Icon */}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFB380]/15">
                    <span className="text-2xl" role="img" aria-label="Star and moon">
                        🌙
                    </span>
                </div>

                {/* Heading */}
                <h2 className="mb-2 text-xl font-bold text-white">
                    Ramadan Checklist
                </h2>

                {/* Body */}
                <p className="mb-2 text-sm leading-relaxed text-white/70">
                    This is your nightly checklist of actions to help you make the most of
                    the last days of Ramadan.
                </p>
                <p className="mb-5 text-sm leading-relaxed text-white/70">
                    Each night has the same set of recommended acts of worship — tick them
                    off as you go. Your progress is saved on this device so you can track
                    your consistency across every night.
                </p>

                {/* CTA */}
                <button
                    type="button"
                    onClick={dismiss}
                    className="w-full min-h-[48px] rounded-2xl bg-[#FFB380] px-6 py-3 text-sm font-semibold text-[#0A1128] shadow-lg transition-all hover:bg-[#FFC89E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] active:scale-[0.98]"
                >
                    Get Started
                </button>
            </div>
        </div>
    );
}
