"use client";

/**
 * FileAnalytics - File upload analytics view
 */

import * as React from "react";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Upload,
  HardDrive,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAnalyticsStore } from "@/stores/analytics-store";
import { FileUploadChart } from "../charts/FileUploadChart";

// ============================================================================
// Types
// ============================================================================

interface FileAnalyticsProps {
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function getFileTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "images":
      return <ImageIcon className="h-4 w-4" />;
    case "videos":
      return <Video className="h-4 w-4" />;
    case "audio":
      return <Music className="h-4 w-4" />;
    case "documents":
      return <FileText className="h-4 w-4" />;
    case "archives":
      return <Archive className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Component
// ============================================================================

export function FileAnalytics({ className }: FileAnalyticsProps) {
  const { summary, fileUploads, isLoading, fetchSectionData } =
    useAnalyticsStore();

  // Fetch file data on mount
  React.useEffect(() => {
    fetchSectionData("files");
  }, [fetchSectionData]);

  // Calculate file stats
  const fileStats = React.useMemo(() => {
    if (!fileUploads || fileUploads.length === 0) return null;

    const totalFiles = fileUploads.reduce((sum, d) => sum + d.count, 0);
    const totalSize = fileUploads.reduce((sum, d) => sum + d.totalSize, 0);
    const avgSize = totalFiles > 0 ? totalSize / totalFiles : 0;
    const avgPerDay = totalFiles / fileUploads.length;

    // Aggregate file types
    const fileTypes: Record<string, number> = {};
    fileUploads.forEach((upload) => {
      Object.entries(upload.fileTypes).forEach(([type, count]) => {
        fileTypes[type] = (fileTypes[type] || 0) + count;
      });
    });

    const sortedTypes = Object.entries(fileTypes)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalFiles > 0 ? (count / totalFiles) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalFiles,
      totalSize,
      avgSize,
      avgPerDay,
      fileTypes: sortedTypes,
    };
  }, [fileUploads]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Files"
          value={summary?.files.totalFiles.value.toLocaleString() ?? 0}
          description="files uploaded"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Total Storage"
          value={formatFileSize(summary?.files.totalSize.value ?? 0)}
          description="storage used"
          icon={<HardDrive className="h-4 w-4" />}
        />
        <StatCard
          title="Avg. File Size"
          value={formatFileSize(summary?.files.averageSize.value ?? 0)}
          description="per file"
          icon={<File className="h-4 w-4" />}
        />
        <StatCard
          title="Unique Uploaders"
          value={summary?.files.uniqueUploaders.value ?? 0}
          description="users uploaded files"
          icon={<Upload className="h-4 w-4" />}
        />
      </div>

      {/* File Activity Summary */}
      {fileStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Daily Average
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round(fileStats.avgPerDay).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">files per day</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Uploaded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {fileStats.totalFiles.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(fileStats.totalSize)} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Top File Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fileStats.fileTypes.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 text-xl font-bold">
                    {getFileTypeIcon(fileStats.fileTypes[0].type)}
                    {fileStats.fileTypes[0].type}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fileStats.fileTypes[0].percentage.toFixed(1)}% of uploads
                  </p>
                </>
              ) : (
                <span className="text-muted-foreground">No data</span>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Views */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="types">File Types</TabsTrigger>
          <TabsTrigger value="combined">Combined</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Timeline</CardTitle>
              <CardDescription>
                Number of files uploaded over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadChart height={350} variant="timeline" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>File Type Distribution</CardTitle>
                <CardDescription>Breakdown by file type</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploadChart height={300} variant="types" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>File Types Summary</CardTitle>
                <CardDescription>Detailed breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {fileStats?.fileTypes && fileStats.fileTypes.length > 0 ? (
                  <div className="space-y-4">
                    {fileStats.fileTypes.map((type) => (
                      <div key={type.type} className="flex items-center gap-4">
                        <div className="flex w-32 items-center gap-2">
                          {getFileTypeIcon(type.type)}
                          <span className="font-medium">{type.type}</span>
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span>{type.count.toLocaleString()} files</span>
                            <span className="text-muted-foreground">
                              {type.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${type.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    No file type data available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="combined" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Files and Storage Over Time</CardTitle>
              <CardDescription>
                Combined view of upload count and total storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadChart height={350} variant="combined" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FileAnalytics;
