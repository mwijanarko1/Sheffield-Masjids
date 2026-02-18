"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Mosque } from "@/types/prayer-times";
import mosquesData from "../../public/data/mosques.json";

const mosques = mosquesData.mosques as Mosque[];
const HIJRI_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB-u-ca-islamic", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
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

export default function HomeHeaderCards() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [closestMosque, setClosestMosque] = useState<{
    mosque: Mosque;
    distanceKm: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");

  // Set initial time and start interval
  useEffect(() => {
    const getSheffieldTime = () => {
      return new Date(
        new Date().toLocaleString("en-US", { timeZone: "Europe/London" })
      );
    };
    setCurrentTime(getSheffieldTime());
    const interval = setInterval(() => {
      setCurrentTime(getSheffieldTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    requestUserLocation();
  }, [requestUserLocation]);

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
  }, [userLocation]);

  const closestMosqueMessage = useMemo(() => {
    if (closestMosque) {
      return {
        title: closestMosque.mosque.name,
        subtitle: formatDistance(closestMosque.distanceKm),
        showRetry: false,
      };
    }

    switch (locationStatus) {
      case "loading":
        return {
          title: "Finding nearest masjid...",
          subtitle: "",
          showRetry: false,
        };
      case "denied":
        return {
          title: "Location permission blocked",
          subtitle: "Allow location to detect nearest masjid",
          showRetry: true,
        };
      case "unsupported":
        return {
          title: "Location is not supported",
          subtitle: "Your browser cannot provide location",
          showRetry: false,
        };
      case "error":
        return {
          title: "Could not get your location",
          subtitle: "Try again",
          showRetry: true,
        };
      case "idle":
        return {
          title: "Enable location for nearby",
          subtitle: "",
          showRetry: true,
        };
      case "success":
        return {
          title: "No masjid location data",
          subtitle: "",
          showRetry: false,
        };
      default:
        return {
          title: "Enable location for nearby",
          subtitle: "",
          showRetry: true,
        };
    }
  }, [closestMosque, locationStatus]);

  const hijriDate = useMemo(() => {
    if (!currentTime) return "";
    try {
      const parts = HIJRI_DATE_FORMATTER.formatToParts(currentTime);
      const day = parts.find((part) => part.type === "day")?.value;
      const month = parts.find((part) => part.type === "month")?.value;
      const year = parts.find((part) => part.type === "year")?.value;
      if (!day || !month || !year) return "";
      return `${day} ${month} ${year} AH`;
    } catch {
      return "";
    }
  }, [currentTime]);

  const gregorianDate = useMemo(() => {
    if (!currentTime) return "";
    return currentTime.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [currentTime]);

  const timeString = useMemo(() => {
    if (!currentTime) return "--:--";
    return currentTime.toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, [currentTime]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Dates Card */}
      <Card className="flex flex-col justify-center bg-background">
        <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[100px]">
          <div className="space-y-1">
            <p className="text-lg font-bold text-foreground leading-tight">
              {gregorianDate}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {hijriDate}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Time Card */}
      <Card className="flex flex-col justify-center bg-background">
        <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[100px]">
          <p className="text-4xl font-black text-foreground tabular-nums tracking-tight">
            {timeString}
          </p>
        </CardContent>
      </Card>

      {/* Closest Mosque Card */}
      <Card className="flex flex-col justify-center bg-background">
        <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[100px]">
          <p className="mb-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">Closest Masjid</p>
          <p className="text-lg font-bold text-foreground leading-tight">
            {closestMosqueMessage.title}
          </p>
          {closestMosqueMessage.subtitle ? (
            <p className="mt-1 text-xs text-muted-foreground">{closestMosqueMessage.subtitle}</p>
          ) : null}
          {closestMosqueMessage.showRetry ? (
            <button
              type="button"
              onClick={requestUserLocation}
              className="mt-2 text-xs font-semibold text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
            >
              Retry location
            </button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
