"use client";

/**
 * Audio Call Component
 * Provides audio-only call functionality
 */

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

export interface AudioCallProps {
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  onEnd?: () => void;
  className?: string;
}

export function AudioCall({
  participantId,
  participantName,
  participantAvatar,
  onEnd,
  className,
}: AudioCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onEnd?.();
  };

  return (
    <div
      className={cn("flex flex-col items-center justify-center p-8", className)}
    >
      <Avatar className="h-24 w-24">
        <AvatarImage src={participantAvatar} alt={participantName} />
        <AvatarFallback className="text-2xl">
          {participantName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <h2 className="mt-4 text-xl font-semibold">{participantName}</h2>
      <p className="mt-2 text-muted-foreground">
        {formatDuration(callDuration)}
      </p>

      <div className="mt-8 flex items-center gap-4">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          className="h-14 w-14 rounded-full"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          className="h-16 w-16 rounded-full"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-7 w-7" />
        </Button>

        <Button
          variant={isSpeakerOn ? "secondary" : "outline"}
          size="lg"
          className="h-14 w-14 rounded-full"
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
        >
          {isSpeakerOn ? (
            <Volume2 className="h-6 w-6" />
          ) : (
            <VolumeX className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default AudioCall;
