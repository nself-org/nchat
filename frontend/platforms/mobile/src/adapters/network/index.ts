/**
 * Network Adapter for nself-chat Mobile
 *
 * Monitors network connectivity and connection quality
 */

import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network'

/**
 * Network connection status
 */
export interface NetworkStatus {
  connected: boolean
  connectionType: ConnectionType
  cellular: boolean
  wifi: boolean
  offline: boolean
}

/**
 * Network adapter interface
 */
export interface NetworkAdapter {
  getStatus(): Promise<NetworkStatus>
  addStatusChangeListener(
    handler: (status: NetworkStatus) => void
  ): () => void
  isOnline(): Promise<boolean>
  isWifi(): Promise<boolean>
  isCellular(): Promise<boolean>
}

/**
 * Mobile network implementation using Capacitor Network
 *
 * @example
 * ```typescript
 * import { mobileNetwork } from '@/adapters/network'
 *
 * // Get current status
 * const status = await mobileNetwork.getStatus()
 * console.log('Connected:', status.connected)
 * console.log('Type:', status.connectionType)
 *
 * // Listen for changes
 * const cleanup = mobileNetwork.addStatusChangeListener((status) => {
 *   if (status.offline) {
 *     console.log('You are offline')
 *   } else if (status.wifi) {
 *     console.log('Connected via Wi-Fi')
 *   } else if (status.cellular) {
 *     console.log('Connected via cellular')
 *   }
 * })
 * ```
 */
export const mobileNetwork: NetworkAdapter = {
  /**
   * Get current network status
   */
  async getStatus(): Promise<NetworkStatus> {
    try {
      const status = await Network.getStatus()

      return {
        connected: status.connected,
        connectionType: status.connectionType,
        cellular: status.connectionType === 'cellular',
        wifi: status.connectionType === 'wifi',
        offline: !status.connected,
      }
    } catch (error) {
      console.error('[Network] Error getting status:', error)
      return {
        connected: false,
        connectionType: 'none',
        cellular: false,
        wifi: false,
        offline: true,
      }
    }
  },

  /**
   * Listen for network status changes
   */
  addStatusChangeListener(handler: (status: NetworkStatus) => void) {
    const listenerPromise = Network.addListener(
      'networkStatusChange',
      (status: ConnectionStatus) => {
        const networkStatus: NetworkStatus = {
          connected: status.connected,
          connectionType: status.connectionType,
          cellular: status.connectionType === 'cellular',
          wifi: status.connectionType === 'wifi',
          offline: !status.connected,
        }

        console.log('[Network] Status changed:', networkStatus)
        handler(networkStatus)
      }
    )

    return () => {
      listenerPromise.then((l) => l.remove()).catch(() => {})
    }
  },

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const status = await mobileNetwork.getStatus()
    return status.connected
  },

  /**
   * Check if connected via Wi-Fi
   */
  async isWifi(): Promise<boolean> {
    const status = await mobileNetwork.getStatus()
    return status.wifi
  },

  /**
   * Check if connected via cellular
   */
  async isCellular(): Promise<boolean> {
    const status = await mobileNetwork.getStatus()
    return status.cellular
  },
}

/**
 * Network helpers
 */
export const networkHelpers = {
  /**
   * Get human-readable connection type
   */
  getConnectionTypeName(type: ConnectionType): string {
    const typeMap: Record<ConnectionType, string> = {
      wifi: 'Wi-Fi',
      cellular: 'Cellular',
      none: 'No connection',
      unknown: 'Unknown',
    }

    return typeMap[type] || 'Unknown'
  },

  /**
   * Check if connection is metered (cellular)
   */
  isMeteredConnection(type: ConnectionType): boolean {
    return type === 'cellular'
  },

  /**
   * Check if connection is suitable for large downloads
   */
  isSuitableForLargeDownloads(status: NetworkStatus): boolean {
    return status.wifi
  },

  /**
   * Get connection quality estimate
   */
  getConnectionQuality(
    type: ConnectionType
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    switch (type) {
      case 'wifi':
        return 'excellent'
      case 'cellular':
        return 'good'
      case 'unknown':
        return 'fair'
      case 'none':
        return 'poor'
      default:
        return 'fair'
    }
  },

  /**
   * Should enable data-saving mode?
   */
  shouldEnableDataSaving(status: NetworkStatus): boolean {
    return status.cellular || status.offline
  },

  /**
   * Should auto-download media?
   */
  shouldAutoDownloadMedia(status: NetworkStatus): boolean {
    return status.wifi && status.connected
  },
}

/**
 * Network event emitter for app-wide status updates
 */
export class NetworkStatusEmitter {
  private listeners = new Set<(status: NetworkStatus) => void>()
  private cleanup: (() => void) | null = null
  private currentStatus: NetworkStatus | null = null

  /**
   * Start listening for network changes
   */
  start() {
    if (this.cleanup) return // Already started

    this.cleanup = mobileNetwork.addStatusChangeListener((status) => {
      this.currentStatus = status
      this.emit(status)
    })

    // Get initial status
    mobileNetwork.getStatus().then((status) => {
      this.currentStatus = status
      this.emit(status)
    })
  }

  /**
   * Stop listening for network changes
   */
  stop() {
    if (this.cleanup) {
      this.cleanup()
      this.cleanup = null
    }
    this.listeners.clear()
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(listener: (status: NetworkStatus) => void) {
    this.listeners.add(listener)

    // Send current status immediately if available
    if (this.currentStatus) {
      listener(this.currentStatus)
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Get current status
   */
  getStatus(): NetworkStatus | null {
    return this.currentStatus
  }

  private emit(status: NetworkStatus) {
    this.listeners.forEach((listener) => {
      try {
        listener(status)
      } catch (error) {
        console.error('[NetworkStatusEmitter] Listener error:', error)
      }
    })
  }
}

export default mobileNetwork
