'use client';

/**
 * DialogueHUD — карточка разговора с экипажем станции.
 *
 * Один каркас на всех шестерых: та же «обсидиановая» панель, что у модалок
 * (glass-panel + те же классы заголовка и кнопок), поэтому разговор читается
 * как часть интерфейса станции, а не как шесть отдельных приложений. Сектор
 * остаётся только цветовым акцентом — линия сверху, иконка и точка, — а не
 * темой окна: неоновая рамка, сканлайны и градиентные кнопки убраны.
 *
 * Печать текста посимвольно сохранена: она задаёт ритм чтения и не мешает.
 * Клик по панели, Enter или Space мгновенно показывают реплику целиком;
 * Escape и клик по фону закрывают разговор.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { NPC_DIALOGUES, NPCDialogueDef } from '../../data/npcDialogues';
import { getGlobalCyberAudio } from '../../hooks/cyberAudio';
import {
  X,
  ChevronRight,
  UserRound,
  Wrench,
  Radio,
  Shapes,
  Globe2,
  FlaskConical
} from 'lucide-react';
import { StatueKey } from '../../types/scene';
import { radarState } from '../../store/radarState';
import { ZONES, nearestUnmetZone } from '../../data/zones';
import type { NPCId } from '../../types/store';

/** Иконка в заголовке — единственная визуальная метка профессии. */
type CrewIcon = React.ComponentType<{ size?: number; strokeWidth?: number }>;

const NPC_ICONS: Record<NPCId, CrewIcon> = {
  commander: UserRound,
  chief_engineer: Wrench,
  comms_officer: Radio,
  ui_architect: Shapes,
  geodata_analyst: Globe2,
  photonics_specialist: FlaskConical
};

export default function DialogueHUD(): React.ReactElement | null {
  const {
    activeDialogue,
    setActiveDialogue,
    setActiveModal,
    setSelectedProject,
    markMaterialOpened,
    metCrew,
    language
  } = useGameStore();

  // Подсказка «куда дальше» считается от позиции игрока, а не от порядка
  // обхода: физически ближайший сектор полезнее, чем следующий по сценарию.
  const nextZone = React.useMemo(
    () => nearestUnmetZone(radarState.x, radarState.z, metCrew),
    [metCrew, activeDialogue]
  );

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

    // Досье отмечает сам факт открытия материала — здесь, а не по закрытию окна:
    // посетитель мог закрыть его сразу, но материал он всё равно увидел.
    markMaterialOpened(npcDef.targetKey);

    if (npcDef.targetType === 'modal') {
      setActiveModal(npcDef.targetKey as StatueKey);
    } else if (npcDef.targetType === 'project') {
      setSelectedProject(npcDef.targetKey);
    }
  }, [npcDef, audio, setActiveDialogue, setActiveModal, setSelectedProject, markMaterialOpened]);

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
  const Icon = NPC_ICONS[npcDef.id];

  // Цвет сектора приходит из данных и живёт только в CSS-переменных панели:
  // один класс на все диалоги, акцент — параметр. См. .dialogue-* в globals.css.
  const accentStyle = {
    '--dialogue-accent': npcDef.hexColor,
    '--dialogue-accent-rgb': npcDef.rgbColor
  } as React.CSSProperties;

  return (
    <div
      className="dialogue-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        className="dialogue-sheet glass-panel"
        style={accentStyle}
        onClick={handleSkipTyping}
        role="dialog"
        aria-labelledby="dialogue-npc-name"
        aria-describedby="dialogue-npc-text"
      >
        <div className="modal-accent-line dialogue-accent-line" />

        {/* Header: иконка, имя, роль; бейдж сектора и закрытие — справа */}
        <div className="modal-header dialogue-header">
          <div className="modal-badge-group">
            <div className="modal-badge-icon dialogue-icon" aria-hidden="true">
              <Icon size={19} strokeWidth={1.8} />
            </div>
            <div className="dialogue-heading">
              <h2 id="dialogue-npc-name" className="modal-title">
                {npcDef.name[language]}
              </h2>
              <p className="modal-subtitle">{npcDef.role[language]}</p>
            </div>
          </div>

          <div className="dialogue-header-right">
            <span className="dialogue-badge">{npcDef.badge[language]}</span>
            <button
              type="button"
              className="modal-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              aria-label={language === 'uk' ? 'Закрити діалог' : 'Close dialogue'}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content: Typewriter Message */}
        <p id="dialogue-npc-text" className="dialogue-text">
          {currentRenderedText}
          {!isTypingComplete && <span className="dialogue-caret" aria-hidden="true" />}
        </p>

        {/* Footer: одна и та же пара кнопок во всех диалогах */}
        <div className="dialogue-footer">
          <button
            type="button"
            className="modal-action-btn secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
          >
            {npcDef.dismissLabel[language]}
          </button>

          <button
            type="button"
            className="modal-action-btn primary"
            onClick={(e) => {
              e.stopPropagation();
              handlePrimaryAction();
            }}
          >
            <span>{npcDef.actionLabel[language]}</span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Куда идти дальше. Разговор — естественный момент направить посетителя
            к следующему сектору, и заодно это подсказка, зачем вообще обходить
            станцию. Текущий NPC уже отмечен встреченным при открытии диалога,
            поэтому в «ближайшем непознанном» он не появится. */}
        {nextZone ? (
          <div className="dialogue-next-hint">
            <span className="dialogue-next-dot" style={{ backgroundColor: ZONES[nextZone].hexColor }} />
            <span>
              {language === 'uk' ? 'Далі' : 'Next'}:{' '}
              <strong>{ZONES[nextZone].name[language]}</strong>
            </span>
          </div>
        ) : (
          <div className="dialogue-next-hint complete">
            <span>
              {language === 'uk'
                ? 'Увесь екіпаж на зв’язку — дос’є зібрано'
                : 'Whole crew accounted for — dossier complete'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
