/**
 * Base Resource Class
 *
 * Provides common functionality for all resource classes.
 */

import type { NChatClient } from "../client";

export abstract class BaseResource {
  protected client: NChatClient;

  constructor(client: NChatClient) {
    this.client = client;
  }

  /**
   * Make a GET request
   */
  protected async _get<T>(path: string, params?: object): Promise<T> {
    const queryString = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return this.client.request<T>("GET", `${path}${queryString}`);
  }

  /**
   * Make a POST request
   */
  protected async _post<T>(path: string, data?: unknown): Promise<T> {
    return this.client.request<T>("POST", path, data);
  }

  /**
   * Make a PUT request
   */
  protected async _put<T>(path: string, data?: unknown): Promise<T> {
    return this.client.request<T>("PUT", path, data);
  }

  /**
   * Make a PATCH request
   */
  protected async _patch<T>(path: string, data?: unknown): Promise<T> {
    return this.client.request<T>("PATCH", path, data);
  }

  /**
   * Make a DELETE request
   */
  protected async _delete<T>(path: string): Promise<T> {
    return this.client.request<T>("DELETE", path);
  }
}
