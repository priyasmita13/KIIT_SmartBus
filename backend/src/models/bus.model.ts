import mongoose, { Schema, Document, Model } from 'mongoose';

export type BusStatus = 'IN_SERVICE' | 'OUT_OF_SERVICE' | 'ON_BREAK' | 'EMERGENCY';
export type SeatAvailability = 'EMPTY' | 'FEW_SEATS' | 'FULL';

export interface BusDocument extends Document {
  busId: string;
  driverId?: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  destination: string;
  seatAvailability: SeatAvailability;
  passengerCount: number;
  maxCapacity: number;
  status: BusStatus;
  lastUpdated: Date;
  route: string;
  isActive: boolean;
}

const busSchema = new Schema<BusDocument>(
  {
    busId: { type: String, unique: true, required: true, index: true },
    driverId: { type: String, ref: 'User' },
    currentLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    destination: { type: String, required: true, default: 'Campus 25' },
    seatAvailability: { 
      type: String, 
      enum: ['EMPTY', 'FEW_SEATS', 'FULL'], 
      default: 'EMPTY' 
    },
    passengerCount: { type: Number, default: 0, min: 0 },
    maxCapacity: { type: Number, default: 30 },
    status: { 
      type: String, 
      enum: ['IN_SERVICE', 'OUT_OF_SERVICE', 'ON_BREAK', 'EMERGENCY'], 
      default: 'OUT_OF_SERVICE' 
    },
    lastUpdated: { type: Date, default: Date.now },
    route: { type: String, default: 'Main Route' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// driverId and isActive indexes (busId already indexed via unique:true above)
busSchema.index({ driverId: 1 });
busSchema.index({ isActive: 1 });

export const Bus: Model<BusDocument> = mongoose.models.Bus || mongoose.model<BusDocument>('Bus', busSchema);

export default Bus;
