"use client";

// ===============================================================================
// Telegram Voice Message Component
// ===============================================================================
//
// A voice message bubble with waveform visualization, play button,
// duration, and playback controls.
//
// ===============================================================================

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TELEGRAM_COLORS, TELEGRAM_BUBBLES } from "../config";
import { Play, Pause, Check, CheckCheck, Clock } from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface TelegramVoiceMessageProps {
  id: string;
  audioUrl: string;
  duration: number; // in seconds
  waveform?: number[]; // array of 0-1 values for waveform bars
  timestamp: Date;
  isOwn?: boolean;
  status?: "sending" | "sent" | "delivered" | "read";
  isPlayed?: boolean;
  isPlaying?: boolean;
  currentTime?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  className?: string;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function TelegramVoiceMessage({
  id,
  audioUrl,
  duration,
  waveform = generateDefaultWaveform(),
  timestamp,
  isOwn = false,
  status = "read",
  isPlayed = false,
  isPlaying = false,
  currentTime = 0,
  onPlay,
  onPause,
  onSeek,
  className,
}: TelegramVoiceMessageProps) {
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playing = isPlaying !== undefined ? isPlaying : localPlaying;
  const time = currentTime !== undefined ? currentTime : localTime;
  const progress = duration > 0 ? time / duration : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (playing) {
      onPause?.();
      audioRef.current?.pause();
      setLocalPlaying(false);
    } else {
      onPlay?.();
      audioRef.current?.play();
      setLocalPlaying(true);
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek?.(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setLocalTime(newTime);
  };

  const getStatusIcon = () => {
    switch (status) {
      case "sending":
        return <Clock className="h-3.5 w-3.5 text-white/60" />;
      case "sent":
        return <Check className="h-3.5 w-3.5 text-white/60" />;
      case "delivered":
        return <CheckCheck className="h-3.5 w-3.5 text-white/60" />;
      case "read":
        return (
          <CheckCheck
            className="h-3.5 w-3.5"
            style={{ color: TELEGRAM_COLORS.checkRead }}
          />
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setLocalTime(audio.currentTime);
    const handleEnded = () => {
      setLocalPlaying(false);
      setLocalTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  return (
    <div
      className={cn(
        "flex px-4",
        isOwn ? "justify-end" : "justify-start",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl px-3 py-2 shadow-sm",
          isOwn
            ? "rounded-br-sm bg-[#EFFDDE] dark:bg-[#2B5278]"
            : "rounded-bl-sm bg-white dark:bg-[#182533]",
        )}
        style={{ minWidth: TELEGRAM_BUBBLES.voice.minWidth }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- Voice message audio does not have captions */}
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors",
            isOwn ? "bg-[#4FAE4E] text-white" : "bg-[#2AABEE] text-white",
          )}
        >
          {playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" />
          )}
        </button>

        {/* Waveform */}
        <div className="min-w-0 flex-1">
          <div
            role="slider"
            tabIndex={0}
            aria-label="Voice message progress"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
            className="flex h-7 cursor-pointer items-center gap-0.5"
            onClick={handleWaveformClick}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                const newTime = Math.min(time + 5, duration);
                onSeek?.(newTime);
                if (audioRef.current) {
                  audioRef.current.currentTime = newTime;
                }
                setLocalTime(newTime);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                const newTime = Math.max(time - 5, 0);
                onSeek?.(newTime);
                if (audioRef.current) {
                  audioRef.current.currentTime = newTime;
                }
                setLocalTime(newTime);
              }
            }}
          >
            {waveform.map((value, index) => {
              const barProgress = index / waveform.length;
              const isPlayed = barProgress <= progress;

              return (
                <div
                  key={index}
                  className={cn(
                    "w-[3px] rounded-full transition-colors",
                    isPlayed
                      ? isOwn
                        ? "bg-[#4FAE4E]"
                        : "bg-[#2AABEE]"
                      : isOwn
                        ? "bg-[#A0D89A]"
                        : "bg-gray-300 dark:bg-gray-600",
                  )}
                  style={{
                    height: `${Math.max(value * 24, 4)}px`,
                  }}
                />
              );
            })}
          </div>

          {/* Duration & Time */}
          <div className="mt-1 flex items-center justify-between">
            <span
              className={cn(
                "text-xs",
                isOwn
                  ? "text-gray-600 dark:text-gray-300"
                  : "text-gray-500 dark:text-gray-400",
              )}
            >
              {playing || time > 0
                ? formatDuration(time)
                : formatDuration(duration)}
            </span>
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "text-[11px]",
                  isOwn
                    ? "text-gray-600 dark:text-gray-300"
                    : "text-gray-500 dark:text-gray-400",
                )}
              >
                {timestamp.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              {isOwn && getStatusIcon()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate a random-looking waveform for demo purposes
function generateDefaultWaveform(bars: number = 32): number[] {
  const waveform: number[] = [];
  for (let i = 0; i < bars; i++) {
    // Create a wave-like pattern with some randomness
    const base = Math.sin(i / 4) * 0.3 + 0.5;
    const random = Math.random() * 0.4;
    waveform.push(Math.min(1, Math.max(0.1, base + random - 0.2)));
  }
  return waveform;
}

export default TelegramVoiceMessage;
