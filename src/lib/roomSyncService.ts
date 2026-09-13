/**
 * Phoenix Bingo - Universal Master Room Synchronization Service
 * 
 * Provides:
 * 1. Native Server-Sent Events (SSE) `/api/room/stream` for instant (<15ms) push across all devices.
 * 2. Automatic continuous fallback polling `/api/room/state` (500ms).
 * 3. Cross-device ticket claim & release broadcasting.
 * 4. Authoritative Master Clock calibration.
 * 5. Admin live controls bridge.
 */

import { updateServerTimeOffset } from "./liveSyncEngine";

export interface RemoteTicket {
  ticketNum: number;
  userId: string;
  userName: string;
  roundId: number;
  timestamp: number;
}

let deviceId = "";

export function getDeviceId(): string {
  if (deviceId) return deviceId;
  if (typeof window === "undefined") return "server_placeholder";

  try {
    const stored = localStorage.getItem("phoenix_device_id");
    if (stored) {
      deviceId = stored;
      return deviceId;
    }
    const newId = "dev_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    localStorage.setItem("phoenix_device_id", newId);
    deviceId = newId;
    return deviceId;
  } catch {
    return "dev_fallback_" + Math.random().toString(36).substring(2, 6);
  }
}

// BroadcastChannel for instant local multi-tab sync on the same device
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    syncChannel = new BroadcastChannel("phoenix_live_room_tickets");
  }
} catch {}

export interface ServerLiveRoomData {
  success?: boolean;
  serverTime: number;
  roundId: number;
  phase: "lobby" | "game" | "victory";
  countdown: number;
  elapsedInRound: number;
  drawnBalls: number[];
  currentBall: number | null;
  totalRoomTickets: number;
  takenTickets: number[];
  takenDetails: Record<number, { userId: string; userName: string; userPhone?: string }>;
  jackpot: number;
  winnerInfo: {
    ticket: number;
    winningBallCount: number;
    name: string;
    phone: string;
    userId: string;
  };
  playersCount: number;
  lobbyDuration?: number;
  lastAction?: {
    type: "SELECT" | "UNSELECT" | "ADMIN_ACTION" | "TICK";
    ticketNum?: number;
    userName?: string;
    time: number;
    action?: string;
  };
}

export type RoomListener = (data: ServerLiveRoomData) => void;
const listeners = new Set<RoomListener>();

export function subscribeRoomSync(listener: RoomListener) {
  listeners.add(listener);
  // Send latest state if available immediately
  if (latestServerState) {
    try {
      listener(latestServerState);
    } catch {}
  }
  return () => {
    listeners.delete(listener);
  };
}

let latestServerState: ServerLiveRoomData | null = null;

export function getLatestServerState(): ServerLiveRoomData | null {
  return latestServerState;
}

function notifyListeners(data: ServerLiveRoomData) {
  latestServerState = data;
  if (typeof data.serverTime === "number") {
    updateServerTimeOffset(data.serverTime);
  }

  listeners.forEach((fn) => {
    try {
      fn(data);
    } catch {}
  });

  // Broadcast to other tabs on the same device
  if (syncChannel) {
    try {
      syncChannel.postMessage(data);
    } catch {}
  }
}

// Same-device tab listener
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    const data = event.data;
    if (data && typeof data.roundId === "number" && Array.isArray(data.takenTickets)) {
      latestServerState = data;
      listeners.forEach((fn) => {
        try {
          fn(data);
        } catch {}
      });
    }
  };
}

// Memory cache of server taken tickets
let cachedServerTaken: number[] = [];

// ==========================================
// 1. SSE (Server-Sent Events) REAL-TIME PUSH
// ==========================================
let eventSource: EventSource | null = null;
let sseReconnectTimer: any = null;

function initSSE() {
  if (typeof window === "undefined" || !("EventSource" in window)) return;
  if (eventSource) {
    try {
      eventSource.close();
    } catch {}
    eventSource = null;
  }

  try {
    const myId = getDeviceId();
    const es = new EventSource(`/api/room/stream?userId=${encodeURIComponent(myId)}`);
    eventSource = es;

    es.onopen = () => {
      // Connected to server stream
    };

    es.onmessage = (e) => {
      try {
        const parsed: ServerLiveRoomData = JSON.parse(e.data);
        if (parsed && typeof parsed.roundId === "number" && Array.isArray(parsed.takenTickets)) {
          cachedServerTaken = parsed.takenTickets;
          notifyListeners(parsed);

          // Dispatch toast if another user claimed a ticket
          if (parsed.lastAction && parsed.lastAction.type === "SELECT" && parsed.lastAction.ticketNum) {
            window.dispatchEvent(
              new CustomEvent("phoenix_ticket_claimed_live", {
                detail: parsed.lastAction,
              })
            );
          }
        }
      } catch {}
    };

    es.onerror = () => {
      try {
        es.close();
      } catch {}
      eventSource = null;
      clearTimeout(sseReconnectTimer);
      sseReconnectTimer = setTimeout(initSSE, 2000);
    };
  } catch {
    clearTimeout(sseReconnectTimer);
    sseReconnectTimer = setTimeout(initSSE, 3000);
  }
}

// Start SSE connection on script load
if (typeof window !== "undefined") {
  initSSE();
}

/**
 * Polls the backend server for live room state (authoritative fallback)
 */
export async function fetchServerRoomState(roundId?: number): Promise<ServerLiveRoomData | null> {
  try {
    const myId = getDeviceId();
    const query = roundId ? `?roundId=${roundId}&userId=${encodeURIComponent(myId)}` : `?userId=${encodeURIComponent(myId)}`;
    const res = await fetch(`/api/room/state${query}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Server not responding");
    const data: ServerLiveRoomData = await res.json();
    if (data && Array.isArray(data.takenTickets) && typeof data.roundId === "number") {
      cachedServerTaken = data.takenTickets;
      notifyListeners(data);
      return data;
    }
  } catch {
    // Network/API not ready, fallback to cached
  }

  return latestServerState;
}

/**
 * Notifies the server and all connected phones when a ticket is selected
 */
export async function claimRemoteTicket(
  roundId: number,
  ticketNum: number,
  userName: string = "ተጫዋች",
  userPhone: string = ""
): Promise<boolean> {
  const myId = getDeviceId();

  // 1. Send to server
  try {
    const res = await fetch("/api/room/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roundId,
        ticketNum,
        userId: myId,
        userName,
        userPhone,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.takenTickets)) {
        cachedServerTaken = data.takenTickets;
        notifyListeners(data);
        return true;
      } else if (data.error === "TICKET_ALREADY_TAKEN") {
        if (Array.isArray(data.takenTickets)) {
          cachedServerTaken = data.takenTickets;
          notifyListeners(data);
        }
        return false;
      }
    }
  } catch {
    // Fallback gracefully
  }
  return true;
}

/**
 * Notifies the server and other phones when a ticket is released / refunded
 */
export async function releaseRemoteTicket(roundId: number, ticketNum: number): Promise<boolean> {
  const myId = getDeviceId();

  try {
    const res = await fetch("/api/room/unselect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roundId,
        ticketNum,
        userId: myId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.takenTickets)) {
        cachedServerTaken = data.takenTickets;
        notifyListeners(data);
      }
      return true;
    }
  } catch {}
  return true;
}

/**
 * Master Admin Action dispatcher (Force start, next round, change lobby timer)
 */
export async function sendAdminRoomAction(action: string, payload: Record<string, any> = {}): Promise<ServerLiveRoomData | null> {
  try {
    const res = await fetch("/api/room/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...payload,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.roundId === "number") {
        notifyListeners(data);
        return data;
      }
    }
  } catch {}
  return null;
}
