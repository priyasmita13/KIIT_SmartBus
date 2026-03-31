import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
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
import { JoeBot } from './chatbot'

export default function App() {
  return (
    <Router>
      <JoeBot />
      <Routes>
        {/* Auth pages without navbar/footer */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Main app pages with navbar/footer */}
        <Route path="/" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Home />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/live-tracker" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <LiveTracker />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/seat-availability" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <SeatAvailability />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/bus/:busId" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <BusDetail />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/route-schedule" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <RouteSchedule />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/contact" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Contact />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/profile" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <ProfilePage />
            </main>
            <Footer />
          </div>
        } />
        
        {/* Role-based routes - redirect to home for now */}
        <Route path="/student" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Home />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/driver" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Home />
            </main>
            <Footer />
          </div>
        } />
        <Route path="/admin" element={
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <AdminPage />
            </main>
            <Footer />
          </div>
        } />
      </Routes>
    </Router>
  )
}
