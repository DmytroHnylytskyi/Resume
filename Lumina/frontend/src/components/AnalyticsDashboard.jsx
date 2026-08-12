import React, { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { analyticsApi } from '../api/analyticsApi';
import { AuthContext } from './AuthContext';

/**
 * Student Progress Analytics Dashboard.
 *
 * @component
 * @returns {JSX.Element} Rendered UserAnalytics.
 */
export function UserAnalytics() {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-analytics', token],
    queryFn: analyticsApi.getUserAnalytics,
    enabled: !!token,
  });

  if (isError) {
    return (
      <div style={{ padding: '2rem', color: '#ef4444', textAlign: 'center' }}>
        {t('app.error', 'Network error. Please try again.')}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div style={{ padding: '2rem', color: '#fff', textAlign: 'center' }}>
        {t('app.loading')}
      </div>
    );
  }

  return (
    <div className="analytics-container" style={{ margin: '2rem auto', maxWidth: '1200px' }}>
      <div>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>
          {t('analytics.my_progress')}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {data.total_courses}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{t('analytics.total_courses')}</div>
          </div>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0d9488' }}>
              {data.total_lessons_completed}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{t('analytics.completed_lessons')}</div>
          </div>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ea580c' }}>
              {data.total_submissions}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{t('analytics.homeworks')}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            {t('analytics.activity_30d')}
          </h3>
          <div style={{ height: 300, width: '100%' }}>
            {data.activity && data.activity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.activity}>
                  <XAxis dataKey="date" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name={t('analytics.lessons_completed')}
                    stroke="#0d9488"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0d9488' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                {t('analytics.no_activity')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Teacher Management Analytics Dashboard.
 *
 * @component
 * @returns {JSX.Element} Rendered TeacherAnalytics.
 */
export function TeacherAnalytics() {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['teacher-analytics', token],
    queryFn: analyticsApi.getTeacherAnalytics,
    enabled: !!token,
  });

  const COLORS = ['#0d9488', '#ea580c', '#eab308'];

  if (isError) {
    return (
      <div style={{ padding: '2rem', color: '#ef4444', textAlign: 'center' }}>
        {t('app.error', 'Network error. Please try again.')}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div style={{ padding: '2rem', color: '#fff', textAlign: 'center' }}>
        {t('app.loading')}
      </div>
    );
  }

  return (
    <div className="analytics-container" style={{ margin: '2rem auto', maxWidth: '1200px' }}>
      <div>
        <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>
          {t('analytics.teacher_analytics')}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {data.total_students}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{t('analytics.total_students')}</div>
          </div>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0d9488' }}>
              {data.active_assignments}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{t('analytics.active_assignments')}</div>
          </div>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ea580c' }}>
              {data.total_submissions}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{t('analytics.total_submissions')}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            {t('analytics.submission_timeliness')}
          </h3>
          <div style={{ height: 300, width: '100%' }}>
            {data.submissions_status && data.total_submissions > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.submissions_status}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.submissions_status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                {t('analytics.no_submissions')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
