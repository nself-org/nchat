-- ============================================================================
-- Per-App RBAC/ACL Migration
-- ============================================================================
-- Enables monorepo "one of many" compatibility where users can have different
-- roles across different applications sharing the same backend.
--
-- Example: A user can be an admin in nchat, but a regular user in ntv
-- ============================================================================

-- App Registry Table
-- Tracks all applications using this backend
CREATE TABLE IF NOT EXISTS public.apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT UNIQUE NOT NULL, -- e.g., "nchat", "ntv", "nfamily"
    app_name TEXT NOT NULL, -- e.g., "ɳChat", "Example App", "ɳFamily"
    app_url TEXT, -- e.g., "https://chat.nself.org"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.apps IS 'Registry of all applications sharing this backend (monorepo support)';
COMMENT ON COLUMN public.apps.app_id IS 'Unique identifier for the app (slug format)';
COMMENT ON COLUMN public.apps.is_active IS 'Whether this app is currently active';

-- Per-App User Roles Table
-- Stores user roles specific to each application
CREATE TABLE IF NOT EXISTS public.app_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL REFERENCES public.apps(app_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- e.g., "owner", "admin", "moderator", "member", "guest"
    granted_by UUID REFERENCES auth.users(id), -- Who granted this role
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Optional expiration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(app_id, user_id, role) -- User can have multiple roles per app
);

COMMENT ON TABLE public.app_user_roles IS 'User roles specific to each application (enables per-app RBAC)';
COMMENT ON COLUMN public.app_user_roles.role IS 'Role name: owner, admin, moderator, member, guest, or custom';
COMMENT ON COLUMN public.app_user_roles.granted_by IS 'User ID who granted this role';
COMMENT ON COLUMN public.app_user_roles.expires_at IS 'Optional expiration for temporary roles';

-- Per-App Permissions Table
-- Defines granular permissions for each role within an app
CREATE TABLE IF NOT EXISTS public.app_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL REFERENCES public.apps(app_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    permission TEXT NOT NULL, -- e.g., "channels.create", "messages.delete", "users.ban"
    resource TEXT, -- Optional: specific resource ID this permission applies to
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(app_id, role, permission, resource)
);

COMMENT ON TABLE public.app_role_permissions IS 'Granular permissions for each role within an app';
COMMENT ON COLUMN public.app_role_permissions.permission IS 'Permission identifier (e.g., channels.create, messages.delete)';
COMMENT ON COLUMN public.app_role_permissions.resource IS 'Optional resource ID for resource-specific permissions';

-- Indexes for performance
CREATE INDEX idx_app_user_roles_user ON public.app_user_roles(user_id);
CREATE INDEX idx_app_user_roles_app ON public.app_user_roles(app_id);
CREATE INDEX idx_app_user_roles_lookup ON public.app_user_roles(app_id, user_id);
CREATE INDEX idx_app_role_permissions_lookup ON public.app_role_permissions(app_id, role);
CREATE INDEX idx_apps_app_id ON public.apps(app_id);
CREATE INDEX idx_apps_active ON public.apps(is_active) WHERE is_active = true;

-- Helper function: Check if user has role in app
CREATE OR REPLACE FUNCTION public.user_has_app_role(
    p_user_id UUID,
    p_app_id TEXT,
    p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.app_user_roles
        WHERE user_id = p_user_id
          AND app_id = p_app_id
          AND role = p_role
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_has_app_role IS 'Check if user has a specific role in an app';

-- Helper function: Check if user has permission in app
CREATE OR REPLACE FUNCTION public.user_has_app_permission(
    p_user_id UUID,
    p_app_id TEXT,
    p_permission TEXT,
    p_resource TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.app_user_roles aur
        JOIN public.app_role_permissions arp
          ON arp.app_id = aur.app_id AND arp.role = aur.role
        WHERE aur.user_id = p_user_id
          AND aur.app_id = p_app_id
          AND arp.permission = p_permission
          AND (p_resource IS NULL OR arp.resource IS NULL OR arp.resource = p_resource)
          AND (aur.expires_at IS NULL OR aur.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_has_app_permission IS 'Check if user has a specific permission in an app';

-- Helper function: Get user roles for app
CREATE OR REPLACE FUNCTION public.get_user_app_roles(
    p_user_id UUID,
    p_app_id TEXT
) RETURNS TABLE(role TEXT, granted_at TIMESTAMPTZ, expires_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT aur.role, aur.granted_at, aur.expires_at
    FROM public.app_user_roles aur
    WHERE aur.user_id = p_user_id
      AND aur.app_id = p_app_id
      AND (aur.expires_at IS NULL OR aur.expires_at > NOW())
    ORDER BY aur.granted_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_app_roles IS 'Get all active roles for a user in an app';

-- Insert default app (nchat)
INSERT INTO public.apps (app_id, app_name, app_url, is_active)
VALUES ('nchat', 'ɳChat', 'https://chat.nself.org', true)
ON CONFLICT (app_id) DO NOTHING;

-- Default role permissions for nchat
-- Owner permissions (complete control)
INSERT INTO public.app_role_permissions (app_id, role, permission) VALUES
    ('nchat', 'owner', 'app.admin'),
    ('nchat', 'owner', 'users.manage'),
    ('nchat', 'owner', 'users.ban'),
    ('nchat', 'owner', 'channels.create'),
    ('nchat', 'owner', 'channels.delete'),
    ('nchat', 'owner', 'channels.manage'),
    ('nchat', 'owner', 'messages.delete.any'),
    ('nchat', 'owner', 'settings.manage'),
    ('nchat', 'owner', 'billing.manage'),
    ('nchat', 'owner', 'integrations.manage')
ON CONFLICT (app_id, role, permission, resource) DO NOTHING;

-- Admin permissions (most things except billing)
INSERT INTO public.app_role_permissions (app_id, role, permission) VALUES
    ('nchat', 'admin', 'users.manage'),
    ('nchat', 'admin', 'users.ban'),
    ('nchat', 'admin', 'channels.create'),
    ('nchat', 'admin', 'channels.delete'),
    ('nchat', 'admin', 'channels.manage'),
    ('nchat', 'admin', 'messages.delete.any'),
    ('nchat', 'admin', 'settings.view'),
    ('nchat', 'admin', 'integrations.manage')
ON CONFLICT (app_id, role, permission, resource) DO NOTHING;

-- Moderator permissions (content moderation)
INSERT INTO public.app_role_permissions (app_id, role, permission) VALUES
    ('nchat', 'moderator', 'users.warn'),
    ('nchat', 'moderator', 'users.timeout'),
    ('nchat', 'moderator', 'channels.manage'),
    ('nchat', 'moderator', 'messages.delete'),
    ('nchat', 'moderator', 'messages.pin')
ON CONFLICT (app_id, role, permission, resource) DO NOTHING;

-- Support permissions (user support with limited admin)
INSERT INTO public.app_role_permissions (app_id, role, permission) VALUES
    ('nchat', 'support', 'users.warn'),
    ('nchat', 'support', 'channels.view'),
    ('nchat', 'support', 'channels.join'),
    ('nchat', 'support', 'messages.view'),
    ('nchat', 'support', 'messages.send'),
    ('nchat', 'support', 'messages.pin'),
    ('nchat', 'support', 'dms.send')
ON CONFLICT (app_id, role, permission, resource) DO NOTHING;

-- Helper permissions (community helper with limited moderation)
INSERT INTO public.app_role_permissions (app_id, role, permission) VALUES
    ('nchat', 'helper', 'channels.view'),
    ('nchat', 'helper', 'channels.join'),
    ('nchat', 'helper', 'messages.send'),
    ('nchat', 'helper', 'messages.edit.own'),
    ('nchat', 'helper', 'messages.delete.own'),
    ('nchat', 'helper', 'messages.react'),
    ('nchat', 'helper', 'messages.pin'),
    ('nchat', 'helper', 'files.upload'),
    ('nchat', 'helper', 'dms.send')
ON CONFLICT (app_id, role, permission, resource) DO NOTHING;

-- Member permissions (standard user)
INSERT INTO public.app_role_permissions (app_id, role, permission) VALUES
    ('nchat', 'member', 'channels.view'),
    ('nchat', 'member', 'channels.join'),
    ('nchat', 'member', 'messages.send'),
    ('nchat', 'member', 'messages.edit.own'),
    ('nchat', 'member', 'messages.delete.own'),
    ('nchat', 'member', 'messages.react'),
    ('nchat', 'member', 'files.upload'),
    ('nchat', 'member', 'dms.send')
ON CONFLICT (app_id, role, permission, resource) DO NOTHING;

-- Guest permissions (limited access)
INSERT INTO public.app_role_permissions (app_id, role, permission) VALUES
    ('nchat', 'guest', 'channels.view'),
    ('nchat', 'guest', 'messages.view')
ON CONFLICT (app_id, role, permission, resource) DO NOTHING;

-- Row Level Security (RLS) Policies
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_role_permissions ENABLE ROW LEVEL SECURITY;

-- Apps table policies
CREATE POLICY "Apps are viewable by all authenticated users"
    ON public.apps FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Apps are manageable by app owners"
    ON public.apps FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.app_user_roles
            WHERE app_user_roles.app_id = apps.app_id
              AND app_user_roles.user_id = auth.uid()
              AND app_user_roles.role IN ('owner', 'admin')
        )
    );

-- App user roles policies
CREATE POLICY "Users can view their own app roles"
    ON public.app_user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "App admins can view all roles in their app"
    ON public.app_user_roles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.app_user_roles own_roles
            WHERE own_roles.app_id = app_user_roles.app_id
              AND own_roles.user_id = auth.uid()
              AND own_roles.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "App admins can manage roles in their app"
    ON public.app_user_roles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.app_user_roles own_roles
            WHERE own_roles.app_id = app_user_roles.app_id
              AND own_roles.user_id = auth.uid()
              AND own_roles.role IN ('owner', 'admin')
        )
    );

-- App role permissions policies
CREATE POLICY "Permissions are viewable by app users"
    ON public.app_role_permissions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.app_user_roles
            WHERE app_user_roles.app_id = app_role_permissions.app_id
              AND app_user_roles.user_id = auth.uid()
        )
    );

CREATE POLICY "Permissions are manageable by app owners"
    ON public.app_role_permissions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.app_user_roles
            WHERE app_user_roles.app_id = app_role_permissions.app_id
              AND app_user_roles.user_id = auth.uid()
              AND app_user_roles.role = 'owner'
        )
    );

-- Grant permissions to Hasura
GRANT SELECT ON public.apps TO hasura;
GRANT SELECT ON public.app_user_roles TO hasura;
GRANT SELECT ON public.app_role_permissions TO hasura;
GRANT INSERT, UPDATE, DELETE ON public.app_user_roles TO hasura;
GRANT EXECUTE ON FUNCTION public.user_has_app_role TO hasura;
GRANT EXECUTE ON FUNCTION public.user_has_app_permission TO hasura;
GRANT EXECUTE ON FUNCTION public.get_user_app_roles TO hasura;
