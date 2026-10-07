import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Modal from './Modal.jsx';

describe('Modal', () => {
  it('renders the title and children', () => {
    render(
      <Modal title="Edit" onClose={() => {}}>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('closes on the close button', () => {
    const onClose = vi.fn();
    render(<Modal title="Edit" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape but not on other keys', () => {
    const onClose = vi.fn();
    render(<Modal title="Edit" onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked but not the dialog', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Edit" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );

    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(container.querySelector('.modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tolerates a missing onClose handler', () => {
    render(<Modal title="Edit">Body</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
