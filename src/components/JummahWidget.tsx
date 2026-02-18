import React from 'react';
import { formatTo12Hour } from '@/lib/prayer-times';

interface JummahWidgetProps {
  jummahTime: string;
  isActive?: boolean;
}

export default function JummahWidget({ jummahTime, isActive }: JummahWidgetProps) {
  // Format time for display (using 12-hour format)
  const formatJummahTime = (time: string) => {
    return formatTo12Hour(time);
  };

  return (
    <div className={`flex flex-col rounded-xl sm:rounded-2xl transition-all duration-500 shadow-sm overflow-hidden ${isActive
      ? 'bg-[var(--theme-primary)] text-white scale-[1.01] shadow-xl ring-2 ring-white/20 z-10'
      : 'bg-gradient-to-br from-white to-[var(--theme-accent)] text-[var(--theme-primary)] hover:shadow-md'
      }`}>
      {/* Top Section: Name and Time */}
      <div className="pt-4 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-4 text-center">
        <div className={`font-serif italic font-bold text-base sm:text-lg lg:text-xl mb-1 capitalize ${isActive ? 'text-white/90' : 'text-[var(--theme-primary)]'}`}>
          jummah prayer
        </div>
        <div className="text-3xl sm:text-4xl lg:text-5xl font-sans font-extrabold tracking-tighter leading-none">
          {formatJummahTime(jummahTime)}
        </div>
      </div>
    </div>
  );
} 