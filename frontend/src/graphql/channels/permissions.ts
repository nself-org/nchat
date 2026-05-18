/**
 * GraphQL operations for channel permissions
 * Phase 6: Tasks 60-65
 */

import { gql } from "@apollo/client";

export const PERMISSION_OVERRIDE_FRAGMENT = gql`
  fragment PermissionOverrideFragment on nchat_channel_permission_overrides {
    id
    channel_id
    target_type
    target_id
    allow_permissions
    deny_permissions
    created_at
    created_by
    expires_at
  }
`;

export const GET_CHANNEL_PERMISSIONS = gql`
  ${PERMISSION_OVERRIDE_FRAGMENT}
  query GetChannelPermissions($channel_id: uuid!) {
    nchat_channel_permission_overrides(
      where: { channel_id: { _eq: $channel_id } }
    ) {
      ...PermissionOverrideFragment
    }
  }
`;

export const CREATE_PERMISSION_OVERRIDE = gql`
  ${PERMISSION_OVERRIDE_FRAGMENT}
  mutation CreatePermissionOverride(
    $channel_id: uuid!
    $target_type: String!
    $target_id: uuid!
    $allow_permissions: bigint!
    $deny_permissions: bigint!
    $created_by: uuid!
  ) {
    insert_nchat_channel_permission_overrides_one(
      object: {
        channel_id: $channel_id
        target_type: $target_type
        target_id: $target_id
        allow_permissions: $allow_permissions
        deny_permissions: $deny_permissions
        created_by: $created_by
      }
      on_conflict: {
        constraint: nchat_channel_permission_overrides_channel_id_target_type_target
        update_columns: [allow_permissions, deny_permissions]
      }
    ) {
      ...PermissionOverrideFragment
    }
  }
`;

export const DELETE_PERMISSION_OVERRIDE = gql`
  mutation DeletePermissionOverride($id: uuid!) {
    delete_nchat_channel_permission_overrides_by_pk(id: $id) {
      id
    }
  }
`;
