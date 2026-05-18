// ============================================================================
// WELCOME WORKFLOW EXAMPLE
// Automatically welcomes new members to the workspace
// ============================================================================

import type { Workflow, WorkflowEdge } from "../workflow-types";
import { createTriggerStep } from "../workflow-triggers";
import {
  createMessageStep,
  createFormStep,
  createConditionStep,
  createEndStep,
} from "../workflow-steps";
import { createCondition } from "../workflow-conditions";

/**
 * Create a welcome workflow that:
 * 1. Triggers when a new member joins
 * 2. Sends a welcome message
 * 3. Asks for introduction via form
 * 4. Posts introduction to a channel (if provided)
 */
export function createWelcomeWorkflow(
  createdBy: string,
  welcomeChannelId?: string,
): Workflow {
  // Create trigger
  const trigger = createTriggerStep("member_joined", { x: 250, y: 50 });
  trigger.name = "Member Joined";
  trigger.description = "Triggered when a new member joins the workspace";

  // Create welcome message step
  const welcomeMessage = createMessageStep(
    { x: 250, y: 180 },
    {
      target: "user",
      content: `Hello {{trigger.data.userName}}! Welcome to our workspace! We're excited to have you here.

Here are some things to help you get started:
- Check out the #general channel for team updates
- Browse #introductions to meet other team members
- Visit #help if you have any questions

Would you like to introduce yourself to the team?`,
      parseVariables: true,
    },
  );
  welcomeMessage.name = "Send Welcome Message";
  welcomeMessage.description =
    "Send a personalized welcome message to the new member";

  // Create introduction form
  const introForm = createFormStep(
    { x: 250, y: 310 },
    {
      title: "Introduce Yourself",
      description: "Help your teammates get to know you!",
      target: "user",
      fields: [
        {
          id: "name",
          name: "displayName",
          label: "What should we call you?",
          type: "text",
          placeholder: "Your preferred name",
          required: true,
        },
        {
          id: "role",
          name: "role",
          label: "What is your role?",
          type: "text",
          placeholder: "e.g., Software Engineer, Designer, Product Manager",
          required: true,
        },
        {
          id: "location",
          name: "location",
          label: "Where are you located?",
          type: "text",
          placeholder: "City, Country or Timezone",
          required: false,
        },
        {
          id: "funFact",
          name: "funFact",
          label: "Share a fun fact about yourself",
          type: "textarea",
          placeholder: "Something interesting about you!",
          required: false,
        },
        {
          id: "wantsToPost",
          name: "postIntroduction",
          label: "Post this to the team?",
          type: "checkbox",
          defaultValue: true,
        },
      ],
      submitLabel: "Submit Introduction",
      timeoutSeconds: 86400, // 24 hours
    },
  );
  introForm.name = "Introduction Form";
  introForm.description = "Collect introduction information from new member";

  // Create condition to check if they want to post
  const checkPost = createConditionStep({ x: 250, y: 440 });
  checkPost.name = "Check Post Preference";
  checkPost.description = "Check if user wants to post introduction";
  checkPost.config = {
    logic: "and",
    conditions: [
      createCondition(
        "variables.formResponse.postIntroduction",
        "equals",
        true,
      ),
    ],
  };

  // Create introduction post message
  const postIntro = createMessageStep(
    { x: 100, y: 570 },
    {
      target: "channel",
      channelId: welcomeChannelId || "introductions",
      content: `Please welcome our newest team member!

**{{variables.formResponse.displayName}}** has joined us as a **{{variables.formResponse.role}}**

{{#if variables.formResponse.location}}Location: {{variables.formResponse.location}}{{/if}}

{{#if variables.formResponse.funFact}}Fun fact: {{variables.formResponse.funFact}}{{/if}}

Everyone say hi!`,
      parseVariables: true,
    },
  );
  postIntro.name = "Post Introduction";
  postIntro.description = "Post the introduction to the team channel";

  // Create thank you message for posting
  const thankYouPost = createMessageStep(
    { x: 100, y: 700 },
    {
      target: "user",
      content:
        "Thanks for introducing yourself! Your introduction has been posted to the team. Looking forward to working with you!",
      parseVariables: false,
    },
  );
  thankYouPost.name = "Thank You (Posted)";
  thankYouPost.description = "Thank the user for posting their introduction";

  // Create thank you message for not posting
  const thankYouNoPost = createMessageStep(
    { x: 400, y: 570 },
    {
      target: "user",
      content:
        "No problem! Your information has been saved. Feel free to introduce yourself to the team whenever you're ready. Welcome aboard!",
      parseVariables: false,
    },
  );
  thankYouNoPost.name = "Thank You (Not Posted)";
  thankYouNoPost.description = "Thank the user when they chose not to post";

  // Create end steps
  const endPosted = createEndStep(
    { x: 100, y: 830 },
    {
      status: "success",
      message: "Welcome workflow completed - introduction posted",
    },
  );
  endPosted.name = "End (Posted)";

  const endNotPosted = createEndStep(
    { x: 400, y: 700 },
    {
      status: "success",
      message: "Welcome workflow completed - no introduction posted",
    },
  );
  endNotPosted.name = "End (Not Posted)";

  // Define edges
  const edges: WorkflowEdge[] = [
    {
      id: "edge_1",
      sourceId: trigger.id,
      targetId: welcomeMessage.id,
      type: "default",
    },
    {
      id: "edge_2",
      sourceId: welcomeMessage.id,
      targetId: introForm.id,
      type: "default",
    },
    {
      id: "edge_3",
      sourceId: introForm.id,
      targetId: checkPost.id,
      type: "default",
    },
    {
      id: "edge_4",
      sourceId: checkPost.id,
      targetId: postIntro.id,
      sourceHandle: "true",
      type: "true",
      label: "Yes, post",
    },
    {
      id: "edge_5",
      sourceId: checkPost.id,
      targetId: thankYouNoPost.id,
      sourceHandle: "false",
      type: "false",
      label: "No, skip",
    },
    {
      id: "edge_6",
      sourceId: postIntro.id,
      targetId: thankYouPost.id,
      type: "default",
    },
    {
      id: "edge_7",
      sourceId: thankYouPost.id,
      targetId: endPosted.id,
      type: "default",
    },
    {
      id: "edge_8",
      sourceId: thankYouNoPost.id,
      targetId: endNotPosted.id,
      type: "default",
    },
  ];

  const now = new Date().toISOString();

  return {
    id: `workflow_welcome_${Date.now()}`,
    name: "Welcome New Members",
    description:
      "Automatically welcomes new members with a personalized message and optional introduction form",
    status: "draft",
    version: 1,
    steps: [
      trigger,
      welcomeMessage,
      introForm,
      checkPost,
      postIntro,
      thankYouPost,
      thankYouNoPost,
      endPosted,
      endNotPosted,
    ],
    edges,
    variables: [
      {
        id: "var_1",
        name: "welcomeChannelId",
        type: "string",
        defaultValue: welcomeChannelId || "introductions",
        description: "Channel ID for posting introductions",
        isInput: true,
      },
    ],
    settings: {
      maxDuration: 86400000, // 24 hours
      retryOnFailure: false,
      logLevel: "all",
      notifyOnError: true,
      tags: ["onboarding", "welcome", "automated"],
      category: "Onboarding",
    },
    createdBy,
    createdAt: now,
    updatedAt: now,
    metadata: {
      icon: "UserPlus",
      color: "#10B981",
      category: "Onboarding",
      tags: ["onboarding", "welcome", "new-member"],
    },
  };
}

export default createWelcomeWorkflow;
