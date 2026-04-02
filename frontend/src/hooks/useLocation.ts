import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import { API_BASE as API } from '../lib/apiBase';


interface Location {
  latitude: number;
  longitude: number;
  lastUpdated: Date;
}

interface Driver {
  id: string;
  name: string;
  busId?: string;
  location: Location;
  lastUpdated: Date;
}

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Get user's current location
  const getCurrentLocation = useCallback((): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            lastUpdated: new Date()
          };
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unable to retrieve your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              setPermissionDenied(true);
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }, []);

  // Update location on server
  const updateLocationOnServer = useCallback(async (location: Location) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) return;

      await axios.post(
        `${API}/api/location/update`,
        {
          latitude: location.latitude,
          longitude: location.longitude
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (error) {
      console.error('Error updating location on server:', error);
    }
  }, []);

  // Get nearby drivers
  const fetchNearbyDrivers = useCallback(async (location: Location) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) return;

      const response = await axios.get(
        `${API}/api/location/nearby-drivers?latitude=${location.latitude}&longitude=${location.longitude}&radius=5`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setNearbyDrivers(response.data.drivers);
      }
    } catch (error) {
      console.error('Error fetching nearby drivers:', error);
    }
  }, []);

  // Start location tracking
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      setIsTracking(true);

      // Get initial location
      const location = await getCurrentLocation();
      setUserLocation(location);
      
      // Update on server
      await updateLocationOnServer(location);
      
      // Get nearby drivers
      await fetchNearbyDrivers(location);

      // Set up interval for updates (every 20 seconds)
      const interval = setInterval(async () => {
        try {
          const newLocation = await getCurrentLocation();
          setUserLocation(newLocation);
          await updateLocationOnServer(newLocation);
          await fetchNearbyDrivers(newLocation);
        } catch (error) {
          console.error('Error updating location:', error);
        }
      }, 20000);

      // Store interval ID for cleanup
      (window as any).locationTrackingInterval = interval;

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start location tracking');
      setIsTracking(false);
    }
  }, [getCurrentLocation, updateLocationOnServer, fetchNearbyDrivers]);

  // Stop location tracking
  const stopTracking = useCallback(async () => {
    setIsTracking(false);
    
    // Clear interval
    if ((window as any).locationTrackingInterval) {
      clearInterval((window as any).locationTrackingInterval);
      (window as any).locationTrackingInterval = null;
    }

    // Set user offline on server
    try {
      const token = sessionStorage.getItem('accessToken');
      if (token) {
        await axios.post(
          `${API}/api/location/offline`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ((window as any).locationTrackingInterval) {
        clearInterval((window as any).locationTrackingInterval);
      }
    };
  }, []);

  return {
    userLocation,
    nearbyDrivers,
    isTracking,
    error,
    permissionDenied,
    startTracking,
    stopTracking,
    getCurrentLocation
  };
};
