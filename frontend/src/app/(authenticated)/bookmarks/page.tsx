"use client";

/**
 * Bookmarks Page
 *
 * Main page for viewing and managing bookmarks.
 */

import { BookmarkList } from "@/components/bookmarks/BookmarkList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavedMessages } from "@/components/bookmarks/SavedMessages";
import { Bookmark, Save } from "lucide-react";

export default function BookmarksPage() {
  return (
    <div className="flex h-screen flex-col">
      <Tabs defaultValue="bookmarks" className="flex h-full flex-col">
        <div className="border-b">
          <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
            <TabsTrigger
              value="bookmarks"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Bookmarks
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Save className="mr-2 h-4 w-4" />
              Saved Messages
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="bookmarks" className="m-0 flex-1">
          <BookmarkList />
        </TabsContent>

        <TabsContent value="saved" className="m-0 flex-1">
          <SavedMessages />
        </TabsContent>
      </Tabs>
    </div>
  );
}
