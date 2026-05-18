// ============================================================================
// APPROVAL WORKFLOW EXAMPLE
// Multi-level approval workflow for requests
// ============================================================================

import type { Workflow, WorkflowEdge } from "../workflow-types";
import { createTriggerStep } from "../workflow-triggers";
import {
  createMessageStep,
  createFormStep,
  createConditionStep,
  createApprovalStep,
  createDelayStep,
  createEndStep,
} from "../workflow-steps";
import { createActionStep } from "../workflow-actions";
import { createCondition, createConditionGroup } from "../workflow-conditions";

/**
 * Create an approval workflow that:
 * 1. Triggers via slash command or keyword
 * 2. Collects request details
 * 3. Routes to appropriate approver based on amount/type
 * 4. Handles approval/rejection with notifications
 */
export function createApprovalWorkflow(
  createdBy: string,
  options: {
    approvers?: string[];
    seniorApprovers?: string[];
    notificationChannelId?: string;
    highValueThreshold?: number;
  } = {},
): Workflow {
  const {
    approvers = [],
    seniorApprovers = [],
    notificationChannelId,
    highValueThreshold = 1000,
  } = options;

  // Create slash command trigger
  const trigger = createTriggerStep("slash_command", { x: 400, y: 50 });
  trigger.name = "Request Trigger";
  trigger.description = "Triggered by /request command";
  trigger.config = {
    triggerType: "slash_command",
    slashCommand: "/request",
  };

  // Create request form
  const requestForm = createFormStep(
    { x: 400, y: 180 },
    {
      title: "Submit Request",
      description: "Fill out the details of your request",
      target: "trigger_source",
      fields: [
        {
          id: "type",
          name: "requestType",
          label: "Request Type",
          type: "select",
          required: true,
          options: [
            { label: "Purchase Request", value: "purchase" },
            { label: "Time Off", value: "time_off" },
            { label: "Expense Reimbursement", value: "expense" },
            { label: "Access Request", value: "access" },
            { label: "Other", value: "other" },
          ],
        },
        {
          id: "title",
          name: "title",
          label: "Request Title",
          type: "text",
          placeholder: "Brief description of your request",
          required: true,
          validation: {
            maxLength: 100,
          },
        },
        {
          id: "description",
          name: "description",
          label: "Details",
          type: "textarea",
          placeholder: "Provide detailed information about your request",
          required: true,
          validation: {
            minLength: 20,
            maxLength: 2000,
          },
        },
        {
          id: "amount",
          name: "amount",
          label: "Amount (if applicable)",
          type: "number",
          placeholder: "0.00",
          required: false,
          validation: {
            min: 0,
            max: 1000000,
          },
        },
        {
          id: "urgency",
          name: "urgency",
          label: "Urgency",
          type: "radio",
          required: true,
          options: [
            { label: "Low - No rush", value: "low" },
            { label: "Medium - Within a week", value: "medium" },
            { label: "High - Within 24 hours", value: "high" },
            { label: "Critical - ASAP", value: "critical" },
          ],
          defaultValue: "medium",
        },
        {
          id: "attachments",
          name: "attachmentUrl",
          label: "Supporting Documents (URL)",
          type: "text",
          placeholder: "Link to any supporting documents",
          required: false,
        },
      ],
      submitLabel: "Submit Request",
      timeoutSeconds: 300,
    },
  );
  requestForm.name = "Request Form";
  requestForm.description = "Collect request details from user";

  // Acknowledge receipt
  const acknowledge = createMessageStep(
    { x: 400, y: 310 },
    {
      target: "trigger_source",
      content: `Thank you! Your request has been submitted.

**{{variables.formResponse.title}}**
Type: {{variables.formResponse.requestType}}
Urgency: {{variables.formResponse.urgency}}

Your request ID is: **{{variables.requestId}}**

You'll be notified once a decision is made.`,
      parseVariables: true,
    },
  );
  acknowledge.name = "Acknowledge Request";
  acknowledge.description = "Confirm receipt to requester";

  // Check if high value
  const checkHighValue = createConditionStep({ x: 400, y: 440 });
  checkHighValue.name = "Check Value Threshold";
  checkHighValue.description = `Route high-value requests (>${highValueThreshold}) to senior approvers`;
  checkHighValue.config = {
    logic: "or",
    conditions: [
      createCondition(
        "variables.formResponse.amount",
        "greater_than",
        highValueThreshold,
      ),
      createCondition("variables.formResponse.urgency", "equals", "critical"),
    ],
  };

  // Standard approval step
  const standardApproval = createApprovalStep(
    { x: 200, y: 570 },
    {
      approvalType: "single",
      approvers: approvers,
      message: `**New Request for Approval**

**{{variables.formResponse.title}}**
Submitted by: {{trigger.data.userName}}
Type: {{variables.formResponse.requestType}}
Amount: $ {{variables.formResponse.amount}}
Urgency: {{variables.formResponse.urgency}}

**Details:**
{{variables.formResponse.description}}

{{#if variables.formResponse.attachmentUrl}}
Attachments: {{variables.formResponse.attachmentUrl}}
{{/if}}`,
      timeoutMinutes: 1440, // 24 hours
      timeoutAction: "escalate",
      escalateTo: seniorApprovers,
      requireComment: false,
      reminderIntervalMinutes: 240, // 4 hours
    },
  );
  standardApproval.name = "Standard Approval";
  standardApproval.description = "Request approval from standard approvers";

  // Senior approval step
  const seniorApproval = createApprovalStep(
    { x: 600, y: 570 },
    {
      approvalType: "single",
      approvers: seniorApprovers.length > 0 ? seniorApprovers : approvers,
      message: `**HIGH VALUE/CRITICAL Request for Approval**

**{{variables.formResponse.title}}**
Submitted by: {{trigger.data.userName}}
Type: {{variables.formResponse.requestType}}
Amount: $ {{variables.formResponse.amount}}
Urgency: {{variables.formResponse.urgency}}

**Details:**
{{variables.formResponse.description}}

{{#if variables.formResponse.attachmentUrl}}
Attachments: {{variables.formResponse.attachmentUrl}}
{{/if}}

This request requires senior approval due to value or urgency.`,
      timeoutMinutes: 720, // 12 hours for critical
      timeoutAction: "notify",
      requireComment: true,
      reminderIntervalMinutes: 120, // 2 hours
    },
  );
  seniorApproval.name = "Senior Approval";
  seniorApproval.description = "Request approval from senior approvers";

  // Approved notification
  const approvedNotification = createMessageStep(
    { x: 200, y: 700 },
    {
      target: "user",
      content: `Great news! Your request has been **approved**.

**{{variables.formResponse.title}}**
Request ID: {{variables.requestId}}

{{#if variables.approvalComment}}
Approver's comment: {{variables.approvalComment}}
{{/if}}

Approved by: {{variables.approvedBy}}
Approved at: {{variables.approvedAt}}`,
      parseVariables: true,
    },
  );
  approvedNotification.name = "Approval Notification";
  approvedNotification.description = "Notify requester of approval";

  // Rejected notification
  const rejectedNotification = createMessageStep(
    { x: 400, y: 700 },
    {
      target: "user",
      content: `Unfortunately, your request has been **declined**.

**{{variables.formResponse.title}}**
Request ID: {{variables.requestId}}

{{#if variables.rejectionReason}}
Reason: {{variables.rejectionReason}}
{{/if}}

Reviewed by: {{variables.reviewedBy}}

If you have questions, please reach out to your approver or submit a new request with additional details.`,
      parseVariables: true,
    },
  );
  rejectedNotification.name = "Rejection Notification";
  rejectedNotification.description = "Notify requester of rejection";

  // Timeout notification
  const timeoutNotification = createMessageStep(
    { x: 600, y: 700 },
    {
      target: "user",
      content: `Your request is still pending review.

**{{variables.formResponse.title}}**
Request ID: {{variables.requestId}}

The approval has timed out and has been escalated to additional reviewers. You'll be notified once a decision is made.`,
      parseVariables: true,
    },
  );
  timeoutNotification.name = "Timeout Notification";
  timeoutNotification.description =
    "Notify requester of timeout and escalation";

  // Post to notification channel (if configured)
  const postToChannel = createMessageStep(
    { x: 200, y: 830 },
    {
      target: "channel",
      channelId: notificationChannelId || "approvals",
      content: `**Request {{variables.approvalStatus}}**

{{variables.formResponse.title}}
Requester: {{trigger.data.userName}}
Type: {{variables.formResponse.requestType}}
Amount: $ {{variables.formResponse.amount}}

Decision by: {{variables.reviewedBy}}`,
      parseVariables: true,
    },
  );
  postToChannel.name = "Post to Channel";
  postToChannel.description = "Post decision to notification channel";

  // End steps
  const endApproved = createEndStep(
    { x: 200, y: 960 },
    {
      status: "success",
      message: "Request approved and processed",
      outputVariables: ["requestId", "approvedBy", "approvedAt"],
    },
  );
  endApproved.name = "End (Approved)";

  const endRejected = createEndStep(
    { x: 400, y: 830 },
    {
      status: "success",
      message: "Request rejected",
      outputVariables: ["requestId", "reviewedBy", "rejectionReason"],
    },
  );
  endRejected.name = "End (Rejected)";

  const endTimeout = createEndStep(
    { x: 600, y: 830 },
    {
      status: "success",
      message: "Request timed out and escalated",
      outputVariables: ["requestId"],
    },
  );
  endTimeout.name = "End (Timeout)";

  // Define edges
  const edges: WorkflowEdge[] = [
    {
      id: "edge_1",
      sourceId: trigger.id,
      targetId: requestForm.id,
      type: "default",
    },
    {
      id: "edge_2",
      sourceId: requestForm.id,
      targetId: acknowledge.id,
      type: "default",
    },
    {
      id: "edge_3",
      sourceId: acknowledge.id,
      targetId: checkHighValue.id,
      type: "default",
    },
    {
      id: "edge_4",
      sourceId: checkHighValue.id,
      targetId: standardApproval.id,
      sourceHandle: "false",
      type: "false",
      label: "Standard",
    },
    {
      id: "edge_5",
      sourceId: checkHighValue.id,
      targetId: seniorApproval.id,
      sourceHandle: "true",
      type: "true",
      label: "High Value/Critical",
    },
    {
      id: "edge_6",
      sourceId: standardApproval.id,
      targetId: approvedNotification.id,
      sourceHandle: "approved",
      type: "default",
      label: "Approved",
    },
    {
      id: "edge_7",
      sourceId: standardApproval.id,
      targetId: rejectedNotification.id,
      sourceHandle: "rejected",
      type: "default",
      label: "Rejected",
    },
    {
      id: "edge_8",
      sourceId: standardApproval.id,
      targetId: timeoutNotification.id,
      sourceHandle: "timeout",
      type: "timeout",
      label: "Timeout",
    },
    {
      id: "edge_9",
      sourceId: seniorApproval.id,
      targetId: approvedNotification.id,
      sourceHandle: "approved",
      type: "default",
      label: "Approved",
    },
    {
      id: "edge_10",
      sourceId: seniorApproval.id,
      targetId: rejectedNotification.id,
      sourceHandle: "rejected",
      type: "default",
      label: "Rejected",
    },
    {
      id: "edge_11",
      sourceId: seniorApproval.id,
      targetId: timeoutNotification.id,
      sourceHandle: "timeout",
      type: "timeout",
      label: "Timeout",
    },
    {
      id: "edge_12",
      sourceId: approvedNotification.id,
      targetId: postToChannel.id,
      type: "default",
    },
    {
      id: "edge_13",
      sourceId: postToChannel.id,
      targetId: endApproved.id,
      type: "default",
    },
    {
      id: "edge_14",
      sourceId: rejectedNotification.id,
      targetId: endRejected.id,
      type: "default",
    },
    {
      id: "edge_15",
      sourceId: timeoutNotification.id,
      targetId: endTimeout.id,
      type: "default",
    },
  ];

  const now = new Date().toISOString();

  return {
    id: `workflow_approval_${Date.now()}`,
    name: "Request Approval",
    description:
      "Multi-level approval workflow with routing based on value and urgency",
    status: "draft",
    version: 1,
    steps: [
      trigger,
      requestForm,
      acknowledge,
      checkHighValue,
      standardApproval,
      seniorApproval,
      approvedNotification,
      rejectedNotification,
      timeoutNotification,
      postToChannel,
      endApproved,
      endRejected,
      endTimeout,
    ],
    edges,
    variables: [
      {
        id: "var_1",
        name: "requestId",
        type: "string",
        description: "Unique request identifier",
      },
      {
        id: "var_2",
        name: "approvers",
        type: "array",
        defaultValue: approvers,
        description: "List of standard approver user IDs",
        isInput: true,
      },
      {
        id: "var_3",
        name: "seniorApprovers",
        type: "array",
        defaultValue: seniorApprovers,
        description: "List of senior approver user IDs",
        isInput: true,
      },
      {
        id: "var_4",
        name: "highValueThreshold",
        type: "number",
        defaultValue: highValueThreshold,
        description: "Amount threshold for senior approval",
        isInput: true,
      },
      {
        id: "var_5",
        name: "approvalStatus",
        type: "string",
        description: "Final approval status",
        isOutput: true,
      },
      {
        id: "var_6",
        name: "approvedBy",
        type: "string",
        description: "User who approved the request",
        isOutput: true,
      },
      {
        id: "var_7",
        name: "approvedAt",
        type: "date",
        description: "Timestamp of approval",
        isOutput: true,
      },
      {
        id: "var_8",
        name: "reviewedBy",
        type: "string",
        description: "User who reviewed the request",
        isOutput: true,
      },
      {
        id: "var_9",
        name: "rejectionReason",
        type: "string",
        description: "Reason for rejection",
        isOutput: true,
      },
      {
        id: "var_10",
        name: "approvalComment",
        type: "string",
        description: "Comment from approver",
        isOutput: true,
      },
    ],
    settings: {
      maxDuration: 172800000, // 48 hours
      retryOnFailure: true,
      maxRetries: 3,
      logLevel: "all",
      notifyOnComplete: true,
      notifyOnError: true,
      notifyUsers: [...approvers, ...seniorApprovers],
      tags: ["approval", "request", "multi-level"],
      category: "Approvals",
    },
    createdBy,
    createdAt: now,
    updatedAt: now,
    metadata: {
      icon: "CheckCircle",
      color: "#14B8A6",
      category: "Approvals",
      tags: ["approval", "request", "workflow"],
    },
  };
}

export default createApprovalWorkflow;
