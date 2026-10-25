import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';

// Congrats card for finished goals — shown when a mutation returns celebration: true.
export default function CelebrationModal({ open, goalTitle, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Goal completed! 🎉" width="max-w-md">
      <div className="text-center">
        <p className="text-4xl">🏆</p>
        <p className="mt-3 font-semibold">{goalTitle ? `“${goalTitle}” is done.` : 'Goal completed.'}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          That's money in the identity bank. Claim the reward you promised yourself — then aim the next one.
        </p>
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={onClose}>Keep going</Button>
      </div>
    </Modal>
  );
}
