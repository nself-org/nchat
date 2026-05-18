"use client";

/**
 * Extended Message Content Renderer
 *
 * Unified component for rendering all message types including:
 * - Text, rich text, markdown, code blocks
 * - Media (images, videos, audio, voice, GIFs)
 * - Files and documents
 * - Polls and stickers
 * - Location and contact cards
 * - Forwarded messages
 * - System events
 */

import { useState, useCallback, memo, useMemo } from "react";
import { format } from "date-fns";
import {
  MapPin,
  Navigation,
  Phone,
  Mail,
  Building2,
  User,
  ExternalLink,
  Copy,
  Check,
  Forward,
  Quote,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  FileText,
  File,
  Archive,
  Code,
  Globe,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MessageContent } from "./message-content";
import { PollDisplay } from "./poll-display";
import type {
  ExtendedMessage,
  ExtendedMessageType,
  LocationMessageData,
  LiveLocationData,
  ContactCardData,
  ForwardAttribution,
  RichEmbed,
  CodeBlockData,
  isSystemMessageType,
  getGoogleMapsUrl,
  getAppleMapsUrl,
  formatLocation,
  formatContactName,
  getPrimaryPhone,
  getPrimaryEmail,
} from "@/types/message-extended";

// ============================================================================
// PROPS TYPES
// ============================================================================

interface ExtendedMessageContentProps {
  message: ExtendedMessage;
  currentUserId?: string;
  onForwardClick?: () => void;
  onLocationClick?: (location: LocationMessageData) => void;
  onContactClick?: (contact: ContactCardData) => void;
  onPollVote?: (pollId: string, optionIds: string[]) => void;
  onOriginalMessageClick?: (messageId: string) => void;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ExtendedMessageContent = memo(function ExtendedMessageContent({
  message,
  currentUserId,
  onForwardClick,
  onLocationClick,
  onContactClick,
  onPollVote,
  onOriginalMessageClick,
  className,
}: ExtendedMessageContentProps) {
  const messageType = message.extendedType || message.type;

  // Render based on message type
  switch (messageType) {
    // Location messages
    case "location":
      return (
        <LocationMessageContent
          locationData={message.locationData!}
          onClick={() => onLocationClick?.(message.locationData!)}
          className={className}
        />
      );

    case "live_location":
      return (
        <LiveLocationMessageContent
          liveLocationData={message.liveLocationData!}
          onClick={() => onLocationClick?.(message.liveLocationData!)}
          className={className}
        />
      );

    // Contact messages
    case "contact":
    case "contact_card":
      return (
        <ContactMessageContent
          contact={message.contactData!}
          onClick={() => onContactClick?.(message.contactData!)}
          className={className}
        />
      );

    // Forward/Quote messages
    case "forward":
    case "quote":
      return (
        <ForwardedMessageContent
          message={message}
          forwardAttribution={message.forwardAttribution!}
          isQuote={messageType === "quote"}
          onOriginalClick={() =>
            onOriginalMessageClick?.(
              message.forwardAttribution!.originalMessageId,
            )
          }
          className={className}
        />
      );

    // Code blocks
    case "code_block":
      return (
        <CodeBlockMessageContent
          codeBlocks={message.codeBlocks || []}
          content={message.content}
          className={className}
        />
      );

    // Poll messages
    case "poll":
    case "quiz":
      if (message.poll) {
        return (
          <PollDisplay
            // @ts-expect-error Poll type from types/poll.ts vs lib/messages/polls.ts have compatible shapes at runtime
            poll={message.poll}
            currentUserId={currentUserId || ""}
            // @ts-expect-error onPollVote returns void but PollDisplay expects Promise<void>; works at runtime
            onVote={
              onPollVote
                ? (pollId, optionIds) => onPollVote(pollId, optionIds)
                : undefined
            }
            className={className}
          />
        );
      }
      return <MessageContent content={message.content} className={className} />;

    // GIF messages
    case "gif":
      return (
        <GifMessageContent
          gifUrl={message.gifUrl || ""}
          gifMetadata={message.gifMetadata}
          caption={message.content}
          className={className}
        />
      );

    // Voice messages
    case "voice":
      return (
        <VoiceMessageContent
          voiceData={message.voiceMessage}
          className={className}
        />
      );

    // Rich embeds
    case "rich_text":
      return (
        <RichEmbedMessageContent
          content={message.content}
          contentHtml={message.contentHtml}
          embeds={message.embeds || []}
          className={className}
        />
      );

    // Default text rendering with potential embeds
    default:
      // Check if this is a system message
      if (isSystemMessageTypeCheck(messageType as ExtendedMessageType)) {
        return <SystemEventContent message={message} className={className} />;
      }

      // Regular text message with optional embeds
      return (
        <div className={cn("space-y-2", className)}>
          <MessageContent
            content={message.content}
            contentHtml={message.contentHtml}
          />
          {message.embeds && message.embeds.length > 0 && (
            <div className="space-y-2">
              {message.embeds.map((embed, index) => (
                <EmbedCard key={index} embed={embed} />
              ))}
            </div>
          )}
        </div>
      );
  }
});

// ============================================================================
// LOCATION MESSAGE COMPONENT
// ============================================================================

interface LocationMessageContentProps {
  locationData: LocationMessageData;
  onClick?: () => void;
  className?: string;
}

const LocationMessageContent = memo(function LocationMessageContent({
  locationData,
  onClick,
  className,
}: LocationMessageContentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCoords = useCallback(() => {
    const coords = `${locationData.location.latitude}, ${locationData.location.longitude}`;
    navigator.clipboard.writeText(coords);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [locationData]);

  const googleMapsUrl = useMemo(
    () =>
      `https://www.google.com/maps?q=${locationData.location.latitude},${locationData.location.longitude}`,
    [locationData],
  );

  const appleMapsUrl = useMemo(
    () =>
      `https://maps.apple.com/?ll=${locationData.location.latitude},${locationData.location.longitude}`,
    [locationData],
  );

  return (
    <Card
      className={cn(
        "max-w-sm cursor-pointer overflow-hidden transition-shadow hover:shadow-md",
        className,
      )}
      onClick={onClick}
    >
      {/* Static Map Preview */}
      {locationData.staticMapUrl ? (
        <div className="relative aspect-video w-full bg-muted">
          <img
            src={locationData.staticMapUrl}
            alt="Location map"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-red-500 p-2 shadow-lg">
              <MapPin className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-muted">
          <MapPin className="h-12 w-12 text-muted-foreground" />
        </div>
      )}

      <CardContent className="p-3">
        {/* Location Name/Address */}
        <div className="space-y-1">
          {locationData.name && (
            <h4 className="font-semibold">{locationData.name}</h4>
          )}
          {locationData.venue && (
            <p className="text-sm text-muted-foreground">
              {locationData.venue}
            </p>
          )}
          {locationData.address && (
            <p className="text-sm text-muted-foreground">
              {locationData.address}
            </p>
          )}
          <p className="font-mono text-xs text-muted-foreground">
            {locationData.location.latitude.toFixed(6)},{" "}
            {locationData.location.longitude.toFixed(6)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <Globe className="mr-1 h-3 w-3" />
              Google Maps
            </a>
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyCoords();
                  }}
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy coordinates</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// LIVE LOCATION MESSAGE COMPONENT
// ============================================================================

interface LiveLocationMessageContentProps {
  liveLocationData: LiveLocationData;
  onClick?: () => void;
  className?: string;
}

const LiveLocationMessageContent = memo(function LiveLocationMessageContent({
  liveLocationData,
  onClick,
  className,
}: LiveLocationMessageContentProps) {
  const isActive =
    liveLocationData.isActive &&
    new Date() < new Date(liveLocationData.expiresAt);

  return (
    <Card
      className={cn(
        "max-w-sm cursor-pointer overflow-hidden transition-shadow hover:shadow-md",
        isActive && "border-green-500/50",
        className,
      )}
      onClick={onClick}
    >
      {/* Map Preview */}
      <div className="relative aspect-video w-full bg-muted">
        {liveLocationData.staticMapUrl ? (
          <img
            src={liveLocationData.staticMapUrl}
            alt="Live location"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Navigation className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className={cn(
              "rounded-full p-2 shadow-lg",
              isActive ? "bg-green-500" : "bg-gray-500",
            )}
            animate={isActive ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Navigation className="h-5 w-5 text-white" />
          </motion.div>
        </div>
        {isActive && (
          <div className="absolute left-2 top-2">
            <Badge variant="default" className="bg-green-500">
              <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
              Live
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Live Location</span>
            <span className="text-xs text-muted-foreground">
              {isActive ? "Sharing" : "Ended"}
            </span>
          </div>
          {liveLocationData.address && (
            <p className="text-sm text-muted-foreground">
              {liveLocationData.address}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Last updated:{" "}
            {format(new Date(liveLocationData.lastUpdatedAt), "h:mm a")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// CONTACT MESSAGE COMPONENT
// ============================================================================

interface ContactMessageContentProps {
  contact: ContactCardData;
  onClick?: () => void;
  className?: string;
}

const ContactMessageContent = memo(function ContactMessageContent({
  contact,
  onClick,
  className,
}: ContactMessageContentProps) {
  const primaryPhone =
    contact.phones?.find((p) => p.isPrimary)?.number ||
    contact.phones?.[0]?.number;
  const primaryEmail =
    contact.emails?.find((e) => e.isPrimary)?.email ||
    contact.emails?.[0]?.email;

  return (
    <Card
      className={cn(
        "max-w-xs cursor-pointer transition-shadow hover:shadow-md",
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Contact Header */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} />}
            <AvatarFallback>
              {contact.firstName?.[0]?.toUpperCase() || (
                <User className="h-6 w-6" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-semibold">{contact.displayName}</h4>
            {contact.organization && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{contact.organization}</span>
              </div>
            )}
            {contact.jobTitle && (
              <p className="truncate text-xs text-muted-foreground">
                {contact.jobTitle}
              </p>
            )}
          </div>
        </div>

        {/* Contact Info */}
        {(primaryPhone || primaryEmail) && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              {primaryPhone && (
                <a
                  href={`tel:${primaryPhone}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-4 w-4" />
                  {primaryPhone}
                </a>
              )}
              {primaryEmail && (
                <a
                  href={`mailto:${primaryEmail}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{primaryEmail}</span>
                </a>
              )}
            </div>
          </>
        )}

        {/* View Details Button */}
        <Button variant="outline" size="sm" className="mt-3 w-full">
          View Details
        </Button>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// FORWARDED MESSAGE COMPONENT
// ============================================================================

interface ForwardedMessageContentProps {
  message: ExtendedMessage;
  forwardAttribution: ForwardAttribution;
  isQuote?: boolean;
  onOriginalClick?: () => void;
  className?: string;
}

const ForwardedMessageContent = memo(function ForwardedMessageContent({
  message,
  forwardAttribution,
  isQuote = false,
  onOriginalClick,
  className,
}: ForwardedMessageContentProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Forward Header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isQuote ? (
          <Quote className="h-3 w-3" />
        ) : (
          <Forward className="h-3 w-3" />
        )}
        <span>
          {isQuote ? "Quoted from" : "Forwarded from"}{" "}
          <button
            onClick={onOriginalClick}
            className="font-medium text-primary hover:underline"
          >
            {forwardAttribution.originalAuthor.displayName}
          </button>
          {forwardAttribution.originalChannelName && (
            <>
              {" in "}
              <span className="font-medium">
                #{forwardAttribution.originalChannelName}
              </span>
            </>
          )}
        </span>
        <span className="text-muted-foreground/70">
          {format(new Date(forwardAttribution.originalSentAt), "MMM d, h:mm a")}
        </span>
      </div>

      {/* Forwarded Content */}
      <div
        className={cn(
          "rounded-lg border-l-2 pl-3",
          isQuote
            ? "border-l-primary/50 bg-muted/30"
            : "border-l-muted-foreground/30",
        )}
      >
        <MessageContent
          content={message.content}
          contentHtml={message.contentHtml}
        />
      </div>

      {/* Forward Chain (multi-hop) */}
      {forwardAttribution.forwardChain &&
        forwardAttribution.forwardChain.length > 1 && (
          <div className="text-xs text-muted-foreground">
            Forwarded {forwardAttribution.forwardChain.length} times
          </div>
        )}
    </div>
  );
});

// ============================================================================
// CODE BLOCK MESSAGE COMPONENT
// ============================================================================

interface CodeBlockMessageContentProps {
  codeBlocks: CodeBlockData[];
  content: string;
  className?: string;
}

const CodeBlockMessageContent = memo(function CodeBlockMessageContent({
  codeBlocks,
  content,
  className,
}: CodeBlockMessageContentProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = useCallback((code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  if (codeBlocks.length === 0) {
    return <MessageContent content={content} className={className} />;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {codeBlocks.map((block, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-lg border bg-muted/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-muted px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Code className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {block.language || "Plain text"}
              </span>
              {block.filename && (
                <span className="text-xs text-muted-foreground/70">
                  {block.filename}
                </span>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopy(block.code, index)}
                  >
                    {copiedIndex === index ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {copiedIndex === index ? "Copied!" : "Copy code"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Code */}
          <pre className="overflow-x-auto p-3">
            <code className="font-mono text-xs">{block.code}</code>
          </pre>

          {/* Source link */}
          {block.sourceUrl && (
            <div className="border-t px-3 py-1.5">
              <a
                href={block.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View source
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// GIF MESSAGE COMPONENT
// ============================================================================

interface GifMessageContentProps {
  gifUrl: string;
  gifMetadata?: {
    id?: string;
    width: number;
    height: number;
    previewUrl?: string;
    title?: string;
    source?: "giphy" | "tenor" | "custom";
  };
  caption?: string;
  className?: string;
}

const GifMessageContent = memo(function GifMessageContent({
  gifUrl,
  gifMetadata,
  caption,
  className,
}: GifMessageContentProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Calculate dimensions
  const maxWidth = 400;
  const width = gifMetadata?.width || maxWidth;
  const height = gifMetadata?.height || 300;
  const aspectRatio = width / height;
  const displayWidth = Math.min(width, maxWidth);
  const displayHeight = displayWidth / aspectRatio;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className="relative overflow-hidden rounded-lg border bg-muted/30"
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          maxWidth: "100%",
        }}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          </div>
        )}

        {hasError && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">Failed to load GIF</p>
          </div>
        )}

        <img
          src={gifUrl}
          alt={gifMetadata?.title || "GIF"}
          className={cn(
            "h-full w-full object-contain transition-opacity",
            isLoaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />

        {/* Source badge */}
        {gifMetadata?.source && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs opacity-70">
              {gifMetadata.source}
            </Badge>
          </div>
        )}
      </div>

      {caption && <p className="text-sm text-muted-foreground">{caption}</p>}
    </div>
  );
});

// ============================================================================
// VOICE MESSAGE COMPONENT
// ============================================================================

interface VoiceMessageContentProps {
  voiceData?: {
    url: string;
    duration: number;
    waveform?: number[];
    transcript?: string;
    size: number;
    format: string;
  };
  className?: string;
}

const VoiceMessageContent = memo(function VoiceMessageContent({
  voiceData,
  className,
}: VoiceMessageContentProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!voiceData) {
    return (
      <p className="text-sm text-muted-foreground">Voice message unavailable</p>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg bg-muted/30 p-3",
        className,
      )}
    >
      {/* Play/Pause Button */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="ml-0.5 h-4 w-4" />
        )}
      </Button>

      {/* Waveform */}
      <div className="flex-1">
        <div className="flex h-8 items-center gap-0.5">
          {(voiceData.waveform || Array(40).fill(0.5)).map((val, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-colors",
                progress > (i / 40) * 100
                  ? "bg-primary"
                  : "bg-muted-foreground/30",
              )}
              style={{ height: `${Math.max(20, val * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDuration((progress * voiceData.duration) / 100)}</span>
          <span>{formatDuration(voiceData.duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsMuted(!isMuted)}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      {/* Transcript (if available) */}
      {voiceData.transcript && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">{voiceData.transcript}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

// ============================================================================
// RICH EMBED MESSAGE COMPONENT
// ============================================================================

interface RichEmbedMessageContentProps {
  content: string;
  contentHtml?: string;
  embeds: RichEmbed[];
  className?: string;
}

const RichEmbedMessageContent = memo(function RichEmbedMessageContent({
  content,
  contentHtml,
  embeds,
  className,
}: RichEmbedMessageContentProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <MessageContent content={content} contentHtml={contentHtml} />
      {embeds.map((embed, index) => (
        <EmbedCard key={index} embed={embed} />
      ))}
    </div>
  );
});

// ============================================================================
// EMBED CARD COMPONENT
// ============================================================================

interface EmbedCardProps {
  embed: RichEmbed;
  className?: string;
}

const EmbedCard = memo(function EmbedCard({
  embed,
  className,
}: EmbedCardProps) {
  return (
    <Card
      className={cn("max-w-lg overflow-hidden", className)}
      style={{
        borderLeftColor: embed.color,
        borderLeftWidth: embed.color ? 3 : 1,
      }}
    >
      <CardContent className="p-3">
        {/* Provider */}
        {embed.provider && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            {embed.providerIcon && (
              <img src={embed.providerIcon} alt="" className="h-4 w-4" />
            )}
            <span>{embed.provider}</span>
          </div>
        )}

        {/* Author */}
        {embed.author && (
          <div className="mb-2 flex items-center gap-2">
            {embed.authorIcon && (
              <img
                src={embed.authorIcon}
                alt=""
                className="h-5 w-5 rounded-full"
              />
            )}
            {embed.authorUrl ? (
              <a
                href={embed.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {embed.author}
              </a>
            ) : (
              <span className="text-sm font-medium">{embed.author}</span>
            )}
          </div>
        )}

        {/* Title */}
        {embed.title && (
          <h4 className="font-semibold">
            {embed.url ? (
              <a
                href={embed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {embed.title}
              </a>
            ) : (
              embed.title
            )}
          </h4>
        )}

        {/* Description */}
        {embed.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
            {embed.description}
          </p>
        )}

        {/* Thumbnail */}
        {embed.thumbnailUrl && (
          <div className="mt-2">
            <img
              src={embed.thumbnailUrl}
              alt=""
              className="max-h-48 rounded-md object-cover"
              style={{
                maxWidth: embed.thumbnailWidth
                  ? `${embed.thumbnailWidth}px`
                  : "100%",
              }}
            />
          </div>
        )}

        {/* Fields */}
        {embed.fields && embed.fields.length > 0 && (
          <div
            className="mt-2 grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            }}
          >
            {embed.fields.map((field, index) => (
              <div key={index} className={cn(!field.inline && "col-span-full")}>
                <div className="text-xs font-semibold">{field.name}</div>
                <div className="text-sm text-muted-foreground">
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {(embed.footer || embed.timestamp) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {embed.footerIcon && (
              <img src={embed.footerIcon} alt="" className="h-4 w-4" />
            )}
            {embed.footer && <span>{embed.footer}</span>}
            {embed.footer && embed.timestamp && <span>•</span>}
            {embed.timestamp && (
              <span>{format(new Date(embed.timestamp), "MMM d, yyyy")}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================================
// SYSTEM EVENT COMPONENT
// ============================================================================

interface SystemEventContentProps {
  message: ExtendedMessage;
  className?: string;
}

const SystemEventContent = memo(function SystemEventContent({
  message,
  className,
}: SystemEventContentProps) {
  const systemData = message.systemData;

  if (!systemData) {
    return (
      <div
        className={cn("text-center text-sm text-muted-foreground", className)}
      >
        {message.content || "System message"}
      </div>
    );
  }

  const actorName = systemData.actor?.displayName || "Someone";
  const targetName = systemData.targetUser?.displayName || "someone";

  const getEventText = () => {
    switch (systemData.eventType) {
      case "user_joined":
        return (
          <>
            <strong>{actorName}</strong> joined the channel
          </>
        );
      case "user_left":
        return (
          <>
            <strong>{actorName}</strong> left the channel
          </>
        );
      case "user_added":
        return (
          <>
            <strong>{actorName}</strong> added <strong>{targetName}</strong> to
            the channel
          </>
        );
      case "user_removed":
        return (
          <>
            <strong>{actorName}</strong> removed <strong>{targetName}</strong>{" "}
            from the channel
          </>
        );
      case "user_banned":
        return (
          <>
            <strong>{targetName}</strong> was banned by{" "}
            <strong>{actorName}</strong>
          </>
        );
      case "channel_renamed":
        return (
          <>
            <strong>{actorName}</strong> renamed the channel to{" "}
            <strong>{systemData.newValue as string}</strong>
          </>
        );
      case "topic_changed":
        return (
          <>
            <strong>{actorName}</strong> changed the topic to "
            {systemData.newValue as string}"
          </>
        );
      case "message_pinned":
        return (
          <>
            <strong>{actorName}</strong> pinned a message
          </>
        );
      case "call_started":
        return (
          <>
            <strong>{actorName}</strong> started a call
          </>
        );
      case "call_ended":
        const duration = systemData.duration;
        return (
          <>
            Call ended
            {duration
              ? ` (${Math.floor(duration / 60)}m ${duration % 60}s)`
              : ""}
          </>
        );
      default:
        return message.content || "System event";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-2 text-center text-xs text-muted-foreground",
        className,
      )}
    >
      <span>{getEventText()}</span>
    </div>
  );
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isSystemMessageTypeCheck(type: ExtendedMessageType): boolean {
  const systemTypes: ExtendedMessageType[] = [
    "system",
    "user_joined",
    "user_left",
    "user_added",
    "user_removed",
    "user_banned",
    "user_unbanned",
    "user_muted",
    "user_unmuted",
    "role_assigned",
    "role_removed",
    "channel_created",
    "channel_renamed",
    "channel_archived",
    "channel_unarchived",
    "channel_deleted",
    "topic_changed",
    "description_changed",
    "icon_changed",
    "message_pinned",
    "message_unpinned",
    "call_started",
    "call_ended",
    "call_missed",
    "screen_share_started",
    "screen_share_ended",
    "recording_started",
    "recording_stopped",
    "thread_created",
    "thread_resolved",
    "integration",
    "bot_message",
    "webhook_message",
    "message_deleted",
    "message_edited_by_mod",
    "auto_moderation",
    "spam_detected",
    "warning_issued",
  ];
  return systemTypes.includes(type);
}
