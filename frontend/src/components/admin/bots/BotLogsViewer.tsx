/**
 * Bot Logs Viewer Component
 *
 * Real-time log streaming with filtering, search, and download capabilities.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Download,
  Trash2,
  Search,
  Filter,
  Play,
  Pause,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  botId: string;
}

interface BotLogsViewerProps {
  botId: string;
  botName: string;
  logs?: LogEntry[];
  streaming?: boolean;
  onToggleStreaming?: () => void;
  onClearLogs?: () => void;
  onDownloadLogs?: () => void;
  onRefresh?: () => void;
}

// Mock log generator for demo
const generateMockLog = (botId: string, id: number): LogEntry => {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  const messages = [
    "Bot initialized successfully",
    "Received message event from channel #general",
    "Executing command: /help",
    "Permission check passed for user @john",
    "Sending response to channel #random",
    "Rate limit warning: approaching threshold",
    "Error: Failed to connect to external API",
    "Debug: Processing message queue",
    "Message sent successfully",
    "Command execution completed in 145ms",
  ];

  const level = levels[Math.floor(Math.random() * levels.length)];
  const message = messages[Math.floor(Math.random() * messages.length)];

  return {
    id: `log-${id}`,
    timestamp: new Date(),
    level,
    message,
    metadata: {
      channelId: "ch-123",
      userId: "user-456",
      duration: Math.floor(Math.random() * 500),
    },
    botId,
  };
};

export function BotLogsViewer({
  botId,
  botName,
  logs: initialLogs = [],
  streaming = false,
  onToggleStreaming,
  onClearLogs,
  onDownloadLogs,
  onRefresh,
}: BotLogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(
    new Set(["debug", "info", "warn", "error"]),
  );
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const logCounter = useRef(logs.length);

  // Generate mock logs for demo
  useEffect(() => {
    if (streaming) {
      const interval = setInterval(() => {
        const newLog = generateMockLog(botId, logCounter.current++);
        setLogs((prev) => [...prev, newLog].slice(-1000)); // Keep last 1000 logs
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [streaming, botId]);

  // Filter logs
  useEffect(() => {
    let result = logs;

    // Filter by level
    result = result.filter((log) => selectedLevels.has(log.level));

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          JSON.stringify(log.metadata).toLowerCase().includes(query),
      );
    }

    setFilteredLogs(result);
  }, [logs, selectedLevels, searchQuery]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [filteredLogs, autoScroll]);

  // Toggle log level filter
  const toggleLevel = (level: LogLevel) => {
    const newLevels = new Set(selectedLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setSelectedLevels(newLevels);
  };

  // Get log level icon and color
  const getLogLevelConfig = (level: LogLevel) => {
    const configs = {
      debug: {
        icon: Bug,
        color: "text-muted-foreground",
        bg: "bg-muted",
      },
      info: {
        icon: Info,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      },
      warn: {
        icon: AlertTriangle,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
      },
      error: {
        icon: AlertCircle,
        color: "text-red-500",
        bg: "bg-red-500/10",
      },
    };
    return configs[level];
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  // Download logs
  const handleDownload = () => {
    const logText = filteredLogs
      .map(
        (log) =>
          `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}${
            log.metadata ? "\n  " + JSON.stringify(log.metadata, null, 2) : ""
          }`,
      )
      .join("\n\n");

    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${botName.replace(/\s+/g, "-").toLowerCase()}-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    onDownloadLogs?.();
  };

  // Clear logs
  const handleClear = () => {
    setLogs([]);
    logCounter.current = 0;
    onClearLogs?.();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Terminal className="h-6 w-6" />
            {botName} Logs
          </h2>
          <p className="text-muted-foreground">
            Real-time bot execution logs and debugging information
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
          {onToggleStreaming && (
            <Button variant="outline" size="sm" onClick={onToggleStreaming}>
              {streaming ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Stream
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={logs.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-scroll"
                checked={autoScroll}
                onCheckedChange={(checked) => setAutoScroll(checked as boolean)}
              />
              <Label htmlFor="auto-scroll" className="text-sm">
                Auto-scroll
              </Label>
            </div>
          </div>
        </div>

        {/* Log Level Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Levels:</span>
          {(["debug", "info", "warn", "error"] as LogLevel[]).map((level) => {
            const config = getLogLevelConfig(level);
            return (
              <Badge
                key={level}
                variant={selectedLevels.has(level) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleLevel(level)}
              >
                {level.toUpperCase()}
              </Badge>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total: {logs.length}</span>
          <span>Filtered: {filteredLogs.length}</span>
          {streaming && (
            <div className="flex items-center gap-1 text-green-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live
            </div>
          )}
        </div>
      </div>

      {/* Log Display */}
      <div className="rounded-lg border bg-black/95">
        <ScrollArea className="h-[600px]" ref={scrollAreaRef}>
          <div className="p-4 font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Terminal className="mb-2 h-8 w-8" />
                <p>No logs to display</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((log) => {
                  const config = getLogLevelConfig(log.level);
                  const Icon = config.icon;
                  return (
                    <div
                      key={log.id}
                      className="group rounded px-2 py-1 hover:bg-white/5"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <div
                          className={`flex items-center gap-1 ${config.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span className="w-12 text-xs font-bold">
                            {log.level.toUpperCase()}
                          </span>
                        </div>
                        <span className="flex-1 text-white">{log.message}</span>
                      </div>
                      {log.metadata && (
                        <div className="ml-32 mt-1 text-xs text-muted-foreground">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <div key={key}>
                              {key}: {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
