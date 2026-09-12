/**
 * Phoenix Bingo - Cross-Device Real-Time Room Synchronization
 * 
 * Synchronizes taken tickets between multiple real devices & tabs.
 * - BroadcastChannel for immediate same-device multi-tab sync
 * - Server Polling (/api/room/...) for cross-device sync between real phones
 */

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

// BroadcastChannel for instant local multi-tab sync
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    syncChannel = new BroadcastChannel("phoenix_live_room_tickets");
  }
} catch {}

type RoomListener = (data: { roundId: number; takenTickets: number[]; playersCount: number }) => void;
const listeners = new Set<RoomListener>();

export function subscribeRoomSync(listener: RoomListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(roundId: number, takenTickets: number[], playersCount: number) {
  listeners.forEach((fn) => {
    try {
      fn({ roundId, takenTickets, playersCount });
    } catch {}
  });
}

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    const data = event.data;
    if (data && typeof data.roundId === "number" && Array.isArray(data.takenTickets)) {
      notifyListeners(data.roundId, data.takenTickets, data.playersCount || 1);
    }
  };
}

// Memory cache of server taken tickets
let cachedServerTaken: number[] = [];
let lastFetchedRoundId = -1;

/**
 * Polls the backend server for live room state
 */
export async function fetchServerRoomState(roundId: number): Promise<{
  takenTickets: number[];
  playersCount: number;
}> {
  try {
    const myId = getDeviceId();
    const res = await fetch(`/api/room/state?roundId=${roundId}&userId=${encodeURIComponent(myId)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Server not responding");
    const data = await res.json();
    if (data && Array.isArray(data.takenTickets)) {
      cachedServerTaken = data.takenTickets;
      lastFetchedRoundId = roundId;
      notifyListeners(roundId, data.takenTickets, data.playersCount || 1);
      return {
        takenTickets: data.takenTickets,
        playersCount: data.playersCount || 1,
      };
    }
  } catch {
    // Network/API not ready, fallback to cached
  }

  return {
    takenTickets: cachedServerTaken,
    playersCount: 1,
  };
}

/**
 * Notifies the server and other phones when a ticket is selected
 */
export async function claimRemoteTicket(
  roundId: number,
  ticketNum: number,
  userName: string = "ተጫዋች",
  userPhone: string = ""
): Promise<boolean> {
  const myId = getDeviceId();

  // 1. Broadcast locally immediately
  if (syncChannel) {
    try {
      syncChannel.postMessage({
        type: "SELECT_TICKET",
        roundId,
        ticketNum,
        userId: myId,
        takenTickets: Array.from(new Set([...cachedServerTaken, ticketNum])),
      });
    } catch {}
  }

  // 2. Send to server
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
      if (Array.isArray(data.takenTickets)) {
        cachedServerTaken = data.takenTickets;
        notifyListeners(roundId, data.takenTickets, data.playersCount || 1);
      }
      return true;
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

  // 1. Broadcast locally
  if (syncChannel) {
    try {
      const next = cachedServerTaken.filter((t) => t !== ticketNum);
      syncChannel.postMessage({
        type: "RELEASE_TICKET",
        roundId,
        ticketNum,
        userId: myId,
        takenTickets: next,
      });
    } catch {}
  }

  // 2. Send to server
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
        notifyListeners(roundId, data.takenTickets, data.playersCount || 1);
      }
      return true;
    }
  } catch {}
  return true;
}
