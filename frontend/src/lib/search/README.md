# Search System Documentation

## Overview

The nself-chat search system provides powerful full-text search capabilities across messages, files, users, and channels using MeiliSearch.

## Features

- **Full-text search** across all content types
- **Search operators** for advanced filtering
- **Saved searches** for frequently used queries
- **Search history** tracking
- **Keyboard shortcuts** (Cmd+K / Ctrl+K)
- **Real-time indexing** as content is created/updated
- **Highlighted results** with context snippets

## Architecture

```
┌─────────────────────┐
│   SearchModal       │  ← User Interface
│  (Cmd+K / Ctrl+K)  │
└──────────┬──────────┘
           │
           ├── SearchFilters (date, channel, user, type)
           ├── SearchResults (display results)
           └── SavedSearches (saved queries)
           │
           ▼
┌─────────────────────┐
│   use-search hook   │  ← React Hook
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  /api/search        │  ← API Route
└──────────┬──────────┘
           │
           ├── query-parser (parse operators)
           └── meilisearch-client (search)
           │
           ▼
┌─────────────────────┐
│   MeiliSearch       │  ← Search Engine
│   (port 7700)       │
└─────────────────────┘
```

## Search Operators

### From Operator

Search messages from a specific user:

```
project update from:john
```

### In Operator

Search within a specific channel:

```
bug report in:dev
```

### Has Operator

Filter by content type:

```
has:link          # Messages with links
has:file          # Messages with attachments
has:image         # Messages with images
```

### Date Operators

Filter by date range:

```
before:2024-01-01  # Before date
after:2024-01-01   # After date
```

### Is Operator

Filter by message properties:

```
is:pinned         # Pinned messages only
is:starred        # Starred messages only
```

### Combined Operators

Combine multiple operators:

```
project update from:john in:general has:file after:2024-01-01
```

## Usage

### Basic Search

```typescript
import { useSearch } from '@/hooks/use-search'

function MyComponent() {
  const { search, results, isLoading, error } = useSearch()

  const handleSearch = async () => {
    await search('my query', {
      type: 'messages',
      limit: 20
    })
  }

  return (
    <div>
      {isLoading && <div>Searching...</div>}
      {error && <div>Error: {error}</div>}
      {results && <div>Found {results.totals.total} results</div>}
    </div>
  )
}
```

### With Keyboard Shortcut

```typescript
import { useSearchKeyboard } from '@/hooks/use-search-keyboard'
import { SearchModal } from '@/components/search/SearchModal'

function MyApp() {
  const { isSearchOpen, setIsSearchOpen } = useSearchKeyboard()

  return (
    <>
      <div>Press Cmd+K to search</div>
      <SearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  )
}
```

### Save a Search

```typescript
const { saveSearch } = useSearch();

await saveSearch("Weekly Updates", "update from:john", {
  dateFrom: "2024-01-01",
});
```

## Indexing

### Automatic Indexing

Content is automatically indexed when created or updated:

```typescript
import { indexMessage } from "@/lib/search/indexer";

// After creating a message
await indexMessage({
  id: message.id,
  content: message.content,
  author_id: message.author_id,
  author_name: message.author_name,
  channel_id: message.channel_id,
  channel_name: message.channel_name,
  created_at: message.created_at,
  has_link: hasLinks(message.content),
  has_file: message.attachments.length > 0,
  has_image: message.attachments.some((a) => a.type === "image"),
  is_pinned: false,
  is_starred: false,
});
```

### Bulk Reindexing

Reindex all content from database:

```typescript
import { reindexAllMessages, reindexAllFiles } from "@/lib/search/indexer";

// Fetch from database
const fetchMessages = async () => {
  const { data } = await client.query({ query: GET_ALL_MESSAGES });
  return data.messages;
};

// Reindex
await reindexAllMessages(fetchMessages);
await reindexAllFiles(fetchFiles);
```

### Delete from Index

Remove content from search index:

```typescript
import { deleteFromIndex, INDEX_NAMES } from "@/lib/search/indexer";

await deleteFromIndex(INDEX_NAMES.MESSAGES, messageId);
```

## Configuration

### Environment Variables

```bash
# MeiliSearch URL
NEXT_PUBLIC_MEILISEARCH_URL=http://search.localhost:7700

# Master key (server-side only)
MEILISEARCH_MASTER_KEY=your-master-key-here
```

### Initialize Indexes

Run once to create indexes with proper configuration:

```typescript
import { initializeIndexes } from "@/lib/search/meilisearch-client";

await initializeIndexes();
```

This creates:

- `messages` index with searchable/filterable attributes
- `files` index
- `users` index
- `channels` index

## API Reference

### POST /api/search

Search across all content types:

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "project update from:john",
    "types": ["messages"],
    "limit": 20,
    "offset": 0
  }'
```

Response:

```json
{
  "success": true,
  "results": [
    {
      "id": "msg-1",
      "type": "messages",
      "title": "Message from John",
      "content": "Here is the project update...",
      "highlight": "...the <mark>project update</mark>...",
      "channelName": "general",
      "createdAt": "2024-01-30T12:00:00Z"
    }
  ],
  "totals": {
    "messages": 5,
    "files": 0,
    "users": 0,
    "channels": 0,
    "total": 5
  }
}
```

### GET /api/search?q=query

Quick search endpoint:

```bash
curl http://localhost:3000/api/search?q=project+update&limit=10
```

## Database Schema

### search_history

Stores user search history:

```sql
CREATE TABLE nchat_search_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  result_count INTEGER,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);
```

### saved_searches

Stores user saved searches:

```sql
CREATE TABLE nchat_saved_searches (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0
);
```

## Performance

### Indexing Performance

- **Single message**: ~10ms
- **Bulk messages (1000)**: ~500ms
- **Full reindex (100k messages)**: ~30s

### Search Performance

- **Simple query**: ~5ms
- **Complex query with filters**: ~15ms
- **Search across all types**: ~20ms

### Optimization Tips

1. **Batch indexing**: Use bulk methods for multiple documents
2. **Background indexing**: Index new content asynchronously
3. **Scheduled reindex**: Run full reindex during off-peak hours
4. **Pagination**: Limit results per page (20-50 recommended)
5. **Debounce search**: Wait 300ms after user stops typing

## Troubleshooting

### MeiliSearch not running

Check if MeiliSearch container is running:

```bash
cd .backend
nself status
```

Start MeiliSearch if stopped:

```bash
cd .backend
nself start
```

### Indexes not created

Initialize indexes manually:

```bash
curl -X POST http://localhost:3000/api/search/initialize
```

### Search not finding results

1. Check if content is indexed:

```bash
curl http://search.localhost:7700/indexes/messages/stats
```

2. Reindex content:

```typescript
await reindexAllMessages(fetchMessages);
```

3. Check MeiliSearch logs:

```bash
cd .backend
nself logs meilisearch
```

### Slow search performance

1. Check index stats:

```bash
curl http://search.localhost:7700/indexes/messages/stats
```

2. Optimize filterable attributes (only add what you need)
3. Reduce searchable attributes
4. Use pagination (limit results)

## Examples

### Search Messages in Channel

```typescript
const { search } = useSearch();

await search("bug report in:dev", {
  type: "messages",
});
```

### Search Files by User

```typescript
await search("from:alice", {
  type: "files",
});
```

### Search with Date Range

```typescript
await search("update after:2024-01-01 before:2024-02-01", {
  type: "messages",
});
```

### Search Pinned Messages

```typescript
await search("is:pinned", {
  type: "messages",
});
```

## Future Enhancements

- [ ] Fuzzy search for typo tolerance
- [ ] Search suggestions/autocomplete
- [ ] Search analytics dashboard
- [ ] Export search results
- [ ] Advanced filters in UI
- [ ] Search within threads
- [ ] Search by file type
- [ ] Search by reaction
- [ ] Search by mention

## Resources

- [MeiliSearch Documentation](https://docs.meilisearch.com/)
- [MeiliSearch REST API](https://docs.meilisearch.com/reference/api/)
- [Search Best Practices](https://docs.meilisearch.com/learn/getting_started/search_preview.html)
