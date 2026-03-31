import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Bus, Clock, MapPin, Filter, RefreshCw } from 'lucide-react';

const SeatAvailability = () => {
  const [filterRoute, setFilterRoute] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const busData = [
    {
      id: 'KB001',
      route: 'Campus 1 → Campus 6',
      availableSeats: 15,
      totalSeats: 45,
      status: 'Available',
      nextStop: 'Library Junction',
      eta: '3 min',
      lastUpdated: '30s ago',
      image: 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=300',
      link: '/bus/KB001'
    },
    {
      id: 'KB002',
      route: 'Campus 6 → Campus 15',
      availableSeats: 8,
      totalSeats: 45,
      status: 'Few Seats',
      nextStop: 'Medical Center',
      eta: '1 min',
      lastUpdated: '15s ago',
      image: 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=300',
      link: '/bus/KB002'
    },
    {
      id: 'KB003',
      route: 'Campus 15 → Campus 25',
      availableSeats: 22,
      totalSeats: 45,
      status: 'Available',
      nextStop: 'Sports Complex',
      eta: '7 min',
      lastUpdated: '45s ago',
      image: 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=300',
      link: '/bus/KB003'
    },
    {
      id: 'KB004',
      route: 'Campus 25 → Campus 1',
      availableSeats: 5,
      totalSeats: 45,
      status: 'Nearly Full',
      nextStop: 'Main Gate',
      eta: '12 min',
      lastUpdated: '20s ago',
      image: 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=300',
      link: '/bus/KB004'
    },
    {
      id: 'KB005',
      route: 'Campus 1 → Campus 15',
      availableSeats: 0,
      totalSeats: 45,
      status: 'Full',
      nextStop: 'Academic Block A',
      eta: '2 min',
      lastUpdated: '10s ago',
      image: 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=300',
      link: '/bus/KB005'
    },
    {
      id: 'KB006',
      route: 'Campus 15 → Campus 6',
      availableSeats: 31,
      totalSeats: 45,
      status: 'Available',
      nextStop: 'Hostels Area',
      eta: '5 min',
      lastUpdated: '25s ago',
      image: 'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=300',
      link: '/bus/KB006'
    },
  ];

  const routes = ['all', 'Campus 1', 'Campus 6', 'Campus 15', 'Campus 25'];

  const filteredBuses = filterRoute === 'all' 
    ? busData 
    : busData.filter(bus => bus.route.includes(filterRoute));

  const getStatusStyles = (status: string, availableSeats: number, totalSeats: number) => {
    const percentage = (availableSeats / totalSeats) * 100;
    
    if (status === 'Full' || percentage === 0) {
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-500' };
    } else if (status === 'Nearly Full' || percentage <= 20) {
      return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-500' };
    } else if (status === 'Few Seats' || percentage <= 50) {
      return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-500' };
    } else {
      return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-500' };
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getSeatIcon = (availableSeats: number, totalSeats: number) => {
    const filled = totalSeats - availableSeats;
    const seatsArray = Array.from({ length: totalSeats }, (_, i) => i < filled);
    
    return (
      <div className="grid grid-cols-9 gap-1 mt-2">
        {seatsArray.map((isFilled, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-sm ${
              isFilled ? 'bg-red-400' : 'bg-green-400'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-primary to-green-secondary bg-clip-text text-transparent flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-primary to-green-secondary p-2 rounded-xl">
                <Users className="h-8 w-8 text-white" />
              </div>
              <span>Seat Monitor</span>
            </h1>
            <p className="text-gray-600 mt-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live seat tracking • Updated every 30 seconds</span>
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-green-primary to-green-secondary text-white px-6 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-700">Filter by route:</span>
          <div className="flex flex-wrap gap-2">
            {routes.map((route) => (
              <button
                key={route}
                onClick={() => setFilterRoute(route)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterRoute === route
                    ? 'bg-green-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {route === 'all' ? 'All Routes' : route}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Bus className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredBuses.length}</p>
              <p className="text-gray-600">Active Buses</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredBuses.reduce((sum, bus) => sum + bus.availableSeats, 0)}
              </p>
              <p className="text-gray-600">Available Seats</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(filteredBuses.reduce((sum, bus) => sum + parseInt(bus.eta), 0) / filteredBuses.length)}min
              </p>
              <p className="text-gray-600">Avg ETA</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <MapPin className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredBuses.filter(bus => bus.status === 'Available').length}
              </p>
              <p className="text-gray-600">Comfortable Rides</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bus Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredBuses.map((bus) => {
          const styles = getStatusStyles(bus.status, bus.availableSeats, bus.totalSeats);
          const occupancyPercentage = ((bus.totalSeats - bus.availableSeats) / bus.totalSeats) * 100;
          
          return (
            <Link
              key={bus.id}
              to={bus.link}
              className={`block ${styles.bg} ${styles.border} border-2 rounded-2xl p-6 transition-all hover:shadow-2xl transform hover:scale-105 backdrop-blur-lg`}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <img 
                    src={bus.image} 
                    alt={`Bus ${bus.id}`}
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                  />
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${styles.badge} border-2 border-white flex items-center justify-center`}>
                    <Bus className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-green-primary to-green-secondary bg-clip-text text-transparent">{bus.id}</h3>
                      <p className="text-gray-600 font-medium">{bus.route}</p>
                    </div>
                    <span className={`${styles.badge} text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg`}>
                      {bus.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Available Seats</p>
                  <p className={`text-2xl font-bold ${styles.text}`}>
                    {bus.availableSeats}/{bus.totalSeats}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Occupancy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {occupancyPercentage.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Seat Occupancy</span>
                  <span>{bus.totalSeats - bus.availableSeats} occupied</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                  <div
                    className={`h-3 rounded-full transition-all shadow-sm ${styles.badge}`}
                    style={{ width: `${occupancyPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Seat Visualization */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Seat Layout</p>
                {getSeatIcon(bus.availableSeats, bus.totalSeats)}
                <div className="flex items-center space-x-4 mt-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                    <span className="text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
                    <span className="text-gray-600">Occupied</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>Next: {bus.nextStop}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>ETA: {bus.eta}</span>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Last updated: {bus.lastUpdated}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-green-primary to-green-secondary bg-clip-text text-transparent mb-4">Availability Legend</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse shadow-lg"></div>
            <div>
              <p className="font-medium text-gray-900">Available</p>
              <p className="text-sm text-gray-600">50%+ seats free</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse shadow-lg"></div>
            <div>
              <p className="font-medium text-gray-900">Few Seats</p>
              <p className="text-sm text-gray-600">20-50% seats free</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full bg-orange-500 animate-pulse shadow-lg"></div>
            <div>
              <p className="font-medium text-gray-900">Nearly Full</p>
              <p className="text-sm text-gray-600">0-20% seats free</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-lg"></div>
            <div>
              <p className="font-medium text-gray-900">Full</p>
              <p className="text-sm text-gray-600">No seats available</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default SeatAvailability;


