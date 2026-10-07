import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PasswordStrength from './PasswordStrength.jsx';

describe('PasswordStrength', () => {
  it('starts empty and lists every requirement as unmet', () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(screen.getByText('Too weak')).toBeInTheDocument();
    expect(container.querySelectorAll('.password-checklist li')).toHaveLength(5);
    expect(container.querySelectorAll('.password-checklist li.is-met')).toHaveLength(0);
    expect(container.querySelector('.password-strength-bar')).toHaveAttribute('data-score', '0');
  });

  it('reflects a stronger password in the meter and checklist', () => {
    const { container } = render(<PasswordStrength password="Abcd1234!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
    const bar = container.querySelector('.password-strength-bar');
    expect(bar).toHaveAttribute('data-score', '4');
    expect(bar).toHaveStyle({ width: '100%' });
    expect(container.querySelectorAll('.password-checklist li.is-met')).toHaveLength(5);
  });

  it('marks partial progress and announces politely', () => {
    const { container } = render(<PasswordStrength password="aaaaaaaa" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
    expect(container.querySelector('.password-strength')).toHaveAttribute('aria-live', 'polite');
    expect(container.querySelectorAll('.password-checklist li.is-met')).toHaveLength(2);
  });
});
