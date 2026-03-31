import express from 'express';
import { LocationService } from '../services/location.service';
import User from '../models/user.model';

export class LocationController {
  // Update user's location
  static async updateLocation(req: express.Request, res: express.Response) {
    try {
      const { latitude, longitude, destination } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const updatedUser = await LocationService.updateLocation(userId, latitude, longitude, destination);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        message: 'Location updated successfully',
        location: updatedUser.location
      });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get nearby drivers (for students) — PUBLIC, no auth needed
  static async getNearbyDrivers(req: express.Request, res: express.Response) {
    try {
      const { latitude, longitude, radius = 5 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const nearbyDrivers = await LocationService.getNearbyDrivers(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        parseFloat(radius as string)
      );

      res.json({
        success: true,
        drivers: nearbyDrivers.map(driver => ({
          id: driver._id,
          name: driver.name,
          busId: driver.driverBusId,
          destination: driver.currentDestination || 'Unknown',
          location: driver.location,
          lastUpdated: driver.location?.lastUpdated
        }))
      });
    } catch (error) {
      console.error('Error fetching nearby drivers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all online drivers (for admin/driver dashboard)
  static async getAllDrivers(req: express.Request, res: express.Response) {
    try {
      const userId = (req as any).user?.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Only admin and drivers can see all drivers
      if (user.role !== 'ADMIN' && user.role !== 'DRIVER') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const drivers = await LocationService.getOnlineDrivers();

      res.json({
        success: true,
        drivers: drivers.map(driver => ({
          id: driver._id,
          name: driver.name,
          busId: driver.driverBusId,
          location: driver.location,
          lastUpdated: driver.location?.lastUpdated
        }))
      });
    } catch (error) {
      console.error('Error fetching all drivers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Set user offline
  static async setOffline(req: express.Request, res: express.Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await LocationService.setUserOffline(userId);

      res.json({
        success: true,
        message: 'User set offline successfully'
      });
    } catch (error) {
      console.error('Error setting user offline:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
