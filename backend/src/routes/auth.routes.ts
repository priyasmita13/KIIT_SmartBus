import { Router } from 'express';
import {
  postLogin,
  postLogout,
  postSignup,
  postRefresh,
  postVerifyEmail,
  postResendSignupOtp,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/signup', postSignup);
router.post('/verify-email', postVerifyEmail);
router.post('/resend-otp', postResendSignupOtp);
router.post('/login', postLogin);
router.post('/logout', postLogout);
router.post('/refresh', postRefresh);

export default router;
