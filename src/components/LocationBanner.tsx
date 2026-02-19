"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Mosque } from "@/types/prayer-times";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    return null;
  }

  // Find closest mosque when user location is available
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

  if (isDismissed) {
    return null;
  }

  // If we found the closest mosque
  if (closestMosque) {
    return (
      <div className="w-full bg-muted border-b border-border py-2 px-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>
            Closest masjid is <strong>{closestMosque.mosque.name}</strong>{" "}
            ({formatDistance(closestMosque.distanceKm)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSelectMosque(closestMosque.mosque)}
          >
            Switch to {closestMosque.mosque.name}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // If no location access or error, show a small button/banner to enable it
  if (locationStatus !== "loading" && locationStatus !== "success") {
    return (
      <div className="w-full bg-muted/50 border-b border-border py-2 px-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>Enable location to find the nearest masjid</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={requestUserLocation}
          >
            Enable Location
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (locationStatus === "loading") {
    return (
      <div className="w-full bg-muted/50 border-b border-border py-2 px-4 flex items-center justify-center text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 mr-2 animate-pulse" />
        <span>Finding nearest masjid...</span>
      </div>
    );
  }

  return null;
}
