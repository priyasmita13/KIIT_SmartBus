import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import config from '../config.js';
import User from '../models/user.model.js';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    role: string;
    name: string;
    driverBusId?: string;
  };
}

/**
 * Socket.IO middleware that validates the JWT passed in handshake.auth.token.
 * - Drivers MUST pass a valid token (role = DRIVER).
 * - Students can connect without a token (anonymous viewers).
 *
 * We fetch the user from DB (not just JWT) so we have name + driverBusId.
 */
export async function socketAuth(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    // Unauthenticated student viewer — allowed
    socket.data = { userId: '', role: 'STUDENT', name: 'Anonymous' };
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwtAccessSecret) as { sub: string; role: string };

    // Fetch user from DB to get name + driverBusId (not in JWT payload)
    const user = await User.findById(payload.sub).select('name role driverBusId').lean();

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.data = {
      userId: payload.sub,
      role: payload.role,
      name: user.name,
      ...(user.driverBusId != null && { driverBusId: user.driverBusId }),
    };
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}
