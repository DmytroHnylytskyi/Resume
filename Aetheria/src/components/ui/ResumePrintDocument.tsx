'use client';

import React from 'react';
import { developerProfiles, getProjectUrl } from '../../data/resumeData';
import { Locale } from '../../types/portfolio';
import { Mail, Send, ExternalLink, MapPin, CheckCircle2, Globe } from 'lucide-react';
import { GithubIcon } from './icons';

interface ResumePrintDocumentProps {
  language: Locale;
}

export default function ResumePrintDocument({ language }: ResumePrintDocumentProps): React.ReactElement {
  const profile = developerProfiles[language];
  const edu = profile.education[0];
  const isUk = language === 'uk';

  return (
    <div className="classic-print-document">
      {/* ── HEADER ── */}
      <header className="cv-header">
        <div className="cv-header-top">
          <div className="cv-title-group">
            <h1 className="cv-name">{profile.name}</h1>
            <div className="cv-role-row">
              <span className="cv-role">{profile.role}</span>
              <span className="cv-dot-sep">•</span>
              <span className="cv-meta-item">
                <MapPin size={11} />
                <span>{profile.location}</span>
              </span>
            </div>
          </div>

          <div className="cv-contacts-block">
            <a href={`mailto:${profile.contacts.email}`} className="cv-contact-item">
              <Mail size={11} />
              <span>{profile.contacts.email}</span>
            </a>
            <a href={profile.contacts.telegram} target="_blank" rel="noopener noreferrer" className="cv-contact-item">
              <Send size={11} />
              <span>{profile.contacts.telegramHandle || '@mokydjin'}</span>
            </a>
            <a href={profile.contacts.github} target="_blank" rel="noopener noreferrer" className="cv-contact-item">
              <GithubIcon size={11} />
              <span>github.com/DmytroHnylytskyi</span>
            </a>
            <a href="https://hnylytskyi.dev" target="_blank" rel="noopener noreferrer" className="cv-contact-item">
              <Globe size={11} />
              <span>hnylytskyi.dev</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── PROFESSIONAL SUMMARY ── */}
      <section className="cv-section">
        <h2 className="cv-section-title">{isUk ? 'Професійний Профіль' : 'Professional Summary'}</h2>
        <p className="cv-bio-text">{profile.bio}</p>
        <ul className="cv-bullet-list">
          {profile.summary.map((item, idx) => (
            <li key={idx} className="cv-bullet-item">
              <span className="cv-bullet-marker">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── CORE TECHNICAL SKILLS ── */}
      <section className="cv-section">
        <h2 className="cv-section-title">{isUk ? 'Технічні Навички' : 'Core Technical Skills'}</h2>
        <div className="cv-skills-grid">
          {profile.skills.map((cat, idx) => (
            <div key={idx} className="cv-skill-line">
              <span className="cv-skill-label">{cat.category}:</span>
              <span className="cv-skill-values">{cat.items.join(' • ')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED PROJECTS ── */}
      <section className="cv-section cv-projects-section">
        <h2 className="cv-section-title">{isUk ? 'Ключові Проєкти' : 'Featured Projects'}</h2>
        <div className="cv-projects-container">
          {Object.values(profile.projects).map((proj) => {
            const liveUrl = getProjectUrl(proj.id, proj.url);
            return (
              <article key={proj.id} className="cv-project-entry">
                <div className="cv-project-heading">
                  <div className="cv-project-title-area">
                    <h3 className="cv-project-title">{proj.title}</h3>
                    <span className="cv-project-tagline">— {proj.tagline}</span>
                  </div>
                  <div className="cv-project-action-links">
                    {liveUrl && liveUrl !== '#' && (
                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cv-link-badge"
                        title={isUk ? 'Відкрити демо' : 'Open live demo'}
                      >
                        <ExternalLink size={10} />
                        <span>{isUk ? 'Live Demo ↗' : 'Live Demo ↗'}</span>
                      </a>
                    )}
                    {proj.githubUrl && (
                      <a
                        href={proj.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cv-link-badge github"
                        title={isUk ? 'Вихідний код' : 'Source code'}
                      >
                        <GithubIcon size={10} />
                        <span>GitHub ↗</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="cv-project-stack">
                  <span className="cv-stack-label">Stack:</span>
                  <span className="cv-stack-tags">{proj.tags.join(' • ')}</span>
                </div>

                <p className="cv-project-summary">{proj.description}</p>

                <ul className="cv-project-bullets">
                  {proj.features.map((feat, fIdx) => (
                    <li key={fIdx} className="cv-proj-bullet-item">
                      <span className="cv-proj-bullet-dot" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── EDUCATION & CERTIFICATIONS (Side-by-side or stacked cleanly) ── */}
      <div className="cv-dual-section-row">
        {/* Education */}
        <section className="cv-section cv-edu-col">
          <h2 className="cv-section-title">{isUk ? 'Освіта' : 'Education'}</h2>
          {edu && (
            <div className="cv-edu-card">
              <div className="cv-edu-header">
                <span className="cv-edu-school">{edu.institution}</span>
                <span className="cv-edu-dates">{edu.period}</span>
              </div>
              <div className="cv-edu-degree">
                {edu.specialty} — {edu.degree}
              </div>
              <div className="cv-edu-details">
                {edu.faculty} • {edu.status}
              </div>
            </div>
          )}
        </section>

        {/* Certifications */}
        <section className="cv-section cv-certs-col">
          <h2 className="cv-section-title">{isUk ? 'Сертифікати' : 'Verified Certifications'}</h2>
          <div className="cv-certs-compact-grid">
            {profile.certifications.map((cert) => (
              <div key={cert.id} className="cv-cert-card">
                <div className="cv-cert-top">
                  <span className="cv-cert-name">{cert.title}</span>
                  <span className="cv-cert-badge">{cert.issuer}</span>
                </div>
                <div className="cv-cert-bottom">
                  <span className="cv-cert-level">{cert.level}</span>
                  {cert.url && (
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cv-cert-link"
                    >
                      <CheckCircle2 size={10} />
                      <span>{isUk ? 'Верифіковано ↗' : 'Verified ↗'}</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── FOOTER ── */}
      <footer className="cv-doc-footer">
        <span>{profile.name} — Full-Stack & Creative 3D Developer</span>
        <span>{profile.contacts.email} • {profile.contacts.telegramHandle} • hnylytskyi.dev</span>
      </footer>
    </div>
  );
}
