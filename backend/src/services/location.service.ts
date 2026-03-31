import User from '../models/user.model';
import type { UserDocument } from '../models/user.model';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  userId: string;
}

export class LocationService {
  // Update user location (destination optional — driver sets it when going online)
  static async updateLocation(userId: string, latitude: number, longitude: number, destination?: string): Promise<UserDocument | null> {
    try {
      const update: any = {
        location: { latitude, longitude, lastUpdated: new Date() },
        isOnline: true,
      };
      if (destination !== undefined) update.currentDestination = destination;

      const user = await User.findByIdAndUpdate(userId, update, { new: true });
      return user;
    } catch (error) {
      console.error('Error updating location:', error);
      return null;
    }
  }

  // Get all online drivers (buses)
  static async getOnlineDrivers(): Promise<UserDocument[]> {
    try {
      const drivers = await User.find({
        role: 'DRIVER',
        isOnline: true,
        location: { $exists: true }
      }).select('name driverBusId location lastUpdated');
      
      return drivers;
    } catch (error) {
      console.error('Error fetching online drivers:', error);
      return [];
    }
  }

  // Get nearby drivers within radius (in kilometers)
  static async getNearbyDrivers(userLat: number, userLng: number, radiusKm: number = 5): Promise<UserDocument[]> {
    try {
      const drivers = await User.find({
        role: 'DRIVER',
        isOnline: true,
        location: { $exists: true }
      }).select('name driverBusId location lastUpdated');

      // Filter by distance (simple distance calculation)
      const nearbyDrivers = drivers.filter(driver => {
        if (!driver.location) return false;
        
        const distance = this.calculateDistance(
          userLat, userLng,
          driver.location.latitude, driver.location.longitude
        );
        
        return distance <= radiusKm;
      });

      return nearbyDrivers;
    } catch (error) {
      console.error('Error fetching nearby drivers:', error);
      return [];
    }
  }

  // Calculate distance between two points (Haversine formula)
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Set user offline
  static async setUserOffline(userId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, { isOnline: false });
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }
}
