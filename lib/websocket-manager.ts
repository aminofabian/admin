/**
 * Centralized WebSocket Manager
 * Eliminates duplicate connections and provides consistent reconnection logic
 */

export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  connectionTimeout?: number;
}

export interface WebSocketListeners {
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export interface ManagedWebSocket {
  ws: WebSocket;
  url: string;
  listeners: Set<WebSocketListeners>;
  reconnectAttempts: number;
  isConnecting: boolean;
  shouldReconnect: boolean;
  lastActivity: number;
}

class WebSocketManager {
  private connections = new Map<string, ManagedWebSocket>();
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private connectionTimeouts = new Map<string, NodeJS.Timeout>();

  private readonly DEFAULT_CONFIG: Required<Omit<WebSocketConfig, 'url'>> = {
    maxReconnectAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    connectionTimeout: 10000,
  };

  /**
   * Connect to WebSocket URL or return existing connection
   */
  connect(config: WebSocketConfig, listeners: WebSocketListeners): ManagedWebSocket {
    const { url } = config;

    // Check if connection already exists
    if (this.connections.has(url)) {
      const managed = this.connections.get(url)!;
      managed.listeners.add(listeners);

      // If connection is open, immediately call onOpen
      if (managed.ws.readyState === WebSocket.OPEN) {
        listeners.onOpen?.();
      }

      return managed;
    }

    // Create new managed connection
    const managed: ManagedWebSocket = {
      ws: this.createWebSocket(url),
      url,
      listeners: new Set([listeners]),
      reconnectAttempts: 0,
      isConnecting: true,
      shouldReconnect: true,
      lastActivity: Date.now(),
    };

    this.connections.set(url, managed);
    this.setupWebSocket(managed, config);
    this.setupConnectionTimeout(managed, config);

    return managed;
  }

  /**
   * Disconnect specific listener from WebSocket
   */
  disconnect(url: string, listeners: WebSocketListeners): void {
    const managed = this.connections.get(url);
    if (!managed) return;

    managed.listeners.delete(listeners);

    // If no more listeners, close the connection
    if (managed.listeners.size === 0) {
      this.closeConnection(url);
    }
  }

  /**
   * Send message through WebSocket
   */
  send(url: string, data: any): boolean {
    const managed = this.connections.get(url);
    if (!managed || managed.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      managed.ws.send(JSON.stringify(data));
      managed.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error('❌ [WebSocket Manager] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  isConnected(url: string): boolean {
    const managed = this.connections.get(url);
    return managed?.ws.readyState === WebSocket.OPEN || false;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const url of this.connections.keys()) {
      this.closeConnection(url);
    }
  }

  private createWebSocket(url: string): WebSocket {
    return new WebSocket(url);
  }

  private setupWebSocket(managed: ManagedWebSocket, config: WebSocketConfig): void {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    managed.ws.onopen = () => {
      console.log(`✅ [WebSocket Manager] Connected to: ${managed.url}`);
      managed.isConnecting = false;
      managed.reconnectAttempts = 0;

      // Clear connection timeout
      this.clearConnectionTimeout(managed.url);

      // Notify all listeners
      managed.listeners.forEach(listener => {
        try {
          listener.onOpen?.();
        } catch (error) {
          console.error('❌ [WebSocket Manager] Error in onOpen listener:', error);
        }
      });
    };

    managed.ws.onmessage = (event) => {
      managed.lastActivity = Date.now();

      try {
        const data = JSON.parse(event.data);

        // Notify all listeners
        managed.listeners.forEach(listener => {
          try {
            listener.onMessage?.(data);
          } catch (error) {
            console.error('❌ [WebSocket Manager] Error in onMessage listener:', error);
          }
        });
      } catch (error) {
        console.error('❌ [WebSocket Manager] Failed to parse message:', error);
      }
    };

    managed.ws.onerror = (error) => {
      console.error(`❌ [WebSocket Manager] WebSocket error for ${managed.url}:`, error);
      managed.isConnecting = false;

      // Clear connection timeout
      this.clearConnectionTimeout(managed.url);

      // Notify all listeners
      managed.listeners.forEach(listener => {
        try {
          listener.onError?.(error);
        } catch (error) {
          console.error('❌ [WebSocket Manager] Error in onError listener:', error);
        }
      });
    };

    managed.ws.onclose = (event) => {
      console.log(`🔌 [WebSocket Manager] WebSocket closed for ${managed.url}:`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      managed.isConnecting = false;
      this.clearConnectionTimeout(managed.url);

      // Notify all listeners
      managed.listeners.forEach(listener => {
        try {
          listener.onClose?.(event);
        } catch (error) {
          console.error('❌ [WebSocket Manager] Error in onClose listener:', error);
        }
      });

      // Attempt reconnection if connection should persist
      if (managed.shouldReconnect && !event.wasClean) {
        this.attemptReconnection(managed, finalConfig);
      }
    };
  }

  private setupConnectionTimeout(managed: ManagedWebSocket, config: WebSocketConfig): void {
    const timeout = config.connectionTimeout || this.DEFAULT_CONFIG.connectionTimeout;

    const timeoutId = setTimeout(() => {
      if (managed.isConnecting) {
        console.error(`❌ [WebSocket Manager] Connection timeout for ${managed.url}`);
        managed.ws.close(1006, 'Connection timeout');
      }
    }, timeout);

    this.connectionTimeouts.set(managed.url, timeoutId);
  }

  private clearConnectionTimeout(url: string): void {
    const timeoutId = this.connectionTimeouts.get(url);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.connectionTimeouts.delete(url);
    }
  }

  private attemptReconnection(managed: ManagedWebSocket, config: Required<WebSocketConfig>): void {
    if (!managed.shouldReconnect || managed.reconnectAttempts >= config.maxReconnectAttempts) {
      console.log(`⚠️ [WebSocket Manager] Max reconnection attempts reached for ${managed.url}`);
      this.closeConnection(managed.url);
      return;
    }

    managed.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      config.baseDelay * Math.pow(2, managed.reconnectAttempts - 1),
      config.maxDelay
    );

    // Add random jitter (±25% of delay)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    const finalDelay = Math.max(0, delay + jitter);

    console.log(`🔄 [WebSocket Manager] Reconnecting to ${managed.url} in ${Math.round(finalDelay)}ms (attempt ${managed.reconnectAttempts}/${config.maxReconnectAttempts})`);

    const timeoutId = setTimeout(() => {
      this.reconnectTimeouts.delete(managed.url);

      // Create new WebSocket
      managed.ws = this.createWebSocket(managed.url);
      managed.isConnecting = true;
      this.setupWebSocket(managed, config);
      this.setupConnectionTimeout(managed, config);
    }, finalDelay);

    this.reconnectTimeouts.set(managed.url, timeoutId);
  }

  private closeConnection(url: string): void {
    const managed = this.connections.get(url);
    if (!managed) return;

    // Clear all timeouts
    this.clearConnectionTimeout(url);
    const reconnectTimeoutId = this.reconnectTimeouts.get(url);
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      this.reconnectTimeouts.delete(url);
    }

    // Close WebSocket
    managed.shouldReconnect = false;
    if (managed.ws.readyState === WebSocket.OPEN || managed.ws.readyState === WebSocket.CONNECTING) {
      try {
        managed.ws.close(1000, 'Client disconnecting');
      } catch (error) {
        console.warn('⚠️ [WebSocket Manager] Error closing WebSocket:', error);
      }
    }

    // Remove from connections map
    this.connections.delete(url);
  }
}

// Singleton instance
export const websocketManager = new WebSocketManager();

// Utility function for URL encoding
export function createWebSocketUrl(base: string, path: string, params: Record<string, string | number> = {}): string {
  const url = new URL(path, base);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

// Debounce utility for rapid updates
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}