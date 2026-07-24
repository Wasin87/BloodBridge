import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground font-medium">Loading BloodBridge...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is suspended in real-time
  const suspended = JSON.parse(localStorage.getItem('bloodbridge_suspended_users') || '[]');
  const isSuspended = suspended.includes(user.id) || (user.email && suspended.includes(user.email));

  if (isSuspended) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md p-8 rounded-3xl border-2 border-rose-500/30 bg-card shadow-2xl text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <span className="text-3xl">🚨</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-foreground tracking-tight">Account Suspended</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your Campus BloodBridge account has been suspended by System Administrator <strong className="text-foreground">Wasin Ahmed</strong> for violating platform rules, posting fake details, or spamming.
            </p>
          </div>
          <button
            onClick={() => {
              import('../lib/supabase').then(({ supabase }) => {
                supabase.auth.signOut().then(() => {
                  window.location.href = '/login';
                });
              });
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-md"
          >
            Log Out & Exit
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
