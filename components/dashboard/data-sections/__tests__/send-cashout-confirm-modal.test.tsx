import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SendCashoutConfirmModal } from '../send-cashout-confirm-modal';

describe('SendCashoutConfirmModal', () => {
  it('prefills the cashout amount and sends the edited value', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <SendCashoutConfirmModal
        isOpen
        cashoutAmount="100"
        providerLabel="Binpay"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const amountInput = screen.getByRole('textbox', { name: 'Amount to send' });
    expect(amountInput).toHaveValue('100.00');
    expect(screen.getByText(/Must be between \$10\.00 – \$110\.00/)).toBeInTheDocument();

    await user.clear(amountInput);
    await user.type(amountInput, '97.50');
    await user.click(screen.getByRole('button', { name: 'Send to Binpay' }));

    expect(onConfirm).toHaveBeenCalledWith(97.5);
  });

  it('blocks amounts outside 10% to 110% of the cashout', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <SendCashoutConfirmModal
        isOpen
        cashoutAmount="100"
        providerLabel="Binpay"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const amountInput = screen.getByRole('textbox', { name: 'Amount to send' });
    await user.clear(amountInput);
    await user.type(amountInput, '5');
    await user.click(screen.getByRole('button', { name: 'Send to Binpay' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Amount must be between $10.00 and $110.00.')).toBeInTheDocument();
  });
});
