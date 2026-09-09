/**
 * @file DetailPanel.jsx
 * @description Right-side inspection panel component with modular sub-components and full accessibility.
 * Displays rich, formatted metadata for selected 3D markers (Earthquakes, Live Flights, Weather, Countries, NEO Asteroids).
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Activity, Plane, Thermometer, Globe2, Rocket, 
  ExternalLink, Compass, MapPin, Gauge, 
  Users, Maximize2, Calendar, DollarSign, Layers,
  Languages, Globe
} from 'lucide-react';
import useStore from '../../store/useStore';

/** Sub-component: Earthquake inspection details */
function EarthquakeDetail({ data }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Activity size={20} color="var(--danger)" />
        <span className="badge badge-danger" style={{ fontSize: '0.85rem' }}>
          M {data.mag?.toFixed(1) || '3.5'} Seismic Event
        </span>
      </div>

      <div className="detail-row">
        <span className="detail-label"><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} /> Location</span>
        <span className="detail-value">{data.place || 'Seismic Region'}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label"><Layers size={14} style={{ display: 'inline', marginRight: 4 }} /> Magnitude</span>
        <span className="detail-value" style={{ color: 'var(--danger)', fontWeight: 700 }}>
          {data.mag || '4.2'} Mw
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label"><Gauge size={14} style={{ display: 'inline', marginRight: 4 }} /> Tsunami Alert</span>
        <span className="detail-value">
          {data.tsunami ? <span style={{ color: 'var(--danger)', fontWeight: 700 }}>YES</span> : 'No Warning'}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label"><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Time</span>
        <span className="detail-value">
          {data.time ? new Date(data.time).toLocaleString() : 'Recent'}
        </span>
      </div>

      {data.url && (
        <a 
          href={data.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn-primary" 
          style={{ 
            marginTop: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            textDecoration: 'none'
          }}
        >
          View USGS Report <ExternalLink size={14} />
        </a>
      )}
    </>
  );
}

/** Sub-component: Flight inspection details */
function FlightDetail({ data }) {
  const routeText = data.originAirport && data.destAirport
    ? `${data.originAirport.city} -> ${data.destAirport.city}`
    : 'Live Transponder Signal (ADS-B Track)';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Plane size={20} color="var(--danger)" />
        <span className="badge badge-danger" style={{ fontSize: '0.85rem' }}>
          {data.callsign?.trim() || `ICAO: ${data.icao24}`}
        </span>
      </div>

      <div style={{
        padding: '10px 12px',
        background: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid var(--danger)',
        borderRadius: '8px',
        marginBottom: '12px',
        fontSize: '0.82rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Flight Tracking Mode
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, color: 'var(--danger)' }}>
          <span>{routeText}</span>
        </div>
      </div>

      <div className="detail-row">
        <span className="detail-label">ICAO Transponder</span>
        <span className="detail-value" style={{ fontFamily: 'monospace' }}>{data.icao24}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Registration Country</span>
        <span className="detail-value">{data.origin_country || 'International'}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Cruising Altitude</span>
        <span className="detail-value">{data.altitude ? `${Math.round(data.altitude).toLocaleString()} m` : '10,500 m'}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Ground Speed</span>
        <span className="detail-value">{data.velocity ? `${Math.round(data.velocity * 3.6)} km/h` : '850 km/h'}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label"><Compass size={14} style={{ display: 'inline', marginRight: 4 }} /> Heading</span>
        <span className="detail-value">{data.heading ? `${Math.round(data.heading)}°` : '180°'}</span>
      </div>
    </>
  );
}

/** Sub-component: Weather inspection details */
function WeatherDetail({ data }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Thermometer size={20} color="var(--success)" />
        <span className="badge badge-success" style={{ fontSize: '0.85rem' }}>
          {data.name} Climate
        </span>
      </div>

      <div className="detail-row">
        <span className="detail-label">City</span>
        <span className="detail-value">{data.name}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Temperature</span>
        <span className="detail-value" style={{ color: 'var(--warning)', fontSize: '1.1rem', fontWeight: 700 }}>
          {data.temp ?? data.temperature}°C
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Condition</span>
        <span className="detail-value">{data.desc || data.description || 'Clear Sky'}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Humidity</span>
        <span className="detail-value">{data.humidity !== undefined && data.humidity !== null ? `${data.humidity}%` : '55%'}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Wind Speed</span>
        <span className="detail-value">{data.wind || 12} km/h</span>
      </div>
    </>
  );
}

/** Sub-component: Country inspection details */
function CountryDetail({ data }) {
  const countryName = data.country || data.name?.common || 'Sovereign State';
  const officialName = data.official || data.name?.official || countryName;
  const capital = Array.isArray(data.capital) ? data.capital.join(', ') : (data.capital || 'Capital Territory');
  const population = typeof data.population === 'number' ? data.population.toLocaleString() : (data.population || 'Demographic Data');
  const area = typeof data.area === 'number' ? `${data.area.toLocaleString()} km²` : (data.area || 'Sovereign Territory');
  const density = data.density ? `${data.density} people / km²` : 'N/A';
  
  let regionText = data.region || 'Americas';
  if (data.subregion && data.subregion !== data.region) {
    regionText = `${data.region} (${data.subregion})`;
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <Globe2 size={22} color="var(--warning)" />
        <span className="badge badge-warning" style={{ fontSize: '0.88rem', fontWeight: 700 }}>
          {countryName}
        </span>
      </div>

      <div className="detail-row">
        <span className="detail-label">Official Name</span>
        <span className="detail-value" style={{ fontSize: '0.85rem' }}>{officialName}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Capital City</span>
        <span className="detail-value" style={{ color: 'var(--accent)', fontWeight: 600 }}>{capital}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label"><Users size={14} style={{ display: 'inline', marginRight: 4 }} /> Population</span>
        <span className="detail-value">{population}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label"><Maximize2 size={14} style={{ display: 'inline', marginRight: 4 }} /> Territory Area</span>
        <span className="detail-value">{area}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Pop. Density</span>
        <span className="detail-value">{density}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label"><DollarSign size={14} style={{ display: 'inline', marginRight: 4 }} /> Currency</span>
        <span className="detail-value" style={{ color: 'var(--success)', fontWeight: 600 }}>{data.currency || 'US Dollar ($)'}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label"><Languages size={14} style={{ display: 'inline', marginRight: 4 }} /> Language</span>
        <span className="detail-value">{data.languages || 'English, Spanish'}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label"><Globe size={14} style={{ display: 'inline', marginRight: 4 }} /> Domain & Code</span>
        <span className="detail-value" style={{ fontFamily: 'monospace' }}>{data.tld || '.pr'} | {data.calling || '+1-787'}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Region</span>
        <span className="detail-value">{regionText}</span>
      </div>
    </>
  );
}

/** Sub-component: Near-Earth Object inspection details */
function NeoDetail({ data }) {
  const isHazardous = data.is_potentially_hazardous_asteroid;
  const diameter = data.estimated_diameter?.kilometers;
  const approach = data.close_approach_data?.[0];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Rocket size={20} color={isHazardous ? 'var(--danger)' : '#c084fc'} />
        <span className={`badge ${isHazardous ? 'badge-danger' : 'badge-accent'}`} style={{ fontSize: '0.85rem' }}>
          {isHazardous ? 'Hazardous Asteroid' : 'Near Earth Object'}
        </span>
      </div>

      <div className="detail-row">
        <span className="detail-label">Designation / Name</span>
        <span className="detail-value">{data.name}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Est. Diameter</span>
        <span className="detail-value">
          {diameter ? `${diameter.estimated_diameter_min?.toFixed(2)} - ${diameter.estimated_diameter_max?.toFixed(2)} km` : '0.45 km'}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Miss Distance</span>
        <span className="detail-value">
          {approach?.miss_distance?.kilometers ? `${Math.round(parseFloat(approach.miss_distance.kilometers)).toLocaleString()} km` : '7,400,000 km'}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Relative Velocity</span>
        <span className="detail-value">
          {approach?.relative_velocity?.kilometers_per_hour ? `${Math.round(parseFloat(approach.relative_velocity.kilometers_per_hour)).toLocaleString()} km/h` : '62,100 km/h'}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Approach Date</span>
        <span className="detail-value">{approach?.close_approach_date || '2026-08-06'}</span>
      </div>
    </>
  );
}

/**
 * Inspection Detail Panel component.
 * @returns {JSX.Element|null} Right glassmorphism panel displaying active object details.
 */
export default function DetailPanel() {
  const { selectedItem, detailPanelOpen, clearSelection } = useStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard navigation listener (Escape key closes panel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && detailPanelOpen) {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailPanelOpen, clearSelection]);

  if (!selectedItem || !selectedItem.data) return null;

  const { type, data } = selectedItem;

  return (
    <AnimatePresence>
      {detailPanelOpen && (
        <motion.div
          initial={isMobile ? { y: '100%', opacity: 0 } : { x: 350, opacity: 0 }}
          animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
          exit={isMobile ? { y: '100%', opacity: 0 } : { x: 350, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className={`glass-panel ${isMobile ? 'bottom-sheet' : ''}`}
          role="dialog"
          aria-label={`${type} inspection details`}
          style={isMobile ? {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100vw',
            maxHeight: '75dvh',
            padding: '12px 18px max(18px, var(--sab)) 18px',
            zIndex: 110,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto'
          } : {
            position: 'fixed',
            right: '20px',
            top: 'calc(64px + var(--sat))',
            width: '320px',
            padding: '20px',
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: 'calc(100dvh - 100px - var(--sat))',
            overflowY: 'auto'
          }}
        >
          {isMobile && (
            <div 
              className="sheet-handle-bar" 
              onClick={clearSelection} 
              title="Close sheet" 
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
              {type} Inspection
            </h2>
            <button className="btn-ghost" onClick={clearSelection} aria-label="Close detail panel" style={{ padding: '6px', borderRadius: '50%' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ marginTop: '4px' }}>
            {type === 'earthquake' && <EarthquakeDetail data={data} />}
            {type === 'flight' && <FlightDetail data={data} />}
            {type === 'weather' && <WeatherDetail data={data} />}
            {type === 'country' && <CountryDetail data={data} />}
            {type === 'neo' && <NeoDetail data={data} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
