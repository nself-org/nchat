/**
 * CallKit Stub for TypeScript compilation
 * Used when Capacitor integration is not available
 */

export const callKitManager = {
  initialize: async (_appName: string) => {},
  startOutgoingCall: async (_options: any) => {},
  reportCallConnected: async (_uuid: string) => {},
} as any;
