"use client";

import React, { useEffect, useState, useMemo } from "react";
import moment from "moment-hijri";
import { Card, CardContent } from "@/components/ui/card";
import { Mosque } from "@/types/prayer-times";
import mosquesData from "../../public/data/mosques.json";

const mosques = (mosquesData.mosques as Mosque[]).filter(
  (m) => m.id !== "sheffield-grand-mosque"
);

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

export default function HomeHeaderCards() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [closestMosque, setClosestMosque] = useState<Mosque | null>(null);

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

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Find closest mosque when user location is available
  useEffect(() => {
    if (userLocation) {
      let minDistance = Infinity;
      let closest: Mosque | null = null;

      mosques.forEach((mosque) => {
        if (mosque.lat && mosque.lng) {
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
      });

      setClosestMosque(closest);
    }
  }, [userLocation]);

  const hijriDate = useMemo(() => {
    if (!currentTime) return "";
    try {
      const m = moment(currentTime);
      const day = m.iDate();
      const monthIdx = m.iMonth();
      const year = m.iYear();
      const months = [
        "Muharram",
        "Safar",
        "Rabi' al-awwal",
        "Rabi' al-thani",
        "Jumada al-awwal",
        "Jumada al-thani",
        "Rajab",
        "Sha'ban",
        "Ramadan",
        "Shawwal",
        "Dhu al-Qi'dah",
        "Dhu al-Hijjah",
      ];
      return `${day} ${months[monthIdx]} ${year}`;
    } catch (e) {
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
      <Card className="flex flex-col justify-center bg-card/50 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[100px]">
          <div className="space-y-1">
            <p className="text-lg font-bold text-foreground leading-tight">
              {gregorianDate}
            </p>
            <p className="text-sm font-medium text-primary">
              {hijriDate}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Time Card */}
      <Card className="flex flex-col justify-center bg-card/50 backdrop-blur-sm border-primary/20">
        <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[100px]">
          <p className="text-4xl font-black text-foreground tabular-nums tracking-tight">
            {timeString}
          </p>
        </CardContent>
      </Card>

      {/* Closest Mosque Card */}
      <Card className="flex flex-col justify-center bg-card/50 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[100px]">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Closest Masjid</p>
          {closestMosque ? (
            <p className="text-lg font-bold text-foreground leading-tight">
              {closestMosque.name}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {userLocation ? "Finding..." : "Enable location for nearby"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
