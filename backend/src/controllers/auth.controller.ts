import type { Request, Response } from 'express';
import { login, signup, signTokens, verifyEmailSignup, resendSignupOtp } from '../services/auth.service.js';
import config from '../config.js';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

const baseCookieOptions = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: config.isProd ? 'strict' : 'lax',
} as const;

const cookieOptions = config.isProd && config.cookieDomain
  ? { ...baseCookieOptions, domain: config.cookieDomain }
  : baseCookieOptions;

export async function postSignup(req: Request, res: Response) {
  const result = await signup(req.body);
  // Returns userId only — user must verify email before getting tokens
  res.status(201).json(result);
}

export async function postVerifyEmail(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await verifyEmailSignup(req.body);
  res
    .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 3600 * 1000 })
    .json({ user, accessToken });
}

export async function postResendSignupOtp(req: Request, res: Response) {
  const result = await resendSignupOtp(req.body);
  res.json(result);
}

export async function postLogin(req: Request, res: Response) {
  try {
    const { user, accessToken, refreshToken } = await login(req.body);
    res
      .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 3600 * 1000 })
      .json({ user, accessToken });
  } catch (err: any) {
    if (err.needsVerification) {
      return res.status(403).json({
        error: { message: err.message, status: 403 },
        needsVerification: true,
        userId: err.userId,
      });
    }
    throw err;
  }
}

export async function postLogout(_req: Request, res: Response) {
  res.clearCookie('refreshToken', cookieOptions).status(204).send();
}

export async function postRefresh(req: Request, res: Response) {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) return res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
  try {
    const payload = jwt.verify(token, config.jwtRefreshSecret) as { sub: string; role: string };
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
    const { accessToken } = signTokens({ sub: user.id, role: user.role });
    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch {
    return res.status(401).json({ error: { message: 'Unauthorized', status: 401 } });
  }
}
