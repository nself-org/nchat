// ===============================================================================
// Demo Mode Utilities
// ===============================================================================
//
// Provides utilities for managing demo mode state, demo user authentication,
// and demo data operations. Demo mode allows users to try the platform
// without creating an account.
//
// ===============================================================================

import {
  getCurrentDemoUser,
  demoUsers,
  demoChannels,
  demoMessages,
} from "./sample-data";
import type { DemoUser, DemoChannel, DemoMessage } from "./sample-data";
import type { TemplateId } from "@/templates/types";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface DemoState {
  isEnabled: boolean;
  currentTemplate: TemplateId;
  currentUser: DemoUser | null;
  sessionStartedAt: Date | null;
  messagesAdded: DemoMessage[];
  reactionsAdded: Array<{ messageId: string; emoji: string; userId: string }>;
}

export interface DemoSession {
  id: string;
  template: TemplateId;
  startedAt: Date;
  expiresAt: Date;
  user: DemoUser;
}

// -------------------------------------------------------------------------------
// Storage Keys
// -------------------------------------------------------------------------------

const DEMO_STATE_KEY = "nchat-demo-state";
const DEMO_SESSION_KEY = "nchat-demo-session";
const DEMO_MESSAGES_KEY = "nchat-demo-messages";
const DEMO_REACTIONS_KEY = "nchat-demo-reactions";

// -------------------------------------------------------------------------------
// Demo Mode State Management
// -------------------------------------------------------------------------------

/**
 * Check if demo mode is currently enabled
 */
export function isDemoModeEnabled(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const state = localStorage.getItem(DEMO_STATE_KEY);
    if (!state) return false;
    const parsed = JSON.parse(state) as DemoState;
    return parsed.isEnabled === true;
  } catch {
    return false;
  }
}

/**
 * Get the current demo state
 */
export function getDemoState(): DemoState | null {
  if (typeof window === "undefined") return null;

  try {
    const state = localStorage.getItem(DEMO_STATE_KEY);
    if (!state) return null;
    return JSON.parse(state) as DemoState;
  } catch {
    return null;
  }
}

/**
 * Enable demo mode with a specific template
 */
export function enableDemoMode(templateId: TemplateId): DemoState {
  const demoUser = getCurrentDemoUser();

  const state: DemoState = {
    isEnabled: true,
    currentTemplate: templateId,
    currentUser: demoUser,
    sessionStartedAt: new Date(),
    messagesAdded: [],
    reactionsAdded: [],
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state));

    // Also create a session
    const session: DemoSession = {
      id: generateSessionId(),
      template: templateId,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      user: demoUser,
    };
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  }

  return state;
}

/**
 * Disable demo mode and clear all demo data
 */
export function disableDemoMode(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(DEMO_STATE_KEY);
  localStorage.removeItem(DEMO_SESSION_KEY);
  localStorage.removeItem(DEMO_MESSAGES_KEY);
  localStorage.removeItem(DEMO_REACTIONS_KEY);
}

/**
 * Switch to a different template while in demo mode
 */
export function switchDemoTemplate(templateId: TemplateId): DemoState | null {
  const currentState = getDemoState();
  if (!currentState) {
    return enableDemoMode(templateId);
  }

  const newState: DemoState = {
    ...currentState,
    currentTemplate: templateId,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(newState));

    // Update session
    const session = getDemoSession();
    if (session) {
      session.template = templateId;
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    }
  }

  return newState;
}

/**
 * Get the current template in demo mode
 */
export function getCurrentDemoTemplate(): TemplateId {
  const state = getDemoState();
  return state?.currentTemplate ?? "default";
}

// -------------------------------------------------------------------------------
// Demo Session Management
// -------------------------------------------------------------------------------

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the current demo session
 */
export function getDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;

  try {
    const session = localStorage.getItem(DEMO_SESSION_KEY);
    if (!session) return null;

    const parsed = JSON.parse(session) as DemoSession;

    // Check if session has expired
    if (new Date(parsed.expiresAt) < new Date()) {
      disableDemoMode();
      return null;
    }

    return {
      ...parsed,
      startedAt: new Date(parsed.startedAt),
      expiresAt: new Date(parsed.expiresAt),
    };
  } catch {
    return null;
  }
}

/**
 * Check if there's a valid demo session
 */
export function hasValidDemoSession(): boolean {
  const session = getDemoSession();
  return session !== null;
}

/**
 * Extend the demo session by 24 hours
 */
export function extendDemoSession(): DemoSession | null {
  const session = getDemoSession();
  if (!session) return null;

  const extendedSession: DemoSession = {
    ...session,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(extendedSession));
  }

  return extendedSession;
}

// -------------------------------------------------------------------------------
// Demo User Authentication (Simulated)
// -------------------------------------------------------------------------------

/**
 * Get the current demo user (no real authentication)
 */
export function getDemoUser(): DemoUser | null {
  const state = getDemoState();
  return state?.currentUser ?? null;
}

/**
 * Check if a user is "logged in" to demo mode
 */
export function isDemoUserLoggedIn(): boolean {
  return isDemoModeEnabled() && getDemoUser() !== null;
}

/**
 * Simulate signing in as a different demo user
 */
export function switchDemoUser(userId: string): DemoUser | null {
  const user = demoUsers.find((u) => u.id === userId);
  if (!user) return null;

  const state = getDemoState();
  if (!state) return null;

  const newState: DemoState = {
    ...state,
    currentUser: user,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(newState));

    // Update session user
    const session = getDemoSession();
    if (session) {
      session.user = user;
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    }
  }

  return user;
}

// -------------------------------------------------------------------------------
// Demo Data Operations (Simulated CRUD)
// -------------------------------------------------------------------------------

/**
 * Add a message in demo mode (stored in localStorage)
 */
export function addDemoMessage(
  message: Omit<DemoMessage, "id">,
): DemoMessage | null {
  const state = getDemoState();
  if (!state) return null;

  const newMessage: DemoMessage = {
    ...message,
    id: `demo-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  };

  const messages = getDemoMessages();
  messages.push(newMessage);

  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(messages));

    // Update state
    const newState: DemoState = {
      ...state,
      messagesAdded: [...state.messagesAdded, newMessage],
    };
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(newState));
  }

  return newMessage;
}

/**
 * Get all demo messages (original + user-added)
 */
export function getDemoMessages(): DemoMessage[] {
  if (typeof window === "undefined") return [...demoMessages];

  try {
    const stored = localStorage.getItem(DEMO_MESSAGES_KEY);
    if (!stored) return [...demoMessages];

    const userMessages = JSON.parse(stored) as DemoMessage[];
    return [...demoMessages, ...userMessages];
  } catch {
    return [...demoMessages];
  }
}

/**
 * Add a reaction to a message in demo mode
 */
export function addDemoReaction(messageId: string, emoji: string): boolean {
  const state = getDemoState();
  if (!state || !state.currentUser) return false;

  const reactions = getDemoReactions();

  // Check if user already reacted with this emoji
  const existingIndex = reactions.findIndex(
    (r) =>
      r.messageId === messageId &&
      r.emoji === emoji &&
      r.userId === state.currentUser!.id,
  );

  if (existingIndex >= 0) {
    // Remove reaction (toggle off)
    reactions.splice(existingIndex, 1);
  } else {
    // Add reaction
    reactions.push({
      messageId,
      emoji,
      userId: state.currentUser.id,
    });
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_REACTIONS_KEY, JSON.stringify(reactions));

    // Update state
    const newState: DemoState = {
      ...state,
      reactionsAdded: reactions,
    };
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(newState));
  }

  return true;
}

/**
 * Get all demo reactions
 */
export function getDemoReactions(): Array<{
  messageId: string;
  emoji: string;
  userId: string;
}> {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(DEMO_REACTIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// -------------------------------------------------------------------------------
// Demo Data Reset
// -------------------------------------------------------------------------------

/**
 * Reset all demo data to initial state (keeps demo mode enabled)
 */
export function resetDemoData(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(DEMO_MESSAGES_KEY);
  localStorage.removeItem(DEMO_REACTIONS_KEY);

  const state = getDemoState();
  if (state) {
    const resetState: DemoState = {
      ...state,
      messagesAdded: [],
      reactionsAdded: [],
    };
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(resetState));
  }
}

/**
 * Get demo channels (they remain static)
 */
export function getDemoChannels(): DemoChannel[] {
  return [...demoChannels];
}

/**
 * Get demo users (they remain static)
 */
export function getDemoUsers(): DemoUser[] {
  return [...demoUsers];
}

// -------------------------------------------------------------------------------
// URL Helpers
// -------------------------------------------------------------------------------

/**
 * Get the demo URL for a specific template
 */
export function getDemoTemplateUrl(templateId: TemplateId): string {
  return `/demo/${templateId}`;
}

/**
 * Check if the current path is a demo path
 */
export function isDemoPath(pathname: string): boolean {
  return pathname.startsWith("/demo");
}

/**
 * Extract template ID from demo path
 */
export function getTemplateFromPath(pathname: string): TemplateId | null {
  const match = pathname.match(/^\/demo\/([a-z]+)/);
  if (!match) return null;

  const templateId = match[1] as TemplateId;
  const validTemplates: TemplateId[] = [
    "default",
    "slack",
    "discord",
    "telegram",
    "whatsapp",
  ];

  return validTemplates.includes(templateId) ? templateId : null;
}
