import { API_URL } from '../config';
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

export function UserAnalytics() {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/analytics/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(setData)
      .catch(err => {
        console.error(err);
        setError(t('app.error', 'Network error. Please try again.'));
      });
    }
  }, [token]);

  if (error) return <div style={{padding: '2rem', color: '#ef4444', textAlign: 'center'}}>{error}</div>;
  if (!data) return <div style={{padding: '2rem', color: '#fff', textAlign: 'center'}}>{t('app.loading')}</div>;

  return (
    <div className="analytics-container" style={{
      margin: '2rem auto',
      maxWidth: '1200px'
    }}>
      <div>
        <h2 style={{fontSize: '2rem', marginBottom: '2rem', color: 'var(--text-primary)'}}>{t('analytics.my_progress')}</h2>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem'}}>
          <div className="glass-panel" style={{textAlign: 'center', padding: '1.5rem'}}>
            <div style={{fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)'}}>{data.total_courses}</div>
            <div style={{color: 'var(--text-secondary)'}}>{t('analytics.total_courses')}</div>
          </div>
          <div className="glass-panel" style={{textAlign: 'center', padding: '1.5rem'}}>
            <div style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#0d9488'}}>{data.total_lessons_completed}</div>
            <div style={{color: 'var(--text-secondary)'}}>{t('analytics.completed_lessons')}</div>
          </div>
          <div className="glass-panel" style={{textAlign: 'center', padding: '1.5rem'}}>
            <div style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#ea580c'}}>{data.total_submissions}</div>
            <div style={{color: 'var(--text-secondary)'}}>{t('analytics.homeworks')}</div>
          </div>
        </div>

        <div className="glass-panel" style={{padding: '2rem'}}>
          <h3 style={{marginBottom: '1.5rem', color: 'var(--text-primary)'}}>{t('analytics.activity_30d')}</h3>
          <div style={{height: 300, width: '100%'}}>
            {data.activity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.activity}>
                  <XAxis dataKey="date" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                  <Tooltip contentStyle={{background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)'}} />
                  <Line type="monotone" dataKey="count" name={t('analytics.lessons_completed')} stroke="#0d9488" strokeWidth={3} dot={{r: 4, fill: '#0d9488'}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{color: 'var(--text-secondary)', textAlign: 'center'}}>{t('analytics.no_activity')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeacherAnalytics() {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/analytics/teacher`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(setData)
      .catch(err => {
        console.error(err);
        setError(t('app.error', 'Network error. Please try again.'));
      });
    }
  }, [token]);

  if (error) return <div style={{padding: '2rem', color: '#ef4444', textAlign: 'center'}}>{error}</div>;
  if (!data) return <div style={{padding: '2rem', color: '#fff', textAlign: 'center'}}>{t('app.loading')}</div>;

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="teacher-panel glass-panel-teacher" style={{padding: '2rem'}}>
      <h3 style={{fontSize: '1.5rem', marginBottom: '2rem'}}>{t('analytics.overview')}</h3>
      
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem'}}>
        <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center'}}>
          <div style={{fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-color)'}}>{data.total_students}</div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{t('analytics.total_students')}</div>
        </div>
        <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center'}}>
          <div style={{fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-color)'}}>{data.active_assignments}</div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{t('analytics.active_assignments')}</div>
        </div>
        <div style={{background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center'}}>
          <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b'}}>{data.total_submissions}</div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{t('analytics.received_hw')}</div>
        </div>
      </div>

      <div style={{display: 'flex', flexWrap: 'wrap', gap: '2rem'}}>
        <div style={{flex: '1 1 300px', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px'}}>
          <h4 style={{marginBottom: '1rem', color: 'var(--text-primary)'}}>{t('analytics.deadlines_status')}</h4>
          <div style={{height: 250}}>
            {data.total_submissions > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.submissions_status} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {data.submissions_status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{background: '#222', border: 'none', borderRadius: '8px'}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem'}}>{t('teacher.no_submissions')}</p>
            )}
          </div>
          {data.total_submissions > 0 && (
            <div style={{display: 'flex', justifyContent: 'center', gap: '1rem'}}>
              {data.submissions_status.map((entry, index) => (
                <div key={index} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
                  <div style={{width: 12, height: 12, borderRadius: '50%', background: COLORS[index]}}></div>
                  {entry.name}: {entry.value}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
