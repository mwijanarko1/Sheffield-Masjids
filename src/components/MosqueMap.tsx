"use client";

import { useEffect, useMemo, useState } from "react";
import { Mosque } from "@/types/prayer-times";

interface MosqueMapProps {
  mosque: Mosque;
}

type MapProvider = "google" | "osm";

export default function MosqueMap({ mosque }: MosqueMapProps) {
  const [mapProvider, setMapProvider] = useState<MapProvider>("google");

  const googleEmbedUrl = useMemo(() => {
    const encodedQuery = encodeURIComponent(`${mosque.lat},${mosque.lng}`);
    return `https://www.google.com/maps?hl=en&q=${encodedQuery}&z=16&output=embed`;
  }, [mosque.lat, mosque.lng]);

  const openStreetMapEmbedUrl = useMemo(() => {
    const delta = 0.01;
    const left = (mosque.lng - delta).toFixed(6);
    const right = (mosque.lng + delta).toFixed(6);
    const top = (mosque.lat + delta).toFixed(6);
    const bottom = (mosque.lat - delta).toFixed(6);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${mosque.lat}%2C${mosque.lng}`;
  }, [mosque.lat, mosque.lng]);

  useEffect(() => {
    setMapProvider("google");
  }, [mosque.id]);

  const embedUrl =
    mapProvider === "google" ? googleEmbedUrl : openStreetMapEmbedUrl;

  const externalMapUrl = `https://www.google.com/maps/search/?api=1&query=${mosque.lat},${mosque.lng}`;

  return (
    <div className="flex h-[50vh] min-h-[280px] w-full max-h-[400px] flex-col sm:h-[360px] md:h-[400px]">
      <iframe
        className="min-h-0 flex-1"
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={embedUrl}
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        title={`Map showing location of ${mosque.name}`}
        onError={() => {
          if (mapProvider === "google") {
            setMapProvider("osm");
          }
        }}
      />
      <div className="shrink-0 px-3 pt-2 text-center text-xs text-muted-foreground">
        <a
          href={externalMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--theme-highlight)] hover:text-[var(--theme-highlight-bright)]"
        >
          Open location in Google Maps
        </a>
      </div>
    </div>
  );
}
