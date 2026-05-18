"use client";

import { useState, useEffect } from "react";
import { Plus, Download, Upload, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "./UserList";
import { UserFilters } from "./UserFilters";
import { UserStats } from "./UserStats";
import { InviteModal } from "./InviteModal";
import { BanUserModal } from "./BanUserModal";
import { useUserManagementStore } from "@/stores/user-management-store";
import type { AdminUser } from "@/lib/admin/users/user-types";

interface UserManagementProps {
  initialUsers?: AdminUser[];
  initialTotal?: number;
}

export function UserManagement({
  initialUsers = [],
  initialTotal = 0,
}: UserManagementProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const {
    users,
    usersTotal,
    isLoadingUsers,
    setUsers,
    openInviteModal,
    inviteModalOpen,
    closeInviteModal,
    inviteModalMode,
    banModalOpen,
    banModalUser,
    closeBanModal,
    usersFilters,
    setUsersFilters,
    clearUsersFilters,
  } = useUserManagementStore();

  // Initialize with server data
  useEffect(() => {
    if (initialUsers.length > 0) {
      setUsers(initialUsers, initialTotal);
    }
  }, [initialUsers, initialTotal, setUsers]);

  const handleRefresh = async () => {
    // Trigger refetch - in production this would call the API
  };

  const handleExport = () => {
    // Open export dialog or trigger export
  };

  const handleImport = () => {
    // Open import dialog
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    switch (value) {
      case "all":
        setUsersFilters({
          ...usersFilters,
          isBanned: undefined,
          isActive: undefined,
        });
        break;
      case "active":
        setUsersFilters({ ...usersFilters, isActive: true, isBanned: false });
        break;
      case "inactive":
        setUsersFilters({ ...usersFilters, isActive: false, isBanned: false });
        break;
      case "banned":
        setUsersFilters({ ...usersFilters, isBanned: true });
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button size="sm" onClick={() => openInviteModal("single")}>
            <Plus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <UserStats />

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Filter users by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <UserFilters
              filters={usersFilters}
              onFiltersChange={setUsersFilters}
              onClear={clearUsersFilters}
            />
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All Users ({usersTotal})</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="banned">Banned</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <UserList users={users} isLoading={isLoadingUsers} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <InviteModal
        open={inviteModalOpen}
        onClose={closeInviteModal}
        mode={inviteModalMode}
      />

      <BanUserModal
        open={banModalOpen}
        user={banModalUser}
        onClose={closeBanModal}
      />
    </div>
  );
}

export default UserManagement;
