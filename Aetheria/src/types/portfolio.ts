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
    contactMe: string;
    viewIn3D: string;
    aboutTitle: string;
    aboutSubtitle: string;
    educationTitle: string;
    educationSubtitle: string;
    certificationsTitle: string;
    certificationsSubtitle: string;
    skillsTitle: string;
    skillsSubtitle: string;
    projectsTitle: string;
    projectsSubtitle: string;
    keyFeatures: string;
    liveDemo: string;
    sourceCode: string;
    contactsTitle: string;
    contactsSubtitle: string;
    copyEmail: string;
    copied: string;
    openLink: string;
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
