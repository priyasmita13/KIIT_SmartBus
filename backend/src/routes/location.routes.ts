import { Router } from 'express';
import { LocationController } from '../controllers/location.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// PUBLIC — anyone can see nearby buses (no login needed to view the map)
router.get('/nearby-drivers', LocationController.getNearbyDrivers);

// Everything below requires authentication
router.use(requireAuth());

// Update driver's location (DRIVER only)
router.post('/update', LocationController.updateLocation);

// Get all online drivers (for admin/driver dashboard)
router.get('/all-drivers', LocationController.getAllDrivers);

// Set user offline
router.post('/offline', LocationController.setOffline);

export default router;
