# Backend Management Components

React components for managing nself CLI backend from the nchat admin UI.

## Components

### BackendStatus

Real-time status dashboard for all nself backend services.

**Features**:

- Service health monitoring (healthy, unhealthy, starting, stopped)
- Resource usage (CPU, memory)
- Service uptime tracking
- Auto-refresh every 10 seconds
- Quick links to service URLs
- Direct link to nself Admin UI

**Usage**:

```tsx
import { BackendStatus } from "@/components/admin/backend/BackendStatus";

export default function AdminDashboard() {
  return (
    <div>
      <BackendStatus />
    </div>
  );
}
```

**API Integration**:

To make this component functional in production, create an API endpoint that executes nself CLI commands:

```typescript
// app/api/admin/backend/status/route.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Execute: nself status --json
    const { stdout } = await execAsync("cd .backend && nself status --json");
    const status = JSON.parse(stdout);

    return Response.json(status);
  } catch (error) {
    console.error("Failed to get backend status:", error);
    return Response.json({ error: "Failed to get status" }, { status: 500 });
  }
}
```

Then update the component to call this API:

```typescript
const fetchServiceStatus = async () => {
  try {
    const response = await fetch("/api/admin/backend/status");
    const data = await response.json();
    setServices(data.services);
    setLastUpdate(new Date());
    setLoading(false);
  } catch (error) {
    console.error("Failed to fetch service status:", error);
    setLoading(false);
  }
};
```

---

### DatabaseManager

Database management interface for migrations, backups, and operations.

**Features**:

- Database statistics (size, tables, connections)
- Migration management (view, run, rollback)
- Backup creation and restoration
- Data seeding and mock data generation
- Type generation for TypeScript
- Database shell access
- Recent backup history

**Usage**:

```tsx
import { DatabaseManager } from "@/components/admin/backend/DatabaseManager";

export default function AdminDatabase() {
  return (
    <div>
      <DatabaseManager />
    </div>
  );
}
```

**API Integration**:

Create API endpoints for database operations:

```typescript
// app/api/admin/backend/database/migrate/route.ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Execute: nself db migrate up
    const { stdout, stderr } = await execAsync(
      "cd .backend && nself db migrate up",
    );

    return Response.json({
      success: true,
      output: stdout,
      error: stderr,
    });
  } catch (error) {
    console.error("Failed to run migrations:", error);
    return Response.json({ error: "Migration failed" }, { status: 500 });
  }
}

// GET endpoint for migration status
export async function GET() {
  try {
    const { stdout } = await execAsync(
      "cd .backend && nself db migrate status --json",
    );
    const status = JSON.parse(stdout);

    return Response.json(status);
  } catch (error) {
    console.error("Failed to get migration status:", error);
    return Response.json({ error: "Failed to get status" }, { status: 500 });
  }
}
```

```typescript
// app/api/admin/backend/database/backup/route.ts
export async function POST() {
  try {
    const { stdout } = await execAsync("cd .backend && nself db backup --json");
    const result = JSON.parse(stdout);

    return Response.json(result);
  } catch (error) {
    console.error("Failed to create backup:", error);
    return Response.json({ error: "Backup failed" }, { status: 500 });
  }
}
```

---

## Integration Steps

### 1. Add Admin Routes

Create admin pages that use these components:

```typescript
// app/admin/backend/page.tsx
import { BackendStatus } from '@/components/admin/backend/BackendStatus'

export default function BackendPage() {
  return (
    <div className="container mx-auto p-6">
      <BackendStatus />
    </div>
  )
}
```

```typescript
// app/admin/backend/database/page.tsx
import { DatabaseManager } from '@/components/admin/backend/DatabaseManager'

export default function DatabasePage() {
  return (
    <div className="container mx-auto p-6">
      <DatabaseManager />
    </div>
  )
}
```

### 2. Add Navigation

Update admin navigation to include backend management:

```typescript
// components/layout/AdminNav.tsx
const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Backend", href: "/admin/backend" },
  { label: "Database", href: "/admin/backend/database" },
  { label: "Users", href: "/admin/users" },
  // ...
];
```

### 3. Implement API Endpoints

Create the API endpoints as shown above in `app/api/admin/backend/`:

```
app/api/admin/backend/
├── status/
│   └── route.ts          # GET service status
├── database/
│   ├── migrate/
│   │   └── route.ts      # GET status, POST run migrations
│   ├── backup/
│   │   └── route.ts      # POST create backup
│   ├── restore/
│   │   └── route.ts      # POST restore backup
│   ├── seed/
│   │   └── route.ts      # POST seed data
│   └── types/
│       └── route.ts      # POST generate types
└── logs/
    └── route.ts          # GET service logs
```

### 4. Add Authentication/Authorization

Ensure only admins can access these endpoints:

```typescript
// middleware.ts
import { getServerSession } from "next-auth";

export async function middleware(request: Request) {
  if (request.url.includes("/api/admin/backend")) {
    const session = await getServerSession();

    if (!session || session.user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}
```

### 5. Add Real-Time Updates (Optional)

Use WebSockets or Server-Sent Events for real-time updates:

```typescript
// app/api/admin/backend/stream/route.ts
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Stream service status updates every 5 seconds
      const interval = setInterval(async () => {
        try {
          const { stdout } = await execAsync(
            "cd .backend && nself status --json",
          );
          const data = `data: ${stdout}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          controller.error(error);
        }
      }, 5000);

      // Cleanup
      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

---

## Security Considerations

1. **Authentication**: Only allow authenticated admins to access these components
2. **Authorization**: Verify user has admin role before executing commands
3. **Rate Limiting**: Prevent abuse of expensive operations (backups, migrations)
4. **Input Validation**: Sanitize any user input before passing to shell commands
5. **Audit Logging**: Log all admin actions for accountability
6. **CSRF Protection**: Use Next.js built-in CSRF protection
7. **Environment Separation**: Never allow production operations from development UI

---

## Future Enhancements

### Planned Components

1. **ServiceLogs** - Real-time log viewer with filtering
2. **DeploymentManager** - Deploy to staging/production from UI
3. **EnvironmentSwitcher** - Switch between local/staging/prod
4. **BackupScheduler** - Configure automated backup schedules
5. **MonitoringDashboard** - Embedded Grafana dashboards
6. **AlertManager** - Configure and view alerts
7. **ConfigEditor** - Edit .env files from UI (with validation)
8. **SchemaDesigner** - Visual database schema designer
9. **QueryEditor** - Execute SQL queries from UI
10. **UserManager** - Manage database users and permissions

### Suggested Improvements

1. **Terminal Emulator**: Embedded terminal to run nself commands directly
2. **Command History**: Track and replay executed commands
3. **Batch Operations**: Run multiple operations in sequence
4. **Rollback UI**: One-click rollback for migrations/deployments
5. **Performance Metrics**: Charts for CPU, memory, disk usage over time
6. **Cost Tracking**: Show infrastructure costs (if using cloud provider)

---

## Related Documentation

- [nself CLI Setup Guide](../../../docs/guides/backend/nself-cli-setup.md)
- [nself CLI Deployment Guide](../../../docs/guides/backend/nself-cli-deployment.md)
- [nself Documentation](https://github.com/nself-org/cli)

---

_Version: 1.0.0 | Date: January 31, 2026_
