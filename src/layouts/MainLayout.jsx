import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, checkIsAdmin } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Button } from '../components/ui/button';
import { 
  LogOut, User, Moon, Sun, Home, Users, HeartPulse, 
  PlusCircle, FileSpreadsheet, ChevronDown, ShieldCheck, Heart, LogIn 
} from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainLayout() {
  const { user, profile, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = checkIsAdmin(user?.email, user?.user_metadata, profile?.role);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      setDropdownOpen(false);
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error(error);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Donors', path: '/donors', icon: Users },
    { name: 'Donate', path: '/become-donor', icon: PlusCircle, isSpecial: true },
    { name: 'Requests', path: '/requests', icon: FileSpreadsheet },
  ];

  const savedName = user?.id ? localStorage.getItem(`user_name_${user.id}`) : null;
  const rawName = (profile?.full_name && profile.full_name !== 'User') 
    ? profile.full_name 
    : (user?.user_metadata?.full_name || user?.user_metadata?.name || savedName || (isAdmin ? 'Wasin Ahmed' : (user?.email ? user.email.split('@')[0] : 'Campus Donor')));
  const userName = rawName ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : 'Campus Donor';
  const firstName = userName.split(' ')[0] || 'Campus';
  const savedAvatar = user?.id ? localStorage.getItem(`user_avatar_${user.id}`) : null;
  const userAvatar = profile?.avatar_url || user?.avatar_url || savedAvatar || null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-5xl">
          {/* Brand Logo & Name: Exactly identical logo for both mobile and desktop */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <Logo size="md" />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 transition-colors hover:text-primary ${
                  location.pathname === link.path ? 'text-primary font-bold' : 'text-muted-foreground'
                } ${link.isAdmin ? 'text-primary font-black bg-primary/10 px-3 py-1 rounded-full border border-primary/20' : ''}`}
              >
                <link.icon className="h-4 w-4" />
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right Header Section: Theme Toggle + User Profile Trigger */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              className="rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
            </Button>
            
            {user ? (
              /* User Profile Section with Name on Left (Desktop & Mobile) and Avatar Circle */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2.5 md:p-1.5 md:pl-3 rounded-full border border-border/80 bg-card hover:bg-secondary/60 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {/* Name on left: First Name on mobile, Full Name on desktop */}
                  <div className="flex items-center gap-1.5 max-w-[140px] truncate">
                    {/* Mobile: First Name */}
                    <span className="text-xs font-bold text-foreground truncate block md:hidden">
                      {firstName}
                    </span>
                    {/* Desktop: Full Name */}
                    <span className="text-xs font-bold text-foreground truncate hidden md:block">
                      {userName}
                    </span>
                  </div>

                  {/* Profile Avatar Circle: Mobile and Desktop */}
                  <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-primary/10 border-2 border-primary/40 overflow-hidden flex items-center justify-center shrink-0">
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <span className="text-xs font-black text-primary uppercase">
                        {userName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 rounded-3xl border border-border bg-card/95 backdrop-blur-2xl p-3 shadow-2xl z-50 space-y-2"
                    >
                      {/* Dropdown User Info Card Header */}
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/60 border border-border/60">
                        <div className="h-10 w-10 rounded-full bg-primary/15 border-2 border-primary/40 overflow-hidden flex items-center justify-center shrink-0">
                          {userAvatar ? (
                            <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-black text-primary uppercase">
                              {userName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="overflow-hidden space-y-0.5">
                          <p className="text-xs font-bold text-foreground truncate">{userName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border mt-1 ${
                            isAdmin 
                              ? 'text-primary bg-primary/15 border-primary/30' 
                              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          }`}>
                            <ShieldCheck size={10} /> {isAdmin ? 'System Administrator' : 'Active Donor'}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Links */}
                      <div className="space-y-1 pt-1">
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                          >
                            <ShieldCheck className="h-4 w-4 text-primary" /> Admin Control Panel
                          </Link>
                        )}
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 hover:text-primary transition-colors"
                        >
                          <User className="h-4 w-4 text-primary" /> My Profile & Photo
                        </Link>
                        <Link
                          to="/request-blood"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                        >
                          <HeartPulse className="h-4 w-4 text-rose-500" /> Request Blood (Receiver)
                        </Link>
                        <Link
                          to="/become-donor"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 hover:text-primary transition-colors"
                        >
                          <Heart className="h-4 w-4 text-primary" /> Become/Edit Donor Profile
                        </Link>
                        <Link
                          to="/donors"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 hover:text-primary transition-colors"
                        >
                          <Users className="h-4 w-4 text-primary" /> Donor Directory
                        </Link>
                        <Link
                          to="/requests"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 hover:text-primary transition-colors"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-primary" /> Emergency Requests
                        </Link>
                      </div>

                      <div className="border-t border-border/60 pt-2 space-y-1">
                        <button
                          onClick={() => {
                            toggleTheme();
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <span className="flex items-center gap-2.5">
                            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            {theme === 'dark' ? 'Dark' : 'Light'}
                          </span>
                        </button>

                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Button 
                onClick={() => navigate('/login')} 
                className="rounded-2xl font-black bg-primary hover:bg-rose-700 text-white shadow-lg shadow-rose-600/10 px-5 h-10 text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Login</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-12 max-w-5xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/80 bg-background/95 backdrop-blur-2xl z-40 pb-safe shadow-2xl">
          <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              if (link.isSpecial) {
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="flex flex-col items-center justify-center -mt-5"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-background hover:scale-105 transition-transform">
                      <PlusCircle className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-semibold text-primary mt-0.5">{link.name}</span>
                  </Link>
                );
              }
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                    isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <link.icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''}`} />
                  <span className="text-[10px] tracking-tight">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
