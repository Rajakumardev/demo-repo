import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import CategoryIcon, { ICON_NAMES, ICONS } from './icons.jsx';

describe('icons registry', () => {
  it('maps every name to a component', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(0);
    for (const name of ICON_NAMES) {
      expect(ICONS[name]).toBeTruthy();
    }
  });
});

describe('CategoryIcon', () => {
  it('renders the requested icon', () => {
    const { container } = render(<CategoryIcon name="coffee" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('falls back to the tag icon for unknown names', () => {
    const { container } = render(<CategoryIcon name="does-not-exist" size={24} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
