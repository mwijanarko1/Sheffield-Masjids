import React from 'react';

interface JummahWidgetProps {
  jummahTime: string;
  isActive?: boolean;
}

export default function JummahWidget({ jummahTime, isActive }: JummahWidgetProps) {
  // Format time for display (keep in 24-hour format)
  const formatJummahTime = (time: string) => {
    // Return time as-is (already in 24-hour format from data)
    return time;
  };

  return (
    <div className={`flex flex-col rounded-xl sm:rounded-2xl transition-all duration-500 shadow-sm overflow-hidden ${isActive
      ? 'bg-[var(--theme-primary)] text-white scale-[1.01] shadow-xl ring-2 ring-white/20 z-10'
      : 'bg-gradient-to-br from-white to-[var(--theme-accent)] text-[var(--theme-primary)] active:scale-[0.99]'
      }`}>
      <div className="pt-3 sm:pt-4 md:pt-5 pb-3 sm:pb-4 px-3 sm:px-4 text-center">
        <div className={`font-serif italic font-bold text-sm sm:text-base md:text-lg mb-0.5 sm:mb-1 capitalize ${isActive ? 'text-white/90' : 'text-[var(--theme-primary)]'}`}>
          jummah prayer
        </div>
        <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-sans font-extrabold tracking-tighter leading-none">
          {formatJummahTime(jummahTime)}
        </div>
      </div>
    </div>
  );
} 