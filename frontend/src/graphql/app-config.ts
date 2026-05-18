import { gql } from "@apollo/client";

// Query to get app configuration
export const GET_APP_CONFIG = gql`
  query GetAppConfiguration {
    app_configuration {
      key
      value
      category
    }
  }
`;

// Mutation to update app configuration
export const UPDATE_APP_CONFIG = gql`
  mutation UpdateAppConfiguration(
    $objects: [app_configuration_insert_input!]!
  ) {
    insert_app_configuration(
      objects: $objects
      on_conflict: {
        constraint: app_configuration_key_key
        update_columns: [value, updated_at]
      }
    ) {
      affected_rows
      returning {
        key
        value
      }
    }
  }
`;

// Query to get config change history from audit logs
export const GET_APP_CONFIG_HISTORY = gql`
  query GetAppConfigHistory($limit: Int = 10) {
    nchat_audit_logs(
      where: {
        resource_type: { _eq: "app_configuration" }
        action: { _eq: "config.update" }
      }
      order_by: { timestamp: desc }
      limit: $limit
    ) {
      id
      timestamp
      actor_email
      resource_new_value
      description
    }
  }
`;

// Type definitions for the GraphQL responses
export interface AppConfigurationRow {
  key: string;
  value: string;
  category: string;
}

export interface AppConfigHistoryEntry {
  id: string;
  timestamp: string;
  actor_email: string | null;
  resource_new_value: Record<string, unknown> | null;
  description: string;
}

export interface GetAppConfigResponse {
  app_configuration: AppConfigurationRow[];
}

export interface GetAppConfigHistoryResponse {
  nchat_audit_logs: AppConfigHistoryEntry[];
}

export interface UpdateAppConfigResponse {
  insert_app_configuration: {
    affected_rows: number;
    returning: Array<{
      key: string;
      value: string;
    }>;
  };
}
