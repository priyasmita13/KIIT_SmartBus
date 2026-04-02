import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bus, AlertTriangle, MessageSquare, RefreshCw, MapPin, Users, Clock, CheckCircle, XCircle } from 'lucide-react';

import { API_BASE as API } from '../lib/apiBase';


interface BusData {
  _id: string;
  busId: string;
  driverId?: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  destination: string;
  seatAvailability: 'EMPTY' | 'FEW_SEATS' | 'FULL';
  passengerCount: number;
  maxCapacity: number;
  status: 'IN_SERVICE' | 'OUT_OF_SERVICE' | 'ON_BREAK' | 'EMERGENCY';
  lastUpdated: string;
  route: string;
  isActive: boolean;
}

interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

// Dummy buses data
const dummyBuses: BusData[] = [
  {
    _id: 'dummy-1',
    busId: 'KB001',
    currentLocation: { latitude: 20.355, longitude: 85.819 },
    destination: 'Campus 6',
    seatAvailability: 'EMPTY',
    passengerCount: 15,
    maxCapacity: 45,
    status: 'IN_SERVICE',
    lastUpdated: new Date(Date.now() - 30000).toISOString(),
    route: 'Campus 1 → Campus 6',
    isActive: true
  },
  {
    _id: 'dummy-2',
    busId: 'KB002',
    currentLocation: { latitude: 20.360, longitude: 85.825 },
    destination: 'Campus 15',
    seatAvailability: 'FEW_SEATS',
    passengerCount: 37,
    maxCapacity: 45,
    status: 'IN_SERVICE',
    lastUpdated: new Date(Date.now() - 15000).toISOString(),
    route: 'Campus 6 → Campus 15',
    isActive: true
  },
  {
    _id: 'dummy-3',
    busId: 'KB003',
    currentLocation: { latitude: 20.350, longitude: 85.815 },
    destination: 'Campus 25',
    seatAvailability: 'EMPTY',
    passengerCount: 22,
    maxCapacity: 45,
    status: 'IN_SERVICE',
    lastUpdated: new Date(Date.now() - 45000).toISOString(),
    route: 'Campus 15 → Campus 25',
    isActive: true
  },
  {
    _id: 'dummy-4',
    busId: 'KB004',
    currentLocation: { latitude: 20.365, longitude: 85.830 },
    destination: 'Campus 1',
    seatAvailability: 'FULL',
    passengerCount: 45,
    maxCapacity: 45,
    status: 'IN_SERVICE',
    lastUpdated: new Date(Date.now() - 20000).toISOString(),
    route: 'Campus 25 → Campus 1',
    isActive: true
  },
  {
    _id: 'dummy-5',
    busId: 'KB005',
    currentLocation: { latitude: 20.340, longitude: 85.810 },
    destination: 'Campus 15',
    seatAvailability: 'FULL',
    passengerCount: 45,
    maxCapacity: 45,
    status: 'IN_SERVICE',
    lastUpdated: new Date(Date.now() - 10000).toISOString(),
    route: 'Campus 1 → Campus 15',
    isActive: true
  },
  {
    _id: 'dummy-6',
    busId: 'KB006',
    currentLocation: { latitude: 20.370, longitude: 85.835 },
    destination: 'Campus 6',
    seatAvailability: 'EMPTY',
    passengerCount: 31,
    maxCapacity: 45,
    status: 'IN_SERVICE',
    lastUpdated: new Date(Date.now() - 25000).toISOString(),
    route: 'Campus 15 → Campus 6',
    isActive: true
  }
];

// Placeholder complaints
const placeholderComplaints: Complaint[] = [
  {
    id: 'comp-1',
    userId: 'user-123',
    userName: 'Rahul Sharma',
    userEmail: '2206249@kiit.ac.in',
    category: 'Technical Issue',
    subject: 'Bus tracking not updating',
    message: 'The bus KB001 location is not updating in real-time. Last update was 10 minutes ago. Please fix this issue.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    priority: 'MEDIUM'
  },
  {
    id: 'comp-2',
    userId: 'user-456',
    userName: 'Priya Patel',
    userEmail: '2406090@kiit.ac.in',
    category: 'Complaint',
    subject: 'Bus driver behavior',
    message: 'The driver of bus KB002 was driving very recklessly today. Almost caused an accident near the library junction. This needs immediate attention.',
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    priority: 'HIGH'
  },
  {
    id: 'comp-3',
    userId: 'user-789',
    userName: 'Arjun Kumar',
    userEmail: '2206284@kiit.ac.in',
    category: 'Route Suggestion',
    subject: 'Need bus route to new building',
    message: 'Can we add a bus route to the new Engineering Block? Many students have to walk 15 minutes from the nearest bus stop.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    priority: 'LOW'
  },
  {
    id: 'comp-4',
    userId: 'user-321',
    userName: 'Sneha Das',
    userEmail: '2305123@kiit.ac.in',
    category: 'Complaint',
    subject: 'Overcrowded bus',
    message: 'Bus KB004 is always overcrowded during morning hours. Students are standing in the aisle which is unsafe. Please add more buses on this route.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    priority: 'MEDIUM'
  },
  {
    id: 'comp-5',
    userId: 'user-654',
    userName: 'Vikram Singh',
    userEmail: '2407890@kiit.ac.in',
    category: 'Technical Issue',
    subject: 'App crashing on login',
    message: 'The app keeps crashing when I try to login. I\'ve tried reinstalling but the issue persists. Using Android version 12.',
    status: 'RESOLVED',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    priority: 'HIGH'
  },
  {
    id: 'comp-6',
    userId: 'user-987',
    userName: 'Ananya Roy',
    userEmail: '2304567@kiit.ac.in',
    category: 'Feedback',
    subject: 'Great service improvement',
    message: 'The new real-time tracking feature is amazing! It has made my commute so much easier. Thank you for this update.',
    status: 'RESOLVED',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    priority: 'LOW'
  }
];

export default function AdminPage() {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBuses();
    // Refresh buses every 30 seconds
    const interval = setInterval(fetchBuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBuses = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await axios.get(`${API}/api/buses`);
      setBuses(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load buses');
      console.error('Error fetching buses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_SERVICE':
        return 'bg-green-100 text-green-800';
      case 'OUT_OF_SERVICE':
        return 'bg-gray-100 text-gray-800';
      case 'ON_BREAK':
        return 'bg-yellow-100 text-yellow-800';
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeatAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'EMPTY':
        return 'bg-green-100 text-green-800';
      case 'FEW_SEATS':
        return 'bg-yellow-100 text-yellow-800';
      case 'FULL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Merge real buses with dummy placeholders (real data takes priority)
  const allBuses = [
    ...buses,
    ...dummyBuses.filter(
      (dummy) => !buses.some((bus) => bus.busId === dummy.busId)
    ),
  ];
  const activeBuses = allBuses.filter(bus => bus.isActive && bus.status === 'IN_SERVICE');
  const sosAlerts = allBuses.filter(bus => bus.status === 'EMERGENCY');
  
  // Use placeholder complaints
  const complaints = placeholderComplaints;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Three Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Buses Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Bus className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Active Buses</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {activeBuses.length}
                  </span>
                </div>
                <button
                  onClick={fetchBuses}
                  disabled={refreshing}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loading && buses.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                  <p className="mt-2 text-gray-600">Loading buses...</p>
                </div>
              ) : error && buses.length === 0 ? (
                <div className="text-center py-8">
                  <XCircle className="h-8 w-8 text-red-500 mx-auto" />
                  <p className="mt-2 text-red-600">{error}</p>
                  <p className="mt-2 text-sm text-gray-500">Showing dummy data</p>
                </div>
              ) : activeBuses.length === 0 ? (
                <div className="text-center py-8">
                  <Bus className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="mt-2 text-gray-600">No active buses at the moment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBuses.map((bus) => (
                    <div
                      key={bus._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{bus.busId}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(bus.status)}`}>
                              {bus.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSeatAvailabilityColor(bus.seatAvailability)}`}>
                              {bus.seatAvailability.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span>{bus.destination}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Users className="h-4 w-4" />
                              <span>{bus.passengerCount}/{bus.maxCapacity} passengers</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Bus className="h-4 w-4" />
                              <span>{bus.route}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>Updated {formatTimeAgo(bus.lastUpdated)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SOS Alerts Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">SOS Alerts</h2>
              {sosAlerts.length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {sosAlerts.length}
                </span>
              )}
            </div>

            {sosAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="mt-2 text-gray-600">No SOS alerts</p>
                <p className="text-sm text-gray-500 mt-1">All systems operational</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sosAlerts.map((bus) => (
                  <div
                    key={bus._id}
                    className="border-2 border-red-300 bg-red-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-red-900">{bus.busId}</h3>
                        <p className="text-sm text-red-700 mt-1">{bus.destination}</p>
                        <p className="text-xs text-red-600 mt-1">
                          Alert: {formatTimeAgo(bus.lastUpdated)}
                        </p>
                      </div>
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Complaints Section */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Complaints</h2>
              <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {complaints.length}
              </span>
            </div>
            <div className="flex space-x-2">
              <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {complaints.filter(c => c.status === 'PENDING').length} Pending
              </span>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {complaints.filter(c => c.status === 'IN_PROGRESS').length} In Progress
              </span>
            </div>
          </div>

          {complaints.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-gray-600">No complaints at the moment</p>
              <p className="text-sm text-gray-500 mt-1">Complaint system will be available soon</p>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint) => {
                const getPriorityColor = (priority: string) => {
                  switch (priority) {
                    case 'URGENT':
                      return 'bg-red-100 text-red-800 border-red-300';
                    case 'HIGH':
                      return 'bg-orange-100 text-orange-800 border-orange-300';
                    case 'MEDIUM':
                      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                    case 'LOW':
                      return 'bg-green-100 text-green-800 border-green-300';
                    default:
                      return 'bg-gray-100 text-gray-800 border-gray-300';
                  }
                };

                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'PENDING':
                      return 'bg-yellow-100 text-yellow-800';
                    case 'IN_PROGRESS':
                      return 'bg-blue-100 text-blue-800';
                    case 'RESOLVED':
                      return 'bg-green-100 text-green-800';
                    default:
                      return 'bg-gray-100 text-gray-800';
                  }
                };

                return (
                  <div
                    key={complaint.id}
                    className={`border-l-4 rounded-lg p-4 hover:shadow-md transition-shadow ${getPriorityColor(complaint.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{complaint.subject}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(complaint.status)}`}>
                            {complaint.status.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(complaint.priority)}`}>
                            {complaint.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">{complaint.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span className="font-medium">{complaint.userName}</span>
                        <span>{complaint.userEmail}</span>
                        <span className="text-gray-500">•</span>
                        <span>{complaint.category}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(complaint.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

