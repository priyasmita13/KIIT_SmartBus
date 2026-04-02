import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { Bus, Mail, Lock, ArrowLeft, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

import { API_BASE as API } from '../lib/apiBase'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, setUserFromData } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Forgot password states
  const [forgotPassword, setForgotPassword] = useState(false)
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)

  // Email verification (for unverified accounts trying to log in)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [verifyUserId, setVerifyUserId] = useState<string | null>(null)
  const [verifyOtp, setVerifyOtp] = useState(['', '', '', '', '', ''])
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!email.endsWith('@kiit.ac.in')) {
      setError('Please use your official KIIT email ID')
      setLoading(false)
      return
    }

    try {
      const data = await login(email, password)
      const role = data.user.role.toLowerCase()
      navigate(`/${role}`)
    } catch (err: any) {
      if (err?.response?.data?.needsVerification) {
        const uid = err.response.data.userId
        setVerifyUserId(uid)
        setNeedsVerification(true)
        // Auto-send a fresh OTP immediately — the original signup OTP may have expired
        try {
          await axios.post(`${API}/api/auth/resend-otp`, { userId: uid })
        } catch {
          // ignore — user can still click Resend manually
        }
        startResendTimer()
      } else {
        setError(err?.response?.data?.error?.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  function startResendTimer() {
    setResendTimer(60)
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  function handleVerifyOtpChange(index: number, value: string) {
    if (value.length > 1 || !/^\d*$/.test(value)) return
    const updated = [...verifyOtp]
    updated[index] = value
    setVerifyOtp(updated)
    if (value && index < 5) {
      document.getElementById(`verify-otp-${index + 1}`)?.focus()
    }
  }

  function handleVerifyOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !verifyOtp[index] && index > 0) {
      document.getElementById(`verify-otp-${index - 1}`)?.focus()
    }
  }

  function handleVerifyOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').slice(0, 6)
    if (!/^\d+$/.test(pasted)) return
    setVerifyOtp([...pasted.split(''), ...Array(6 - pasted.length).fill('')])
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault()
    const otpValue = verifyOtp.join('')
    if (otpValue.length !== 6) { setVerifyError('Please enter the complete 6-digit OTP'); return }

    setVerifyLoading(true)
    setVerifyError(null)
    try {
      const res = await axios.post(`${API}/api/auth/verify-email`, { userId: verifyUserId, otp: otpValue }, { withCredentials: true })
      setVerifySuccess('Email verified! Redirecting...')
      setUserFromData(res.data.user, res.data.accessToken)
      setTimeout(() => navigate(`/${res.data.user.role.toLowerCase()}`), 1500)
    } catch (err: any) {
      setVerifyError(err?.response?.data?.error?.message || 'Verification failed')
    } finally {
      setVerifyLoading(false)
    }
  }

  async function handleResendVerifyOtp() {
    setResendLoading(true)
    setVerifyError(null)
    try {
      await axios.post(`${API}/api/auth/resend-otp`, { userId: verifyUserId })
      setVerifySuccess('OTP resent successfully!')
      setVerifyOtp(['', '', '', '', '', ''])
      startResendTimer()
      setTimeout(() => setVerifySuccess(null), 3000)
    } catch (err: any) {
      setVerifyError(err?.response?.data?.error?.message || 'Failed to resend OTP')
    } finally {
      setResendLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setForgotPasswordMessage('Please enter your email address'); return }
    setForgotPasswordLoading(true)
    setForgotPasswordMessage(null)
    try {
      const res = await axios.post(`${API}/api/forgot-password/forgot-password`, { email })
      setForgotPasswordMessage(res.data.message)
      setOtpSent(true)
    } catch (err: any) {
      setForgotPasswordMessage(err?.response?.data?.error?.message || 'Failed to send reset email. Please try again.')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otp || otp.length !== 6) { setForgotPasswordMessage('Please enter a valid 6-digit OTP'); return }
    setForgotPasswordLoading(true)
    setForgotPasswordMessage(null)
    try {
      const res = await axios.post(`${API}/api/forgot-password/verify-otp`, { email, otp })
      setForgotPasswordMessage(res.data.message)
      setOtpVerified(true)
    } catch (err: any) {
      setForgotPasswordMessage(err?.response?.data?.error?.message || 'Invalid OTP. Please try again.')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) { setForgotPasswordMessage('Password must be at least 8 characters long'); return }
    if (newPassword !== confirmPassword) { setForgotPasswordMessage('Passwords do not match'); return }
    setForgotPasswordLoading(true)
    setForgotPasswordMessage(null)
    try {
      const res = await axios.post(`${API}/api/forgot-password/reset-password`, { email, otp, newPassword })
      setForgotPasswordMessage(res.data.message)
      setTimeout(() => {
        setForgotPassword(false); setOtpSent(false); setOtpVerified(false)
        setOtp(''); setNewPassword(''); setConfirmPassword(''); setForgotPasswordMessage(null)
      }, 2000)
    } catch (err: any) {
      setForgotPasswordMessage(err?.response?.data?.error?.message || 'Failed to reset password. Please try again.')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  // --- Email Verification Screen (shown when unverified account tries to log in) ---
  if (needsVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Bus className="h-12 w-12 text-green-primary" />
              <h1 className="text-3xl font-bold text-green-primary ml-2">KIIT SmartBus</h1>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Verify Your Email</h2>
            <p className="text-gray-600 mt-2">A 6-digit OTP was sent to <span className="font-semibold text-green-primary">{email}</span></p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-green-200">
            {verifyError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm text-center">{verifyError}</p>
              </div>
            )}
            {verifySuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-green-600 text-sm text-center">{verifySuccess}</p>
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-6">
              <div className="flex gap-2 justify-center" onPaste={handleVerifyOtpPaste}>
                {verifyOtp.map((digit, i) => (
                  <input
                    key={i}
                    id={`verify-otp-${i}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleVerifyOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleVerifyOtpKeyDown(i, e)}
                    className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-green-primary focus:ring-2 focus:ring-green-200 outline-none transition"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={verifyLoading}
                className="w-full bg-gradient-to-r from-green-primary to-green-secondary text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {verifyLoading ? <><RefreshCw className="animate-spin h-5 w-5 mr-2" />Verifying...</> : 'Verify Email'}
              </button>
            </form>

            <div className="text-center mt-4">
              {resendTimer > 0 ? (
                <p className="text-gray-600 text-sm">Resend OTP in <span className="font-semibold text-green-primary">{resendTimer}s</span></p>
              ) : (
                <button
                  onClick={handleResendVerifyOtp}
                  disabled={resendLoading}
                  className="text-green-primary hover:text-green-700 text-sm font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
                  Resend OTP
                </button>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setNeedsVerification(false); setVerifyOtp(['', '', '', '', '', '']); setVerifyError(null) }}
                className="text-green-primary hover:text-green-700 text-sm font-medium flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Main Login / Forgot Password Screen ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Bus className="h-12 w-12 text-green-primary" />
            <h1 className="text-3xl font-bold text-green-primary ml-2">KIIT SmartBus</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {forgotPassword
              ? (otpVerified ? 'Set New Password' : otpSent ? 'Enter OTP' : 'Reset Password')
              : 'Welcome Back'
            }
          </h2>
          <p className="text-gray-600 mt-2">
            {forgotPassword
              ? (otpVerified ? 'Create a new secure password' : otpSent ? 'Check your email for the verification code' : 'Enter your email to reset your password')
              : 'Sign in to your account'
            }
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-green-200">
          {!forgotPassword ? (
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors"
                    placeholder="yourname@kiit.ac.in"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-primary to-green-secondary text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 focus:ring-2 focus:ring-green-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {loading ? <><RefreshCw className="animate-spin h-5 w-5 mr-2" />Signing in...</> : 'Sign In'}
              </button>
            </form>
          ) : (
            <>
              {!otpSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  {forgotPasswordMessage && (
                    <div className={`border rounded-lg p-3 ${forgotPasswordMessage.includes('sent') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <p className={`text-sm text-center ${forgotPasswordMessage.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>{forgotPasswordMessage}</p>
                    </div>
                  )}
                  <button type="submit" disabled={forgotPasswordLoading} className="w-full bg-gradient-to-r from-green-primary to-green-secondary text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center">
                    {forgotPasswordLoading ? <><RefreshCw className="animate-spin h-5 w-5 mr-2" />Sending...</> : 'Send Reset Email'}
                  </button>
                </form>
              ) : !otpVerified ? (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Enter 6-digit OTP sent to {email}</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors text-center text-2xl font-mono tracking-widest"
                    />
                  </div>
                  {forgotPasswordMessage && (
                    <div className={`border rounded-lg p-3 ${forgotPasswordMessage.includes('verified') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <p className={`text-sm text-center ${forgotPasswordMessage.includes('verified') ? 'text-green-600' : 'text-red-600'}`}>{forgotPasswordMessage}</p>
                    </div>
                  )}
                  <button type="submit" disabled={forgotPasswordLoading} className="w-full bg-gradient-to-r from-green-primary to-green-secondary text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center">
                    {forgotPasswordLoading ? <><RefreshCw className="animate-spin h-5 w-5 mr-2" />Verifying...</> : 'Verify OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors" placeholder="Enter new password" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors" placeholder="Confirm new password" />
                    </div>
                  </div>
                  {forgotPasswordMessage && (
                    <div className={`border rounded-lg p-3 ${forgotPasswordMessage.includes('successfully') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <p className={`text-sm text-center ${forgotPasswordMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{forgotPasswordMessage}</p>
                    </div>
                  )}
                  <button type="submit" disabled={forgotPasswordLoading} className="w-full bg-gradient-to-r from-green-primary to-green-secondary text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center">
                    {forgotPasswordLoading ? <><RefreshCw className="animate-spin h-5 w-5 mr-2" />Resetting...</> : 'Reset Password'}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-6 text-center space-y-3">
            {!forgotPassword ? (
              <>
                <button type="button" onClick={() => setForgotPassword(true)} className="text-green-primary hover:text-green-700 text-sm font-medium transition-colors">
                  Forgot your password?
                </button>
                <p className="text-gray-600 text-sm">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-green-primary hover:text-green-700 font-medium transition-colors">Sign up here</Link>
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => { setForgotPassword(false); setOtpSent(false); setOtpVerified(false); setOtp(''); setNewPassword(''); setConfirmPassword(''); setForgotPasswordMessage(null) }}
                className="text-green-primary hover:text-green-700 text-sm font-medium transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
