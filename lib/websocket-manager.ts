/**
 * Centralized WebSocket Manager
 * Eliminates duplicate connections and provides consistent reconnection logic
 */

import { TOKEN_KEY } from "@/lib/constants/api";
import { storage } from "@/lib/utils/storage";
import {
  ensureFreshAccessToken,
  redirectToLoginAfterAuthFailure,
} from "@/lib/auth/ensure-fresh-access-token";
import { wsReconnectDelayMs } from "@/lib/ws/reconnect-backoff";
import { recordWsAuthMetric } from "@/lib/ws/ws-auth-metrics";

/** Query parameter name expected by the backend WebSocket gateways for JWT validation */
const WEBSOCKET_ACCESS_TOKEN_QUERY = "token" as const;

const AUTH_CLOSE_CODES = new Set([4001, 1008, 4401, 4403]);
/** Abnormal closure — often a failed handshake when the browser never saw onopen. */
const ABNORMAL_CLOSE = 1006;

function isAuthCloseEvent(event: CloseEvent): boolean {
  if (AUTH_CLOSE_CODES.has(event.code)) return true;
  return /auth|token|forbidden|unauthor|expired/i.test(event.reason || "");
}

/** Stable map key: strip token so reconnects with a new JWT stay on the same connection. */
export function stableWebSocketConnectionKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete(WEBSOCKET_ACCESS_TOKEN_QUERY);
    return parsed.toString();
  } catch {
    return url
      .replace(/([?&])token=[^&]*/gi, "$1")
      .replace(/[?&]$/, "")
      .replace(/\?$/, "");
  }
}

function withAccessToken(url: string, token: string | null): string {
  try {
    const parsed = new URL(url);
    if (token) {
      parsed.searchParams.set(WEBSOCKET_ACCESS_TOKEN_QUERY, token);
    } else {
      parsed.searchParams.delete(WEBSOCKET_ACCESS_TOKEN_QUERY);
    }
    return parsed.toString();
  } catch {
    const stripped = stableWebSocketConnectionKey(url);
    if (!token) return stripped;
    const sep = stripped.includes("?") ? "&" : "?";
    return `${stripped}${sep}token=${encodeURIComponent(token)}`;
  }
}

export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  connectionTimeout?: number;
}

export interface WebSocketListeners {
  onOpen?: () => void;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onMaxReconnectAttemptsReached?: () => void;
  onAuthFailure?: () => void;
}

export interface ManagedWebSocket {
  /** Stable key without token */
  key: string;
  ws: WebSocket;
  url: string;
  listeners: Set<WebSocketListeners>;
  reconnectAttempts: number;
  isConnecting: boolean;
  shouldReconnect: boolean;
  lastActivity: number;
  authRefreshAttempted: boolean;
  /** True after at least one successful onopen for this connection slot. */
  hasOpened: boolean;
}

class WebSocketManager {
  private connections = new Map<string, ManagedWebSocket>();
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private connectionTimeouts = new Map<string, NodeJS.Timeout>();
  private pingIntervals = new Map<string, NodeJS.Timeout>();

  /** How often the client sends a ping to keep the connection alive (ms) */
  private readonly PING_INTERVAL_MS = 25000;

  private readonly DEFAULT_CONFIG: Required<Omit<WebSocketConfig, "url">> = {
    maxReconnectAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    connectionTimeout: 10000,
  };

  /**
   * Connect to WebSocket URL or return existing connection
   */
  connect(
    config: WebSocketConfig,
    listeners: WebSocketListeners,
  ): ManagedWebSocket {
    const key = stableWebSocketConnectionKey(config.url);

    // Check if connection already exists
    if (this.connections.has(key)) {
      const managed = this.connections.get(key)!;
      managed.listeners.add(listeners);

      // If connection is open, immediately call onOpen
      if (managed.ws.readyState === WebSocket.OPEN) {
        listeners.onOpen?.();
      }

      return managed;
    }

    // Create new managed connection
    const managed: ManagedWebSocket = {
      key,
      ws: this.createWebSocket(config.url),
      url: config.url,
      listeners: new Set([listeners]),
      reconnectAttempts: 0,
      isConnecting: true,
      shouldReconnect: true,
      lastActivity: Date.now(),
      authRefreshAttempted: false,
      hasOpened: false,
    };

    this.connections.set(key, managed);
    this.setupWebSocket(managed, config);
    this.setupConnectionTimeout(managed, config);

    return managed;
  }

  /**
   * Disconnect specific listener from WebSocket
   */
  disconnect(url: string, listeners: WebSocketListeners): void {
    const key = stableWebSocketConnectionKey(url);
    const managed = this.connections.get(key);
    if (!managed) return;

    managed.listeners.delete(listeners);

    // If no more listeners, close the connection
    if (managed.listeners.size === 0) {
      this.closeConnection(key);
    }
  }

  /**
   * Send message through WebSocket
   */
  send(url: string, data: unknown): boolean {
    const key = stableWebSocketConnectionKey(url);
    const managed = this.connections.get(key);
    if (!managed || managed.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      managed.ws.send(JSON.stringify(data));
      managed.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error("❌ [WebSocket Manager] Failed to send message:", error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  isConnected(url: string): boolean {
    const key = stableWebSocketConnectionKey(url);
    const managed = this.connections.get(key);
    return managed?.ws.readyState === WebSocket.OPEN || false;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const key of this.connections.keys()) {
      this.closeConnection(key);
    }
  }

  private createWebSocket(url: string): WebSocket {
    return new WebSocket(url);
  }

  private setupWebSocket(
    managed: ManagedWebSocket,
    config: WebSocketConfig,
  ): void {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    managed.ws.onopen = () => {
      console.log(`✅ [WebSocket Manager] Connected to: ${managed.key}`);
      managed.isConnecting = false;
      managed.reconnectAttempts = 0;
      managed.authRefreshAttempted = false;
      managed.hasOpened = true;

      this.clearConnectionTimeout(managed.key);
      this.startHeartbeat(managed);

      managed.listeners.forEach((listener) => {
        try {
          listener.onOpen?.();
        } catch (error) {
          console.error(
            "❌ [WebSocket Manager] Error in onOpen listener:",
            error,
          );
        }
      });
    };

    managed.ws.onmessage = (event) => {
      managed.lastActivity = Date.now();

      try {
        const data = JSON.parse(event.data);

        managed.listeners.forEach((listener) => {
          try {
            listener.onMessage?.(data);
          } catch (error) {
            console.error(
              "❌ [WebSocket Manager] Error in onMessage listener:",
              error,
            );
          }
        });
      } catch (error) {
        console.error("❌ [WebSocket Manager] Failed to parse message:", error);
      }
    };

    managed.ws.onerror = (error) => {
      const state = managed.ws.readyState;
      const stateNames = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
      const stateName = stateNames[state] || "UNKNOWN";

      if (state !== WebSocket.CLOSING && state !== WebSocket.CLOSED) {
        console.warn(
          `⚠️ [WebSocket Manager] WebSocket error for ${managed.key} (state: ${stateName})`,
        );
      }

      managed.isConnecting = false;
      this.clearConnectionTimeout(managed.key);

      managed.listeners.forEach((listener) => {
        try {
          listener.onError?.(error);
        } catch (err) {
          console.error(
            "❌ [WebSocket Manager] Error in onError listener:",
            err,
          );
        }
      });
    };

    managed.ws.onclose = (event) => {
      console.log(
        `🔌 [WebSocket Manager] WebSocket closed for ${managed.key}:`,
        {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        },
      );

      managed.isConnecting = false;
      this.clearConnectionTimeout(managed.key);
      this.stopHeartbeat(managed.key);

      managed.listeners.forEach((listener) => {
        try {
          listener.onClose?.(event);
        } catch (error) {
          console.error(
            "❌ [WebSocket Manager] Error in onClose listener:",
            error,
          );
        }
      });

      if (!managed.shouldReconnect) {
        return;
      }

      if (isAuthCloseEvent(event)) {
        if (!managed.authRefreshAttempted) {
          managed.authRefreshAttempted = true;
          void this.attemptReconnection(managed, finalConfig, {
            forceRefresh: true,
            immediate: true,
            logoutOnRefreshFailure: true,
          });
          return;
        }

        managed.shouldReconnect = false;
        recordWsAuthMetric("auth_close_login", {
          endpoint: managed.key,
          code: event.code,
        });
        managed.listeners.forEach((listener) => {
          try {
            listener.onAuthFailure?.();
          } catch {
            // ignore
          }
        });
        redirectToLoginAfterAuthFailure();
        this.closeConnection(managed.key);
        return;
      }

      // Failed handshake → 1006 with no prior onopen: one soft refresh, then network backoff.
      if (
        event.code === ABNORMAL_CLOSE &&
        !managed.hasOpened &&
        !managed.authRefreshAttempted
      ) {
        managed.authRefreshAttempted = true;
        recordWsAuthMetric("handshake_1006_refresh", {
          endpoint: managed.key,
        });
        void this.attemptReconnection(managed, finalConfig, {
          forceRefresh: true,
          immediate: true,
          logoutOnRefreshFailure: false,
        });
        return;
      }

      if (!event.wasClean) {
        void this.attemptReconnection(managed, finalConfig);
      }
    };
  }

  private setupConnectionTimeout(
    managed: ManagedWebSocket,
    config: WebSocketConfig,
  ): void {
    const timeout =
      config.connectionTimeout || this.DEFAULT_CONFIG.connectionTimeout;

    const timeoutId = setTimeout(() => {
      if (managed.isConnecting) {
        console.error(
          `❌ [WebSocket Manager] Connection timeout for ${managed.key}`,
        );
        managed.ws.close(1006, "Connection timeout");
      }
    }, timeout);

    this.connectionTimeouts.set(managed.key, timeoutId);
  }

  private clearConnectionTimeout(key: string): void {
    const timeoutId = this.connectionTimeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.connectionTimeouts.delete(key);
    }
  }

  private async attemptReconnection(
    managed: ManagedWebSocket,
    config: Required<WebSocketConfig>,
    options?: {
      forceRefresh?: boolean;
      immediate?: boolean;
      logoutOnRefreshFailure?: boolean;
    },
  ): Promise<void> {
    if (
      !managed.shouldReconnect ||
      (!options?.forceRefresh &&
        managed.reconnectAttempts >= config.maxReconnectAttempts)
    ) {
      console.log(
        `⚠️ [WebSocket Manager] Max reconnection attempts reached for ${managed.key}`,
      );
      managed.listeners.forEach((listener) => {
        try {
          listener.onMaxReconnectAttemptsReached?.();
        } catch (error) {
          console.error(
            "❌ [WebSocket Manager] Error in onMaxReconnectAttemptsReached listener:",
            error,
          );
        }
      });
      this.closeConnection(managed.key);
      return;
    }

    if (!options?.forceRefresh) {
      managed.reconnectAttempts++;
    }

    const finalDelay = wsReconnectDelayMs(managed.reconnectAttempts, {
      immediate: options?.immediate,
    });

    recordWsAuthMetric("reconnect_scheduled", {
      endpoint: managed.key,
      attempt: managed.reconnectAttempts,
      delayMs: finalDelay,
      forceRefresh: Boolean(options?.forceRefresh),
    });

    console.log(
      `🔄 [WebSocket Manager] Reconnecting to ${managed.key} in ${Math.round(finalDelay)}ms (attempt ${managed.reconnectAttempts}/${config.maxReconnectAttempts})`,
    );

    const existing = this.reconnectTimeouts.get(managed.key);
    if (existing) clearTimeout(existing);

    const hardLogout = options?.logoutOnRefreshFailure !== false;

    const timeoutId = setTimeout(() => {
      this.reconnectTimeouts.delete(managed.key);
      void (async () => {
        const token = await ensureFreshAccessToken({
          force: options?.forceRefresh,
        });

        if (options?.forceRefresh && !token) {
          if (hardLogout) {
            managed.shouldReconnect = false;
            recordWsAuthMetric("auth_close_login", {
              endpoint: managed.key,
              reason: "refresh_null",
            });
            managed.listeners.forEach((listener) => {
              try {
                listener.onAuthFailure?.();
              } catch {
                // ignore
              }
            });
            redirectToLoginAfterAuthFailure();
            this.closeConnection(managed.key);
            return;
          }
          // Soft recovery (handshake 1006): keep trying with network backoff.
          void this.attemptReconnection(managed, config);
          return;
        }

        const nextUrl = withAccessToken(
          managed.key,
          token || storage.get(TOKEN_KEY),
        );
        managed.url = nextUrl;
        managed.ws = this.createWebSocket(nextUrl);
        managed.isConnecting = true;
        this.setupWebSocket(managed, config);
        this.setupConnectionTimeout(managed, config);
      })();
    }, finalDelay);

    this.reconnectTimeouts.set(managed.key, timeoutId);
  }

  /**
   * Start a client-side heartbeat ping interval.
   */
  private startHeartbeat(managed: ManagedWebSocket): void {
    this.stopHeartbeat(managed.key);

    const intervalId = setInterval(() => {
      if (managed.ws.readyState !== WebSocket.OPEN) {
        this.stopHeartbeat(managed.key);
        return;
      }
      try {
        managed.ws.send(
          JSON.stringify({ type: "ping", timestamp: Date.now() }),
        );
      } catch {
        this.stopHeartbeat(managed.key);
      }
    }, this.PING_INTERVAL_MS);

    this.pingIntervals.set(managed.key, intervalId);
  }

  private stopHeartbeat(key: string): void {
    const intervalId = this.pingIntervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.pingIntervals.delete(key);
    }
  }

  private closeConnection(key: string): void {
    const managed = this.connections.get(key);
    if (!managed) return;

    this.clearConnectionTimeout(key);
    this.stopHeartbeat(key);
    const reconnectTimeoutId = this.reconnectTimeouts.get(key);
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      this.reconnectTimeouts.delete(key);
    }

    managed.shouldReconnect = false;
    if (
      managed.ws.readyState === WebSocket.OPEN ||
      managed.ws.readyState === WebSocket.CONNECTING
    ) {
      try {
        managed.ws.close(1000, "Client disconnecting");
      } catch (error) {
        console.warn("⚠️ [WebSocket Manager] Error closing WebSocket:", error);
      }
    }

    this.connections.delete(key);
  }
}

// Singleton instance
export const websocketManager = new WebSocketManager();

// Utility function for URL encoding
export function createWebSocketUrl(
  base: string,
  path: string,
  params: Record<string, string | number> = {},
): string {
  const url = new URL(path, base);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

/**
 * Same as {@link createWebSocketUrl}, but adds `token=<JWT>` from localStorage
 * so the backend can authenticate the connecting user (Bearer equivalent on WS handshake).
 */
export function createAuthenticatedWebSocketUrl(
  base: string,
  path: string,
  params: Record<string, string | number> = {},
): string {
  const accessToken = storage.get(TOKEN_KEY);
  const merged: Record<string, string | number> = { ...params };
  if (accessToken) {
    merged[WEBSOCKET_ACCESS_TOKEN_QUERY] = accessToken;
  }
  return createWebSocketUrl(base, path, merged);
}

/**
 * Ensure a fresh access token, then build an authenticated WS URL.
 * Call before every connect.
 */
export async function createFreshAuthenticatedWebSocketUrl(
  base: string,
  path: string,
  params: Record<string, string | number> = {},
  options?: { forceRefresh?: boolean },
): Promise<string> {
  await ensureFreshAccessToken({ force: options?.forceRefresh });
  return createAuthenticatedWebSocketUrl(base, path, params);
}

// Debounce utility for rapid updates
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number,
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
