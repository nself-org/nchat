"use client";

/**
 * Bot Testing Component
 * Test sandbox for trying out your bot
 */

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BotBuilderDefinition } from "@/lib/bots";

// ============================================================================
// TYPES
// ============================================================================

interface BotTestingProps {
  bot: BotBuilderDefinition;
  className?: string;
}

interface TestMessage {
  id: string;
  type: "user" | "bot" | "system";
  content: string;
  timestamp: Date;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BotTesting({ bot, className }: BotTestingProps) {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add system message on load
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        type: "system",
        content: `Bot "${bot.name}" loaded. Try sending a message to test it!`,
        timestamp: new Date(),
      },
    ]);
  }, [bot.name]);

  // Add a message
  const addMessage = (type: TestMessage["type"], content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  // Process message through bot
  const processBotResponse = (userMessage: string) => {
    // Check triggers
    for (const trigger of bot.triggers) {
      let shouldRespond = false;

      switch (trigger.type) {
        case "message_created":
          shouldRespond = true;
          break;

        case "keyword":
          const keywords = trigger.config.keywords as string[];
          if (keywords) {
            shouldRespond = keywords.some((k) =>
              userMessage.toLowerCase().includes(k.toLowerCase()),
            );
          }
          break;

        case "mention":
          shouldRespond = userMessage
            .toLowerCase()
            .includes("@" + bot.name.toLowerCase());
          break;
      }

      if (shouldRespond) {
        // Execute actions
        for (const action of bot.actions.sort((a, b) => a.order - b.order)) {
          switch (action.type) {
            case "send_message":
            case "reply_message":
              const message = processTemplate(action.config.message as string, {
                user: "TestUser",
                channel: "test-channel",
                message: userMessage,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
              });
              addMessage("bot", message);
              break;

            case "add_reaction":
              const reactions = action.config.reactions as string[];
              if (reactions) {
                addMessage("bot", `[Added reactions: ${reactions.join(" ")}]`);
              }
              break;
          }

          // Check for command
          if (action.config.isCommand) {
            const commandName = action.config.command as string;
            if (userMessage.startsWith("/" + commandName)) {
              const response = processTemplate(
                action.config.response as string,
                {
                  user: "TestUser",
                  channel: "test-channel",
                  message: userMessage,
                  date: new Date().toLocaleDateString(),
                  time: new Date().toLocaleTimeString(),
                },
              );
              addMessage("bot", response);
            }
          }
        }
        break; // Only respond to first matching trigger
      }
    }
  };

  // Process template variables
  const processTemplate = (
    template: string,
    vars: Record<string, string>,
  ): string => {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  };

  // Send message
  const handleSend = () => {
    if (!input.trim()) return;

    addMessage("user", input);
    setIsProcessing(true);

    // Simulate processing delay
    setTimeout(() => {
      processBotResponse(input);
      setIsProcessing(false);
    }, 500);

    setInput("");
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear chat
  const handleClear = () => {
    setMessages([
      {
        id: "cleared",
        type: "system",
        content: "Chat cleared. Start testing again!",
        timestamp: new Date(),
      },
    ]);
  };

  // Simulate events
  const simulateEvent = (event: string) => {
    addMessage("system", `[Simulated: ${event}]`);

    for (const trigger of bot.triggers) {
      if (trigger.type === event) {
        for (const action of bot.actions.sort((a, b) => a.order - b.order)) {
          if (
            action.type === "send_message" ||
            action.type === "reply_message"
          ) {
            const message = processTemplate(action.config.message as string, {
              user: "NewUser",
              channel: "test-channel",
              message: "",
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
            });
            addMessage("bot", message);
          }
        }
      }
    }
  };

  return (
    <div className={cn("flex h-[500px] flex-col", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="font-medium">Test Sandbox</h4>
          <p className="text-sm text-muted-foreground">
            Test your bot before deploying
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleClear}>
          Clear Chat
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="mb-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => simulateEvent("user_joined")}
        >
          Simulate Join
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => simulateEvent("user_left")}
        >
          Simulate Leave
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => simulateEvent("reaction_added")}
        >
          Simulate Reaction
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-2",
              message.type === "user" && "justify-end",
              message.type === "system" && "justify-center",
            )}
          >
            {message.type === "bot" && (
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-sm text-primary">
                B
              </div>
            )}
            <div
              className={cn(
                "max-w-[70%] rounded-lg px-3 py-2",
                message.type === "user" && "text-primary-foreground bg-primary",
                message.type === "bot" && "bg-muted",
                message.type === "system" &&
                  "bg-muted/50 text-sm text-muted-foreground",
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="mt-1 text-xs opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            {message.type === "user" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm">
                U
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-2">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-sm text-primary">
              B
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message to test..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2"
          disabled={isProcessing}
        />
        <Button onClick={handleSend} disabled={isProcessing || !input.trim()}>
          Send
        </Button>
      </div>

      {/* Commands hint */}
      {bot.actions.some((a) => a.config.isCommand) && (
        <div className="mt-2 text-sm text-muted-foreground">
          Available commands:{" "}
          {bot.actions
            .filter((a) => a.config.isCommand)
            .map((a) => "/" + a.config.command)
            .join(", ")}
        </div>
      )}
    </div>
  );
}

export default BotTesting;
