import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, RefreshCw, Bus, Crosshair, Radio } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io, type Socket } from 'socket.io-client';

import { API_BASE as API } from '../lib/apiBase';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ── Types ──────────────────────────────────────────────────────────────────────
interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface BusState {
  socketId: string;
  userId: string;
  name: string;
  busId: string;
  latitude: number;
  longitude: number;
  destination: string;
  heading?: number;
  speed?: number;
  lastUpdated: number;
  distanceKm?: number;
}

// ── RecenterMap helper ─────────────────────────────────────────────────────────
const RecenterMap: React.FC<{ lat: number; lng: number; shouldRecenter: boolean; onRecentered: () => void }> = ({
  lat, lng, shouldRecenter, onRecentered,
}) => {
  const map = useMap();
  useEffect(() => {
    if (shouldRecenter && lat && lng) {
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
      onRecentered();
    }
  }, [lat, lng, shouldRecenter, map, onRecentered]);
  return null;
};

// ── Smooth moving bus marker ───────────────────────────────────────────────────
/**
 * Instead of re-rendering React components on every location update,
 * we use a ref to hold the Leaflet marker instance and call setLatLng()
 * directly — Leaflet animates the move smoothly with CSS transitions.
 */
const BusMarker: React.FC<{ bus: BusState; icon: Icon }> = ({ bus, icon }) => {
  const markerRef = useRef<L.Marker | null>(null);

  // On subsequent position updates, move the marker without re-mounting
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([bus.latitude, bus.longitude]);
    }
  }, [bus.latitude, bus.longitude]);

  return (
    <Marker
      position={[bus.latitude, bus.longitude]}
      icon={icon}
      ref={markerRef}
    >
      <Popup>
        <div style={{ minWidth: '180px' }}>
          <p className="font-semibold text-yellow-600 mb-1">🚌 {bus.name}</p>
          <p className="text-sm text-gray-700">📍 Heading to: <strong>{bus.destination}</strong></p>
          {bus.busId && <p className="text-xs text-gray-500 mt-1">Bus ID: {bus.busId}</p>}
          {bus.speed !== undefined && (
            <p className="text-xs text-gray-500">Speed: {bus.speed} km/h</p>
          )}
          {bus.distanceKm !== undefined && (
            <p className="text-xs text-gray-500">
              Distance: {bus.distanceKm < 1 ? `${Math.round(bus.distanceKm * 1000)}m` : `${bus.distanceKm.toFixed(1)}km`} away
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Updated: {new Date(bus.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
      </Popup>
    </Marker>
  );
};

// ── Haversine distance helper ──────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Accuracy label ─────────────────────────────────────────────────────────────
function getAccuracyInfo(accuracy: number | null) {
  if (accuracy === null) return { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100' };
  if (accuracy === 0)   return { label: 'Manual (Perfect)', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (accuracy < 10)   return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (accuracy < 30)   return { label: 'Very Good', color: 'text-green-600', bg: 'bg-green-50' };
  if (accuracy < 50)   return { label: 'Good', color: 'text-green-500', bg: 'bg-green-50' };
  if (accuracy < 100)  return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
  if (accuracy < 500)  return { label: 'Approximate', color: 'text-orange-600', bg: 'bg-orange-50' };
  return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-50' };
}

// ── Main Component ─────────────────────────────────────────────────────────────
const LiveTracker: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isRefining, setIsRefining] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [shouldRecenter, setShouldRecenter] = useState(true);
  const [buses, setBuses] = useState<BusState[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const mapInitializedRef = useRef(false);
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userLocationRef = useRef<Position | null>(null); // used inside socket callback
  const GOOD_ACCURACY = 50;

  // ── Custom icons ─────────────────────────────────────────────────────────────
  const busIcon = new Icon({
    iconUrl:
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>
          <g filter="url(#s)">
            <rect x="4" y="6" width="32" height="22" rx="5" fill="#F59E0B" stroke="white" stroke-width="2"/>
            <rect x="7" y="10" width="9" height="7" rx="1.5" fill="white" fill-opacity="0.85"/>
            <rect x="18" y="10" width="9" height="7" rx="1.5" fill="white" fill-opacity="0.85"/>
            <rect x="4" y="22" width="32" height="5" rx="1" fill="#D97706"/>
            <circle cx="11" cy="33" r="3.5" fill="#1F2937" stroke="white" stroke-width="2"/>
            <circle cx="29" cy="33" r="3.5" fill="#1F2937" stroke="white" stroke-width="2"/>
          </g>
        </svg>
      `),
    iconSize: [40, 40],
    iconAnchor: [20, 36],
    popupAnchor: [0, -36],
  });

  const userIcon = new Icon({
    iconUrl:
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1"/>
          <circle cx="16" cy="16" r="8" fill="#10B981" stroke="white" stroke-width="2.5"/>
          <circle cx="16" cy="16" r="3" fill="white"/>
        </svg>
      `),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  // ── Reverse geocode (Nominatim, free) ────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        setAddressLoading(true);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.display_name) {
            const parts = (data.display_name as string).split(', ');
            setAddress(parts.slice(0, 4).join(', '));
          }
        }
      } catch {
        setAddress(null);
      } finally {
        setAddressLoading(false);
      }
    }, 1000);
  }, []);

  // ── GPS watch ────────────────────────────────────────────────────────────────
  const clearWatcher = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }
    clearWatcher();
    setError(null);
    setIsRefining(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const location: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLocation(location);
        userLocationRef.current = location;
        setLocationAccuracy(pos.coords.accuracy);
        setError(null);
        setPermissionDenied(false);
        if (pos.coords.accuracy <= GOOD_ACCURACY) setIsRefining(false);
        if (!mapInitializedRef.current) {
          setShouldRecenter(true);
          mapInitializedRef.current = true;
        }
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access denied. Please allow location access in your browser settings.');
            setPermissionDenied(true);
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('Unable to retrieve your location.');
        }
        setIsRefining(false);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  }, [clearWatcher, reverseGeocode]);

  // ── Socket.IO — student connection (unauthenticated) ─────────────────────────
  useEffect(() => {
    const socket = io(API, {
      auth: {}, // no token — student viewer
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      // Request the current bus snapshot immediately
      socket.emit('student:join');
    });

    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('buses:update', (updatedBuses: BusState[]) => {
      // Attach distance to each bus relative to student's current location
      const loc = userLocationRef.current;
      const withDist = updatedBuses.map((bus) => {
        if (!loc) return bus;
        return {
          ...bus,
          distanceKm: haversineKm(loc.latitude, loc.longitude, bus.latitude, bus.longitude),
        };
      }).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      setBuses(withDist);
    });

    return () => {
      socket.disconnect();
    };
  }, []); // only once on mount

  // Start GPS on mount
  useEffect(() => {
    startWatchingLocation();
    return () => {
      clearWatcher();
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refresh ─────────────────────────────────────────────────────────────────
  const refreshData = () => {
    setIsLoading(true);
    clearWatcher();
    setUserLocation(null);
    userLocationRef.current = null;
    setLocationAccuracy(null);
    setError(null);
    setAddress(null);
    mapInitializedRef.current = false;
    setShouldRecenter(true);
    setIsRefining(true);
    setTimeout(() => {
      startWatchingLocation();
      setIsLoading(false);
    }, 300);
  };

  const handleRecenter = () => {
    if (userLocation) setShouldRecenter(true);
  };

  const accuracyInfo = getAccuracyInfo(locationAccuracy);
  const defaultCenter: [number, number] = [20.3544, 85.818]; // KIIT campus
  const mapCenter: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : defaultCenter;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-primary to-green-secondary bg-clip-text text-transparent flex items-center space-x-3">
                <div className="bg-gradient-to-r from-green-primary to-green-secondary p-2 rounded-xl animate-pulse">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <span>Live Tracker</span>
              </h1>
              <div className="text-gray-600 mt-2 flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  userLocation ? (isRefining ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-pulse') : 'bg-gray-400'
                }`} />
                <span className="text-sm">
                  {userLocation
                    ? isRefining
                      ? `Refining location… ±${locationAccuracy ? Math.round(locationAccuracy) : '?'}m`
                      : `Location locked • ±${Math.round(locationAccuracy || 0)}m (${accuracyInfo.label})`
                    : error ? 'Location error' : 'Finding location…'}
                </span>
                {/* WebSocket live indicator */}
                <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  <Radio className="h-3 w-3" />
                  <span>{socketConnected ? 'Live' : 'Connecting…'}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRecenter}
                disabled={!userLocation}
                className="bg-white text-green-primary border border-green-primary px-4 py-3 rounded-xl hover:bg-green-50 transition-all flex items-center space-x-2 disabled:opacity-50"
                title="Recenter map on your location"
              >
                <Crosshair className="h-5 w-5" />
                <span className="hidden sm:inline">Recenter</span>
              </button>
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-primary to-green-secondary text-white px-6 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Map + Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/20">
              <div className="p-4 bg-gradient-to-r from-green-primary to-green-secondary text-white flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <Navigation className="h-5 w-5" />
                  <span>Live Map View</span>
                </h2>
                {buses.length > 0 && (
                  <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                    🚌 {buses.length} bus{buses.length !== 1 ? 'es' : ''} online
                  </span>
                )}
              </div>
              <div className="h-96 relative">
                {permissionDenied ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center p-6">
                      <MapPin className="h-16 w-16 text-red-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">Location Access Required</p>
                      <p className="text-gray-500 text-sm mt-2 max-w-sm">
                        Please allow location access in your browser's address bar and then refresh.
                      </p>
                      <button onClick={refreshData} className="mt-4 bg-green-primary text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : error && !userLocation ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center p-6">
                      <MapPin className="h-16 w-16 text-red-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">Location Error</p>
                      <p className="text-gray-500 text-sm mt-2">{error}</p>
                      <button onClick={refreshData} className="mt-4 bg-green-primary text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <MapContainer center={mapCenter} zoom={16} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      maxZoom={19}
                    />

                    {userLocation && (
                      <>
                        {locationAccuracy && locationAccuracy > 10 && (
                          <Circle
                            center={[userLocation.latitude, userLocation.longitude]}
                            radius={locationAccuracy}
                            pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.08, weight: 1, dashArray: '4 4' }}
                          />
                        )}
                        <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
                          <Popup>
                            <div className="text-center" style={{ minWidth: '180px' }}>
                              <p className="font-semibold text-green-600 mb-1">📍 Your Location</p>
                              {address && <p className="text-xs text-gray-700 mb-1">{address}</p>}
                              <p className="text-xs text-gray-500 mt-1">
                                Accuracy: ±{Math.round(locationAccuracy || 0)}m ({accuracyInfo.label})
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                        <RecenterMap
                          lat={userLocation.latitude}
                          lng={userLocation.longitude}
                          shouldRecenter={shouldRecenter}
                          onRecentered={() => setShouldRecenter(false)}
                        />
                      </>
                    )}

                    {/* Smoothly-moving bus markers */}
                    {buses.map((bus) => (
                      <BusMarker key={bus.socketId} bus={bus} icon={busIcon} />
                    ))}
                  </MapContainer>
                )}

                {/* Live connection overlay */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      userLocation
                        ? isRefining ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-pulse'
                        : 'bg-gray-400'
                    }`} />
                    <span className="text-sm font-medium text-gray-700">
                      {userLocation ? (isRefining ? 'Refining…' : 'GPS Active') : 'Finding…'}
                    </span>
                  </div>
                  {socketConnected && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Radio className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">WebSocket Live</span>
                    </div>
                  )}
                </div>


              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Your Location */}
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-lg p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Location</h3>
              {userLocation ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Location Found</p>
                      <p className="text-sm text-gray-600">{isRefining ? 'Improving accuracy…' : 'GPS locked'}</p>
                    </div>
                  </div>
                  {address && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Detected Address</p>
                      <p className="text-sm text-gray-800 leading-snug">{address}</p>
                    </div>
                  )}
                  {addressLoading && !address && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Looking up address…</p>
                    </div>
                  )}
                  {locationAccuracy !== null && (
                    <p className="text-xs text-gray-400">GPS ±{Math.round(locationAccuracy)}m</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">{error ? 'Location Error' : 'Finding your location…'}</p>
                  <p className="text-gray-500 text-sm mt-1">{error || 'Please allow location access when prompted'}</p>
                </div>
              )}
            </div>

            {/* Nearby Buses */}
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-lg p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                <Bus className="h-5 w-5 text-yellow-500" />
                <span>Live Buses</span>
                {buses.length > 0 && (
                  <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-normal flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    <span>{buses.length} online</span>
                  </span>
                )}
              </h3>
              {!socketConnected ? (
                <div className="text-center py-4">
                  <Radio className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Connecting to live feed…</p>
                </div>
              ) : buses.length === 0 ? (
                <div className="text-center py-4">
                  <Bus className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No buses online right now</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {buses.map((bus) => (
                    <div key={bus.socketId} className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">🚌 {bus.name}</p>
                          <p className="text-xs text-yellow-700 mt-0.5">→ {bus.destination}</p>
                          {bus.speed !== undefined && bus.speed > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">{bus.speed} km/h</p>
                          )}
                        </div>
                        {bus.distanceKm !== undefined && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {bus.distanceKm < 1 ? `${Math.round(bus.distanceKm * 1000)}m` : `${bus.distanceKm.toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracker;
