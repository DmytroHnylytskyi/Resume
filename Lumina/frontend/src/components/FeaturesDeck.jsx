import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, BookOpen, Target, TrendingUp } from 'lucide-react';
import './FeaturesDeck.css';

export default function FeaturesDeck() {
  const { t } = useTranslation();
  const [dealtCount, setDealtCount] = useState(0);

  const features = [
    { id: 'f1', title: t('features.f1_title'), desc: t('features.f1_desc'), icon: <Video size={32} strokeWidth={1.5} color="#ec4899" /> },
    { id: 'f2', title: t('features.f2_title'), desc: t('features.f2_desc'), icon: <BookOpen size={32} strokeWidth={1.5} color="#3b82f6" /> },
    { id: 'f3', title: t('features.f3_title'), desc: t('features.f3_desc'), icon: <Target size={32} strokeWidth={1.5} color="#10b981" /> },
    { id: 'f4', title: t('features.f4_title'), desc: t('features.f4_desc'), icon: <TrendingUp size={32} strokeWidth={1.5} color="#f59e0b" /> }
  ];

  const handleDeckClick = () => {
    if (dealtCount < features.length) {
      setDealtCount(prev => prev + 1);
    } else {
      setDealtCount(0);
    }
  };

  const getCardStyle = (index) => {
    const isDealt = index < dealtCount;
    
    if (!isDealt) {
      // In the deck (Left side, stacked)
      const offset = (features.length - index - 1) * 4;
      return {
        '--card-left': '25%',
        '--card-top': '50%',
        '--card-transform': `translate(-50%, -50%) translateY(-${offset}px) rotate(${offset}deg)`,
        '--card-z': features.length - index
      };
    } else {
      // Dealt on the table (Right side, 2x2 grid)
      const col = index % 2;
      const row = Math.floor(index / 2);
      
      const left = col === 0 ? '60%' : '85%';
      const top = row === 0 ? '30%' : '75%';
      
      const rot = (index % 2 === 0 ? -3 : 4) + (row * 2);

      return {
        '--card-left': left,
        '--card-top': top,
        '--card-transform': `translate(-50%, -50%) rotate(${rot}deg)`,
        '--card-z': index
      };
    }
  };

  return (
    <section className="features-section">
      <div className="features-header">
        <h2>{t('features.title')}</h2>
        <p>{t('features.subtitle')}</p>
      </div>

      <div className="features-arena">
        <div className="deck-base" onClick={handleDeckClick}>
          <span className="pulse-text">
            {dealtCount < features.length ? t('features.click_to_deal', 'Click to deal') : t('features.reset_deck', 'Reset deck')}
          </span>
        </div>

        {dealtCount === 0 && (
          <div className="deck-cover-instruction" onClick={handleDeckClick}>
            <div className="pulse-instruction">
              {t('features.click_to_deal', 'Click to deal')}
            </div>
          </div>
        )}

        {features.map((f, i) => {
          const styleVars = getCardStyle(i);
          return (
            <div 
              key={f.id} 
              className={`feature-card glass-panel ${i < dealtCount ? 'dealt' : 'in-deck'}`}
              style={{
                left: styleVars['--card-left'],
                top: styleVars['--card-top'],
                transform: styleVars['--card-transform'],
                zIndex: styleVars['--card-z']
              }}
              onClick={() => {
                if (i >= dealtCount) handleDeckClick();
              }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
