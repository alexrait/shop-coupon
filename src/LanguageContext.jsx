import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
    en: {
        appName: "Vault Cart",
        welcome: "Welcome to Vault Cart",
        tagline: "End-to-End Encrypted Coupon Management.",
        login: "Login to Continue",
        loginVault: "Login to Vault",
        dashboard: "Dashboard",
        welcomeBack: "Welcome back, {name}",
        vaults: "Your Vaults",
        newVault: "New Vault",
        unlock: "Unlock",
        lock: "Lock",
        password: "Password",
        createVault: "Create Encrypted Vault",
        vaultName: "Vault Name",
        encryptionPassword: "Encryption Password",
        generateKeys: "Generate Keys & Save Vault",
        cancel: "Cancel",
        logout: "Logout",
        privacy: "Privacy Policy",
        terms: "Terms of Use",
        builtWithSecurity: "Built with security first. Your data never leaves your device unencrypted.",
        noVaults: "No vaults found. Create one to get started.",
        addCoupon: "Add Coupon",
        invite: "Invite",
        share: "Share",
        add: "Add",
        saving: "Saving...",
        encrypting: "Encrypting...",
        decrypting: "Decrypting vault content...",
        activityFeed: "Activity Feed",
        noActivity: "No recent activity in this vault.",
        couponMarkedUsed: "Coupon marked used",
        newCouponAdded: "New coupon added",
        undoAvailable: "Undo Available (30d)",
        markUsed: "Mark Used?",
        title: "Title",
        code: "Code",
        value: "Value",
        image: "Image (Optional)",
        protectSave: "Protect & Save",
        enterPassword: "Enter the exact vault password to decrypt and load your records.",
        inviteMember: "Invite Team Member",
        enterEmail: "Enter Gmail address...",
        sendAccess: "Send Access",
        decryptionFailed: "[Decryption Failed]",
        id: "ID",
        delete: "Delete",
        confirmDelete: "Are you sure you want to permanently delete this coupon?",
        moveUp: "Move Up",
        moveDown: "Move Down",
        edit: "Edit",
        formatCode: "Format Code",
        viewCode: "View Details/Code",
    },
    he: {
        appName: "כספת הקופונים",
        welcome: "ברוכים הבאים לכספת הקופונים",
        tagline: "ניהול קופונים מוצפן מקצה לקצה.",
        login: "התחברו כדי להמשיך",
        loginVault: "כניסה לכספת",
        dashboard: "לוח בקרה",
        welcomeBack: "ברוך שובך, {name}",
        vaults: "הכספות שלי",
        newVault: "כספת חדשה",
        unlock: "פתיחה",
        lock: "נעילה",
        password: "סיסמה",
        createVault: "יצירת כספת מוצפנת",
        vaultName: "שם הכספת",
        encryptionPassword: "סיסמת הצפנה",
        generateKeys: "יצירת מפתחות ושמירת כספת",
        cancel: "ביטול",
        logout: "התנתקות",
        privacy: "מדיניות פרטיות",
        terms: "תנאי שימוש",
        builtWithSecurity: "נבנה עם דגש על אבטחה. המידע שלך לעולם לא עוזב את המכשיר ללא הצפנה.",
        noVaults: "לא נמצאו כספות. צרו כספת חדשה כדי להתחיל.",
        addCoupon: "הוספת קופון",
        invite: "הזמנה",
        share: "שיתוף",
        add: "הוספה",
        saving: "שומר...",
        encrypting: "מצפין...",
        decrypting: "מפענח תוכן כספת...",
        activityFeed: "עדכוני פעילות",
        noActivity: "אין פעילות אחרונה בכספת זו.",
        couponMarkedUsed: "קופון סומן כנוצל",
        newCouponAdded: "קופון חדש נוסף",
        undoAvailable: "ביטול זמין (30 יום)",
        markUsed: "לסמן כנוצל?",
        title: "כותרת",
        code: "קוד",
        value: "ערך",
        image: "תמונה (אופציונלי)",
        protectSave: "הצפנה ושמירה",
        enterPassword: "הזינו את סיסמת הכספת המדויקת כדי לפענח ולטעון את הרשומות.",
        inviteMember: "הזמנת חבר צוות",
        enterEmail: "הזינו כתובת ג'ימייל...",
        sendAccess: "שלח גישה",
        decryptionFailed: "[פענוח נכשל]",
        id: "מזהה",
        delete: "מחיקה",
        confirmDelete: "האם אתם בטוחים שברצונכם למחוק את הקופון לצמיתות?",
        moveUp: "הזזה למעלה",
        moveDown: "הזזה למטה",
        edit: "עריכה",
        formatCode: "עצב קוד",
        viewCode: "פרטים / קוד",
    }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(localStorage.getItem('vault_lang') || 'en');
    const [rtl, setRtl] = useState(lang === 'he');

    useEffect(() => {
        localStorage.setItem('vault_lang', lang);
        setRtl(lang === 'he');
        document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }, [lang]);

    const t = (key, params = {}) => {
        let str = translations[lang][key] || translations['en'][key] || key;
        Object.keys(params).forEach(p => {
            str = str.replace(`{${p}}`, params[p]);
        });
        return str;
    };

    const toggleLanguage = () => {
        setLang(prev => prev === 'en' ? 'he' : 'en');
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t, toggleLanguage, rtl }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
