import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/user.model.js';
import { verifyPassword, hashPassword } from '../utils/crypto.js';
import config from '../config.js';
import { errors } from '../lib/errors.js';
import { sendEmailVerificationOtp } from './email.service.js';

const signupSchema = z.object({
  email: z.string().email().refine((email) => email.endsWith('@kiit.ac.in'), {
    message: 'Please use your official KIIT email ID'
  }),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['STUDENT', 'DRIVER', 'ADMIN']).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function signup(input: SignupInput) {
  const data = signupSchema.parse(input);
  const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${data.email}$`, 'i') } })
    .select('+emailVerificationOTP +emailVerificationOTPExpires');

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw errors.conflict('Email already in use');
    }
    // User exists but unverified — resend OTP
    const otp = generateOtp();
    existingUser.emailVerificationOTP = otp;
    existingUser.emailVerificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await existingUser.save();
    await sendEmailVerificationOtp(data.email, otp, existingUser.name);
    return { userId: existingUser.id as string };
  }

  const passwordHash = await hashPassword(data.password);
  const otp = generateOtp();
  const user = await User.create({
    email: data.email,
    passwordHash,
    name: data.name,
    role: data.role || 'STUDENT',
    isEmailVerified: false,
    emailVerificationOTP: otp,
    emailVerificationOTPExpires: new Date(Date.now() + 10 * 60 * 1000),
  });

  await sendEmailVerificationOtp(data.email, otp, data.name);
  return { userId: user.id as string };
}

export async function verifyEmailSignup(input: { userId: string; otp: string }) {
  const user = await User.findById(input.userId)
    .select('+emailVerificationOTP +emailVerificationOTPExpires');

  if (!user) throw errors.notFound('User not found');
  if (user.isEmailVerified) throw errors.badRequest('Email already verified');
  if (!user.emailVerificationOTPExpires || user.emailVerificationOTPExpires < new Date()) {
    throw errors.badRequest('OTP has expired. Please request a new one.');
  }
  if (user.emailVerificationOTP !== input.otp) {
    throw errors.badRequest('Invalid OTP. Please try again.');
  }

  user.isEmailVerified = true;
  // Use $unset via updateOne so exactOptionalPropertyTypes strict mode is satisfied
  await user.updateOne({ $unset: { emailVerificationOTP: 1, emailVerificationOTPExpires: 1 } });
  user.emailVerificationOTP = undefined as any; // reflect in-memory only
  user.emailVerificationOTPExpires = undefined as any;

  const tokens = signTokens({ sub: user.id, role: user.role });
  return { user: sanitize(user), ...tokens };
}

export async function resendSignupOtp(input: { userId: string }) {
  const user = await User.findById(input.userId);
  if (!user) throw errors.notFound('User not found');
  if (user.isEmailVerified) throw errors.badRequest('Email already verified');

  const otp = generateOtp();
  user.emailVerificationOTP = otp;
  user.emailVerificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendEmailVerificationOtp(user.email, otp, user.name);
  return { message: 'OTP resent successfully to your email' };
}

const loginSchema = z.object({
  email: z.string().email().refine((email) => email.endsWith('@kiit.ac.in'), {
    message: 'Please use your official KIIT email ID'
  }),
  password: z.string().min(8)
});
export type LoginInput = z.infer<typeof loginSchema>;

export function signTokens(payload: { sub: string; role: string }) {
  const accessToken = jwt.sign(payload, config.jwtAccessSecret, { expiresIn: config.jwtAccessTtl } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshTtl } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  const { email, password } = loginSchema.parse(input);
  const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
  if (!user) throw errors.unauthorized('Invalid credentials');

  // Strict false check — existing users without this field (undefined) can still log in
  if (user.isEmailVerified === false) {
    const err: any = new Error('Please verify your email before logging in');
    err.status = 403;
    err.needsVerification = true;
    err.userId = user.id;
    throw err;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw errors.unauthorized('Invalid credentials');
  const tokens = signTokens({ sub: user.id, role: user.role });
  return { user: sanitize(user), ...tokens };
}

export function sanitize(user: any) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
