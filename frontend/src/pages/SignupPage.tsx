import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { Bus, Mail, Lock, User, Shield, UserCheck, RefreshCw, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

import { API_BASE as API } from '../lib/apiBase'


type Role = 'STUDENT' | 'DRIVER' | 'ADMIN'

export default function SignupPage() {
  const navigate = useNavigate()
  const { setUserFromData } = useAuth()

  const [formData, setFormData] = useState({ email: '', password: '', name: '', role: 'STUDENT' as Role })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // OTP step
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [userId, setUserId] = useState<string | null>(null)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  function startResendTimer() {
    setResendTimer(60)
    const interval = setInterval(() => {
      setResendTimer((prev: number) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.email.endsWith('@kiit.ac.in')) {
      setError('Please use your official KIIT email ID')
      setLoading(false)
      return
    }

    try {
      const res = await axios.post(`${API}/api/auth/signup`, formData)
      setUserId(res.data.userId)
      setStep('otp')
      startResendTimer()
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1 || !/^\d*$/.test(value)) return
    const updated = [...otp]
    updated[index] = value
    setOtp(updated)
    if (value && index < 5) {
      document.getElementById(`signup-otp-${index + 1}`)?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`signup-otp-${index - 1}`)?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').slice(0, 6)
    if (!/^\d+$/.test(pasted)) return
    setOtp([...pasted.split(''), ...Array(6 - pasted.length).fill('')])
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault()
    const otpValue = otp.join('')
    if (otpValue.length !== 6) { setVerifyError('Please enter the complete 6-digit OTP'); return }

    setVerifyLoading(true)
    setVerifyError(null)
    try {
      const res = await axios.post(`${API}/api/auth/verify-email`, { userId, otp: otpValue }, { withCredentials: true })
      setVerifySuccess('Email verified! Redirecting...')
      setUserFromData(res.data.user, res.data.accessToken)
      setTimeout(() => navigate(`/${res.data.user.role.toLowerCase()}`), 1500)
    } catch (err: any) {
      setVerifyError(err?.response?.data?.error?.message || 'Verification failed')
    } finally {
      setVerifyLoading(false)
    }
  }

  async function handleResendOtp() {
    setResendLoading(true)
    setVerifyError(null)
    try {
      await axios.post(`${API}/api/auth/resend-otp`, { userId })
      setVerifySuccess('OTP resent successfully!')
      setOtp(['', '', '', '', '', ''])
      startResendTimer()
      setTimeout(() => setVerifySuccess(null), 3000)
    } catch (err: any) {
      setVerifyError(err?.response?.data?.error?.message || 'Failed to resend OTP')
    } finally {
      setResendLoading(false)
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'STUDENT': return 'Track buses, check seat availability, and manage your campus transportation'
      case 'DRIVER': return 'Manage your bus route, update location, and communicate with students'
      case 'ADMIN': return 'Manage the entire bus system, routes, schedules, and user accounts'
      default: return ''
    }
  }

  // ── OTP Verification Step ──
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Bus className="h-12 w-12 text-green-primary" />
              <h1 className="text-3xl font-bold text-green-primary ml-2">KIIT SmartBus</h1>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Verify Your Email</h2>
            <p className="text-gray-600 mt-2">
              We sent a 6-digit OTP to{' '}
              <span className="font-semibold text-green-primary">{formData.email}</span>
            </p>
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
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit: string, i: number) => (
                  <input
                    key={i}
                    id={`signup-otp-${i}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-green-primary focus:ring-2 focus:ring-green-200 outline-none transition"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={verifyLoading}
                className="w-full bg-gradient-to-r from-green-primary to-green-secondary text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {verifyLoading
                  ? <><RefreshCw className="animate-spin h-5 w-5 mr-2" />Verifying...</>
                  : 'Verify & Create Account'}
              </button>
            </form>

            <div className="text-center mt-4">
              {resendTimer > 0 ? (
                <p className="text-gray-600 text-sm">
                  Resend OTP in <span className="font-semibold text-green-primary">{resendTimer}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResendOtp}
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
                onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '']); setVerifyError(null) }}
                className="text-green-primary hover:text-green-700 text-sm font-medium flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Signup
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Signup Form Step ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Bus className="h-12 w-12 text-green-primary" />
            <h1 className="text-3xl font-bold text-green-primary ml-2">KIIT SmartBus</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">Create Account</h2>
          <p className="text-gray-600 mt-2">Join the smart campus transportation system</p>
          <div className="mt-4">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center space-x-2 text-green-primary hover:text-green-700 text-sm font-medium transition-colors mx-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-green-200">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent transition-colors"
                  placeholder="Create a secure password"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Your Role</label>
              <div className="space-y-3">
                {[
                  { value: 'STUDENT', label: 'Student', icon: <User className="h-5 w-5" /> },
                  { value: 'DRIVER', label: 'Driver', icon: <Bus className="h-5 w-5" /> },
                  { value: 'ADMIN', label: 'Admin', icon: <Shield className="h-5 w-5" /> },
                ].map((role) => (
                  <label key={role.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-green-primary hover:bg-green-50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                      className="sr-only"
                    />
                    <div className={`flex items-center w-full ${formData.role === role.value ? 'text-green-primary' : 'text-gray-600'}`}>
                      <div className={`mr-3 ${formData.role === role.value ? 'text-green-primary' : 'text-gray-400'}`}>{role.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium">{role.label}</div>
                        <div className="text-sm text-gray-500">{getRoleDescription(role.value)}</div>
                      </div>
                      {formData.role === role.value && <UserCheck className="h-5 w-5 text-green-primary" />}
                    </div>
                  </label>
                ))}
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
              {loading
                ? <><RefreshCw className="animate-spin h-5 w-5 mr-2" />Creating Account...</>
                : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-green-primary hover:text-green-700 font-medium transition-colors">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
