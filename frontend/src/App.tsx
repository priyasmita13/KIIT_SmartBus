import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import LiveTracker from './pages/LiveTracker'
import SeatAvailability from './pages/SeatAvailability'
import RouteSchedule from './pages/RouteSchedule'
import Contact from './pages/Contact'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import BusDetail from './pages/BusDetail'
import DriverMode from './pages/DriverMode'
import { JoeBot } from './chatbot'

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <JoeBot />
        <Routes>
          {/* Public auth pages — no navbar/footer */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Public pages with layout */}
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/live-tracker" element={<Layout><LiveTracker /></Layout>} />
          <Route path="/seat-availability" element={<Layout><SeatAvailability /></Layout>} />
          <Route path="/bus/:busId" element={<Layout><BusDetail /></Layout>} />
          <Route path="/route-schedule" element={<Layout><RouteSchedule /></Layout>} />
          <Route path="/contact" element={<Layout><Contact /></Layout>} />

          {/* Protected pages */}
          <Route path="/profile" element={
            <Layout>
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/admin" element={
            <Layout>
              <ProtectedRoute requiredRole="ADMIN">
                <AdminPage />
              </ProtectedRoute>
            </Layout>
          } />

          {/* Role-based landing routes */}
          <Route path="/student" element={<Layout><Home /></Layout>} />
          <Route path="/driver" element={<Layout><Home /></Layout>} />
          <Route path="/driver-mode" element={<Layout><DriverMode /></Layout>} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
