import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Lock, LogOut } from 'lucide-react';
import { useAuth } from './useAuth';
import { VaultProvider, useVault } from './VaultContext';
import { VaultManager } from './VaultManager';
import { CouponList } from './CouponList';
import { CouponHistory } from './CouponHistory';

const Home = ({ login }: { login: () => void }) => (
  <div className="card text-center animate-fade-in" style={{ maxWidth: '500px', margin: '4rem auto' }}>
    <Lock size={48} color="var(--color-primary)" style={{ marginBottom: '1rem' }} />
    <h2>Welcome to VaultCart</h2>
    <p>End-to-End Encrypted Coupon Management.</p>
    <button className="btn btn-primary mt-4" onClick={login}>Login to Continue</button>
  </div>
);

const Dashboard = ({ user }: { user: any }) => {
  const { publicKey } = useVault();

  return (
    <div className="animate-fade-in">
      <h2>Welcome back, {user?.user_metadata?.full_name || user?.email}</h2>
      <p>Manage your encrypted shopping vaults below.</p>

      {!publicKey ? (
        <VaultManager user={user} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          <CouponList />
          <CouponHistory />
        </div>
      )}
    </div>
  );
};

function App() {
  const { user, login, logout, isInitialized } = useAuth();

  if (!isInitialized) return null;

  return (
    <VaultProvider>
      <Router>
        <div className="app-container">
          <header className="app-header">
            <Link to="/" className="app-logo">
              <Lock size={28} color="var(--color-primary)" />
              VaultCart
            </Link>
            <nav>
              {user ? (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {user.email}
                  </span>
                  <button className="btn btn-secondary" onClick={logout} style={{ padding: '0.5rem', borderRadius: '50%' }} title="Logout">
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button className="btn btn-secondary" onClick={login}>Login</button>
              )}
            </nav>
          </header>

          <main>
            <Routes>
              <Route path="/" element={
                user ? <Navigate to="/dashboard" replace /> : <Home login={login} />
              } />
              <Route path="/dashboard" element={
                user ? <Dashboard user={user} /> : <Navigate to="/" replace />
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </VaultProvider>
  );
}

export default App;
