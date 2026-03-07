import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { Button } from './components/ui/button';
import { Icons } from './components/icons';

export default function PrivacyPage() {
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
                
                <h1 className="text-4xl font-extrabold tracking-tight mb-8">{t('privacy')}</h1>
                
                <div className="prose prose-slate max-w-none text-muted-foreground space-y-6 text-lg leading-relaxed">
                    <p className="text-foreground font-medium italic underline decoration-primary/30 decoration-4 underline-offset-4">
                        {t('privacyIntro')}
                    </p>
                    
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                            <Icons.Shield size={20} className="text-primary" />
                            {t('privacySection1Title')}
                        </h3>
                        <p>{t('privacySection1Content')}</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                            <Icons.UserPlus size={20} className="text-primary" />
                            {t('privacySection2Title')}
                        </h3>
                        <p>{t('privacySection2Content')}</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                            <Icons.Folder size={20} className="text-primary" />
                            {t('privacySection3Title')}
                        </h3>
                        <p>{t('privacySection3Content')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
