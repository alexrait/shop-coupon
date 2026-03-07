import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './components/icons';
import { Button } from './components/ui/button';

const steps = [
  {
    id: 1,
    icon: 'Edit',
    color: 'bg-orange-100 text-orange-600 border-orange-200',
    dotColor: 'bg-orange-500',
    title: 'You enter your coupon',
    description: 'Your coupon data is typed directly in your browser. It never leaves in plain text.',
    tag: 'Your Device',
    tagColor: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    id: 2,
    icon: 'Key',
    color: 'bg-amber-100 text-amber-600 border-amber-200',
    dotColor: 'bg-amber-500',
    title: 'Encrypted in your browser',
    description: 'Using AES-256-GCM — the same standard used by banks — your data is locked with your vault password before any network request.',
    tag: 'Web Crypto API',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 3,
    icon: 'Shield',
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500',
    title: 'Only the encrypted blob is sent',
    description: 'Our server receives a scrambled ciphertext — completely unreadable without your password, which we never see.',
    tag: 'Zero Knowledge',
    tagColor: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    id: 4,
    icon: 'Folder',
    color: 'bg-stone-100 text-stone-600 border-stone-200',
    dotColor: 'bg-stone-500',
    title: 'Stored safely on our server',
    description: 'We store the encrypted blob in our database. Even if our servers were breached, attackers would only get useless ciphertext.',
    tag: 'Server',
    tagColor: 'bg-stone-50 text-stone-700 border-stone-200',
  },
  {
    id: 5,
    icon: 'LockOpen',
    color: 'bg-orange-100 text-orange-600 border-orange-200',
    dotColor: 'bg-orange-500',
    title: 'Decrypted only on your device',
    description: 'When you unlock your vault, decryption happens entirely in your browser. Your password never touches our servers.',
    tag: 'Your Device',
    tagColor: 'bg-orange-50 text-orange-700 border-orange-200',
  },
];

const guarantees = [
  { icon: 'Shield',  title: 'Zero-knowledge architecture', body: 'We mathematically cannot read your data. Your password is the only key.' },
  { icon: 'Key',     title: 'AES-256-GCM encryption',      body: 'Military-grade symmetric encryption with a unique IV per record.' },
  { icon: 'History', title: 'No password recovery',         body: "If you forget your vault password, no one can help — by design. Your data, your control." },
  { icon: 'UserPlus', title: 'Shared access done right',    body: 'Vault sharing uses asymmetric key exchange — your password never leaves your device, even when sharing.' },
];

function AnimatedStep({ step, index, visible }) {
  return (
    <div
      className="flex gap-4 sm:gap-6 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${index * 120}ms`,
      }}
    >
      {/* Timeline */}
      <div className="flex flex-col items-center gap-0 shrink-0">
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${step.color}`}>
          {React.createElement(Icons[step.icon], { size: 18 })}
        </div>
        {index < steps.length - 1 && (
          <div className="w-0.5 flex-1 min-h-[2rem] bg-gradient-to-b from-border to-transparent mt-1" />
        )}
      </div>

      {/* Content */}
      <div className="pb-8 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground">STEP {step.id}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${step.tagColor}`}>
            {step.tag}
          </span>
        </div>
        <h3 className="text-lg font-bold mb-1">{step.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // trigger on mount too
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-orange-50 via-background to-amber-50">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(20 90% 38%) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="container mx-auto px-6 py-20 text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6 border border-primary/20">
            <Icons.Shield size={12} />
            Security &amp; Privacy
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Your data is <span className="text-primary">yours alone.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Here's exactly how Coupon Chest keeps your information private — no hand-waving, just facts.
          </p>
          <Link to="/">
            <Button variant="outline" size="sm">
              <Icons.History size={14} className="mr-2" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16 max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left — step-by-step flow */}
          <div ref={ref}>
            <h2 className="text-2xl font-bold mb-2">How a coupon gets saved</h2>
            <p className="text-muted-foreground text-sm mb-8">Every save follows this exact sequence — in your browser, before anything reaches our servers.</p>
            <div>
              {steps.map((step, i) => (
                <AnimatedStep key={step.id} step={step} index={i} visible={visible} />
              ))}
            </div>
          </div>

          {/* Right — guarantees + visual callout */}
          <div className="flex flex-col gap-6">
            {/* Visual callout box */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-orange-50 to-amber-50 p-6 text-center">
              <Icons.Shield size={48} className="text-primary mx-auto mb-3" />
              <div className="text-3xl font-black text-primary mb-1">AES-256-GCM</div>
              <div className="text-sm text-muted-foreground mb-4">The same encryption standard used by banks, militaries, and healthcare providers worldwide.</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { val: '256', label: 'Bit key' },
                  { val: '0',   label: 'Plain text stored' },
                  { val: '∞',   label: 'Possible keys' },
                ].map(({ val, label }) => (
                  <div key={label} className="bg-white/70 rounded-xl p-3 border border-primary/10">
                    <div className="text-xl font-black text-primary">{val}</div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guarantees */}
            <h2 className="text-2xl font-bold mt-2">What we guarantee</h2>
            <div className="flex flex-col gap-3">
              {guarantees.map(({ icon, title, body }) => {
                const IconComp = Icons[icon];
                return (
                  <div key={title} className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <IconComp size={16} className="text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-0.5">{title}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom banner */}
      <div className="border-t bg-gradient-to-r from-orange-50 to-amber-50 py-12 text-center">
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Still have questions? Review our{' '}
          <Link to="/" className="text-primary font-semibold hover:underline">Privacy Policy</Link>
          {' '}or explore the open source code on GitHub.
        </p>
      </div>
    </div>
  );
}
