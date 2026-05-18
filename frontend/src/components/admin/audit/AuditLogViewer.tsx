"use client";

/**
 * Audit Log Viewer Component
 *
 * Enterprise audit log viewer with:
 * - Advanced filtering and search
 * - Tamper-proof verification
 * - Export in multiple formats
 * - Real-time updates
 */

import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  TamperProofLogEntry,
  AuditSearchFilter,
  IntegrityVerification,
  ExportFormat,
  getTamperProofAuditService,
  verifyAuditIntegrity,
  searchTamperProofLogs,
} from "@/lib/audit/tamper-proof-audit";
import { AuditAction, AuditCategory } from "@/lib/audit/audit-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Download,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  MoreHorizontal,
  Calendar,
  User,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Main Component
// ============================================================================

export function AuditLogViewer() {
  const [entries, setEntries] = useState<TamperProofLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<AuditSearchFilter>({
    limit: 50,
    offset: 0,
    sortBy: "timestamp",
    sortOrder: "desc",
  });
  const [selectedEntry, setSelectedEntry] =
    useState<TamperProofLogEntry | null>(null);
  const [verification, setVerification] =
    useState<IntegrityVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    try {
      const result = await searchTamperProofLogs(filter);
      setEntries(result.entries);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    }
  };

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyAuditIntegrity();
      setVerification(result);

      toast({
        title: result.isValid ? "Integrity Verified" : "Integrity Compromised",
        description: result.isValid
          ? `All ${result.verifiedEntries} entries verified successfully`
          : `${result.compromisedBlocks.length} blocks compromised`,
        variant: result.isValid ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify integrity",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    try {
      const service = getTamperProofAuditService();
      const data = await service.exportLogs(filter, format);

      const blob =
        data instanceof Blob
          ? data
          : new Blob([data], {
              type:
                format === "json"
                  ? "application/json"
                  : format === "csv"
                    ? "text/csv"
                    : format === "pdf"
                      ? "application/pdf"
                      : "text/plain",
            });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Audit logs exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleSearch = (searchText: string) => {
    setFilter({ ...filter, searchText, offset: 0 });
  };

  const handlePageChange = (newOffset: number) => {
    setFilter({ ...filter, offset: newOffset });
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "error":
        return "destructive";
      case "warning":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Log</h2>
          <p className="text-muted-foreground">
            Tamper-proof enterprise audit trail with cryptographic verification
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
          >
            <Shield className="mr-2 h-4 w-4" />
            {isVerifying ? "Verifying..." : "Verify Integrity"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("syslog")}>
                Syslog
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("cef")}>
                CEF (Common Event Format)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Integrity Status */}
      {verification && (
        <Card
          className={cn(
            "border-2",
            verification.isValid ? "border-green-500" : "border-red-500",
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {verification.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Integrity {verification.isValid ? "Verified" : "Compromised"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Entries</div>
                <div className="text-2xl font-bold">
                  {verification.totalEntries}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Verified</div>
                <div className="text-2xl font-bold text-green-600">
                  {verification.verifiedEntries}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Compromised</div>
                <div className="text-2xl font-bold text-red-600">
                  {verification.compromisedBlocks.length}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Verified At</div>
                <div className="text-sm">
                  {verification.verifiedAt.toLocaleString()}
                </div>
              </div>
            </div>
            {verification.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                <div className="font-medium text-red-600">Errors:</div>
                {verification.errors.map((error, i) => (
                  <div key={i} className="text-sm text-muted-foreground">
                    {error}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Search audit logs..."
                  className="pl-10"
                  value={filter.searchText || ""}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-4 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={filter.categories?.[0] || ""}
                  onValueChange={(value) =>
                    setFilter({
                      ...filter,
                      categories: value ? [value as AuditCategory] : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="channel">Channel</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={filter.severities?.[0] || ""}
                  onValueChange={(value) =>
                    setFilter({
                      ...filter,
                      severities: value ? [value] : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filter.success?.toString() || ""}
                  onValueChange={(value) =>
                    setFilter({
                      ...filter,
                      success: value ? value === "true" : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="true">Success</SelectItem>
                    <SelectItem value="false">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={filter.sortBy || "timestamp"}
                  onValueChange={(value: any) =>
                    setFilter({ ...filter, sortBy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timestamp">Time</SelectItem>
                    <SelectItem value="severity">Severity</SelectItem>
                    <SelectItem value="actor">Actor</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {entries.length} of {total} entries
        </div>
        <div>
          {verification && (
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Chain integrity: {verification.isValid ? "Valid" : "Compromised"}
            </span>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Block</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono text-xs">
                  #{entry.blockNumber}
                </TableCell>
                <TableCell className="text-sm">
                  {entry.timestamp.toLocaleString()}
                </TableCell>
                <TableCell>
                  <code className="text-xs">{entry.action}</code>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{entry.actor.id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{entry.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getSeverityVariant(entry.severity)}>
                    {entry.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  {entry.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {(filter.offset! > 0 || hasMore) && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={filter.offset === 0}
            onClick={() =>
              handlePageChange(Math.max(0, filter.offset! - filter.limit!))
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!hasMore}
            onClick={() => handlePageChange(filter.offset! + filter.limit!)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Entry Details Dialog */}
      {selectedEntry && (
        <AuditEntryDialog
          entry={selectedEntry}
          open={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Audit Entry Details Dialog
// ============================================================================

interface AuditEntryDialogProps {
  entry: TamperProofLogEntry;
  open: boolean;
  onClose: () => void;
}

function AuditEntryDialog({ entry, open, onClose }: AuditEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Log Entry #{entry.blockNumber}</DialogTitle>
          <DialogDescription>
            Tamper-proof audit log entry details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                Block Number
              </Label>
              <div className="font-mono">{entry.blockNumber}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Timestamp</Label>
              <div>{entry.timestamp.toLocaleString()}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Action</Label>
              <div>
                <code>{entry.action}</code>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <div>
                <Badge variant="outline">{entry.category}</Badge>
              </div>
            </div>
          </div>

          {/* Actor */}
          <div>
            <Label className="text-xs text-muted-foreground">Actor</Label>
            <div className="mt-1 flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{entry.actor.id}</span>
              <Badge variant="secondary">{entry.actor.type}</Badge>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <div className="mt-1">{entry.description}</div>
          </div>

          {/* Resource */}
          {entry.resource && (
            <div>
              <Label className="text-xs text-muted-foreground">Resource</Label>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline">{entry.resource.type}</Badge>
                <span className="font-mono text-sm">{entry.resource.id}</span>
              </div>
            </div>
          )}

          {/* Cryptographic Info */}
          <div className="space-y-2 rounded-lg bg-muted p-4">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Cryptographic Verification</span>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Entry Hash
              </Label>
              <div className="break-all font-mono text-xs">
                {entry.entryHash}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Previous Hash
              </Label>
              <div className="break-all font-mono text-xs">
                {entry.previousHash}
              </div>
            </div>
          </div>

          {/* Metadata */}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Metadata</Label>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuditLogViewer;
