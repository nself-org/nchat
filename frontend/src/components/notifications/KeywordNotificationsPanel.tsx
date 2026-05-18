"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";
import {
  createKeyword,
  validateKeyword,
} from "@/lib/notifications/keyword-matcher";
import type { KeywordNotification } from "@/lib/notifications/notification-types";

export interface KeywordNotificationsPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * KeywordNotificationsPanel - Custom keyword alert settings
 */
export function KeywordNotificationsPanel({
  className,
  ...props
}: KeywordNotificationsPanelProps) {
  const [newKeyword, setNewKeyword] = React.useState("");
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [wholeWord, setWholeWord] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const keywords = useNotificationSettingsStore(
    (state) => state.preferences.keywords,
  );
  const addKeyword = useNotificationSettingsStore((state) => state.addKeyword);
  const updateKeyword = useNotificationSettingsStore(
    (state) => state.updateKeyword,
  );
  const removeKeyword = useNotificationSettingsStore(
    (state) => state.removeKeyword,
  );
  const toggleKeyword = useNotificationSettingsStore(
    (state) => state.toggleKeyword,
  );

  // Add new keyword
  const handleAddKeyword = () => {
    const validation = validateKeyword(newKeyword);
    if (!validation.valid) {
      setError(validation.error || "Invalid keyword");
      return;
    }

    // Check for duplicates
    const exists = keywords.some(
      (k) => k.keyword.toLowerCase() === newKeyword.toLowerCase().trim(),
    );
    if (exists) {
      setError("This keyword already exists");
      return;
    }

    const keyword = createKeyword(newKeyword, {
      caseSensitive,
      wholeWord,
      enabled: true,
    });

    addKeyword(keyword);
    setNewKeyword("");
    setCaseSensitive(false);
    setWholeWord(true);
    setError(null);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  // Handle delete
  const handleDelete = (keywordId: string) => {
    if (window.confirm("Are you sure you want to delete this keyword?")) {
      removeKeyword(keywordId);
    }
  };

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Add New Keyword */}
      <Card className="p-4">
        <h3 className="mb-4 text-sm font-medium">Add Keyword</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a word or phrase..."
              value={newKeyword}
              onChange={(e) => {
                setNewKeyword(e.target.value);
                setError(null);
              }}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleAddKeyword} disabled={!newKeyword.trim()}>
              Add
            </Button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="case-sensitive"
                checked={caseSensitive}
                onCheckedChange={setCaseSensitive}
              />
              <Label htmlFor="case-sensitive" className="text-sm">
                Case sensitive
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="whole-word"
                checked={wholeWord}
                onCheckedChange={setWholeWord}
              />
              <Label htmlFor="whole-word" className="text-sm">
                Whole word only
              </Label>
            </div>
          </div>
        </div>
      </Card>

      {/* Keywords List */}
      <Card className="p-4">
        <h3 className="mb-4 text-sm font-medium">
          Your Keywords
          {keywords.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground">
              ({keywords.length})
            </span>
          )}
        </h3>

        {keywords.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <svg
              className="mx-auto mb-3 h-12 w-12 opacity-50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <p>No keywords yet</p>
            <p className="mt-1 text-sm">
              Add keywords to get notified when they appear in messages
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {keywords.map((keyword) => (
              <KeywordItem
                key={keyword.id}
                keyword={keyword}
                isEditing={editingId === keyword.id}
                onEdit={() => setEditingId(keyword.id)}
                onSave={(updates) => {
                  updateKeyword(keyword.id, updates);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                onToggle={() => toggleKeyword(keyword.id)}
                onDelete={() => handleDelete(keyword.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Tips */}
      <Card className="bg-muted/50 p-4">
        <h4 className="mb-2 text-sm font-medium">Tips</h4>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>- Keywords are matched in message content</li>
          <li>- Use "whole word only" to avoid partial matches</li>
          <li>- Keywords work across all channels unless restricted</li>
          <li>- Disable keywords temporarily by toggling them off</li>
        </ul>
      </Card>
    </div>
  );
}

// Keyword Item Component
interface KeywordItemProps {
  keyword: KeywordNotification;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<KeywordNotification>) => void;
  onCancel: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function KeywordItem({
  keyword,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onToggle,
  onDelete,
}: KeywordItemProps) {
  const [editValue, setEditValue] = React.useState(keyword.keyword);
  const [editCaseSensitive, setEditCaseSensitive] = React.useState(
    keyword.caseSensitive,
  );
  const [editWholeWord, setEditWholeWord] = React.useState(keyword.wholeWord);

  if (isEditing) {
    return (
      <div className="space-y-3 rounded-lg border p-3">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          autoFocus
        />{" "}
        {/* eslint-disable-line jsx-a11y/no-autofocus */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={editCaseSensitive}
              onCheckedChange={setEditCaseSensitive}
            />
            <span className="text-xs">Case sensitive</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={editWholeWord}
              onCheckedChange={setEditWholeWord}
            />
            <span className="text-xs">Whole word</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({
                keyword: editValue,
                caseSensitive: editCaseSensitive,
                wholeWord: editWholeWord,
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Switch checked={keyword.enabled} onCheckedChange={onToggle} />
        <div>
          <span
            className={cn(
              "font-medium",
              !keyword.enabled && "text-muted-foreground",
            )}
          >
            {keyword.keyword}
          </span>
          <div className="mt-0.5 flex items-center gap-2">
            {keyword.caseSensitive && (
              <Badge variant="outline" className="text-xs">
                Aa
              </Badge>
            )}
            {keyword.wholeWord && (
              <Badge variant="outline" className="text-xs">
                Word
              </Badge>
            )}
            {keyword.channelIds.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {keyword.channelIds.length} channel
                {keyword.channelIds.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <svg
            className="h-4 w-4 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

KeywordNotificationsPanel.displayName = "KeywordNotificationsPanel";

export default KeywordNotificationsPanel;
