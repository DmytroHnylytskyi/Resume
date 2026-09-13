/**
 * portfolio.ts — data model of the portfolio content.
 * Interfaces here describe the shape of `developerProfiles` and
 * `translations` in src/data/resumeData.ts (profile, education,
 * certifications, skills, contacts, projects, and every localized string
 * tree the UI renders).
 */

export type Locale = 'uk' | 'en';

export interface ProjectItem {
  id: string;
  title: string;
  tagline: string;
  description: string;
  tags: string[];
  url: string;
  githubUrl?: string;
  color: string;
  features: string[];
}

export interface EducationItem {
  institution: string;
  faculty: string;
  specialty: string;
  degree: string;
  period: string;
  status: string;
  location: string;
}

export interface CertificationItem {
  id: string;
  title: string;
  issuer: string;
  level?: string;
  category: string;
  verified: boolean;
  /** Public verification link (e.g. HackerRank credential page) */
  url?: string;
}

export interface DeveloperProfile {
  name: string;
  role: string;
  location: string;
  status: string;
  bio: string;
  summary: string[];
  education: EducationItem[];
  certifications: CertificationItem[];
  skills: {
    category: string;
    items: string[];
  }[];
  contacts: {
    email: string;
    telegram: string;
    telegramHandle: string;
    github: string;
  };
  projects: Record<string, ProjectItem>;
}

export interface Translations {
  nav: {
    brandTag: string;
    bio: string;
    skills: string;
    contacts: string;
    view3D: string;
    viewClassic: string;
    resumeTitle: string;
  };
  welcome: {
    title: string;
    subtitle: string;
    chooseMode: string;
    mode3DTitle: string;
    mode3DDesc: string;
    mode3DBtn: string;
    modeClassicTitle: string;
    modeClassicDesc: string;
    modeClassicBtn: string;
    selectLanguage: string;
  };
  loading: {
    title: string;
    subtitle: string;
    tip: string;
  };
  landing: {
    heroGreeting: string;
    availableForWork: string;
    heroFocus: string;
    heroNameOutline: string;
    heroNameSolid: string;
    contactMe: string;
    viewIn3D: string;
    aboutTitle: string;
    aboutSubtitle: string;
    educationTitle: string;
    educationSubtitle: string;
    educationYears: string;
    certificationsTitle: string;
    certificationsSubtitle: string;
    skillsTitle: string;
    skillsSubtitle: string;
    projectsTitle: string;
    projectsSubtitle: string;
    projectsWatermark: string;
    keyFeatures: string;
    liveDemo: string;
    sourceCode: string;
    realProjectBadge: string;
    interactiveBadge: string;
    contactsTitle: string;
    contactsSubtitle: string;
    ctaHeadline: string;
    ctaText: string;
    ctaButton: string;
    copyEmail: string;
    copied: string;
    openLink: string;
    downloadPdf: string;
    backToTop: string;
    statYears: string;
    statProjects: string;
    statTechs: string;
    rightsReserved: string;
  };
  modals: {
    close: string;
    biography: string;
    skillsAndTech: string;
    contactsAndSocial: string;
    education: string;
    certifications: string;
    projectDetails: string;
    visitSite: string;
    viewDemo: string;
    viewCode: string;
    copySuccess: string;
    statusLabel: string;
  };
  interaction: {
    actionKey: string;
    interact: string;
    statueBio: string;
    statueSkills: string;
    statueContacts: string;
    portalForma: string;
    portalTerrascope: string;
    portalLumina: string;
  };
}
