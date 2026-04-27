import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Dialog } from '../../../../src/common/ds/Dialog/Dialog';
import { Button } from '../../../../src/common/ds/Button/Button';

const meta: Meta<typeof Dialog> = {
  title: 'Primitives/Dialog',
  component: Dialog,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Dialog>;

export const Confirm: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ padding: 24 }}>
          <Button onClick={() => setOpen(true)}>Открыть диалог</Button>
        </div>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Удалить задачу PROJ-1234?"
          actions={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button variant="danger" onClick={() => setOpen(false)}>
                Удалить
              </Button>
            </>
          }
        >
          Это действие нельзя отменить. Связанные MR и ветки останутся нетронутыми.
        </Dialog>
      </div>
    );
  },
};
