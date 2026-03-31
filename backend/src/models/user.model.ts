import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'STUDENT' | 'DRIVER' | 'ADMIN';

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  driverBusId?: string;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
  currentDestination?: string;
  isOnline?: boolean;
  isEmailVerified?: boolean;
  emailVerificationOTP?: string;
  emailVerificationOTPExpires?: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['STUDENT', 'DRIVER', 'ADMIN'], default: 'STUDENT', index: true },
    driverBusId: { type: String },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      lastUpdated: { type: Date, default: Date.now }
    },
    currentDestination: { type: String, default: '' },
    isOnline: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean },
    emailVerificationOTP: { type: String, select: false },
    emailVerificationOTPExpires: { type: Date, select: false },
  },
  { timestamps: true }
);


export const User: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);

export default User;


