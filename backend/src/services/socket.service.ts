import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { socketAuth, type AuthenticatedSocket } from '../middleware/socketAuth.js';
import { LocationService } from './location.service.js';
import logger from '../lib/logger.js';
import config from '../config.js';

export interface BusState {
  socketId: string;
  userId: string;
  name: string;
  busId: string;
  latitude: number;
  longitude: number;
  destination: string;
  heading?: number | undefined;    // degrees 0-360, optional
  speed?: number | undefined;      // km/h, optional
  lastUpdated: number;             // epoch ms
}

// In-memory store: socketId → BusState
const activeBuses = new Map<string, BusState>();

// 5 minutes — generous window to handle Chrome background tab throttling
const STALE_THRESHOLD_MS = 5 * 60_000;

let io: SocketIOServer;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      // In dev: allow any origin so ngrok / LAN IPs work without editing .env each time
      // In production: restrict to the explicit CORS_ORIGINS list
      origin: config.isProd
        ? config.corsOrigins
        : true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10_000,
    pingTimeout: 30_000,
  });

  // Apply JWT auth middleware
  io.use((socket, next) => socketAuth(socket as AuthenticatedSocket, next));

  io.on('connection', (socket) => {
    const s = socket as AuthenticatedSocket;
    logger.info({ socketId: s.id, role: s.data.role, name: s.data.name }, 'Socket connected');

    // ── DRIVER EVENTS ──────────────────────────────────────────────────────────

    // Driver sends GPS update
    s.on('driver:location', async (payload: {
      latitude: number;
      longitude: number;
      destination?: string;
      heading?: number;
      speed?: number;
    }) => {
      if (s.data.role !== 'DRIVER' || !s.data.userId) return;

      const { latitude, longitude, destination = 'Unknown', heading, speed } = payload;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

      const busState: BusState = {
        socketId: s.id,
        userId: s.data.userId,
        name: s.data.name,
        busId: s.data.driverBusId ?? s.data.userId,
        latitude,
        longitude,
        destination,
        ...(heading !== undefined && { heading }),
        ...(speed !== undefined && { speed }),
        lastUpdated: Date.now(),
      };

      activeBuses.set(s.id, busState);

      // Broadcast updated bus list to ALL connected clients (students + drivers)
      broadcastBuses();

      // Persist to MongoDB asynchronously — don't await so we don't block the broadcast
      LocationService.updateLocation(s.data.userId, latitude, longitude, destination).catch(
        (err) => logger.error({ err }, 'Failed to persist driver location'),
      );
    });

    // Driver explicitly goes offline
    s.on('driver:offline', async () => {
      if (s.data.role !== 'DRIVER') return;
      activeBuses.delete(s.id);
      broadcastBuses();
      if (s.data.userId) {
        await LocationService.setUserOffline(s.data.userId).catch(() => {});
      }
      logger.info({ name: s.data.name }, 'Driver went offline');
    });

    // Driver heartbeat — sent every 15s when GPS may be throttled (background tab)
    // This just bumps lastUpdated so the stale cleanup doesn't remove the bus
    s.on('driver:ping', () => {
      if (s.data.role !== 'DRIVER') return;
      const existing = activeBuses.get(s.id);
      if (existing) {
        existing.lastUpdated = Date.now();
        activeBuses.set(s.id, existing);
        // No broadcast needed - position hasn't changed
      }
    });

    // ── STUDENT EVENTS ─────────────────────────────────────────────────────────

    // When a new client connects, immediately send the current bus snapshot
    s.on('student:join', () => {
      s.emit('buses:update', getBusSnapshot());
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────────────

    s.on('disconnect', async (reason) => {
      logger.info({ socketId: s.id, role: s.data.role, reason }, 'Socket disconnected');

      if (activeBuses.has(s.id)) {
        activeBuses.delete(s.id);
        broadcastBuses();
        // Set driver offline in DB
        if (s.data.userId) {
          await LocationService.setUserOffline(s.data.userId).catch(() => {});
        }
      }
    });
  });

  // Stale bus cleanup — runs every 30 seconds
  setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [sid, bus] of activeBuses) {
      if (now - bus.lastUpdated > STALE_THRESHOLD_MS) {
        activeBuses.delete(sid);
        changed = true;
        logger.warn({ name: bus.name }, 'Removed stale bus from active map');
      }
    }
    if (changed) broadcastBuses();
  }, 30_000);

  logger.info('Socket.IO server initialized');
  return io;
}

/** Returns all active buses as a plain array (no Map internals). */
function getBusSnapshot(): BusState[] {
  return Array.from(activeBuses.values());
}

/** Broadcasts the current bus list to every connected socket. */
function broadcastBuses() {
  if (!io) return;
  io.emit('buses:update', getBusSnapshot());
}

export { io };
