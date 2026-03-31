import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, RefreshCw, Bus, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Fix Leaflet default icons
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Types
interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

interface NearbyBus {
  id: string;
  name: string;
  busId: string;
  destination: string;
  location: { latitude: number; longitude: number; lastUpdated: string };
  distanceKm?: number;
}

interface RecenterMapProps {
  lat: number;
  lng: number;
  shouldRecenter: boolean;
  onRecentered: () => void;
}

// Recenters map only when explicitly requested (initial load or user clicks recenter)
const RecenterMap: React.FC<RecenterMapProps> = ({ lat, lng, shouldRecenter, onRecentered }) => {
  const map = useMap();
  useEffect(() => {
    if (shouldRecenter && lat && lng) {
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
      onRecentered();
    }
  }, [lat, lng, shouldRecenter, map, onRecentered]);
  return null;
};

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
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [nearbyBuses, setNearbyBuses] = useState<NearbyBus[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const mapInitializedRef = useRef(false);
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const GOOD_ACCURACY = 50; // meters

  // Custom bus marker (yellow bus icon)
  const busIcon = new Icon({
    iconUrl:
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(`
        <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="8" width="28" height="20" rx="4" fill="#F59E0B" stroke="white" stroke-width="2"/>
          <rect x="7" y="11" width="7" height="6" rx="1" fill="white" fill-opacity="0.8"/>
          <rect x="16" y="11" width="7" height="6" rx="1" fill="white" fill-opacity="0.8"/>
          <circle cx="10" cy="30" r="3" fill="#374151" stroke="white" stroke-width="1.5"/>
          <circle cx="26" cy="30" r="3" fill="#374151" stroke="white" stroke-width="1.5"/>
          <rect x="4" y="22" width="28" height="4" rx="1" fill="#D97706"/>
        </svg>
      `),
    iconSize: [36, 36],
    iconAnchor: [18, 30],
    popupAnchor: [0, -30],
  });

  // Custom user marker (pulsing green dot)
  const userIcon = new Icon({
    iconUrl:
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="#10B981" fill-opacity="0.25" stroke="#10B981" stroke-width="1"/>
          <circle cx="16" cy="16" r="8" fill="#10B981" stroke="white" stroke-width="2.5"/>
          <circle cx="16" cy="16" r="3" fill="white"/>
        </svg>
      `),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  // Reverse geocode using Nominatim (free, no API key needed)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    // Debounce: cancel previous request
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        setAddressLoading(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.display_name) {
            // Shorten the address to key parts
            const parts = data.display_name.split(', ');
            const shortAddress = parts.slice(0, 4).join(', ');
            setAddress(shortAddress);
          }
        }
      } catch (err) {
        console.warn('Reverse geocoding failed:', err);
        setAddress(null);
      } finally {
        setAddressLoading(false);
      }
    }, 1000); // 1s debounce to respect Nominatim rate limits
  }, []);

  // Clear any existing watcher
  const clearWatcher = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Start watching location
  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    // Clear any existing watcher first
    clearWatcher();

    setError(null);
    setIsRefining(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const location: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };

        setUserLocation(location);
        setLocationAccuracy(pos.coords.accuracy);
        setError(null);
        setPermissionDenied(false);
        setUpdateCount((prev) => prev + 1);
        setLastUpdateTime(new Date().toLocaleTimeString());

        // If accuracy is good enough, stop refining indicator
        if (pos.coords.accuracy <= GOOD_ACCURACY) {
          setIsRefining(false);
        }

        // Recenter map on first fix
        if (!mapInitializedRef.current) {
          setShouldRecenter(true);
          mapInitializedRef.current = true;
        }

        // Reverse geocode after getting location
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.error('GPS Error:', err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access denied. Please allow location access in your browser settings.');
            setPermissionDenied(true);
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable. Please check your device settings.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('Unable to retrieve your location.');
        }
        setIsRefining(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0, // Always get fresh location
      }
    );
  }, [clearWatcher, reverseGeocode]);

  // Start watching on mount, cleanup on unmount
  useEffect(() => {
    startWatchingLocation();
    return () => {
      clearWatcher();
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch nearby buses — starts once user location is known, polls every 5s
  const fetchNearbyBuses = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `${API}/api/location/nearby-drivers?latitude=${lat}&longitude=${lng}&radius=10`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.drivers)) {
        // Sort by distance, cap at 4
        const withDist = data.drivers.map((d: NearbyBus) => {
          if (!d.location) return { ...d, distanceKm: 999 };
          const R = 6371;
          const dLat = ((d.location.latitude - lat) * Math.PI) / 180;
          const dLng = ((d.location.longitude - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((d.location.latitude * Math.PI) / 180) *
              Math.sin(dLng / 2) ** 2;
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return { ...d, distanceKm: dist };
        });
        withDist.sort((a: NearbyBus, b: NearbyBus) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        setNearbyBuses(withDist.slice(0, 4));
      }
    } catch {
      // silently ignore — bus data is supplementary
    }
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    // Fetch immediately when location becomes available
    fetchNearbyBuses(userLocation.latitude, userLocation.longitude);
    // Then poll every 5 seconds
    busPollingRef.current = setInterval(() => {
      fetchNearbyBuses(userLocation.latitude, userLocation.longitude);
    }, 5000);
    return () => {
      if (busPollingRef.current) clearInterval(busPollingRef.current);
    };
  }, [userLocation?.latitude, userLocation?.longitude, fetchNearbyBuses]);

  // Force refresh: clears everything and re-starts
  const refreshData = () => {
    setIsLoading(true);
    clearWatcher();
    setUserLocation(null);
    setLocationAccuracy(null);
    setError(null);
    setAddress(null);
    setUpdateCount(0);
    mapInitializedRef.current = false;
    setShouldRecenter(true);
    setIsRefining(true);

    setTimeout(() => {
      startWatchingLocation();
      setIsLoading(false);
    }, 300);
  };

  // Recenter button handler
  const handleRecenter = () => {
    if (userLocation) {
      setShouldRecenter(true);
    }
  };

  // Accuracy label + color
  const getAccuracyInfo = (accuracy: number | null) => {
    if (accuracy === null) return { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (accuracy === 0) return { label: 'Manual (Perfect)', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (accuracy < 10) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (accuracy < 30) return { label: 'Very Good', color: 'text-green-600', bg: 'bg-green-50' };
    if (accuracy < 50) return { label: 'Good', color: 'text-green-500', bg: 'bg-green-50' };
    if (accuracy < 100) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (accuracy < 500) return { label: 'Approximate', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const accuracyInfo = getAccuracyInfo(locationAccuracy);

  // Map center: use current location or KIIT campus default
  const defaultCenter: [number, number] = [20.3544, 85.8180]; // KIIT campus
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
              <div className="text-gray-600 mt-2 flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    userLocation
                      ? isRefining
                        ? 'bg-yellow-500 animate-pulse'
                        : 'bg-green-500 animate-pulse'
                      : 'bg-gray-400'
                  }`}
                ></div>
                <span className="text-sm">
                  {userLocation
                    ? isRefining
                      ? `Refining location… Accuracy: ${locationAccuracy ? Math.round(locationAccuracy) : '?'}m`
                      : `Location locked • Accuracy: ${Math.round(locationAccuracy || 0)}m (${accuracyInfo.label})`
                    : error
                    ? 'Location error'
                    : 'Finding location…'}
                </span>
              </div>
              {lastUpdateTime && (
                <p className="text-xs text-gray-400 mt-1">
                  Last update: {lastUpdateTime} • Updates received: {updateCount}
                </p>
              )}
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

        {/* Map + Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/20">
              <div className="p-4 bg-gradient-to-r from-green-primary to-green-secondary text-white">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <Navigation className="h-5 w-5" />
                  <span>Live Map View</span>
                </h2>
              </div>
              <div className="h-96 relative">
                {permissionDenied ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center p-6">
                      <MapPin className="h-16 w-16 text-red-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">Location Access Required</p>
                      <p className="text-gray-500 text-sm mt-2 max-w-sm">
                        Please allow location access in your browser's address bar (click the lock/info icon) and then
                        refresh.
                      </p>
                      <button
                        onClick={refreshData}
                        className="mt-4 bg-green-primary text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
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
                      <button
                        onClick={refreshData}
                        className="mt-4 bg-green-primary text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <MapContainer
                    center={mapCenter}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}
                    className="rounded-lg"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      maxZoom={19}
                      minZoom={1}
                    />
                    {userLocation && (
                      <>
                        {/* Accuracy circle */}
                        {locationAccuracy && locationAccuracy > 10 && (
                          <Circle
                            center={[userLocation.latitude, userLocation.longitude]}
                            radius={locationAccuracy}
                            pathOptions={{
                              color: '#10B981',
                              fillColor: '#10B981',
                              fillOpacity: 0.08,
                              weight: 1,
                              dashArray: '4 4',
                            }}
                          />
                        )}
                        {/* User marker */}
                        <Marker
                          position={[userLocation.latitude, userLocation.longitude]}
                          icon={userIcon}
                        >
                          <Popup>
                            <div className="text-center" style={{ minWidth: '180px' }}>
                              <p className="font-semibold text-green-600 mb-1">📍 Your Location</p>
                              {address && (
                                <p className="text-xs text-gray-700 mb-1">{address}</p>
                              )}
                              <p className="text-sm text-gray-600 font-mono">
                                {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                              </p>
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
                    {/* Bus markers */}
                    {nearbyBuses.map((bus) =>
                      bus.location ? (
                        <Marker
                          key={bus.id}
                          position={[bus.location.latitude, bus.location.longitude]}
                          icon={busIcon}
                        >
                          <Popup>
                            <div style={{ minWidth: '170px' }}>
                              <p className="font-semibold text-yellow-600 mb-1">🚌 {bus.name}</p>
                              <p className="text-sm text-gray-700">📍 Heading to: <strong>{bus.destination}</strong></p>
                              {bus.busId && <p className="text-xs text-gray-500 mt-1">Bus ID: {bus.busId}</p>}
                              {bus.distanceKm !== undefined && (
                                <p className="text-xs text-gray-500">
                                  Distance: {bus.distanceKm < 1 ? `${Math.round(bus.distanceKm * 1000)}m` : `${bus.distanceKm.toFixed(1)}km`} away
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                Updated: {bus.location.lastUpdated ? new Date(bus.location.lastUpdated).toLocaleTimeString() : 'recently'}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      ) : null
                    )}
                  </MapContainer>
                )}

                {/* Tracking Status Overlay */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        userLocation
                          ? isRefining
                            ? 'bg-yellow-500 animate-pulse'
                            : 'bg-green-500 animate-pulse'
                          : 'bg-gray-400'
                      }`}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">
                      {userLocation
                        ? isRefining
                          ? 'Refining…'
                          : 'Location Active'
                        : 'Finding…'}
                    </span>
                  </div>
                  {userLocation && (
                    <p className="text-xs text-gray-500 mt-1">
                      ±{Math.round(locationAccuracy || 0)}m
                    </p>
                  )}
                </div>

                {/* Refining overlay */}
                {userLocation && isRefining && (
                  <div className="absolute bottom-4 left-4 right-4 bg-yellow-50/90 backdrop-blur-sm rounded-lg p-2 shadow-lg z-[1000] text-center">
                    <p className="text-xs text-yellow-700">
                      ⏳ Improving accuracy… Current: ±{Math.round(locationAccuracy || 0)}m
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location Info Sidebar */}
          <div className="space-y-4">
            {/* Your Location Card */}
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
                      <p className="text-sm text-gray-600">
                        {isRefining ? 'Improving accuracy…' : 'GPS locked'}
                      </p>
                    </div>
                  </div>

                  {/* Address */}
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

                  {/* Coordinates */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Coordinates</p>
                    <p className="font-mono text-sm">
                      {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                    </p>
                  </div>

                  {/* Accuracy */}
                  {locationAccuracy !== null && (
                    <div className={`${accuracyInfo.bg} rounded-lg p-3`}>
                      <p className="text-xs text-gray-500">GPS Accuracy</p>
                      <p className={`text-sm font-medium ${accuracyInfo.color}`}>
                        ±{Math.round(locationAccuracy)}m — {accuracyInfo.label}
                      </p>
                      {/* Accuracy bar */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(5, Math.min(100, 100 - locationAccuracy / 5))}%`,
                            backgroundColor:
                              locationAccuracy < 30
                                ? '#10B981'
                                : locationAccuracy < 100
                                ? '#F59E0B'
                                : '#EF4444',
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    {error ? 'Location Error' : 'Finding your location…'}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {error || 'Please allow location access when prompted'}
                  </p>
                </div>
              )}
            </div>

            {/* Bus Status Card */}
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-lg p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                <Bus className="h-5 w-5 text-yellow-500" />
                <span>Nearby Buses</span>
                {nearbyBuses.length > 0 && (
                  <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-normal">{nearbyBuses.length} online</span>
                )}
              </h3>
              {nearbyBuses.length === 0 ? (
                <div className="text-center py-4">
                  <Bus className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {userLocation ? 'No buses nearby right now' : 'Waiting for your location…'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {nearbyBuses.map((bus) => (
                    <div key={bus.id} className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">🚌 {bus.name}</p>
                          <p className="text-xs text-yellow-700 mt-0.5">→ {bus.destination}</p>
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

            {/* Legend */}
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-lg p-4 border border-white/20">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Map Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-600">Your Location</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500 border-dashed"></div>
                  <span className="text-xs text-gray-600">Accuracy Radius</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span className="text-xs text-gray-600">Live Bus</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTracker;
