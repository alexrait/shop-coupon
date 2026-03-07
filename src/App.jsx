import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { VaultProvider, useVault } from './VaultContext';
import { VaultManager } from './VaultManager';
import { CouponList } from './CouponList';
import { CouponHistory } from './CouponHistory';
import { Icons } from './components/icons';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { PrivacyModal, TermsModal } from './components/LegalModals';
import SecurityPage from './SecurityPage';

const Home = ({ login, onShowPrivacy, onShowTerms }) => {
  const { t } = useLanguage();

  const features = [
    { icon: 'Shield', text: t('feature1') },
    { icon: 'Vault',  text: t('feature2') },
    { icon: 'Share',  text: t('feature3') },
    { icon: 'History', text: t('feature4') },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-stretch justify-center min-h-[88vh] gap-12 px-6 py-12 max-w-6xl mx-auto">

      {/* Left — hero */}
      <div className="flex-1 flex flex-col items-center lg:items-start rtl:lg:items-end text-center lg:text-left rtl:lg:text-right gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-3">
            {t('heroTitle')}<br />
            <span className="text-primary">{t('heroHighlight')}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">{t('tagline')}</p>
        </div>

        <img
          src="/hero.png"
          alt="Coupon Chest illustration"
          className="w-full max-w-md rounded-2xl shadow-lg object-cover"
        />

        <ul className="flex flex-col gap-3 w-full max-w-md">
          {features.map(({ icon, text }) => {
            const IconComp = Icons[icon];
            return (
              <li key={icon} className="flex items-center gap-3 text-sm text-foreground">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <IconComp size={16} className="text-primary" />
                </span>
                {text}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right — login card */}
      <div className="w-full max-w-sm flex flex-col gap-4 lg:sticky lg:top-16 lg:self-start lg:h-[calc(100vh-4rem)] lg:justify-center">
        <Card className="w-full text-center p-8 bg-card border-border shadow-xl">
          <div className="flex justify-center mb-5">
            <Icons.Vault size={56} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold mb-2">{t('appName')}</CardTitle>
          <p className="text-muted-foreground text-sm mb-6">{t('tagline')}</p>
          <Button size="lg" className="w-full font-bold text-base" onClick={login}>
            <Icons.LockOpen size={18} className="mr-2" />
            {t('loginVault')}
          </Button>
        </Card>

        <Link
          to="/security"
          className="text-center text-xs text-primary hover:underline font-medium flex items-center justify-center gap-1"
        >
          <Icons.Shield size={12} />
          How we protect your data
        </Link>

        <div className="flex justify-center gap-6 text-xs text-muted-foreground">
          <button onClick={onShowPrivacy} className="hover:text-primary transition-colors underline underline-offset-2 cursor-pointer">
            {t('privacy')}
          </button>
          <button onClick={onShowTerms} className="hover:text-primary transition-colors underline underline-offset-2 cursor-pointer">
            {t('terms')}
          </button>
        </div>
      </div>

    </div>
  );
};


const Dashboard = ({ user }) => {
  const { publicKey } = useVault();
  const { t } = useLanguage();

  return (
    <div className="container mx-auto py-8 px-4 animate-in fade-in duration-700">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-1">{t('welcomeBack', { name: user?.user_metadata?.full_name || user?.email?.split('@')[0] })}</h2>
        <p className="text-muted-foreground">{t('tagline')}</p>
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

function AppContent() {
  const { user, login, logout, isInitialized } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  if (!isInitialized) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Icons.Cart size={48} className="animate-bounce text-primary" />
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-background font-sans selection:bg-primary/30">
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2 group transition-all">
              <Icons.Vault size={32} className="text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xl font-bold tracking-tight">{t('appName')}</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={toggleLanguage} className="font-bold">
                {lang === 'en' ? 'HE' : 'EN'}
              </Button>
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-4 py-1 rounded-full border border-border">
                    {user.email}
                  </span>
                  <Button variant="outline" size="icon" onClick={logout} title={t('logout')} className="rounded-full shadow-sm">
                    <Icons.Logout size={18} className={lang === 'he' ? 'rotate-180' : ''} />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" onClick={login}>{t('login')}</Button>
              )}
            </nav>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/" element={
              user ? <Navigate to="/dashboard" replace /> : <Home login={login} onShowPrivacy={() => setShowPrivacy(true)} onShowTerms={() => setShowTerms(true)} />
            } />
            <Route path="/dashboard" element={
              user ? <Dashboard user={user} /> : <Navigate to="/" replace />
            } />
            <Route path="/security" element={<SecurityPage />} />
          </Routes>
        </main>

        <footer className="border-t py-6">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              {t('builtWithSecurity')}
            </p>
            <div className="flex gap-4 text-sm font-medium text-muted-foreground">
              <button onClick={() => setShowPrivacy(true)} className="hover:text-primary transition-colors cursor-pointer">{t('privacy')}</button>
              <button onClick={() => setShowTerms(true)} className="hover:text-primary transition-colors cursor-pointer">{t('terms')}</button>
            </div>
          </div>
        </footer>

        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      </div>
    </Router>
  );
}

function App() {
  return (
    <LanguageProvider>
      <VaultProvider>
        <AppContent />
      </VaultProvider>
    </LanguageProvider>
  );
}

export default App;
