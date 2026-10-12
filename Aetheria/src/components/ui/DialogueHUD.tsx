'use client';

/**
 * DialogueHUD — Futuristic Holographic Sci-Fi Dialogue Interface.
 *
 * Appears when the player interacts with any of the 6 NPC crew members.
 * Features typewriter text animation, sector color theming, audio feedback,
 * and seamless routing to portfolio modals (Bio, Skills, Contacts, Projects).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { NPC_DIALOGUES, NPCDialogueDef } from '../../data/npcDialogues';
import { getGlobalCyberAudio } from '../../hooks/cyberAudio';
import { X, Sparkles, ChevronRight, Terminal } from 'lucide-react';
import { StatueKey } from '../../types/scene';

export default function DialogueHUD(): React.ReactElement | null {
  const {
    activeDialogue,
    setActiveDialogue,
    setActiveModal,
    setSelectedProject,
    language
  } = useGameStore();

  const [displayedTextLength, setDisplayedTextLength] = useState(0);
  const audio = getGlobalCyberAudio();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const npcDef: NPCDialogueDef | null = activeDialogue
    ? NPC_DIALOGUES[activeDialogue.npcId] || null
    : null;

  const fullText = npcDef ? npcDef.dialogueText[language] : '';

  // ── 1. Typewriter Animation Engine ──
  useEffect(() => {
    if (!npcDef) {
      setDisplayedTextLength(0);
      return;
    }

    setDisplayedTextLength(0);
    let currentLength = 0;
    const targetLength = fullText.length;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      currentLength += 2;
      if (currentLength >= targetLength) {
        setDisplayedTextLength(targetLength);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setDisplayedTextLength(currentLength);
        // Subtle audio click every ~8 characters
        if (currentLength % 8 === 0) {
          audio.play('click', 0.15);
        }
      }
    }, 22);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [npcDef, fullText, language, audio]);

  // Click to skip typewriter to end
  const handleSkipTyping = useCallback(() => {
    if (displayedTextLength < fullText.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayedTextLength(fullText.length);
      audio.play('click', 0.2);
    }
  }, [displayedTextLength, fullText.length, audio]);

  // Dismiss handler
  const handleDismiss = useCallback(() => {
    audio.play('click', 0.25);
    setActiveDialogue(null);
  }, [audio, setActiveDialogue]);

  // Primary Action handler (routes to modal)
  const handlePrimaryAction = useCallback(() => {
    if (!npcDef) return;

    audio.play('interact', 0.4);
    setActiveDialogue(null);

    if (npcDef.targetType === 'modal') {
      setActiveModal(npcDef.targetKey as StatueKey);
    } else if (npcDef.targetType === 'project') {
      setSelectedProject(npcDef.targetKey);
    }
  }, [npcDef, audio, setActiveDialogue, setActiveModal, setSelectedProject]);

  // Keyboard controls: Escape closes, Enter triggers primary if typing finished
  useEffect(() => {
    if (!activeDialogue) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (displayedTextLength < fullText.length) {
          e.preventDefault();
          handleSkipTyping();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDialogue, displayedTextLength, fullText.length, handleDismiss, handleSkipTyping]);

  if (!activeDialogue || !npcDef) return null;

  const isTypingComplete = displayedTextLength >= fullText.length;
  const currentRenderedText = fullText.slice(0, displayedTextLength);

  return (
    <div
      className="dialogue-hud-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 950,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 20px 28px 20px',
        background: 'radial-gradient(ellipse at bottom, rgba(5, 8, 18, 0.45) 0%, transparent 70%)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        className="dialogue-hud-card"
        style={{
          width: '100%',
          maxWidth: '720px',
          background: 'rgba(7, 10, 20, 0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '16px',
          border: `1.5px solid rgba(${npcDef.rgbColor}, 0.45)`,
          boxShadow: `0 16px 48px rgba(0, 0, 0, 0.8), 0 0 32px rgba(${npcDef.rgbColor}, 0.25)`,
          color: '#ffffff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'dialogueSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={handleSkipTyping}
        role="dialog"
        aria-labelledby="dialogue-npc-name"
        aria-describedby="dialogue-npc-text"
      >
        {/* Hologram subtle scanlines overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
            backgroundSize: '100% 3px, 6px 100%',
            opacity: 0.5
          }}
        />

        {/* Header: Badge, Name & Close Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            zIndex: 2
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Sector Indicator Dot */}
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: npcDef.hexColor,
                boxShadow: `0 0 10px ${npcDef.hexColor}`
              }}
            />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  id="dialogue-npc-name"
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    color: '#ffffff'
                  }}
                >
                  {npcDef.name[language]}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: `rgba(${npcDef.rgbColor}, 0.15)`,
                    color: npcDef.hexColor,
                    border: `1px solid rgba(${npcDef.rgbColor}, 0.35)`
                  }}
                >
                  {npcDef.badge[language]}
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginTop: '2px'
                }}
              >
                {npcDef.role[language]}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            aria-label="Close dialogue"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content: Typewriter Message */}
        <div
          id="dialogue-npc-text"
          style={{
            padding: '20px 24px',
            fontSize: '15px',
            lineHeight: '1.65',
            color: 'rgba(255, 255, 255, 0.95)',
            minHeight: '96px',
            position: 'relative',
            zIndex: 2,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}
        >
          {currentRenderedText}
          {!isTypingComplete && (
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '16px',
                background: npcDef.hexColor,
                marginLeft: '4px',
                verticalAlign: 'middle',
                animation: 'blink 0.7s infinite'
              }}
            />
          )}
        </div>

        {/* Footer: Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '12px 20px 16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            position: 'relative',
            zIndex: 2,
            background: 'rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {npcDef.dismissLabel[language]}
          </button>

          {/* Primary action button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrimaryAction();
            }}
            style={{
              padding: '8px 18px',
              background: `linear-gradient(135deg, ${npcDef.hexColor}, rgba(${npcDef.rgbColor}, 0.8))`,
              border: `1px solid rgba(${npcDef.rgbColor}, 0.6)`,
              borderRadius: '8px',
              color: '#070a14',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: `0 4px 14px rgba(${npcDef.rgbColor}, 0.35)`,
              transition: 'transform 0.15s ease, filter 0.15s ease'
            }}
          >
            <span>{npcDef.actionLabel[language]}</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dialogueSlideUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
