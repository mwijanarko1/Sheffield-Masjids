"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Mosque } from "@/types/prayer-times";
import { Button } from "@/components/ui/button";

function MapPinIcon(props: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function XIcon(props: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

type LocationStatus =
  | "idle"
  | "loading"
  | "success"
  | "unsupported"
  | "denied"
  | "error";

// Haversine formula to calculate distance between two points in km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function isValidCoordinate(value: number) {
  return Number.isFinite(value);
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
}

interface LocationBannerProps {
  mosques: Mosque[];
  onSelectMosque: (mosque: Mosque) => void;
}

export function LocationBanner({ mosques, onSelectMosque }: LocationBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [closestMosque, setClosestMosque] = useState<{
    mosque: Mosque;
    distanceKm: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");

  const requestUserLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("unsupported");
      setUserLocation(null);
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("success");
      },
      (error) => {
        setUserLocation(null);
        setLocationStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "error"
        );
        console.error("Error getting location:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  // Get user location on initial render
  useEffect(() => {
    setMounted(true);
    requestUserLocation();
  }, [requestUserLocation]);

  // Find closest mosque when user location is available (must run after all other hooks)
  useEffect(() => {
    if (!userLocation) {
      setClosestMosque(null);
      return;
    }

    let minDistance = Number.POSITIVE_INFINITY;
    let closest: Mosque | null = null;

    for (const mosque of mosques) {
      if (!isValidCoordinate(mosque.lat) || !isValidCoordinate(mosque.lng)) {
        continue;
      }

      const distance = getDistance(
        userLocation.lat,
        userLocation.lng,
        mosque.lat,
        mosque.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        closest = mosque;
      }
    }

    if (closest) {
      setClosestMosque({ mosque: closest, distanceKm: minDistance });
      return;
    }

    setClosestMosque(null);
  }, [userLocation, mosques]);

  // Prevent hydration mismatch by only rendering on client (after all hooks)
  if (!mounted) {
    return null;
  }

  if (isDismissed) {
    return null;
  }

  // If we found the closest mosque
  if (closestMosque) {
    return (
      <div className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80 shadow-md backdrop-blur-xl sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-white/80">
          <MapPinIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Closest masjid is <strong className="text-white">{closestMosque.mosque.name}</strong>{" "}
            ({formatDistance(closestMosque.distanceKm)})
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 sm:mt-0">
          <Button
            size="sm"
            className="h-8 border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
            onClick={() => onSelectMosque(closestMosque.mosque)}
          >
            Switch to {closestMosque.mosque.name}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // If no location access or error, show a small button/banner to enable it
  if (locationStatus !== "loading" && locationStatus !== "success") {
    return (
      <div className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80 shadow-md backdrop-blur-xl sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-white/80">
          <MapPinIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span>Enable location to find the nearest masjid</span>
        </div>
        <div className="mt-3 flex items-center gap-2 sm:mt-0">
          <Button
            size="sm"
            className="h-8 border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
            onClick={requestUserLocation}
          >
            Enable Location
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (locationStatus === "loading") {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80 shadow-md backdrop-blur-xl">
        <MapPinIcon className="h-4 w-4 mr-2 animate-pulse" aria-hidden />
        <span>Finding nearest masjid…</span>
      </div>
    );
  }

  return null;
}
