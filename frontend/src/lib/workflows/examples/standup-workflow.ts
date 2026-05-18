// ============================================================================
// STANDUP WORKFLOW EXAMPLE
// Automated daily standup collection and summary
// ============================================================================

import type { Workflow, WorkflowEdge, LoopStep } from "../workflow-types";
import { createTriggerStep } from "../workflow-triggers";
import {
  createMessageStep,
  createFormStep,
  createDelayStep,
  createLoopStep,
  createEndStep,
} from "../workflow-steps";
import { createActionStep } from "../workflow-actions";

/**
 * Create a standup workflow that:
 * 1. Triggers on a schedule (weekdays at 9am)
 * 2. Sends standup forms to team members
 * 3. Collects responses
 * 4. Posts a summary to the team channel
 */
export function createStandupWorkflow(
  createdBy: string,
  teamChannelId: string,
  teamMemberIds: string[] = [],
): Workflow {
  // Create scheduled trigger
  const trigger = createTriggerStep("scheduled", { x: 250, y: 50 });
  trigger.name = "Daily Standup Trigger";
  trigger.description = "Runs every weekday at 9:00 AM";
  trigger.config = {
    triggerType: "scheduled",
    schedule: {
      type: "recurring",
      cron: "0 9 * * 1-5", // 9am Mon-Fri
      timezone: "America/New_York",
    },
  };

  // Initialize variables
  const initVars = createActionStep("set_variable", { x: 250, y: 180 });
  initVars.name = "Initialize Variables";
  initVars.description = "Set up variables for standup collection";
  initVars.config = {
    actionType: "set_variable",
    variableName: "responses",
    variableValue: [],
  };

  // Create announcement message
  const announcement = createMessageStep(
    { x: 250, y: 310 },
    {
      target: "channel",
      channelId: teamChannelId,
      content: `Good morning team! It's standup time.

Please take a moment to share your update. I'll collect everyone's responses and post a summary shortly.

Check your DMs for the standup form.`,
      parseVariables: true,
    },
  );
  announcement.name = "Announce Standup";
  announcement.description = "Post announcement to team channel";

  // Loop through team members
  const loopMembers = createLoopStep(
    { x: 250, y: 440 },
    {
      loopType: "for_each",
      collection: "teamMembers",
      itemVariableName: "currentMember",
      indexVariableName: "memberIndex",
      maxIterations: 50,
    },
  ) as LoopStep;
  loopMembers.name = "Loop Team Members";
  loopMembers.description = "Send standup form to each team member";

  // Create standup form (sent to each member)
  const standupForm = createFormStep(
    { x: 100, y: 570 },
    {
      title: "Daily Standup",
      description: "Share your daily update with the team",
      target: "user",
      fields: [
        {
          id: "yesterday",
          name: "yesterday",
          label: "What did you accomplish yesterday?",
          type: "textarea",
          placeholder: "List your completed tasks...",
          required: true,
          validation: {
            minLength: 10,
            maxLength: 500,
          },
        },
        {
          id: "today",
          name: "today",
          label: "What are you working on today?",
          type: "textarea",
          placeholder: "List your planned tasks...",
          required: true,
          validation: {
            minLength: 10,
            maxLength: 500,
          },
        },
        {
          id: "blockers",
          name: "blockers",
          label: "Any blockers or challenges?",
          type: "textarea",
          placeholder: 'Describe any obstacles (or write "None" if clear)',
          required: false,
        },
        {
          id: "mood",
          name: "mood",
          label: "How are you feeling today?",
          type: "select",
          options: [
            { label: "Great", value: "great" },
            { label: "Good", value: "good" },
            { label: "Okay", value: "okay" },
            { label: "Struggling", value: "struggling" },
          ],
          required: false,
        },
      ],
      submitLabel: "Submit Standup",
      timeoutSeconds: 7200, // 2 hours to respond
    },
  );
  standupForm.name = "Standup Form";
  standupForm.description = "Collect standup response from team member";

  // Wait for responses
  const waitForResponses = createDelayStep(
    { x: 250, y: 700 },
    {
      delayType: "fixed",
      duration: 2,
      durationUnit: "hours",
      maxWaitDuration: 7200000, // 2 hours max
    },
  );
  waitForResponses.name = "Wait for Responses";
  waitForResponses.description = "Wait 2 hours for team members to respond";

  // Create summary message
  const postSummary = createMessageStep(
    { x: 250, y: 830 },
    {
      target: "channel",
      channelId: teamChannelId,
      content: `**Daily Standup Summary** - {{trigger.data.date}}

{{#each variables.responses}}
---
**{{this.memberName}}** {{#if this.mood}}({{this.mood}}){{/if}}

*Yesterday:*
{{this.yesterday}}

*Today:*
{{this.today}}

{{#if this.blockers}}*Blockers:* {{this.blockers}}{{/if}}
{{/each}}

---
*{{variables.responseCount}}/{{variables.teamCount}} team members responded*`,
      parseVariables: true,
      embeds: [
        {
          title: "Standup Complete",
          color: "#10B981",
          fields: [
            {
              name: "Responses",
              value: "{{variables.responseCount}}",
              inline: true,
            },
            {
              name: "Team Size",
              value: "{{variables.teamCount}}",
              inline: true,
            },
          ],
          timestamp: true,
        },
      ],
    },
  );
  postSummary.name = "Post Summary";
  postSummary.description = "Post the standup summary to the team channel";

  // End step
  const end = createEndStep(
    { x: 250, y: 960 },
    {
      status: "success",
      message: "Daily standup completed",
      outputVariables: ["responses", "responseCount"],
    },
  );
  end.name = "End";
  end.description = "Standup workflow complete";

  // Define edges
  const edges: WorkflowEdge[] = [
    {
      id: "edge_1",
      sourceId: trigger.id,
      targetId: initVars.id,
      type: "default",
    },
    {
      id: "edge_2",
      sourceId: initVars.id,
      targetId: announcement.id,
      type: "default",
    },
    {
      id: "edge_3",
      sourceId: announcement.id,
      targetId: loopMembers.id,
      type: "default",
    },
    {
      id: "edge_4",
      sourceId: loopMembers.id,
      targetId: standupForm.id,
      sourceHandle: "iteration",
      type: "loop",
      label: "For each member",
    },
    {
      id: "edge_5",
      sourceId: standupForm.id,
      targetId: loopMembers.id,
      type: "loop",
      label: "Next member",
    },
    {
      id: "edge_6",
      sourceId: loopMembers.id,
      targetId: waitForResponses.id,
      sourceHandle: "complete",
      type: "default",
      label: "All sent",
    },
    {
      id: "edge_7",
      sourceId: waitForResponses.id,
      targetId: postSummary.id,
      type: "default",
    },
    {
      id: "edge_8",
      sourceId: postSummary.id,
      targetId: end.id,
      type: "default",
    },
  ];

  const now = new Date().toISOString();

  return {
    id: `workflow_standup_${Date.now()}`,
    name: "Daily Standup",
    description:
      "Automated daily standup that collects updates from team members and posts a summary",
    status: "draft",
    version: 1,
    steps: [
      trigger,
      initVars,
      announcement,
      loopMembers,
      standupForm,
      waitForResponses,
      postSummary,
      end,
    ],
    edges,
    variables: [
      {
        id: "var_1",
        name: "teamChannelId",
        type: "string",
        defaultValue: teamChannelId,
        description: "Channel ID for team standups",
        isInput: true,
      },
      {
        id: "var_2",
        name: "teamMembers",
        type: "array",
        defaultValue: teamMemberIds,
        description: "Array of team member IDs",
        isInput: true,
      },
      {
        id: "var_3",
        name: "responses",
        type: "array",
        defaultValue: [],
        description: "Collected standup responses",
      },
      {
        id: "var_4",
        name: "responseCount",
        type: "number",
        defaultValue: 0,
        description: "Number of responses received",
      },
      {
        id: "var_5",
        name: "teamCount",
        type: "number",
        defaultValue: teamMemberIds.length,
        description: "Total team size",
      },
    ],
    settings: {
      maxDuration: 10800000, // 3 hours
      retryOnFailure: true,
      maxRetries: 2,
      logLevel: "all",
      notifyOnComplete: true,
      notifyOnError: true,
      notifyUsers: [createdBy],
      tags: ["standup", "daily", "team", "automated"],
      category: "Team Rituals",
    },
    createdBy,
    createdAt: now,
    updatedAt: now,
    metadata: {
      icon: "Calendar",
      color: "#3B82F6",
      category: "Team Rituals",
      tags: ["standup", "daily", "agile"],
    },
  };
}

export default createStandupWorkflow;
