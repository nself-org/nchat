/**
 * Incoming Call Modal
 *
 * Full-screen modal for incoming voice/video calls with ringtone,
 * avatar display, and accept/decline actions.
 */

"use client";

import React, { useEffect, useState, useRef } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface IncomingCallModalProps {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatarUrl?: string;
  callType: "voice" | "video";
  onAccept: (withVideo: boolean) => void;
  onDecline: () => void;
  ringToneUrl?: string;
  ringVolume?: number;
}

// =============================================================================
// Component
// =============================================================================

export function IncomingCallModal({
  callId,
  callerId,
  callerName,
  callerAvatarUrl,
  callType,
  onAccept,
  onDecline,
  ringToneUrl = "/sounds/ringtone.mp3",
  ringVolume = 0.8,
}: IncomingCallModalProps) {
  const [isRinging, setIsRinging] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone
  useEffect(() => {
    if (typeof window === "undefined") return;

    audioRef.current = new Audio(ringToneUrl);
    audioRef.current.loop = true;
    audioRef.current.volume = ringVolume;

    audioRef.current
      .play()
      .catch((err) => logger.error("Failed to play ringtone:", err));

    // Vibrate on mobile
    if (navigator.vibrate) {
      const vibrateInterval = setInterval(() => {
        navigator.vibrate([500, 500, 500]);
      }, 1500);

      return () => {
        clearInterval(vibrateInterval);
        navigator.vibrate(0);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [ringToneUrl, ringVolume]);

  // Pulsing animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRinging((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAccept = (withVideo: boolean) => {
    // Stop ringtone
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Stop vibration
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }

    onAccept(withVideo);
  };

  const handleDecline = () => {
    // Stop ringtone
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Stop vibration
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }

    onDecline();
  };

  const initials = callerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 p-8">
        {/* Caller Avatar with pulsing ring */}
        <div className="relative">
          {/* Pulsing outer ring */}
          <div
            className={cn(
              "bg-primary/30 absolute inset-0 rounded-full transition-transform duration-1000",
              isRinging ? "scale-125 opacity-0" : "scale-100 opacity-100",
            )}
            style={{
              width: "240px",
              height: "240px",
              top: "-40px",
              left: "-40px",
            }}
          />

          {/* Middle ring */}
          <div
            className={cn(
              "bg-primary/20 absolute inset-0 rounded-full transition-transform duration-1000",
              isRinging ? "scale-110 opacity-0" : "scale-100 opacity-100",
            )}
            style={{
              width: "200px",
              height: "200px",
              top: "-20px",
              left: "-20px",
            }}
          />

          {/* Avatar */}
          <Avatar className="border-primary/50 h-40 w-40 border-4">
            <AvatarImage src={callerAvatarUrl} alt={callerName} />
            <AvatarFallback className="text-primary-foreground bg-primary text-4xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Caller Info */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl font-bold text-white">{callerName}</h2>
          <p className="text-lg text-gray-300">
            Incoming {callType === "video" ? "video" : "voice"} call...
          </p>
        </div>

        {/* Call type indicator */}
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
          {callType === "video" ? (
            <>
              <Video className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-white">Video Call</span>
            </>
          ) : (
            <>
              <Phone className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-white">Voice Call</span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center gap-6">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-16 w-16 rounded-full bg-red-600 text-white transition-transform hover:scale-110 hover:bg-red-700"
              onClick={handleDecline}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
            <span className="text-sm text-gray-400">Decline</span>
          </div>

          {/* Accept with Audio */}
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-20 w-20 rounded-full bg-green-600 text-white shadow-lg shadow-green-600/50 transition-transform hover:scale-110 hover:bg-green-700"
              onClick={() => handleAccept(false)}
            >
              <Phone className="h-8 w-8" />
            </Button>
            <span className="text-sm text-gray-400">
              {callType === "video" ? "Accept (Audio Only)" : "Accept"}
            </span>
          </div>

          {/* Accept with Video (only for video calls) */}
          {callType === "video" && (
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 rounded-full bg-blue-600 text-white transition-transform hover:scale-110 hover:bg-blue-700"
                onClick={() => handleAccept(true)}
              >
                <Video className="h-7 w-7" />
              </Button>
              <span className="text-sm text-gray-400">Accept (Video)</span>
            </div>
          )}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span>Press Enter to accept</span>
          <span>•</span>
          <span>Press Esc to decline</span>
        </div>
      </div>
    </div>
  );
}
