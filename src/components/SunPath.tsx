"use client";

import React, { useMemo, useEffect, useState, useId } from "react";
import { DailyPrayerTimes } from "@/types/prayer-times";

interface SunPathProps {
  prayerData: DailyPrayerTimes;
  /** When true, renders a more compact version for small screens */
  compact?: boolean;
}

const PADDING = 40;
const CURVE_TOP = 12;
const CURVE_BOTTOM = 54;
const SVG_HEIGHT = 72;
const VIEW_WIDTH = 400;

const LABEL_MAP: Record<string, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

const getPercentOfDay = (
  timeStr: string,
  minTimeStr: string,
  maxTimeStr: string
): number => {
  const parse = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m ?? 0);
  };
  const t = parse(timeStr);
  const min = parse(minTimeStr);
  let max = parse(maxTimeStr);
  if (max < min) max += 24 * 60;

  let val = (t - min) / (max - min);
  if (val < 0) val = 0;
  if (val > 1) val = 1;
  return val;
};

const getYOnCurve = (t: number): number => {
  const y1 = 2 * CURVE_TOP - CURVE_BOTTOM;
  return (
    CURVE_BOTTOM * (Math.pow(1 - t, 2) + Math.pow(t, 2)) +
    y1 * 2 * t * (1 - t)
  );
};

export function SunPath({ prayerData, compact = false }: SunPathProps) {
  const [now, setNow] = useState(() => new Date());
  const gradientId = `sunPath-${useId().replace(/:/g, "-")}`;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const prayers = useMemo(() => {
    if (!prayerData) return [];
    return [
      { id: "fajr", time: prayerData.fajr },
      { id: "sunrise", time: prayerData.sunrise },
      { id: "dhuhr", time: prayerData.dhuhr },
      { id: "asr", time: prayerData.asr },
      { id: "maghrib", time: prayerData.maghrib },
      { id: "isha", time: prayerData.isha },
    ];
  }, [prayerData]);

  const pathD = useMemo(() => {
    const width = VIEW_WIDTH - 2 * PADDING;
    let d = `M 0 ${getYOnCurve((0 - PADDING) / width)}`;
    for (let x = 0; x <= VIEW_WIDTH; x += 5) {
      const t = (x - PADDING) / width;
      const y = getYOnCurve(t);
      d += ` L ${x} ${y}`;
    }
    return d;
  }, []);

  const points = useMemo(() => {
    if (prayers.length === 0) return [];
    const width = VIEW_WIDTH - 2 * PADDING;
    return prayers
      .filter((p) => p.id !== "sunrise")
      .map((prayer) => {
        const t = getPercentOfDay(
          prayer.time,
          prayerData.fajr,
          prayerData.isha
        );
        const x = PADDING + t * width;
        const y = getYOnCurve(t);
        return { ...prayer, x, y };
      });
  }, [prayers, prayerData]);

  const horizonY = useMemo(() => {
    if (!prayerData) return CURVE_BOTTOM;
    const maghribT = getPercentOfDay(
      prayerData.maghrib,
      prayerData.fajr,
      prayerData.isha
    );
    return getYOnCurve(maghribT);
  }, [prayerData]);

  const currentPoint = useMemo(() => {
    if (!prayerData) return null;
    const h = now.getHours();
    const m = now.getMinutes();
    const currentStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    const startTime = prayerData.fajr;
    const endTime = prayerData.isha;

    let t = getPercentOfDay(currentStr, startTime, endTime);

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    if (h >= 0 && h < startH) {
      t = 0;
    } else if (h > endH || (h === endH && m > endM)) {
      t = 1;
    }

    const width = VIEW_WIDTH - 2 * PADDING;
    const x = PADDING + t * width;
    const y = getYOnCurve(t);
    return { x, y };
  }, [now, prayerData]);

  return (
    <div
      className={`w-full flex items-center justify-center shrink-0 ${compact ? "h-[88px] sm:h-[72px] my-1" : "h-[88px] sm:h-[80px] my-1.5 sm:my-2"}`}
      role="img"
      aria-label="Sun path across the day from Fajr to Isha with prayer time markers"
    >
      <svg
        width="100%"
        height={compact ? 88 : 80}
        viewBox={`0 0 ${VIEW_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="max-w-full"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0" stopColor="#FF8555" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#FFB380" stopOpacity="1" />
            <stop offset="1" stopColor="#FF8555" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d={pathD}
          stroke={`url(#${gradientId})`}
          strokeWidth={compact ? 2 : 3}
          fill="none"
        />

        {/* Horizon Line */}
        {prayerData && (
          <g>
            <line
              x1={0}
              y1={horizonY}
              x2={VIEW_WIDTH}
              y2={horizonY}
              stroke="rgba(255,179,128,0.5)"
              strokeWidth={compact ? 1.5 : 2}
            />
            <text
              x={12}
              y={horizonY - 4}
              textAnchor="start"
              fill="rgba(255,255,255,0.8)"
              fontSize={compact ? 7 : 8}
              fontWeight="500"
            >
              Sunrise
            </text>
            <text
              x={VIEW_WIDTH - 12}
              y={horizonY - 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.8)"
              fontSize={compact ? 7 : 8}
              fontWeight="500"
            >
              Sunset
            </text>
          </g>
        )}

        {points.map((pt) => (
          <g key={pt.id}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={compact ? 4 : 6}
              fill="#B85C38"
              stroke="#FFB380"
              strokeWidth={compact ? 2 : 3}
            />
            <text
              x={pt.x}
              y={pt.y + (compact ? 14 : 16)}
              textAnchor="middle"
              fill="rgba(255,255,255,0.9)"
              fontSize={compact ? 8 : 9}
              fontWeight="500"
            >
              {LABEL_MAP[pt.id] ?? pt.id}
            </text>
          </g>
        ))}
        {currentPoint && (
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r={compact ? 5 : 8}
            fill="#FFE2CB"
            className="drop-shadow-[0_0_12px_rgba(255,179,128,0.8)]"
          />
        )}
      </svg>
    </div>
  );
}
