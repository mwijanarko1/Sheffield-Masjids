"use client";

import React from 'react';
import { Mosque } from '@/types/prayer-times';

interface MosqueMapProps {
  mosque: Mosque;
}

export default function MosqueMap({ mosque }: MosqueMapProps) {
  // Use Google Maps Embed API (no key needed for basic usage via iframe search)
  // Format: https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=Space+Needle,Seattle+WA
  // But for simple embed we can use the search URL
  const encodedAddress = encodeURIComponent(mosque.address);
  const embedUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;

  return (
    <div className="w-full min-h-[280px] h-[50vh] sm:h-[360px] md:h-[400px] max-h-[400px] rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 ">
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={embedUrl}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map showing location of ${mosque.name}`}
      ></iframe>
    </div>
  );
}
