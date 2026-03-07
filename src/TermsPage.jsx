import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { Button } from './components/ui/button';
import { Icons } from './components/icons';

export default function TermsPage() {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen bg-background py-12 px-6">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link to="/">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <Icons.History size={16} className="rtl:rotate-180" />
                            {t('back')}
                        </Button>
                    </Link>
                </div>
                
                <h1 className="text-4xl font-extrabold tracking-tight mb-8">{t('terms')}</h1>
                
                <div className="prose prose-slate max-w-none text-muted-foreground space-y-6 text-lg leading-relaxed">
                    <p className="text-foreground font-medium italic underline decoration-primary/30 decoration-4 underline-offset-4">
                        {t('termsIntro')}
                    </p>
                    
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                            <Icons.Key size={20} className="text-primary" />
                            {t('termsSection1Title')}
                        </h3>
                        <p>{t('termsSection1Content')}</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                            <Icons.Edit size={20} className="text-primary" />
                            {t('termsSection2Title')}
                        </h3>
                        <p>{t('termsSection2Content')}</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                            <Icons.Vault size={20} className="text-primary" />
                            {t('termsSection3Title')}
                        </h3>
                        <p>{t('termsSection3Content')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
