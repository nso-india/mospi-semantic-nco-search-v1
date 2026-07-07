"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "English" | "Hindi" | "Tamil" | "Telugu";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  "Dashboard": {
    English: "Dashboard",
    Hindi: "डैशबोर्ड",
    Tamil: "டாஷ்போர்டு",
    Telugu: "డాష్‌బోర్డ్"
  },
  "Batch Coding": {
    English: "Batch Coding",
    Hindi: "बैच कोडिंग",
    Tamil: "தொகுதி குறியீடாக்கம்",
    Telugu: "బ్యాచ్ కోడింగ్"
  },
  "Settings": {
    English: "Settings",
    Hindi: "सेटिंग्स",
    Tamil: "அமைப்புகள்",
    Telugu: "సెట్టింగులు"
  },
  "Logout": {
    English: "Logout",
    Hindi: "लॉग आउट",
    Tamil: "வெளியேறு",
    Telugu: "లాగ్అవుట్"
  },
  "SearchPlaceholder": {
    English: "Search occupations...",
    Hindi: "व्यवसायों की खोज करें...",
    Tamil: "தொழில்களைத் தேடுங்கள்...",
    Telugu: "వృత్తులను శోధించండి..."
  },
  "BackToSearch": {
    English: "← Back to Search",
    Hindi: "← खोज पर वापस जाएं",
    Tamil: "← தேடலுக்குத் திரும்பு",
    Telugu: "← శోధనకు తిరిగి వెళ్ళు"
  },
  "Cancel": {
    English: "Cancel",
    Hindi: "रद्द करें",
    Tamil: "ரத்து செய்",
    Telugu: "రద్దు చేయి"
  },
  "SaveChanges": {
    English: "Save Changes",
    Hindi: "परिवर्तन सहेजें",
    Tamil: "மாற்றங்களைச் சேமி",
    Telugu: "మార్పులను సేవ్ చేయి"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("English");

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return key; // Fallback to key
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
