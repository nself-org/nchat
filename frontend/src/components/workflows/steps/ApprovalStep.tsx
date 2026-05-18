"use client";

/**
 * ApprovalStep - Approval configuration component
 *
 * Configures approval request steps
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ApprovalStep as ApprovalStepType,
  ApprovalType,
} from "@/lib/workflows/workflow-types";

interface ApprovalStepPropertiesProps {
  step: ApprovalStepType;
  onUpdate: (config: Record<string, unknown>) => void;
}

export function ApprovalStepProperties({
  step,
  onUpdate,
}: ApprovalStepPropertiesProps) {
  const config = step.config;

  return (
    <div className="space-y-3">
      {/* Approval type */}
      <div>
        <Label className="text-xs">Approval Type</Label>
        <Select
          value={config.approvalType}
          onValueChange={(value) =>
            onUpdate({ approvalType: value as ApprovalType })
          }
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single - Any one approver</SelectItem>
            <SelectItem value="all">All - Everyone must approve</SelectItem>
            <SelectItem value="any">Any - First response wins</SelectItem>
            <SelectItem value="majority">Majority - More than half</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {config.approvalType === "single" && "Only one approval is needed"}
          {config.approvalType === "all" && "All listed approvers must approve"}
          {config.approvalType === "any" &&
            "First response (approve or reject) decides"}
          {config.approvalType === "majority" && "More than half must approve"}
        </p>
      </div>

      {/* Approvers */}
      <div>
        <Label className="text-xs">Approvers (User IDs)</Label>
        <Textarea
          value={config.approvers?.join("\n") || ""}
          onChange={(e) => {
            const approvers = e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s);
            onUpdate({ approvers });
          }}
          className="mt-1 min-h-[60px] font-mono text-xs"
          placeholder="user_id_1&#10;user_id_2&#10;{{manager_id}}"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          One user ID per line. Use variables like {"{{manager_id}}"}
        </p>
      </div>

      {/* Approver roles */}
      <div>
        <Label className="text-xs">Approver Roles (optional)</Label>
        <Input
          value={config.approverRoles?.join(", ") || ""}
          onChange={(e) => {
            const roles = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s);
            onUpdate({ approverRoles: roles });
          }}
          className="mt-1 h-8 text-sm"
          placeholder="admin, manager"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Users with these roles can also approve
        </p>
      </div>

      {/* Approval message */}
      <div>
        <Label className="text-xs">Approval Message</Label>
        <Textarea
          value={config.message || ""}
          onChange={(e) => onUpdate({ message: e.target.value })}
          className="mt-1 min-h-[80px] text-sm"
          placeholder="Please review and approve this request..."
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Message shown to approvers. Supports variables.
        </p>
      </div>

      {/* Timeout */}
      <div className="border-t pt-2">
        <Label className="text-xs">Timeout</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            type="number"
            value={config.timeoutMinutes || 1440}
            onChange={(e) =>
              onUpdate({ timeoutMinutes: parseInt(e.target.value) })
            }
            className="h-8 w-24 text-sm"
            min={1}
          />
          <span className="text-xs text-muted-foreground">minutes</span>
          <span className="text-xs text-muted-foreground">
            ({Math.round((config.timeoutMinutes || 1440) / 60)} hours)
          </span>
        </div>
      </div>

      {/* Timeout action */}
      <div>
        <Label className="text-xs">On Timeout</Label>
        <Select
          value={config.timeoutAction || "reject"}
          onValueChange={(value) => onUpdate({ timeoutAction: value })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approve">Auto-approve</SelectItem>
            <SelectItem value="reject">Auto-reject</SelectItem>
            <SelectItem value="escalate">Escalate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Escalation */}
      {config.timeoutAction === "escalate" && (
        <div>
          <Label className="text-xs">Escalate To (User IDs)</Label>
          <Input
            value={config.escalateTo?.join(", ") || ""}
            onChange={(e) => {
              const users = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s);
              onUpdate({ escalateTo: users });
            }}
            className="mt-1 h-8 text-sm"
            placeholder="manager_id, director_id"
          />
        </div>
      )}

      {/* Options */}
      <div className="space-y-2 border-t pt-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Require Comment</Label>
            <p className="text-[10px] text-muted-foreground">
              Approvers must provide a comment
            </p>
          </div>
          <Switch
            checked={config.requireComment === true}
            onCheckedChange={(checked) => onUpdate({ requireComment: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Allow Delegation</Label>
            <p className="text-[10px] text-muted-foreground">
              Approvers can delegate to others
            </p>
          </div>
          <Switch
            checked={config.allowDelegate === true}
            onCheckedChange={(checked) => onUpdate({ allowDelegate: checked })}
          />
        </div>
      </div>

      {/* Reminders */}
      <div className="border-t pt-2">
        <Label className="text-xs">Reminder Interval (minutes)</Label>
        <Input
          type="number"
          value={config.reminderIntervalMinutes || ""}
          onChange={(e) => {
            const value = e.target.value ? parseInt(e.target.value) : undefined;
            onUpdate({ reminderIntervalMinutes: value });
          }}
          className="mt-1 h-8 text-sm"
          min={15}
          placeholder="Leave empty for no reminders"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          How often to remind approvers. Leave empty to disable.
        </p>
      </div>

      {/* Output info */}
      <div className="border-t pt-2">
        <p className="text-[10px] text-muted-foreground">
          <strong>Output branches:</strong>
          <br />
          - Approved: When approval is granted
          <br />
          - Rejected: When approval is denied
          <br />- Timeout: When no response is received
        </p>
      </div>
    </div>
  );
}

export default ApprovalStepProperties;
