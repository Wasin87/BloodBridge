import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Heart, Phone, Mail, MapPin, ShieldCheck, HeartPulse, ExternalLink, Award, Code2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border/80 bg-card/60 backdrop-blur-md text-card-foreground">
      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-10">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Brand & Bio */}
          <div className="space-y-4 md:col-span-1">
            <Logo size="md" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Campus emergency blood donor platform connecting student donors with patients in urgent need. Saving lives together.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              24/7 Active Donors Network
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Quick Navigation</h4>
            <ul className="space-y-2 text-xs font-medium text-muted-foreground">
              <li>
                <Link to="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/donors" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  Donor Directory
                </Link>
              </li>
              <li>
                <Link to="/requests" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  Emergency Requests
                </Link>
              </li>
              <li>
                <Link to="/become-donor" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  Become a Donor
                </Link>
              </li>
              <li>
                <Link to="/request-blood" className="hover:text-rose-500 transition-colors flex items-center gap-1.5 text-rose-500/90 font-bold">
                  <HeartPulse size={13} /> Request Blood (Receiver)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Blood Groups Quick Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Blood Groups</h4>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                <Link
                  key={group}
                  to={`/donors?group=${encodeURIComponent(group)}`}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-2 py-1.5 rounded-xl bg-secondary/80 border border-border/80 text-[11px] font-black text-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
                >
                  {group}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 4: Emergency Contacts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">24/7 Emergency Support</h4>
            <div className="space-y-2 text-xs">
              <a
                href="tel:999"
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold hover:bg-rose-500/20 transition-all"
              >
                <Phone size={14} /> Emergency Helpline: 999
              </a>
              <div className="flex items-center gap-2 text-muted-foreground pt-1">
                <MapPin size={14} className="text-primary shrink-0" />
                <span className="truncate">Main Campus & Medical Centers</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>100% Verified Campus Donors</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright and Credits */}
        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500/80 shrink-0" />
            <span className="text-muted-foreground font-medium">Created By Developer:</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-secondary/80 border border-border/80 text-foreground font-black shadow-sm transition-all hover:bg-secondary hover:border-primary/20">
              <Code2 size={12} className="text-primary" />
              <span>Md Wasin Ahmed</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/profile" className="hover:text-foreground transition-colors">
              User Profile
            </Link>
            <span>•</span>
            <span className="text-[11px]">© {new Date().getFullYear()} BloodBridge. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
