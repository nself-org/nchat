"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Plus, Download, Upload } from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { UserTable, User as UserType } from "@/components/admin/user-table";
import type { AdminUser } from "@/lib/admin/admin-store";

type User = UserType;
import { BanDialog, BanDialogUser } from "@/components/admin/ban-dialog";
import { RoleSelect, UserRole } from "@/components/admin/role-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Mock users data for demonstration
const mockUsers: User[] = [
  {
    id: "1",
    username: "owner",
    displayName: "Workspace Owner",
    email: "owner@nself.org",
    role: "owner",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: "2",
    username: "admin",
    displayName: "Admin User",
    email: "admin@nself.org",
    role: "admin",
    status: "active",
    createdAt: "2024-01-05T00:00:00Z",
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: "3",
    username: "moderator",
    displayName: "Mod User",
    email: "moderator@nself.org",
    role: "moderator",
    status: "active",
    createdAt: "2024-01-10T00:00:00Z",
    lastSeenAt: "2024-01-20T14:30:00Z",
  },
  {
    id: "4",
    username: "alice",
    displayName: "Alice Johnson",
    email: "alice@nself.org",
    role: "member",
    status: "active",
    createdAt: "2024-01-15T00:00:00Z",
    lastSeenAt: "2024-01-22T09:15:00Z",
  },
  {
    id: "5",
    username: "bob",
    displayName: "Bob Smith",
    email: "bob@nself.org",
    role: "member",
    status: "inactive",
    createdAt: "2024-01-16T00:00:00Z",
    lastSeenAt: "2024-01-18T11:00:00Z",
  },
  {
    id: "6",
    username: "charlie",
    displayName: "Charlie Brown",
    email: "charlie@nself.org",
    role: "member",
    status: "active",
    createdAt: "2024-01-17T00:00:00Z",
    lastSeenAt: "2024-01-21T16:45:00Z",
  },
  {
    id: "7",
    username: "guest",
    displayName: "Guest User",
    email: "guest@nself.org",
    role: "guest",
    status: "active",
    createdAt: "2024-01-18T00:00:00Z",
    lastSeenAt: "2024-01-19T08:30:00Z",
  },
  {
    id: "8",
    username: "banned_user",
    displayName: "Banned User",
    email: "banned@example.com",
    role: "member",
    status: "banned",
    createdAt: "2024-01-12T00:00:00Z",
    lastSeenAt: "2024-01-14T10:00:00Z",
  },
];

export default function UsersManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("member");

  useEffect(() => {
    if (!loading && (!user || !["owner", "admin"].includes(user.role))) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  const handleEditRole = (targetUser: AdminUser | User) => {
    if ("status" in targetUser) {
      setSelectedUser(targetUser);
      setNewRole(targetUser.role);
      setRoleDialogOpen(true);
    }
  };

  const handleBanUser = (targetUser: AdminUser | User) => {
    if ("status" in targetUser) {
      setSelectedUser(targetUser);
      setBanDialogOpen(true);
    }
  };

  const handleDeleteUser = (targetUser: AdminUser | User) => {
    if ("status" in targetUser) {
      setSelectedUser(targetUser);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmBan = async (data: {
    userId: string;
    reason: string;
    duration: string;
    notifyUser: boolean;
  }) => {
    // In production, this would call an API
    setUsers((prev) =>
      prev.map((u) =>
        u.id === data.userId
          ? { ...u, status: u.status === "banned" ? "active" : "banned" }
          : u,
      ),
    );
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;
    // In production, this would call an API
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole } : u)),
    );
    setRoleDialogOpen(false);
    setSelectedUser(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    // In production, this would call an API
    setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  if (loading || !user || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  const banDialogUser: BanDialogUser | null = selectedUser
    ? {
        id: selectedUser.id,
        username: selectedUser.username,
        displayName: selectedUser.displayName,
        email: selectedUser.email,
        avatarUrl: selectedUser.avatarUrl,
        status: selectedUser.status,
      }
    : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        {/* User Table */}
        <UserTable
          users={users}
          onEditRole={handleEditRole}
          onBanUser={handleBanUser}
          onDeleteUser={handleDeleteUser}
        />

        {/* Ban Dialog */}
        <BanDialog
          user={banDialogUser}
          open={banDialogOpen}
          onOpenChange={setBanDialogOpen}
          onConfirm={handleConfirmBan}
        />

        {/* Role Change Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedUser?.displayName}. This will
                change their permissions immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <RoleSelect
                value={newRole}
                onChange={setNewRole}
                disabledRoles={
                  user.role === "admin" ? ["owner", "admin"] : ["owner"]
                }
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRoleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmRoleChange}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedUser?.displayName}?
                This action cannot be undone. All their messages will remain but
                will show as from a deleted user.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
              >
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
