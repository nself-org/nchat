/**
 * Team Store
 * Zustand store for team/workspace management
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  Team,
  TeamSettings,
  TeamInvitation,
  InviteLink,
  TeamMember,
  BillingInfo,
  UsageStatistics,
  TeamExportResult,
} from "@/lib/team/team-types";

// ============================================================================
// State Interface
// ============================================================================

export interface TeamState {
  // Team data
  team: Team | null;
  settings: TeamSettings | null;
  isLoadingTeam: boolean;

  // Members
  members: TeamMember[];
  membersTotal: number;
  isLoadingMembers: boolean;

  // Invitations
  invitations: TeamInvitation[];
  invitationsTotal: number;
  isLoadingInvitations: boolean;

  // Invite Links
  inviteLinks: InviteLink[];
  isLoadingInviteLinks: boolean;

  // Billing
  billing: BillingInfo | null;
  usage: UsageStatistics | null;
  isLoadingBilling: boolean;

  // Export
  exportRequests: TeamExportResult[];
  isLoadingExport: boolean;

  // UI state
  selectedMemberId: string | null;
  selectedInvitationId: string | null;

  // Modals
  inviteModalOpen: boolean;
  inviteModalMode: "email" | "link" | "bulk";
  transferOwnershipModalOpen: boolean;
  deleteTeamModalOpen: boolean;
  exportDataModalOpen: boolean;
  changePlanModalOpen: boolean;
  paymentMethodModalOpen: boolean;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface TeamActions {
  // Team actions
  setTeam: (team: Team | null) => void;
  setSettings: (settings: TeamSettings | null) => void;
  setLoadingTeam: (loading: boolean) => void;
  updateTeamData: (updates: Partial<Team>) => void;

  // Members actions
  setMembers: (members: TeamMember[], total: number) => void;
  setLoadingMembers: (loading: boolean) => void;
  addMember: (member: TeamMember) => void;
  updateMember: (userId: string, updates: Partial<TeamMember>) => void;
  removeMember: (userId: string) => void;
  setSelectedMemberId: (userId: string | null) => void;

  // Invitations actions
  setInvitations: (invitations: TeamInvitation[], total: number) => void;
  setLoadingInvitations: (loading: boolean) => void;
  addInvitation: (invitation: TeamInvitation) => void;
  updateInvitation: (
    invitationId: string,
    updates: Partial<TeamInvitation>,
  ) => void;
  removeInvitation: (invitationId: string) => void;
  setSelectedInvitationId: (invitationId: string | null) => void;

  // Invite Links actions
  setInviteLinks: (links: InviteLink[]) => void;
  setLoadingInviteLinks: (loading: boolean) => void;
  addInviteLink: (link: InviteLink) => void;
  updateInviteLink: (linkId: string, updates: Partial<InviteLink>) => void;
  removeInviteLink: (linkId: string) => void;

  // Billing actions
  setBilling: (billing: BillingInfo | null) => void;
  setUsage: (usage: UsageStatistics | null) => void;
  setLoadingBilling: (loading: boolean) => void;

  // Export actions
  setExportRequests: (requests: TeamExportResult[]) => void;
  addExportRequest: (request: TeamExportResult) => void;
  updateExportRequest: (
    requestId: string,
    updates: Partial<TeamExportResult>,
  ) => void;
  setLoadingExport: (loading: boolean) => void;

  // Modal actions
  openInviteModal: (mode: "email" | "link" | "bulk") => void;
  closeInviteModal: () => void;
  openTransferOwnershipModal: () => void;
  closeTransferOwnershipModal: () => void;
  openDeleteTeamModal: () => void;
  closeDeleteTeamModal: () => void;
  openExportDataModal: () => void;
  closeExportDataModal: () => void;
  openChangePlanModal: () => void;
  closeChangePlanModal: () => void;
  openPaymentMethodModal: () => void;
  closePaymentMethodModal: () => void;

  // Utility
  reset: () => void;
}

export type TeamStore = TeamState & TeamActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: TeamState = {
  // Team data
  team: null,
  settings: null,
  isLoadingTeam: false,

  // Members
  members: [],
  membersTotal: 0,
  isLoadingMembers: false,

  // Invitations
  invitations: [],
  invitationsTotal: 0,
  isLoadingInvitations: false,

  // Invite Links
  inviteLinks: [],
  isLoadingInviteLinks: false,

  // Billing
  billing: null,
  usage: null,
  isLoadingBilling: false,

  // Export
  exportRequests: [],
  isLoadingExport: false,

  // UI state
  selectedMemberId: null,
  selectedInvitationId: null,

  // Modals
  inviteModalOpen: false,
  inviteModalMode: "email",
  transferOwnershipModalOpen: false,
  deleteTeamModalOpen: false,
  exportDataModalOpen: false,
  changePlanModalOpen: false,
  paymentMethodModalOpen: false,
};

// ============================================================================
// Store
// ============================================================================

export const useTeamStore = create<TeamStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // ========================================
      // Team actions
      // ========================================
      setTeam: (team) =>
        set(
          (state) => {
            state.team = team;
          },
          false,
          "team/setTeam",
        ),

      setSettings: (settings) =>
        set(
          (state) => {
            state.settings = settings;
          },
          false,
          "team/setSettings",
        ),

      setLoadingTeam: (loading) =>
        set(
          (state) => {
            state.isLoadingTeam = loading;
          },
          false,
          "team/setLoadingTeam",
        ),

      updateTeamData: (updates) =>
        set(
          (state) => {
            if (state.team) {
              state.team = { ...state.team, ...updates };
            }
          },
          false,
          "team/updateTeamData",
        ),

      // ========================================
      // Members actions
      // ========================================
      setMembers: (members, total) =>
        set(
          (state) => {
            state.members = members;
            state.membersTotal = total;
          },
          false,
          "team/setMembers",
        ),

      setLoadingMembers: (loading) =>
        set(
          (state) => {
            state.isLoadingMembers = loading;
          },
          false,
          "team/setLoadingMembers",
        ),

      addMember: (member) =>
        set(
          (state) => {
            state.members = [member, ...state.members];
            state.membersTotal += 1;
          },
          false,
          "team/addMember",
        ),

      updateMember: (userId, updates) =>
        set(
          (state) => {
            const index = state.members.findIndex((m) => m.userId === userId);
            if (index !== -1) {
              state.members[index] = { ...state.members[index], ...updates };
            }
          },
          false,
          "team/updateMember",
        ),

      removeMember: (userId) =>
        set(
          (state) => {
            state.members = state.members.filter((m) => m.userId !== userId);
            state.membersTotal -= 1;
          },
          false,
          "team/removeMember",
        ),

      setSelectedMemberId: (userId) =>
        set(
          (state) => {
            state.selectedMemberId = userId;
          },
          false,
          "team/setSelectedMemberId",
        ),

      // ========================================
      // Invitations actions
      // ========================================
      setInvitations: (invitations, total) =>
        set(
          (state) => {
            state.invitations = invitations;
            state.invitationsTotal = total;
          },
          false,
          "team/setInvitations",
        ),

      setLoadingInvitations: (loading) =>
        set(
          (state) => {
            state.isLoadingInvitations = loading;
          },
          false,
          "team/setLoadingInvitations",
        ),

      addInvitation: (invitation) =>
        set(
          (state) => {
            state.invitations = [invitation, ...state.invitations];
            state.invitationsTotal += 1;
          },
          false,
          "team/addInvitation",
        ),

      updateInvitation: (invitationId, updates) =>
        set(
          (state) => {
            const index = state.invitations.findIndex(
              (i) => i.id === invitationId,
            );
            if (index !== -1) {
              state.invitations[index] = {
                ...state.invitations[index],
                ...updates,
              };
            }
          },
          false,
          "team/updateInvitation",
        ),

      removeInvitation: (invitationId) =>
        set(
          (state) => {
            state.invitations = state.invitations.filter(
              (i) => i.id !== invitationId,
            );
            state.invitationsTotal -= 1;
          },
          false,
          "team/removeInvitation",
        ),

      setSelectedInvitationId: (invitationId) =>
        set(
          (state) => {
            state.selectedInvitationId = invitationId;
          },
          false,
          "team/setSelectedInvitationId",
        ),

      // ========================================
      // Invite Links actions
      // ========================================
      setInviteLinks: (links) =>
        set(
          (state) => {
            state.inviteLinks = links;
          },
          false,
          "team/setInviteLinks",
        ),

      setLoadingInviteLinks: (loading) =>
        set(
          (state) => {
            state.isLoadingInviteLinks = loading;
          },
          false,
          "team/setLoadingInviteLinks",
        ),

      addInviteLink: (link) =>
        set(
          (state) => {
            state.inviteLinks = [link, ...state.inviteLinks];
          },
          false,
          "team/addInviteLink",
        ),

      updateInviteLink: (linkId, updates) =>
        set(
          (state) => {
            const index = state.inviteLinks.findIndex((l) => l.id === linkId);
            if (index !== -1) {
              state.inviteLinks[index] = {
                ...state.inviteLinks[index],
                ...updates,
              };
            }
          },
          false,
          "team/updateInviteLink",
        ),

      removeInviteLink: (linkId) =>
        set(
          (state) => {
            state.inviteLinks = state.inviteLinks.filter(
              (l) => l.id !== linkId,
            );
          },
          false,
          "team/removeInviteLink",
        ),

      // ========================================
      // Billing actions
      // ========================================
      setBilling: (billing) =>
        set(
          (state) => {
            state.billing = billing;
          },
          false,
          "team/setBilling",
        ),

      setUsage: (usage) =>
        set(
          (state) => {
            state.usage = usage;
          },
          false,
          "team/setUsage",
        ),

      setLoadingBilling: (loading) =>
        set(
          (state) => {
            state.isLoadingBilling = loading;
          },
          false,
          "team/setLoadingBilling",
        ),

      // ========================================
      // Export actions
      // ========================================
      setExportRequests: (requests) =>
        set(
          (state) => {
            state.exportRequests = requests;
          },
          false,
          "team/setExportRequests",
        ),

      addExportRequest: (request) =>
        set(
          (state) => {
            state.exportRequests = [request, ...state.exportRequests];
          },
          false,
          "team/addExportRequest",
        ),

      updateExportRequest: (requestId, updates) =>
        set(
          (state) => {
            const index = state.exportRequests.findIndex(
              (r) => r.id === requestId,
            );
            if (index !== -1) {
              state.exportRequests[index] = {
                ...state.exportRequests[index],
                ...updates,
              };
            }
          },
          false,
          "team/updateExportRequest",
        ),

      setLoadingExport: (loading) =>
        set(
          (state) => {
            state.isLoadingExport = loading;
          },
          false,
          "team/setLoadingExport",
        ),

      // ========================================
      // Modal actions
      // ========================================
      openInviteModal: (mode) =>
        set(
          (state) => {
            state.inviteModalOpen = true;
            state.inviteModalMode = mode;
          },
          false,
          "team/openInviteModal",
        ),

      closeInviteModal: () =>
        set(
          (state) => {
            state.inviteModalOpen = false;
          },
          false,
          "team/closeInviteModal",
        ),

      openTransferOwnershipModal: () =>
        set(
          (state) => {
            state.transferOwnershipModalOpen = true;
          },
          false,
          "team/openTransferOwnershipModal",
        ),

      closeTransferOwnershipModal: () =>
        set(
          (state) => {
            state.transferOwnershipModalOpen = false;
          },
          false,
          "team/closeTransferOwnershipModal",
        ),

      openDeleteTeamModal: () =>
        set(
          (state) => {
            state.deleteTeamModalOpen = true;
          },
          false,
          "team/openDeleteTeamModal",
        ),

      closeDeleteTeamModal: () =>
        set(
          (state) => {
            state.deleteTeamModalOpen = false;
          },
          false,
          "team/closeDeleteTeamModal",
        ),

      openExportDataModal: () =>
        set(
          (state) => {
            state.exportDataModalOpen = true;
          },
          false,
          "team/openExportDataModal",
        ),

      closeExportDataModal: () =>
        set(
          (state) => {
            state.exportDataModalOpen = false;
          },
          false,
          "team/closeExportDataModal",
        ),

      openChangePlanModal: () =>
        set(
          (state) => {
            state.changePlanModalOpen = true;
          },
          false,
          "team/openChangePlanModal",
        ),

      closeChangePlanModal: () =>
        set(
          (state) => {
            state.changePlanModalOpen = false;
          },
          false,
          "team/closeChangePlanModal",
        ),

      openPaymentMethodModal: () =>
        set(
          (state) => {
            state.paymentMethodModalOpen = true;
          },
          false,
          "team/openPaymentMethodModal",
        ),

      closePaymentMethodModal: () =>
        set(
          (state) => {
            state.paymentMethodModalOpen = false;
          },
          false,
          "team/closePaymentMethodModal",
        ),

      // ========================================
      // Utility
      // ========================================
      reset: () => set(() => initialState, false, "team/reset"),
    })),
    { name: "team-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectTeam = (state: TeamStore) => state.team;
export const selectSettings = (state: TeamStore) => state.settings;
export const selectIsLoadingTeam = (state: TeamStore) => state.isLoadingTeam;

export const selectMembers = (state: TeamStore) => state.members;
export const selectMembersTotal = (state: TeamStore) => state.membersTotal;
export const selectIsLoadingMembers = (state: TeamStore) =>
  state.isLoadingMembers;

export const selectInvitations = (state: TeamStore) => state.invitations;
export const selectInvitationsTotal = (state: TeamStore) =>
  state.invitationsTotal;
export const selectInviteLinks = (state: TeamStore) => state.inviteLinks;

export const selectBilling = (state: TeamStore) => state.billing;
export const selectUsage = (state: TeamStore) => state.usage;

export const selectExportRequests = (state: TeamStore) => state.exportRequests;
