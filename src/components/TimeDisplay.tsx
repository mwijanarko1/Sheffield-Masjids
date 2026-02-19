import { formatTo12Hour, isValidTimeForMarkup } from "@/lib/prayer-times";

interface TimeDisplayProps {
  time: string;
  className?: string;
}

/**
 * Renders a prayer time with semantic <time> markup when valid (WCAG 2.1.1, 2.4.6).
 */
export function TimeDisplay({ time, className }: TimeDisplayProps) {
  if (isValidTimeForMarkup(time)) {
    return (
      <time dateTime={time} className={className}>
        {formatTo12Hour(time)}
      </time>
    );
  }
  return <span className={className}>{formatTo12Hour(time)}</span>;
}
