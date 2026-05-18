/**
 * Creates an Nhost client for authentication and storage access.
 *
 * @param options.subdomain - The Nhost project subdomain.
 * @param options.region - The Nhost project region.
 * @returns An NhostClient instance.
 */
export function createNhostClient(options: {
  subdomain: string;
  region: string;
}): import('@nhost/nhost-js').NhostClient {
  // TODO: wire real Nhost client in S05
  void options;
  return null as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
