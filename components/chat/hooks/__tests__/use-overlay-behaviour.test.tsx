import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useRef, useState } from 'react';
import { useOverlayBehaviour, __resetOverlayStack } from '../use-overlay-behaviour';
import { Overlay } from '../../components/overlay';

beforeEach(() => {
  cleanup();
  __resetOverlayStack();
});

function Drawer({ label, onClose }: { label: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useOverlayBehaviour({ isOpen: true, onClose, panelRef });
  return (
    <div ref={panelRef} role="dialog" aria-label={label} tabIndex={-1}>
      <button type="button">inside {label}</button>
    </div>
  );
}

describe('useOverlayBehaviour', () => {
  it('closes the top overlay on Escape, not the one beneath it', () => {
    // The bug: a document-level Escape handler closed the whole console when a
    // drawer sat on top of it, discarding the agent's in-flight input.
    const consoleClose = vi.fn();
    const balanceClose = vi.fn();

    function App() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <Drawer label="console" onClose={consoleClose} />
          {open && <Drawer label="balance" onClose={balanceClose} />}
          <button type="button" onClick={() => setOpen(true)}>
            open
          </button>
        </div>
      );
    }

    render(<App />);
    fireEvent.click(screen.getByText('open'));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(balanceClose).toHaveBeenCalledTimes(1);
    expect(consoleClose).not.toHaveBeenCalled();
  });

  it('does not stack scroll locks and releases cleanly', () => {
    // Real state, so closing actually unmounts — a spy would leave the overlay
    // mounted and the lock correctly held, which is not what this asserts.
    function App() {
      const [consoleOpen, setConsoleOpen] = useState(true);
      const [balanceOpen, setBalanceOpen] = useState(false);
      return (
        <div>
          {consoleOpen && <Drawer label="console" onClose={() => setConsoleOpen(false)} />}
          {balanceOpen && <Drawer label="balance" onClose={() => setBalanceOpen(false)} />}
          <button type="button" onClick={() => setBalanceOpen(true)}>
            open
          </button>
        </div>
      );
    }

    render(<App />);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByText('open'));
    // Two overlays are open: closing one must not unlock the page under the other.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });

  it('moves focus into the overlay on open', () => {
    render(<Drawer label="notes" onClose={() => {}} />);
    expect(document.activeElement).toBe(screen.getByText('inside notes'));
  });

  it('restores focus to the trigger on close', () => {
    function App() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            trigger
          </button>
          {open && <Drawer label="notes" onClose={() => setOpen(false)} />}
        </div>
      );
    }
    render(<App />);
    const trigger = screen.getByText('trigger');
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByText('inside notes'));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab inside the overlay', () => {
    render(
      <Drawer
        label="trapped"
        onClose={() => {}}
      />,
    );
    const inside = screen.getByText('inside trapped');
    inside.focus();

    // One focusable element: Tab must wrap back to itself rather than escaping.
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(inside);
  });

  it('ignores Escape when the overlay is not on top', () => {
    const underClose = vi.fn();
    render(
      <div>
        <Drawer label="under" onClose={underClose} />
        <Drawer label="over" onClose={() => {}} />
      </div>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(underClose).not.toHaveBeenCalled();
  });

  it('unwinds the stack on unmount', () => {
    const { unmount } = render(<Drawer label="temp" onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('Overlay', () => {
  it('exposes dialog semantics and closes on the backdrop', () => {
    const onClose = vi.fn();
    render(
      <Overlay onClose={onClose} label="Chat" panelClassName="p-4">
        <button type="button">inside</button>
      </Overlay>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Chat');

    fireEvent.mouseDown(dialog);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when the click is inside the panel', () => {
    const onClose = vi.fn();
    render(
      <Overlay onClose={onClose} label="Chat" panelClassName="p-4">
        <button type="button">inside</button>
      </Overlay>,
    );
    fireEvent.mouseDown(screen.getByText('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Overlay onClose={onClose} label="Chat" panelClassName="p-4">
        <button type="button">inside</button>
      </Overlay>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
