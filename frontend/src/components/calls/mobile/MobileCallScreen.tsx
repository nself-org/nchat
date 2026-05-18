"use client";

/**
 * Mobile Call Screen
 *
 * Full-screen mobile-optimized call interface with touch controls,
 * gestures, and native mobile UI patterns.
 */

import * as React from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronDown,
  MoreVertical,
  Maximize2,
  Users,
} from "lucide-react";
import { useCallStore } from "@/stores/call-store";
import { formatCallDuration } from "@/components/call/call-controls";
import { useMobilePiP } from "@/hooks/use-mobile-pip";
import { useMobileOrientation } from "@/hooks/use-mobile-orientation";
import { useBatteryStatus } from "@/hooks/use-battery-status";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface MobileCallScreenProps {
  /** Whether the call screen is visible */
  isVisible: boolean;
  /** Callback when screen is minimized */
  onMinimize?: () => void;
  /** Callback when more options is opened */
  onOpenMore?: () => void;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Video Grid Component
// =============================================================================

interface VideoTileProps {
  stream: MediaStream;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isLocal?: boolean;
}

function VideoTile({
  stream,
  name,
  isMuted,
  isSpeaking,
  isLocal,
}: VideoTileProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-900">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- Live video call does not have captions */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="h-full w-full object-cover"
      />

      {/* Name badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 backdrop-blur-sm">
        {isMuted && <MicOff size={12} className="text-red-500" />}
        <span className="text-xs font-medium text-white">{name}</span>
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-green-500" />
      )}

      {/* Local indicator */}
      {isLocal && (
        <div className="absolute right-2 top-2 rounded-full bg-blue-500 px-2 py-1 text-xs text-white">
          You
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Touch Controls Component
// =============================================================================

interface TouchControlProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  variant?: "default" | "danger" | "primary";
  onPress: () => void;
  onLongPress?: () => void;
}

function TouchControl({
  icon,
  label,
  isActive,
  variant = "default",
  onPress,
  onLongPress,
}: TouchControlProps) {
  const [isPressed, setIsPressed] = React.useState(false);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    setIsPressed(true);
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (onLongPress) onLongPress();
        // Haptic feedback
        if ("vibrate" in navigator) {
          navigator.vibrate(50);
        }
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      onPress();
      // Light haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  const handleTouchCancel = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const getBackgroundColor = () => {
    if (variant === "danger") return "bg-red-500 active:bg-red-600";
    if (variant === "primary") return "bg-blue-500 active:bg-blue-600";
    if (isActive) return "bg-green-500 active:bg-green-600";
    return "bg-gray-800 active:bg-gray-700";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        type="button"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={onPress}
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg",
          "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900",
          "transition-all duration-150",
          getBackgroundColor(),
          isPressed && "scale-95",
        )}
        whileTap={{ scale: 0.9 }}
        aria-label={label}
      >
        {icon}
      </motion.button>
      <span className="text-xs text-white/80">{label}</span>
    </div>
  );
}

// =============================================================================
// Mobile Call Screen Component
// =============================================================================

export function MobileCallScreen({
  isVisible,
  onMinimize,
  onOpenMore,
  className,
}: MobileCallScreenProps) {
  const activeCall = useCallStore((state) => state.activeCall);
  const toggleLocalMute = useCallStore((state) => state.toggleLocalMute);
  const toggleLocalVideo = useCallStore((state) => state.toggleLocalVideo);
  const endCall = useCallStore((state) => state.endCall);

  const { orientation, isPortrait } = useMobileOrientation();
  const { batteryLevel, isLowBattery } = useBatteryStatus();
  const { enablePiP, isPiPSupported } = useMobilePiP();

  const [callDuration, setCallDuration] = React.useState(0);
  const [showControls, setShowControls] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 150], [1, 0]);
  const scale = useTransform(y, [0, 150], [1, 0.8]);

  // Update call duration
  React.useEffect(() => {
    if (!activeCall || activeCall.state !== "connected") return;

    const interval = setInterval(() => {
      if (activeCall.connectedAt) {
        const duration = Math.floor(
          (Date.now() - new Date(activeCall.connectedAt).getTime()) / 1000,
        );
        setCallDuration(duration);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall]);

  // Auto-hide controls after 3 seconds
  React.useEffect(() => {
    if (!showControls) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls]);

  // Handle drag to minimize
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.y > 100) {
      onMinimize?.();
    }
  };

  // Toggle controls on tap
  const handleScreenTap = () => {
    setShowControls((prev) => !prev);
  };

  // Toggle fullscreen
  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      logger.error("Failed to toggle fullscreen:", err);
    }
  };

  // Handle end call
  const handleEndCall = () => {
    endCall("completed");
  };

  if (!isVisible || !activeCall) {
    return null;
  }

  const isVideoCall = activeCall.type === "video";
  const isMuted = activeCall.isLocalMuted;
  const isVideoEnabled = activeCall.isLocalVideoEnabled;
  const participants = Array.from(activeCall.participants.values());
  const localStream = activeCall.localStream;
  const remoteStreams = Array.from(activeCall.remoteStreams.entries());

  return (
    <motion.div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-gray-900",
        "safe-area-inset", // Use safe area for notch/home indicator
        className,
      )}
      style={{ opacity, scale }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Top Bar (Draggable) */}
      <motion.div
        className="relative flex-none"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-12 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <motion.div
          className="flex items-center justify-between px-4 py-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
        >
          <div className="flex items-center gap-3">
            {/* Minimize Button */}
            <button
              type="button"
              onClick={onMinimize}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <ChevronDown size={20} className="text-white" />
            </button>

            {/* Call Info */}
            <div>
              <h2 className="font-semibold text-white">
                {participants.length === 1
                  ? participants[0].name
                  : `Group Call (${participants.length + 1})`}
              </h2>
              <p className="text-sm text-white/60">
                {activeCall.state === "connected"
                  ? formatCallDuration(callDuration)
                  : activeCall.state}
              </p>
            </div>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-2">
            {/* Battery Warning */}
            {isLowBattery && (
              <div className="rounded-full bg-yellow-400/20 px-2 py-1 text-xs text-yellow-400">
                {batteryLevel}%
              </div>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleFullscreen}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <Maximize2 size={18} className="text-white" />
            </button>

            {/* More Options */}
            {onOpenMore && (
              <button
                type="button"
                onClick={onOpenMore}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
              >
                <MoreVertical size={18} className="text-white" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Video Grid */}
      <div
        role="button"
        tabIndex={0}
        className="relative flex-1"
        onClick={handleScreenTap}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleScreenTap();
          }
        }}
        onTouchStart={handleScreenTap}
      >
        {isVideoCall ? (
          <div
            className={cn(
              "h-full w-full p-2",
              isPortrait ? "flex flex-col gap-2" : "flex gap-2",
            )}
          >
            {/* Remote Streams */}
            {remoteStreams.map(([participantId, stream]) => {
              const participant = participants.find(
                (p) => p.id === participantId,
              );
              return (
                <div key={participantId} className="flex-1">
                  <VideoTile
                    stream={stream}
                    name={participant?.name || "Unknown"}
                    isMuted={participant?.isMuted || false}
                    isSpeaking={participant?.isSpeaking || false}
                  />
                </div>
              );
            })}

            {/* Local Stream (Picture-in-Picture) */}
            {localStream && isVideoEnabled && (
              <motion.div
                className={cn(
                  "absolute bottom-20 right-4 z-10 h-32 w-24",
                  isPortrait ? "h-32 w-24" : "h-24 w-32",
                )}
                drag
                dragConstraints={{
                  top: 0,
                  left: 0,
                  right: window.innerWidth - 96,
                  bottom: window.innerHeight - 128,
                }}
                dragElastic={0.1}
              >
                <VideoTile
                  stream={localStream}
                  name="You"
                  isMuted={isMuted}
                  isSpeaking={false}
                  isLocal
                />
              </motion.div>
            )}
          </div>
        ) : (
          // Audio-only call - show avatar
          <div className="flex h-full items-center justify-center">
            {participants[0] && (
              <div className="text-center">
                <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-gray-800">
                  <Users size={48} className="text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  {participants[0].name}
                </h3>
                <p className="mt-2 text-white/60">
                  {formatCallDuration(callDuration)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <motion.div
        className="pb-safe flex-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
      >
        <div className="flex items-center justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent px-4 py-6">
          {/* Mute Toggle */}
          <TouchControl
            icon={isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            label={isMuted ? "Unmute" : "Mute"}
            isActive={!isMuted}
            onPress={toggleLocalMute}
          />

          {/* Video Toggle (Video Calls Only) */}
          {isVideoCall && (
            <TouchControl
              icon={
                isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />
              }
              label={isVideoEnabled ? "Stop Video" : "Start Video"}
              isActive={isVideoEnabled}
              onPress={toggleLocalVideo}
            />
          )}

          {/* End Call */}
          <TouchControl
            icon={<PhoneOff size={24} />}
            label="End"
            variant="danger"
            onPress={handleEndCall}
          />

          {/* Speaker Toggle */}
          <TouchControl
            icon={<Volume2 size={24} />}
            label="Speaker"
            isActive
            onPress={() => {
              // Toggle speaker
            }}
          />

          {/* Picture-in-Picture (if supported) */}
          {isPiPSupported && isVideoCall && (
            <TouchControl
              icon={<Maximize2 size={24} />}
              label="PiP"
              onPress={enablePiP}
            />
          )}
        </div>
      </motion.div>

      {/* Low Battery Warning */}
      {isLowBattery &&
        activeCall.state === "connected" &&
        callDuration > 60 && (
          <motion.div
            className="absolute left-4 right-4 top-20 rounded-lg bg-yellow-500/90 p-3 text-sm text-black backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-medium">Low Battery ({batteryLevel}%)</p>
            <p className="mt-1 text-xs">
              Consider switching to audio-only to save battery.
            </p>
          </motion.div>
        )}
    </motion.div>
  );
}

// =============================================================================
// Styles
// =============================================================================

// Add these CSS classes to your global styles
/*
.safe-area-inset {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.pb-safe {
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
}
*/
