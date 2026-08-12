import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CourseCard from '../components/CourseCard';
import { AuthContext } from '../components/AuthContext';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
  }),
}));

describe('CourseCard', () => {
  const mockAuth = {
    user: { id: 1, email: 'student@lumina.dev' },
    token: 'test-token',
  };

  it('renders course card with title, description, and lesson count', () => {
    render(
      <AuthContext.Provider value={mockAuth}>
        <CourseCard
          id={101}
          title="Python Advanced"
          description="Master async programming and metaclasses"
          lessonsCount={5}
          completedCount={2}
          progress={40}
        />
      </AuthContext.Provider>
    );

    expect(screen.getByText('Python Advanced')).toBeInTheDocument();
    expect(screen.getByText('Master async programming and metaclasses')).toBeInTheDocument();
  });
});
