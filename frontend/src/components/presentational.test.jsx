import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wallet } from 'lucide-react';

import CategoryBadge from './CategoryBadge.jsx';
import EmptyState from './EmptyState.jsx';
import Spinner from './Spinner.jsx';
import StatCard from './StatCard.jsx';

describe('Spinner', () => {
  it('renders an optional label with a status role', () => {
    render(<Spinner label="Loading…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('omits the label when not provided', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('.spinner-label')).toBeNull();
  });
});

describe('StatCard', () => {
  it('renders icon, label, value and hint', () => {
    render(<StatCard icon={Wallet} label="Spent" value="$10" hint="this month" />);
    expect(screen.getByText('Spent')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText('this month')).toBeInTheDocument();
  });

  it('works without an icon or hint', () => {
    render(<StatCard label="Spent" value="$10" />);
    expect(screen.queryByText('this month')).toBeNull();
  });
});

describe('EmptyState', () => {
  it('renders everything it is given', () => {
    render(
      <EmptyState
        icon={Wallet}
        title="Nothing here"
        description="Add something"
        action={<button type="button">Add</button>}
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Add something')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('works with only a title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});

describe('CategoryBadge', () => {
  it('renders the name with its colour dot', () => {
    const { container } = render(<CategoryBadge name="Food" color="#f97316" />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(container.querySelector('.color-dot')).toHaveStyle({ background: '#f97316' });
  });

  it('renders a muted fallback without a name', () => {
    render(<CategoryBadge />);
    expect(screen.getByText('Uncategorised')).toBeInTheDocument();
  });
});
