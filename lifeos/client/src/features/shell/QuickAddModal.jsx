import { useDispatch, useSelector } from 'react-redux';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { setQuickAddOpen } from '../../stores/uiSlice';

// Phase 1: the shell mount exists; real capture arrives with Tasks & Inbox (Phase 3).
export default function QuickAddModal() {
  const open = useSelector((s) => s.ui.quickAddOpen);
  const dispatch = useDispatch();
  const onClose = () => dispatch(setQuickAddOpen(false));

  return (
    <Modal open={open} onClose={onClose} title="Quick add">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Fast capture gets its real forms with Tasks & Inbox (Phase 3). Until then, Ctrl+K opens the
        command palette for quick navigation.
      </p>
      <div className="mt-4">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
