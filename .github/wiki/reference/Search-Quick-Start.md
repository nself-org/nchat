# Enhanced Search - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Add to `.env.local`:

```bash
NEXT_PUBLIC_MEILISEARCH_URL=http://search.localhost:7700
MEILISEARCH_MASTER_KEY=nchat-search-dev-key-32-chars-long
```

### 3. Start Backend

```bash
cd .backend
nself start
```

### 4. Initialize Search Indexes

```bash
curl -X POST http://localhost:3000/api/search/initialize
```

### 5. Start Dev Server

```bash
pnpm dev
```

### 6. Try It Out!

Press **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux) to open search.

---

## 🔍 Search Examples

### Basic Search

```
project update
```

### Search from User

```
from:john
```

### Search in Channel

```
in:general
```

### Search with Attachments

```
has:file
```

### Search with Date Range

```
after:2024-01-01 before:2024-12-31
```

### Combined Search

```
project update from:john in:general has:file
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut               | Action              |
| ---------------------- | ------------------- |
| **Cmd+K** / **Ctrl+K** | Open search         |
| **Cmd+S** / **Ctrl+S** | Save current search |
| **Cmd+F** / **Ctrl+F** | Toggle filters      |
| **Escape**             | Close search        |

---

## 🎯 Search Operators

| Operator        | Description          | Example             |
| --------------- | -------------------- | ------------------- |
| `from:username` | Filter by sender     | `from:john`         |
| `in:channel`    | Filter by channel    | `in:general`        |
| `has:link`      | Messages with links  | `has:link`          |
| `has:file`      | Messages with files  | `has:file`          |
| `has:image`     | Messages with images | `has:image`         |
| `before:date`   | Before date          | `before:2024-01-01` |
| `after:date`    | After date           | `after:2024-01-01`  |
| `is:pinned`     | Pinned messages      | `is:pinned`         |
| `is:starred`    | Starred messages     | `is:starred`        |

---

## 📊 Search Tabs

Click tabs to filter by content type:

- **All** - Search everything
- **Messages** - Messages only
- **Files** - Files only
- **Users** - Users only
- **Channels** - Channels only

---

## 💾 Saved Searches

### Save a Search

1. Enter your query
2. Press **Cmd+S** or **Ctrl+S**
3. Enter a name
4. Click OK

### Load a Saved Search

1. Click "Saved" button
2. Click on saved search
3. Results appear instantly

---

## 🔧 Advanced Filters

Click "Filters" button for:

- **Date Range** - From/to dates
- **Channels** - Filter by channel IDs
- **Users** - Filter by user IDs
- **Content Types** - Has link/file/image
- **Properties** - Pinned/starred only
- **Sort** - By relevance or date

---

## 📝 Indexing New Content

### Manual Indexing

```typescript
import { indexMessage } from '@/lib/search/indexer'

await indexMessage({
  id: message.id,
  content: message.content,
  author_id: message.author_id,
  author_name: message.author_name,
  channel_id: message.channel_id,
  channel_name: message.channel_name,
  created_at: message.created_at,
  has_link: /https?:\/\//.test(message.content),
  has_file: false,
  has_image: false,
  is_pinned: false,
  is_starred: false,
})
```

### Bulk Reindexing

```bash
pnpm tsx scripts/reindex-search.ts
```

---

## ❓ Troubleshooting

### Search Modal Won't Open

- Check if **Cmd+K** / **Ctrl+K** works
- Verify `useSearchKeyboard` hook is added to layout

### No Results Found

- Check if MeiliSearch is running: `cd .backend && nself status`
- Initialize indexes: `curl -X POST http://localhost:3000/api/search/initialize`
- Verify content is indexed: `curl http://search.localhost:7700/indexes/messages/stats`

### MeiliSearch Not Running

```bash
cd .backend
nself start
```

### Port 7700 Already in Use

```bash
lsof -i :7700
kill -9 <PID>
```

---

## 📚 Documentation

- **Full Documentation**: [Search-Implementation.md](../guides/Search-Implementation.md)
- **System Architecture**: [../src/lib/search/README.md](README.md)
- **API Reference**: [../src/app/api/search/route.ts](../src/app/api/search/route.ts)

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`pnpm install`)
- [ ] Environment configured (`.env.local`)
- [ ] Backend running (`cd .backend && nself status`)
- [ ] MeiliSearch healthy (`curl http://search.localhost:7700/health`)
- [ ] Indexes initialized (`curl -X POST http://localhost:3000/api/search/initialize`)
- [ ] Dev server running (`pnpm dev`)
- [ ] Search modal opens (**Cmd+K**)
- [ ] Search returns results

---

## 🎉 You're Ready!

Press **Cmd+K** and start searching!

For questions or issues, see:

- [Search Implementation Guide](../guides/Search-Implementation.md)
- [nself-chat Documentation](./README.md)
