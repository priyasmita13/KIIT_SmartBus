import React, { useState, useEffect, useRef } from 'react';
import { Bus, MapPin, Wifi, WifiOff, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const DESTINATIONS = [
  'Campus 1',
  'Campus 2',
  'Campus 3',
  'Campus 4',
  'Campus 5',
  'Campus 6',
  'Campus 7',
  'Campus 11',
  'Campus 14',
  'Campus 15',
  'Campus 25',
  'CDS Gate',
  'KIIT Square',
  'Patia',
  'Infocity',
];

const DriverMode: React.FC = () => {
  const { user } = useAuth();
  const [destination, setDestination] = useState('Campus 25');
  const [isOnline, setIsOnline] = useState(false);
  const [status, setStatus] = useState('Offline — tap Go Online to start');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastPush, setLastPush] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCoords = useRef<{ lat: number; lng: number } | null>(null);

  // Push location to backend
  const pushLocation = async (lat: number, lng: number, dest: string) => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return;
    try {
      await fetch(`${API}/api/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng, destination: dest }),
      });
      setLastPush(new Date().toLocaleTimeString());
      setError(null);
    } catch {
      setError('Failed to push location — check network');
    }
  };

  const goOnline = () => {
    if (!navigator.geolocation) {
      setError('GPS not supported on this device');
      return;
    }
    setError(null);
    setStatus('Getting GPS fix…');

    // Watch GPS
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestCoords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setAccuracy(Math.round(pos.coords.accuracy));
        setStatus(`Online → ${destination}`);
      },
      (err) => {
        setError(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );

    // Push every 5 seconds
    intervalRef.current = setInterval(() => {
      if (latestCoords.current) {
        pushLocation(latestCoords.current.lat, latestCoords.current.lng, destination);
      }
    }, 5000);

    setIsOnline(true);
  };

  const goOffline = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Tell server we're offline
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      try {
        await fetch(`${API}/api/location/offline`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }

    setIsOnline(false);
    setStatus('Offline — tap Go Online to start');
    setAccuracy(null);
    latestCoords.current = null;
  };

  // When destination changes while online, push immediately
  const handleDestinationChange = (newDest: string) => {
    setDestination(newDest);
    if (isOnline && latestCoords.current) {
      pushLocation(latestCoords.current.lat, latestCoords.current.lng, newDest);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

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
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Bus className={`h-8 w-8 ${isOnline ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Driver Mode</h1>
          <p className="text-sm text-gray-500 mt-1">Hi {user.name} 👋</p>
        </div>

        {/* Status badge */}
        <div className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-full text-sm font-medium ${
          isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>{status}</span>
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
          {isOnline && (
            <p className="text-xs text-green-600 mt-1">✓ Changing destination updates the map immediately</p>
          )}
        </div>

        {/* GPS accuracy */}
        {isOnline && accuracy !== null && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              GPS accuracy: <span className="font-semibold">±{accuracy}m</span>
              {lastPush && <span className="text-blue-400 ml-2">· pushed {lastPush}</span>}
            </p>
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
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Wifi className="h-5 w-5" />
            <span>Go Online</span>
          </button>
        ) : (
          <button
            onClick={goOffline}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <WifiOff className="h-5 w-5" />
            <span>Go Offline</span>
          </button>
        )}

        <p className="text-xs text-center text-gray-400">
          Your location is broadcast every 5 seconds to the student map.
        </p>
      </div>
    </div>
  );
};

export default DriverMode;
