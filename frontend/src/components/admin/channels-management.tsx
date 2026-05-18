"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Channel {
  id: string;
  name: string;
  slug: string;
  type: string;
  memberCount: number;
  messageCount: number;
}

export function ChannelsManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [channels] = useState<Channel[]>([
    {
      id: "1",
      name: "general",
      slug: "general",
      type: "public",
      memberCount: 0,
      messageCount: 0,
    },
    {
      id: "2",
      name: "random",
      slug: "random",
      type: "public",
      memberCount: 0,
      messageCount: 0,
    },
    {
      id: "3",
      name: "announcements",
      slug: "announcements",
      type: "public",
      memberCount: 0,
      messageCount: 0,
    },
  ]);

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channels Management</CardTitle>
        <CardDescription>Manage workspace channels</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button>Create Channel</Button>
        </div>

        <div className="space-y-4">
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">
                  <span className="text-muted-foreground">#</span>{" "}
                  {channel.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {channel.memberCount} members · {channel.messageCount}{" "}
                  messages
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="bg-primary/10 rounded-full px-3 py-1 text-xs font-medium text-primary">
                  {channel.type}
                </span>
                <Button variant="outline" size="sm">
                  Settings
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
