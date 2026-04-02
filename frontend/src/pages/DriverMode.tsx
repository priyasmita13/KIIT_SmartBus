import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Bus, MapPin, Wifi, WifiOff, Navigation, Radio, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { API_BASE as API } from '../lib/apiBase';

const DESTINATIONS = [
  'Campus 1', 'Campus 2', 'Campus 3', 'Campus 4', 'Campus 5',
  'Campus 6', 'Campus 7', 'Campus 11', 'Campus 14', 'Campus 15',
  'Campus 25', 'CDS Gate', 'KIIT Square', 'Patia', 'Infocity',
];

type ConnectionStatus = 'offline' | 'connecting' | 'connected' | 'error';

const DriverMode: React.FC = () => {
  const { user } = useAuth();
  const [destination, setDestination] = useState('Campus 25');
  const [isOnline, setIsOnline] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('offline');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastPush, setLastPush] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const latestCoordsRef = useRef<{ lat: number; lng: number; heading?: number; speed?: number } | null>(null);
  const destinationRef = useRef(destination);
  const isOnlineRef = useRef(false);          // ref mirror so event listeners see current value
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  // Keep isOnlineRef in sync so visibility handler can read it
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // ── SOCKET CONNECTION ────────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setError('No auth token — please log in again');
      return;
    }

    setConnStatus('connecting');

    const socket = io(API, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setConnStatus('connected');
      setError(null);
    });

    socket.on('connect_error', (err) => {
      setConnStatus('error');
      // Auth errors (expired/invalid token) — no point retrying, need fresh login
      if (err.message.includes('Invalid') || err.message.includes('expired') || err.message.includes('token')) {
        setError('⚠️ Session expired — please log out and log back in, then try again.');
        socket.disconnect(); // stop retrying
      } else {
        setError(`Connection error: ${err.message}`);
      }
    });

    socket.on('disconnect', (reason) => {
      if (reason !== 'io client disconnect') {
        // Unintentional disconnect — show error but let socket.io auto-reconnect
        setConnStatus('connecting');
      }
    });

    socketRef.current = socket;
    return socket;
  }, []);

  // ── WAKE LOCK (keep screen/browser alive) ────────────────────────────────────
  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        // Re-acquire on page visibility change (wake lock is released when tab hides)
        wakeLockRef.current.addEventListener('release', () => {
          if (isOnlineRef.current) acquireWakeLock();
        });
      }
    } catch {
      // Wake lock not supported or denied — not critical
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('driver:offline');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnStatus('offline');
  }, []);

  // ── EMIT LOCATION ────────────────────────────────────────────────────────────
  const emitLocation = useCallback((
    lat: number,
    lng: number,
    heading?: number,
    spd?: number,
  ) => {
    if (!socketRef.current?.connected) return;

    const payload: Record<string, unknown> = {
      latitude: lat,
      longitude: lng,
      destination: destinationRef.current,
    };
    if (heading !== undefined) payload.heading = Math.round(heading);
    if (spd !== undefined) payload.speed = Math.round(spd * 3.6); // m/s → km/h

    socketRef.current.emit('driver:location', payload);
    setLastPush(new Date().toLocaleTimeString());
    setUpdateCount((c) => c + 1);
  }, []);

  // ── GPS WATCH ────────────────────────────────────────────────────────────────
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS not supported on this device');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc, heading, speed: spd } = pos.coords;
        latestCoordsRef.current = {
          lat: latitude,
          lng: longitude,
          heading: heading ?? undefined,
          speed: spd ?? undefined,
        };
        setAccuracy(Math.round(acc));
        if (spd !== null) setSpeed(Math.round(spd * 3.6));
        setError(null);

        // Emit immediately on every GPS update — this is the Uber model
        emitLocation(latitude, longitude, heading ?? undefined, spd ?? undefined);
      },
      (err) => {
        setError(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  }, [emitLocation]);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ── HEARTBEAT ────────────────────────────────────────────────────────────────
  // Pings backend every 15s so the bus doesn't get cleaned up by the stale-checker
  // even when Chrome throttles GPS callbacks in background tabs
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('driver:ping');
      }
    }, 15_000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ── GO ONLINE / OFFLINE ───────────────────────────────────────────────────────
  const goOnline = () => {
    setError(null);
    setUpdateCount(0);
    const socket = connectSocket();
    if (!socket) return;
    socket.once('connect', () => {
      startGPS();
      startHeartbeat();
    });
    acquireWakeLock();
    setIsOnline(true);
  };

  const goOffline = async () => {
    stopGPS();
    stopHeartbeat();
    releaseWakeLock();
    disconnectSocket();
    setIsOnline(false);
    setAccuracy(null);
    setSpeed(null);
    setLastPush(null);
    latestCoordsRef.current = null;
  };

  // When destination changes while online, push immediately with new dest
  const handleDestinationChange = (newDest: string) => {
    setDestination(newDest);
    destinationRef.current = newDest;
    if (isOnline && latestCoordsRef.current) {
      const { lat, lng, heading, speed: spd } = latestCoordsRef.current;
      emitLocation(lat, lng, heading, spd);
    }
  };

  // Page Visibility recovery — triggered when driver switches back to this tab
  // Chrome throttles/suspends background tabs; this restores everything instantly
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isOnlineRef.current) {
        // Re-acquire wake lock (released when tab was hidden)
        acquireWakeLock();
        // Immediately emit last known position so the bus reappears on the student map
        if (latestCoordsRef.current && socketRef.current?.connected) {
          const { lat, lng, heading, speed: spd } = latestCoordsRef.current;
          emitLocation(lat, lng, heading, spd);
        }
        // If socket disconnected while tab was hidden, reconnect
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [acquireWakeLock, emitLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGPS();
      stopHeartbeat();
      releaseWakeLock();
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── STATUS LABEL ─────────────────────────────────────────────────────────────
  const statusLabel = () => {
    if (!isOnline) return 'Offline — tap Go Online to start';
    switch (connStatus) {
      case 'connecting': return 'Connecting to server…';
      case 'connected': return `Broadcasting → ${destination}`;
      case 'error': return 'Connection error — retrying…';
      default: return 'Starting…';
    }
  };

  const statusColor = () => {
    if (!isOnline) return 'bg-gray-100 text-gray-500';
    if (connStatus === 'connected') return 'bg-green-100 text-green-700';
    if (connStatus === 'error') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const dotColor = () => {
    if (!isOnline) return 'bg-gray-400';
    if (connStatus === 'connected') return 'bg-green-500 animate-pulse';
    if (connStatus === 'error') return 'bg-red-500 animate-pulse';
    return 'bg-yellow-500 animate-pulse';
  };

  // ── ACCESS GUARD ─────────────────────────────────────────────────────────────
  if (!user || user.role !== 'DRIVER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <Bus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 font-semibold text-lg">Driver Access Only</p>
          <p className="text-gray-500 text-sm mt-2">
            This page is for driver accounts. Log in with a DRIVER role account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${connStatus === 'connected' && isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Bus className={`h-8 w-8 transition-colors ${connStatus === 'connected' && isOnline ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Driver Mode</h1>
          <p className="text-sm text-gray-500 mt-1">Hi {user.name} 👋</p>
        </div>

        {/* Status badge */}
        <div className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-full text-sm font-medium transition-colors ${statusColor()}`}>
          <div className={`w-2 h-2 rounded-full ${dotColor()}`} />
          <span>{statusLabel()}</span>
        </div>

        {/* Destination picker */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-1">
            <Navigation className="h-4 w-4" />
            <span>Destination</span>
          </label>
          <select
            value={destination}
            onChange={(e) => handleDestinationChange(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          >
            {DESTINATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {isOnline && connStatus === 'connected' && (
            <p className="text-xs text-green-600 mt-1">✓ Changing destination updates the map immediately</p>
          )}
        </div>

        {/* Live stats */}
        {isOnline && connStatus === 'connected' && (
          <div className="grid grid-cols-2 gap-3">
            {accuracy !== null && (
              <div className="bg-blue-50 rounded-xl px-3 py-2 flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-400">GPS Accuracy</p>
                  <p className="text-sm font-semibold text-blue-700">±{accuracy}m</p>
                </div>
              </div>
            )}
            {speed !== null && (
              <div className="bg-purple-50 rounded-xl px-3 py-2 flex items-center space-x-2">
                <Activity className="h-4 w-4 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-purple-400">Speed</p>
                  <p className="text-sm font-semibold text-purple-700">{speed} km/h</p>
                </div>
              </div>
            )}
            <div className="col-span-2 bg-green-50 rounded-xl px-3 py-2 flex items-center space-x-2">
              <Radio className="h-4 w-4 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-400">Broadcasts sent</p>
                <p className="text-sm font-semibold text-green-700">
                  {updateCount}
                  {lastPush && <span className="font-normal text-green-500 ml-2">· last at {lastPush}</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            ⚠ {error}
          </div>
        )}

        {/* Online / Offline button */}
        {!isOnline ? (
          <button
            onClick={goOnline}
            className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center space-x-2 transition-all"
          >
            <Wifi className="h-5 w-5" />
            <span>Go Online</span>
          </button>
        ) : (
          <button
            onClick={goOffline}
            className="w-full bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center space-x-2 transition-all"
          >
            <WifiOff className="h-5 w-5" />
            <span>Go Offline</span>
          </button>
        )}

        <p className="text-xs text-center text-gray-400">
          Location is streamed live via WebSocket — students see you move in real time.
        </p>
      </div>
    </div>
  );
};

export default DriverMode;
