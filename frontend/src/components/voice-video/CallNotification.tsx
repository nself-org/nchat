/**
 * CallNotification Component
 *
 * Incoming call notification/modal with accept/decline actions.
 * Features:
 * - Caller information display
 * - Accept with video/audio options
 * - Decline button
 * - Ringtone support
 * - Auto-dismiss after timeout
 * - Call type indicator (voice/video)
 * - Multiple call queue handling
 */

"use client";

import React, { useEffect, useState, useRef } from "react";
import { Phone, PhoneOff, Video, VideoOff, User, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// =============================================================================
// Types
// =============================================================================

export interface IncomingCallData {
  /** Call ID */
  id: string;
  /** Caller ID */
  callerId: string;
  /** Caller name */
  callerName: string;
  /** Caller avatar URL */
  callerAvatarUrl?: string;
  /** Call type */
  type: "voice" | "video";
  /** Channel info (for group calls) */
  channelId?: string;
  channelName?: string;
  /** When call was received */
  receivedAt: Date;
}

export interface CallNotificationProps {
  /** Incoming call data */
  call: IncomingCallData | null;
  /** Auto-dismiss timeout in seconds (default: 30) */
  timeout?: number;
  /** Ringtone audio URL */
  ringtoneUrl?: string;
  /** Ringtone volume (0-1) */
  ringtoneVolume?: number;
  /** Callbacks */
  onAccept: (callId: string, withVideo: boolean) => void;
  onDecline: (callId: string) => void;
  onTimeout?: (callId: string) => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CallNotification({
  call,
  timeout = 30,
  ringtoneUrl = "/sounds/ringtone.mp3",
  ringtoneVolume = 0.5,
  onAccept,
  onDecline,
  onTimeout,
  className,
}: CallNotificationProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(ringtoneUrl);
      audioRef.current.loop = true;
      audioRef.current.volume = ringtoneVolume;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [ringtoneUrl, ringtoneVolume]);

  // Play ringtone and start timer when call comes in
  useEffect(() => {
    if (call) {
      // Play ringtone
      if (audioRef.current) {
        audioRef.current.play().catch((error) => {
          console.error("Failed to play ringtone:", error);
        });
      }

      // Reset timer
      setTimeRemaining(timeout);

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Timeout reached
            if (onTimeout) {
              onTimeout(call.id);
            }
            handleDecline();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Stop ringtone and clear timer
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [call, timeout, onTimeout]);

  // Handle accept with video
  const handleAcceptVideo = () => {
    if (!call) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onAccept(call.id, true);
  };

  // Handle accept audio only
  const handleAcceptAudio = () => {
    if (!call) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onAccept(call.id, false);
  };

  // Handle decline
  const handleDecline = () => {
    if (!call) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onDecline(call.id);
  };

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get caller initials
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AnimatePresence>
      {call && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed left-1/2 top-20 z-50 -translate-x-1/2 transform",
            className,
          )}
        >
          <Card className="w-96 overflow-hidden border-2 border-blue-500 shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {call.type === "video" ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <Phone className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    Incoming {call.type === "video" ? "Video" : "Voice"} Call
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDecline}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Caller info */}
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-blue-500 ring-offset-4">
                  <AvatarImage
                    src={call.callerAvatarUrl}
                    alt={call.callerName}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white">
                    {getInitials(call.callerName)}
                  </AvatarFallback>
                </Avatar>
                {/* Pulsing ring animation */}
                <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-blue-500 opacity-20" />
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {call.callerName}
                </h3>
                {call.channelName && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Calling in #{call.channelName}
                  </p>
                )}
              </div>

              {/* Timer */}
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(timeRemaining)}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              {/* Decline */}
              <Button
                variant="destructive"
                size="lg"
                onClick={handleDecline}
                className="flex-1"
              >
                <PhoneOff className="mr-2 h-5 w-5" />
                Decline
              </Button>

              {/* Accept (audio only) */}
              <Button
                variant="secondary"
                size="lg"
                onClick={handleAcceptAudio}
                className="flex-1"
              >
                <Phone className="mr-2 h-5 w-5" />
                Audio
              </Button>

              {/* Accept (with video) - only for video calls or give option */}
              <Button
                variant="default"
                size="lg"
                onClick={handleAcceptVideo}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Video className="mr-2 h-5 w-5" />
                Video
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
