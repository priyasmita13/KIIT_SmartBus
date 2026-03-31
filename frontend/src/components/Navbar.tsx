import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bus, Menu, X, MapPin, Users, Calendar, Shield, HelpCircle, LogIn, UserPlus, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Home', icon: Bus },
    { path: '/live-tracker', label: 'Live Bus Tracker', icon: MapPin },
    { path: '/seat-availability', label: 'Seat Availability', icon: Users },
    { path: '/route-schedule', label: 'Route & Schedule', icon: Calendar },
    { path: '/profile', label: 'Profile', icon: UserCircle, requiresAuth: true },
    { path: '/admin', label: 'Admin Panel', icon: Shield, requiresAdmin: true },
    { path: '/contact', label: 'Contact / Help', icon: HelpCircle },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresAdmin && user?.role !== 'ADMIN') return false;
    if (item.requiresAuth && !user) return false;
    return true;
  });

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-lg border-b-4 border-green-primary sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-green-primary p-2 rounded-lg">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-green-primary leading-tight">KIIT SmartBus</span>
              <p className="text-xs text-gray-600 hidden sm:block leading-tight mt-1">Real-time Campus Transport</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {filteredNavItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap min-w-fit ${
                  isActive(path)
                    ? 'bg-green-primary text-white'
                    : 'text-gray-700 hover:bg-green-50 hover:text-green-primary'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-center">{label}</span>
              </Link>
            ))}

            {/* Auth Buttons */}
            <div className="ml-4 flex items-center space-x-2 border-l border-gray-200 pl-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600 hidden sm:block">
                    Welcome, {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-primary transition-colors duration-200"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/signup"
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-primary text-white hover:bg-green-700 transition-colors duration-200 whitespace-nowrap"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Sign Up</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-700 hover:text-green-primary hover:bg-green-50"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200">
            <div className="space-y-2">
              {filteredNavItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(path)
                      ? 'bg-green-primary text-white'
                      : 'text-gray-700 hover:bg-green-50 hover:text-green-primary'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              ))}

              {/* Mobile Auth Buttons */}
              <div className="pt-4 border-t border-gray-200 mt-4">
                {user ? (
                  <>
                    <div className="px-4 py-2 text-sm text-gray-600">
                      Welcome, {user.name}
                    </div>
                    <button
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 w-full"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-primary transition-colors duration-200"
                    >
                      <LogIn className="h-5 w-5" />
                      <span>Login</span>
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium bg-green-primary text-white hover:bg-green-700 transition-colors duration-200 whitespace-nowrap"
                    >
                      <UserPlus className="h-5 w-5" />
                      <span>Sign Up</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
