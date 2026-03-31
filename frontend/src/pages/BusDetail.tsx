import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Clock, Users, RefreshCw } from 'lucide-react';

// Bus data (same source of truth as SeatAvailability)
const ALL_BUSES = [
  { id: 'KB001', route: 'Campus 1 → Campus 6', availableSeats: 15, totalSeats: 45, status: 'Available', nextStop: 'Library Junction', eta: '3 min', lastUpdated: '30s ago' },
  { id: 'KB002', route: 'Campus 6 → Campus 15', availableSeats: 8, totalSeats: 45, status: 'Few Seats', nextStop: 'Medical Center', eta: '1 min', lastUpdated: '15s ago' },
  { id: 'KB003', route: 'Campus 15 → Campus 25', availableSeats: 22, totalSeats: 45, status: 'Available', nextStop: 'Sports Complex', eta: '7 min', lastUpdated: '45s ago' },
  { id: 'KB004', route: 'Campus 25 → Campus 1', availableSeats: 5, totalSeats: 45, status: 'Nearly Full', nextStop: 'Main Gate', eta: '12 min', lastUpdated: '20s ago' },
  { id: 'KB005', route: 'Campus 1 → Campus 15', availableSeats: 0, totalSeats: 45, status: 'Full', nextStop: 'Academic Block A', eta: '2 min', lastUpdated: '10s ago' },
  { id: 'KB006', route: 'Campus 15 → Campus 6', availableSeats: 31, totalSeats: 45, status: 'Available', nextStop: 'Hostels Area', eta: '5 min', lastUpdated: '25s ago' },
];

// Deterministic seat pattern based on bus id (shuffle-based, guaranteed no infinite loop)
function generateSeatPattern(busId: string, available: number, total: number): boolean[] {
  // Seed from bus id for consistency
  let seed = 0;
  for (let i = 0; i < busId.length; i++) seed += busId.charCodeAt(i) * (i + 1);

  // Simple seeded pseudo-random number generator
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Create array of seat indices and shuffle deterministically
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // All seats start available, mark first (total - available) shuffled indices as occupied
  const seats: boolean[] = new Array(total).fill(true);
  const occupied = total - available;
  for (let i = 0; i < occupied; i++) {
    seats[indices[i]] = false;
  }
  return seats;
}

type SeatStatus = 'available' | 'occupied' | 'aisle' | 'driver';

interface SeatCell {
  type: SeatStatus;
  label?: string;
  row: number;
  col: number;
}

// Build a realistic bus layout: driver + 11 rows × 4 seats (2-aisle-2) + back row of 5
function buildBusLayout(seatPattern: boolean[]): SeatCell[][] {
  const layout: SeatCell[][] = [];
  let seatIndex = 0;

  // Driver row
  layout.push([
    { type: 'driver', label: 'Driver', row: 0, col: 0 },
    { type: 'aisle', row: 0, col: 1 },
    { type: 'aisle', row: 0, col: 2 },
    { type: 'aisle', row: 0, col: 3 },
    { type: 'aisle', row: 0, col: 4 },
  ]);

  // 10 regular rows: 2 seats - aisle - 2 seats
  for (let r = 0; r < 10; r++) {
    const row: SeatCell[] = [];
    for (let c = 0; c < 5; c++) {
      if (c === 2) {
        row.push({ type: 'aisle', row: r + 1, col: c });
      } else {
        const isAvailable = seatIndex < seatPattern.length ? seatPattern[seatIndex] : true;
        row.push({
          type: isAvailable ? 'available' : 'occupied',
          label: `${seatIndex + 1}`,
          row: r + 1,
          col: c,
        });
        seatIndex++;
      }
    }
    layout.push(row);
  }

  // Back row: 5 seats across
  const backRow: SeatCell[] = [];
  for (let c = 0; c < 5; c++) {
    const isAvailable = seatIndex < seatPattern.length ? seatPattern[seatIndex] : true;
    backRow.push({
      type: isAvailable ? 'available' : 'occupied',
      label: `${seatIndex + 1}`,
      row: 11,
      col: c,
    });
    seatIndex++;
  }
  layout.push(backRow);

  return layout;
}

export default function BusDetail() {
  const { busId } = useParams<{ busId: string }>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bus = ALL_BUSES.find((b) => b.id === busId);

  const seatPattern = useMemo(() => {
    if (!bus) return [];
    return generateSeatPattern(bus.id, bus.availableSeats, bus.totalSeats);
  }, [bus]);

  const layout = useMemo(() => buildBusLayout(seatPattern), [seatPattern]);

  if (!bus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <Bus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bus Not Found</h1>
          <p className="text-gray-600 mb-6">The bus "{busId}" was not found in the system.</p>
          <Link
            to="/seat-availability"
            className="inline-flex items-center space-x-2 bg-green-primary text-white px-6 py-3 rounded-xl hover:bg-green-secondary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Seat Availability</span>
          </Link>
        </div>
      </div>
    );
  }

  const occupancyPercentage = ((bus.totalSeats - bus.availableSeats) / bus.totalSeats) * 100;

  const getStatusColor = () => {
    if (bus.status === 'Full') return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200' };
    if (bus.status === 'Nearly Full') return { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', border: 'border-orange-200' };
    if (bus.status === 'Few Seats') return { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50', border: 'border-yellow-200' };
    return { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50', border: 'border-green-200' };
  };

  const statusColor = getStatusColor();

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header with Back */}
        <div className="flex items-center space-x-4">
          <Link
            to="/seat-availability"
            className="bg-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all hover:bg-green-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <div className="flex-grow">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-primary to-green-secondary bg-clip-text text-transparent">
              Bus {bus.id}
            </h1>
            <p className="text-gray-600 text-sm">{bus.route}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-green-primary to-green-secondary text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-500">Available</span>
            </div>
            <p className={`text-2xl font-bold ${statusColor.text}`}>{bus.availableSeats}</p>
            <p className="text-xs text-gray-400">of {bus.totalSeats} seats</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Bus className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-gray-500">Occupancy</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{occupancyPercentage.toFixed(0)}%</p>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${statusColor.bg}`} style={{ width: `${occupancyPercentage}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center space-x-2 mb-1">
              <MapPin className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-gray-500">Next Stop</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{bus.nextStop}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-gray-500">ETA</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{bus.eta}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`${statusColor.light} ${statusColor.border} border rounded-xl p-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${statusColor.bg} ${bus.status !== 'Full' ? 'animate-pulse' : ''}`} />
            <span className={`font-semibold ${statusColor.text}`}>{bus.status}</span>
          </div>
          <span className="text-xs text-gray-500">Updated: {bus.lastUpdated}</span>
        </div>

        {/* Seat Map */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-primary to-green-secondary p-4 text-white">
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <Bus className="h-5 w-5" />
              <span>Seat Map</span>
            </h2>
            <p className="text-green-100 text-sm mt-1">Tap a seat for details • Green = Available, Red = Occupied</p>
          </div>

          <div className="p-6 flex justify-center">
            {/* Bus body */}
            <div className="relative">
              {/* Bus shell */}
              <div className="bg-gray-100 rounded-t-[40px] rounded-b-2xl border-2 border-gray-300 p-4 pt-6 pb-4" style={{ width: '280px' }}>
                {/* Front windshield */}
                <div className="bg-gradient-to-b from-blue-200 to-blue-100 rounded-t-[30px] h-8 mb-3 border border-blue-300 flex items-center justify-center">
                  <span className="text-xs text-blue-600 font-semibold">{bus.id}</span>
                </div>

                {/* Seat rows */}
                <div className="space-y-1.5">
                  {layout.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex justify-center items-center gap-1">
                      {row.map((cell, colIdx) => {
                        if (cell.type === 'driver') {
                          return (
                            <div
                              key={colIdx}
                              className="w-11 h-10 rounded-t-lg bg-gray-400 border border-gray-500 flex items-center justify-center"
                              title="Driver"
                            >
                              <span className="text-[9px] text-white font-bold">DRV</span>
                            </div>
                          );
                        }
                        if (cell.type === 'aisle') {
                          return <div key={colIdx} className="w-5 h-10" />;
                        }
                        const isAvailable = cell.type === 'available';
                        return (
                          <button
                            key={colIdx}
                            className={`w-11 h-10 rounded-t-lg border-2 flex flex-col items-center justify-center transition-all text-[10px] font-medium ${
                              isAvailable
                                ? 'bg-green-100 border-green-400 text-green-700 hover:bg-green-200 hover:border-green-500 hover:shadow-md cursor-pointer'
                                : 'bg-red-100 border-red-300 text-red-500 cursor-not-allowed opacity-80'
                            }`}
                            title={isAvailable ? `Seat ${cell.label} — Available` : `Seat ${cell.label} — Occupied`}
                            disabled={!isAvailable}
                          >
                            <span className="leading-none">{cell.label}</span>
                            {isAvailable ? (
                              <span className="text-[7px] text-green-500 leading-none">free</span>
                            ) : (
                              <span className="text-[7px] text-red-400 leading-none">taken</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Rear bumper */}
                <div className="mt-3 h-3 bg-gray-300 rounded-b-lg border border-gray-400" />
              </div>

              {/* Wheels */}
              <div className="absolute left-[-8px] top-[60px] w-4 h-10 bg-gray-800 rounded-l-full" />
              <div className="absolute right-[-8px] top-[60px] w-4 h-10 bg-gray-800 rounded-r-full" />
              <div className="absolute left-[-8px] bottom-[40px] w-4 h-10 bg-gray-800 rounded-l-full" />
              <div className="absolute right-[-8px] bottom-[40px] w-4 h-10 bg-gray-800 rounded-r-full" />
            </div>
          </div>

          {/* Legend */}
          <div className="px-6 pb-6">
            <div className="flex justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-t-sm bg-green-100 border-2 border-green-400" />
                <span className="text-gray-600">Available ({bus.availableSeats})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-t-sm bg-red-100 border-2 border-red-300 opacity-80" />
                <span className="text-gray-600">Occupied ({bus.totalSeats - bus.availableSeats})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-t-sm bg-gray-400 border border-gray-500" />
                <span className="text-gray-600">Driver</span>
              </div>
            </div>
          </div>
        </div>

        {/* Route Info */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Information</h3>
          <div className="flex items-center space-x-4">
            <div className="flex-grow">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium text-gray-900">{bus.route.split(' → ')[0]}</span>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-gray-300 h-8" />
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-medium text-gray-900">{bus.route.split(' → ')[1]}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Next stop</p>
              <p className="font-semibold text-gray-900">{bus.nextStop}</p>
              <p className="text-sm text-green-primary font-medium">ETA: {bus.eta}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
