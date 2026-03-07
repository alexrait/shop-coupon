import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { VaultProvider, useVault } from './VaultContext';
import { VaultManager } from './VaultManager';
import { CouponList } from './CouponList';
import { CouponHistory } from './CouponHistory';
import { Icons } from './components/icons';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';

const Home = ({ login }) => (
  <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
    <Card className="max-w-[400px] w-full text-center p-8 bg-card/50 backdrop-blur-md border-primary/20 shadow-2xl animate-in zoom-in-95 duration-500">
      <div className="flex justify-center mb-6">
        <Icons.Vault size={64} className="text-primary animate-pulse" />
      </div>
      <CardTitle className="text-3xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent mb-2">
        Vault Cart
      </CardTitle>
      <p className="text-muted-foreground mb-8">
        The ultimate end-to-end encrypted vault for your shopping coupons and secret codes.
      </p>
      <Button size="lg" className="w-full font-bold text-lg" onClick={login}>
        <Icons.LockOpen size={20} className="mr-2" />
        Login to Vault
      </Button>
    </Card>
  </div>
);

const Dashboard = ({ user }) => {
  const { publicKey } = useVault();

  return (
    <div className="container mx-auto py-8 px-4 animate-in fade-in duration-700">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-1">Welcome, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}</h2>
        <p className="text-muted-foreground">Manage your encrypted shopping vaults below.</p>
      </div>

      {!publicKey ? (
        <VaultManager user={user} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CouponList />
          </div>
          <div className="lg:col-span-1">
            <CouponHistory />
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const { user, login, logout, isInitialized } = useAuth();

  if (!isInitialized) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Icons.Cart size={48} className="animate-bounce text-primary" />
    </div>
  );

  return (
    <VaultProvider>
      <Router>
        <div className="min-h-screen bg-background font-sans selection:bg-primary/30">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4">
              <Link to="/" className="flex items-center gap-2 group transition-all">
                <Icons.Vault size={32} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xl font-bold tracking-tight">Vault Cart</span>
              </Link>
              <nav className="flex items-center gap-4">
                {user ? (
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                      {user.email}
                    </span>
                    <Button variant="outline" size="icon" onClick={logout} title="Logout" className="rounded-full">
                      <Icons.Logout size={18} />
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={login}>Login</Button>
                )}
              </nav>
            </div>
          </header>

          <main className="min-h-[calc(100vh-4rem)]">
            <Routes>
              <Route path="/" element={
                user ? <Navigate to="/dashboard" replace /> : <Home login={login} />
              } />
              <Route path="/dashboard" element={
                user ? <Dashboard user={user} /> : <Navigate to="/" replace />
              } />
            </Routes>
          </main>

          <footer className="border-t py-6 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
              <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                Built with security first. Your data never leaves your device unencrypted.
              </p>
            </div>
          </footer>
        </div>
      </Router>
    </VaultProvider>
  );
}

export default App;
