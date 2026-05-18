/**
 * Automation Manager Component
 *
 * Main UI for managing automation rules including:
 * - Viewing and filtering rules
 * - Creating new rules from templates
 * - Editing existing rules
 * - Viewing execution history
 * - Managing rule status
 */

"use client";

import { useState, useMemo } from "react";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Copy,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  useAutomationStore,
  selectFilteredRules,
  selectRulesPagination,
  selectExecutions,
} from "@/lib/automation/automation-store";
import {
  describeCronSchedule,
  getAutomationStatusBadgeVariant,
  formatAutomationRunCount,
  formatAutomationSuccessRate,
  AUTOMATION_TEMPLATES,
} from "@/lib/automation/automation-engine";
import type {
  AutomationRule,
  AutomationStatus,
} from "@/lib/automation/automation-engine";

// ============================================================================
// Main Component
// ============================================================================

export function AutomationManager() {
  const {
    statusFilter,
    searchQuery,
    setStatusFilter,
    setSearchQuery,
    openCreateRuleModal,
    openEditRuleModal,
    openDeleteRuleModal,
    updateRule,
  } = useAutomationStore();

  const filteredRules = useAutomationStore(selectFilteredRules);
  const executions = useAutomationStore(selectExecutions);
  const pagination = useAutomationStore(selectRulesPagination);

  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleToggleStatus = async (rule: AutomationRule) => {
    const newStatus: AutomationStatus =
      rule.status === "active" ? "paused" : "active";
    updateRule(rule.id, { status: newStatus });
    toast.success(`Rule ${newStatus === "active" ? "activated" : "paused"}`);
  };

  const handleRunNow = async (rule: AutomationRule) => {
    toast.info("Running automation rule...", { description: rule.name });
    // In production, this would trigger the rule execution
    setTimeout(() => {
      toast.success("Automation completed", {
        description: "Check execution history for details",
      });
    }, 2000);
  };

  const handleDuplicate = (rule: AutomationRule) => {
    const duplicatedRule: AutomationRule = {
      ...rule,
      id: crypto.randomUUID(),
      name: `${rule.name} (Copy)`,
      status: "disabled",
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      lastRunAt: undefined,
      nextRunAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Add to store
    toast.success("Rule duplicated", {
      description: "Edit the new rule to customize it",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Zap className="h-8 w-8" />
            Automation Rules
          </h1>
          <p className="text-muted-foreground">
            Automate administrative tasks with scheduled rules
          </p>
        </div>
        <Button onClick={openCreateRuleModal}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">Active automations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRules.filter((r) => r.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executions.length}</div>
            <p className="text-xs text-muted-foreground">In the last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">
              Average success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as any)}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="executions">Execution History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <RulesTable
            rules={filteredRules}
            onToggleStatus={handleToggleStatus}
            onRunNow={handleRunNow}
            onEdit={openEditRuleModal}
            onDelete={openDeleteRuleModal}
            onDuplicate={handleDuplicate}
            onViewDetails={(rule) => {
              setSelectedRule(rule);
              setDetailsOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <ExecutionHistoryTable executions={executions} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesGrid onSelectTemplate={openCreateRuleModal} />
        </TabsContent>
      </Tabs>

      {/* Rule Details Dialog */}
      {selectedRule && (
        <RuleDetailsDialog
          rule={selectedRule}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Rules Table Component
// ============================================================================

interface RulesTableProps {
  rules: AutomationRule[];
  onToggleStatus: (rule: AutomationRule) => void;
  onRunNow: (rule: AutomationRule) => void;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
  onDuplicate: (rule: AutomationRule) => void;
  onViewDetails: (rule: AutomationRule) => void;
}

function RulesTable({
  rules,
  onToggleStatus,
  onRunNow,
  onEdit,
  onDelete,
  onDuplicate,
  onViewDetails,
}: RulesTableProps) {
  if (rules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Zap className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No automation rules found</p>
          <p className="text-sm text-muted-foreground">
            Create your first rule to automate administrative tasks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Run</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead>Success Rate</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell>
                <div>
                  <button
                    onClick={() => onViewDetails(rule)}
                    className="text-left font-medium hover:underline"
                  >
                    {rule.name}
                  </button>
                  {rule.description && (
                    <p className="text-xs text-muted-foreground">
                      {rule.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {rule.trigger.replace("_", " ")}
                </Badge>
                {rule.triggerConfig.schedule && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {describeCronSchedule(rule.triggerConfig.schedule.cron)}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {rule.action.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getAutomationStatusBadgeVariant(rule.status)}>
                  {rule.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {rule.lastRunAt ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(rule.lastRunAt, { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {rule.nextRunAt ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(rule.nextRunAt, { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {rule.runCount > 0
                    ? formatAutomationSuccessRate(
                        rule.successCount,
                        rule.runCount,
                      )
                    : "N/A"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleStatus(rule)}
                    title={rule.status === "active" ? "Pause" : "Activate"}
                  >
                    {rule.status === "active" ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRunNow(rule)}
                    title="Run now"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(rule)}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDuplicate(rule)}
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(rule)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ============================================================================
// Execution History Table Component
// ============================================================================

interface ExecutionHistoryTableProps {
  executions: any[];
}

function ExecutionHistoryTable({ executions }: ExecutionHistoryTableProps) {
  if (executions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No execution history</p>
          <p className="text-sm text-muted-foreground">
            Automation executions will appear here once rules run
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Success</TableHead>
            <TableHead>Failed</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {executions.map((execution) => (
            <TableRow key={execution.id}>
              <TableCell className="font-medium">
                {execution.ruleName}
              </TableCell>
              <TableCell>
                {formatDistanceToNow(execution.startedAt, { addSuffix: true })}
              </TableCell>
              <TableCell>
                {execution.completedAt
                  ? `${Math.round(
                      (execution.completedAt.getTime() -
                        execution.startedAt.getTime()) /
                        1000,
                    )}s`
                  : "-"}
              </TableCell>
              <TableCell>{execution.itemsProcessed}</TableCell>
              <TableCell className="text-green-600">
                {execution.itemsSuccessful}
              </TableCell>
              <TableCell className="text-destructive">
                {execution.itemsFailed}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    execution.status === "completed"
                      ? "default"
                      : execution.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {execution.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ============================================================================
// Templates Grid Component
// ============================================================================

interface TemplatesGridProps {
  onSelectTemplate: () => void;
}

function TemplatesGrid({ onSelectTemplate }: TemplatesGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {AUTOMATION_TEMPLATES.map((template, index) => (
        <Card
          key={index}
          className="cursor-pointer transition-colors hover:border-primary"
        >
          <CardHeader>
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trigger:</span>
                <Badge variant="outline" className="capitalize">
                  {template.trigger?.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Action:</span>
                <Badge variant="outline" className="capitalize">
                  {template.action?.replace("_", " ")}
                </Badge>
              </div>
              {template.triggerConfig?.schedule && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {describeCronSchedule(template.triggerConfig.schedule.cron)}
                </div>
              )}
            </div>
            <Button
              onClick={onSelectTemplate}
              className="mt-4 w-full"
              size="sm"
            >
              Use Template
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Rule Details Dialog
// ============================================================================

interface RuleDetailsDialogProps {
  rule: AutomationRule;
  open: boolean;
  onClose: () => void;
}

function RuleDetailsDialog({ rule, open, onClose }: RuleDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule.name}</DialogTitle>
          <DialogDescription>{rule.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">Status</h4>
              <Badge variant={getAutomationStatusBadgeVariant(rule.status)}>
                {rule.status}
              </Badge>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">Run Count</h4>
              <p className="text-sm">
                {formatAutomationRunCount(rule.runCount)}
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">Success Rate</h4>
              <p className="text-sm">
                {rule.runCount > 0
                  ? formatAutomationSuccessRate(
                      rule.successCount,
                      rule.runCount,
                    )
                  : "N/A"}
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">Last Run</h4>
              <p className="text-sm">
                {rule.lastRunAt
                  ? formatDistanceToNow(rule.lastRunAt, { addSuffix: true })
                  : "Never"}
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Trigger</h4>
            <Badge variant="outline" className="capitalize">
              {rule.trigger.replace("_", " ")}
            </Badge>
            {rule.triggerConfig.schedule && (
              <p className="mt-2 text-sm text-muted-foreground">
                {describeCronSchedule(rule.triggerConfig.schedule.cron)}
              </p>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Action</h4>
            <Badge variant="outline" className="capitalize">
              {rule.action.replace("_", " ")}
            </Badge>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Configuration</h4>
            <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
              {JSON.stringify(
                { trigger: rule.triggerConfig, action: rule.actionConfig },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
