/**
 * Comprehensive Developer Profile, Skills Matrix, and Project Types.
 */

export interface UniversityInfo {
  fullName: string;
  institute: string;
  department: string;
  specialty: string;
  year: string;
  degree: string;
}

export interface ContactLinks {
  email: string;
  telegram: string;
  telegramUrl: string;
  phone: string;
  phoneFormatted: string;
  github: string;
  linkedin: string;
  location: string;
  status: string;
}

export interface SkillItem {
  name: string;
  level: number;
  icon?: string;
  desc?: string;
}

export type SkillMatrix = Record<string, SkillItem[]>;

export interface ProjectItem {
  id: string;
  title: string;
  subtitle: string;
  portalKey: 'forma' | 'terrascope' | 'lumina';
  themeColor: string;
  accentGlow: string;
  badge: string;
  url: string;
  description: string;
  tags: string[];
  metrics?: string[];
  technologies?: string[];
  githubUrl?: string;
}

export interface DeveloperProfile {
  name: string;
  nameEn: string;
  title: string;
  tagline: string;
  university: UniversityInfo;
  contacts: ContactLinks;
  about: string[];
  skillsMatrix: SkillMatrix;
  projects: ProjectItem[];
}
