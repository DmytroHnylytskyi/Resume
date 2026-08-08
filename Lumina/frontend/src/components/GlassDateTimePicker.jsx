import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './GlassDateTimePicker.css';

const MONTH_NAMES_UK = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS_UK = ['Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// All CSS variable names that need to be forwarded to the portal
const CAL_VARS = [
  '--cal-bg', '--cal-border', '--cal-shadow', '--cal-text', '--cal-text-muted',
  '--cal-today-border', '--cal-today-color', '--cal-selected-bg', '--cal-selected-shadow',
  '--cal-input-bg', '--cal-input-border', '--cal-input-color', '--cal-divider',
  '--cal-nav-bg', '--cal-nav-border', '--cal-nav-hover-bg', '--cal-nav-hover-color',
  '--cal-day-color', '--cal-day-hover-bg',
  '--glass-bg', '--glass-border', '--text-primary'
];

export default function GlassDateTimePicker({ 
  value, 
  onChange, 
  placeholder, 
  popoverDirection = 'up'
}) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });
  const [themeVars, setThemeVars] = useState({});

  const lang = i18n.language || 'en';
  const monthNames = lang.startsWith('uk') ? MONTH_NAMES_UK : MONTH_NAMES_EN;
  const weekdays = lang.startsWith('uk') ? WEEKDAYS_UK : WEEKDAYS_EN;

  // Detect teacher mode for button styling
  const isTeacherView = Boolean(document.querySelector('.app-container.teacher-mode'));

  // Selected state
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  const [selectedDay, setSelectedDay] = useState(value ? initialDate.getDate() : null);
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [hours, setHours] = useState(value ? String(initialDate.getHours()).padStart(2, '0') : '12');
  const [minutes, setMinutes] = useState(value ? String(initialDate.getMinutes()).padStart(2, '0') : '00');

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedDay(d.getDate());
        setSelectedMonth(d.getMonth());
        setSelectedYear(d.getFullYear());
        setViewDate(d);
        setHours(String(d.getHours()).padStart(2, '0'));
        setMinutes(String(d.getMinutes()).padStart(2, '0'));
      }
    }
  }, [value]);

  // Read computed CSS variables from the app root and pass them to the portal
  const readThemeVars = () => {
    const appRoot = document.querySelector('.app-container') || document.documentElement;
    const computed = getComputedStyle(appRoot);
    const vars = {};
    CAL_VARS.forEach(v => {
      const val = computed.getPropertyValue(v).trim();
      if (val) vars[v] = val;
    });
    setThemeVars(vars);
  };

  const updatePopoverCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 380;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let topPos = rect.bottom + 6;
      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        topPos = rect.top - popoverHeight - 6;
      }

      let leftPos = Math.max(10, Math.min(rect.left, window.innerWidth - 320));

      setPopoverCoords({
        top: topPos,
        left: leftPos
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      readThemeVars();
      updatePopoverCoords();
      window.addEventListener('resize', updatePopoverCoords);
      window.addEventListener('scroll', updatePopoverCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updatePopoverCoords);
      window.removeEventListener('scroll', updatePopoverCoords, true);
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target) &&
        !e.target.closest('.glass-datetime-popover-portal')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    const prev = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    setViewDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    setViewDate(next);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const currentMonthDays = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDayOfWeek = getFirstDayOfWeek(viewDate.getFullYear(), viewDate.getMonth());

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    setSelectedMonth(viewDate.getMonth());
    setSelectedYear(viewDate.getFullYear());
  };

  const handleApply = () => {
    if (!selectedDay) {
      setIsOpen(false);
      return;
    }
    const h = Math.min(23, Math.max(0, parseInt(hours) || 0));
    const m = Math.min(59, Math.max(0, parseInt(minutes) || 0));

    const finalDate = new Date(selectedYear, selectedMonth, selectedDay, h, m);
    const yearStr = finalDate.getFullYear();
    const monthStr = String(finalDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(finalDate.getDate()).padStart(2, '0');
    const hourStr = String(finalDate.getHours()).padStart(2, '0');
    const minStr = String(finalDate.getMinutes()).padStart(2, '0');

    const formattedIso = `${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minStr}`;
    onChange(formattedIso);
    setIsOpen(false);
  };

  const formatDisplayValue = () => {
    if (!value) return placeholder || t('courses.select_date', 'Select date & time');
    const d = new Date(value);
    if (isNaN(d.getTime())) return placeholder || t('courses.select_date', 'Select date & time');
    return d.toLocaleString(undefined, { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const today = new Date();

  // Build inline style object that forwards CSS variables to the portal
  const portalStyle = {
    position: 'fixed',
    top: `${popoverCoords.top}px`,
    left: `${popoverCoords.left}px`,
    zIndex: 999999,
    ...themeVars
  };

  return (
    <div className="glass-datetime-wrapper" ref={containerRef}>
      <button 
        type="button" 
        className="glass-datetime-trigger"
        onClick={() => {
          if (!isOpen) {
            readThemeVars();
            updatePopoverCoords();
          }
          setIsOpen(!isOpen);
        }}
      >
        <div className="glass-datetime-trigger-info">
          <Calendar size={16} className="glass-datetime-trigger-icon" />
          <span>{formatDisplayValue()}</span>
        </div>
      </button>

      {isOpen && ReactDOM.createPortal(
        <div 
          className="glass-datetime-popover glass-datetime-popover-portal"
          style={portalStyle}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="calendar-header">
            <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            <div className="calendar-month-year">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <button type="button" className="calendar-nav-btn" onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekdays */}
          <div className="calendar-weekdays">
            {weekdays.map((wd, i) => <span key={i}>{wd}</span>)}
          </div>

          {/* Days Grid */}
          <div className="calendar-days-grid">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day-cell empty-day" />
            ))}
            
            {Array.from({ length: currentMonthDays }).map((_, i) => {
              const day = i + 1;
              const isToday = today.getDate() === day && today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear();
              const isSelected = selectedDay === day && selectedMonth === viewDate.getMonth() && selectedYear === viewDate.getFullYear();

              return (
                <button
                  key={day}
                  type="button"
                  className={`calendar-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Picker */}
          <div className="time-picker-section">
            <div className="time-picker-label">
              <Clock size={15} />
              <span>{t('create.meeting_time', 'Time')}:</span>
            </div>
            <div className="time-inputs-group">
              <input 
                type="number" 
                min="0" 
                max="23" 
                className="time-input-field" 
                value={hours}
                onChange={e => setHours(e.target.value.padStart(2, '0'))}
              />
              <span className="time-separator">:</span>
              <input 
                type="number" 
                min="0" 
                max="59" 
                className="time-input-field" 
                value={minutes}
                onChange={e => setMinutes(e.target.value.padStart(2, '0'))}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="popover-actions">
            <button 
              type="button" 
              className="btn-glass btn-popover-action" 
              onClick={() => setIsOpen(false)}
            >
              <X size={14} />
            </button>
            <button 
              type="button" 
              className={isTeacherView ? "btn-gold btn-popover-action" : "btn-oil btn-popover-action"} 
              onClick={handleApply}
            >
              <Check size={14} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
