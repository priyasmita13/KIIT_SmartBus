import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import axios from 'axios'

import { API_BASE as API } from '../lib/apiBase'


// Fix default icon paths for Leaflet in bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png'
const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadowUrl, iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = DefaultIcon

interface BusData {
  busId: string;
  currentLocation: { latitude: number; longitude: number };
  destination: string;
  seatAvailability: 'EMPTY' | 'FEW_SEATS' | 'FULL';
  passengerCount: number;
  maxCapacity: number;
  status: 'IN_SERVICE' | 'OUT_OF_SERVICE' | 'ON_BREAK' | 'EMERGENCY';
  lastUpdated: string;
}

function getBackLink() {
  const user = sessionStorage.getItem('user')
  if (user) {
    try {
      const userData = JSON.parse(user)
      return `/${userData.role.toLowerCase()}`
    } catch {
      return '/student' // fallback
    }
  }
  return '/student' // fallback
}

export default function MapPage() {
  const [busData, setBusData] = useState<BusData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch bus data
    async function fetchBusData() {
      try {
        const res = await axios.get(`${API}/api/buses/B001`)
        setBusData(res.data)
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Failed to load bus data')
      }
    }
    fetchBusData()
    
    // Refresh bus data every 30 seconds
    const interval = setInterval(fetchBusData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, margin: 0, padding: 0 }}>
      {/* Header */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000,
        background: 'white',
        padding: '12px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Link 
          to={getBackLink()}
          style={{
            color: '#007bff',
            textDecoration: 'none',
            fontSize: 16
          }}
        >
          ← Back to Dashboard
        </Link>
        {error && (
          <div style={{ 
            color: 'red', 
            fontSize: 14, 
            marginTop: 8,
            padding: '4px 8px',
            background: '#f8d7da',
            borderRadius: 4
          }}>
            {error}
          </div>
        )}
      </div>
      
      {/* Full-screen Map */}
      <MapContainer 
        center={[20.355, 85.819]} 
        zoom={14} 
        style={{ 
          height: '100vh', 
          width: '100vw',
          position: 'absolute',
          top: 0,
          left: 0
        }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution="&copy; OpenStreetMap contributors" 
        />
        {busData && (
          <Marker position={[busData.currentLocation.latitude, busData.currentLocation.longitude]}>
            <Popup>
              <div style={{ padding: 8, minWidth: 200 }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>Bus {busData.busId}</h3>
                <div style={{ marginBottom: 4 }}>
                  <strong>Destination:</strong> {busData.destination}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Status:</strong> {busData.status.replace('_', ' ')}
                </div>
                <div style={{ 
                  marginBottom: 8,
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: busData.seatAvailability === 'EMPTY' ? '#d4edda' : 
                                 busData.seatAvailability === 'FEW_SEATS' ? '#fff3cd' : '#f8d7da',
                  color: busData.seatAvailability === 'EMPTY' ? '#155724' : 
                         busData.seatAvailability === 'FEW_SEATS' ? '#856404' : '#721c24',
                  fontSize: 14
                }}>
                  Seats: {busData.seatAvailability === 'EMPTY' ? 'Empty' : 
                         busData.seatAvailability === 'FEW_SEATS' ? 'Few Seats' : 'Full'} 
                  ({busData.passengerCount}/{busData.maxCapacity})
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Last updated: {new Date(busData.lastUpdated).toLocaleString()}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}



