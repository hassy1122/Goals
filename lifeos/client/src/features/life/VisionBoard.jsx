import { useRef, useState } from 'react';
import { useAddBoardImageMutation, useRemoveBoardImageMutation, useReorderBoardMutation } from '../../api/life.api';
import { useUploadFileMutation, useDeleteUploadMutation, uploadUrl } from '../../api/upload.api';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { pushToast } from '../../stores/uiSlice';
import { useDispatch } from 'react-redux';
import { getApiError } from '../../api/base';

const TEXTAREA = 'input';

export default function VisionBoard({ boardImages = [], readOnly = false }) {
  const dispatch = useDispatch();
  const fileRef = useRef(null);
  const [caption, setCaption] = useState('');
  const [uploadFile, { isLoading: uploading }] = useUploadFileMutation();
  const [deleteUpload] = useDeleteUploadMutation();
  const [addBoardImage] = useAddBoardImageMutation();
  const [removeBoardImage] = useRemoveBoardImageMutation();
  const [reorderBoard] = useReorderBoardMutation();

  const onpick = () => fileRef.current?.click();

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const { data } = await uploadFile(file).unwrap();
      await addBoardImage({ uploadId: data.upload.id, caption }).unwrap();
      setCaption('');
      dispatch(pushToast('Added to your vision board', 'success'));
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const onRemove = async (image) => {
    try {
      await removeBoardImage(image._id).unwrap();
      await deleteUpload(image.uploadId).unwrap();
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  const shift = async (index, delta) => {
    const ids = boardImages.map((img) => img._id);
    const swap = index + delta;
    if (swap < 0 || swap >= ids.length) return;
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
    try {
      await reorderBoard(ids).unwrap();
    } catch (err) {
      dispatch(pushToast(getApiError(err), 'error'));
    }
  };

  return (
    <div>
      {!readOnly && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="max-w-xs"
            maxLength={160}
          />
          <Button variant="secondary" onClick={onpick} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Add image'}
          </Button>
          <span className="text-xs text-slate-400 dark:text-slate-500">jpeg · png · webp · up to 5 MB</span>
        </div>
      )}

      {boardImages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
          Your board is empty — pictures pull the future into the present.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {boardImages.map((img, i) => (
            <li key={img._id} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <img src={uploadUrl(img.uploadId)} alt={img.caption || 'Vision board image'} className="aspect-video w-full object-cover" />
              {img.caption && (
                <p className="truncate border-t border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  {img.caption}
                </p>
              )}
              {!readOnly && (
                <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => shift(i, -1)} className="rounded bg-black/60 px-1.5 text-xs text-white" aria-label="Move left">←</button>
                  <button type="button" onClick={() => shift(i, 1)} className="rounded bg-black/60 px-1.5 text-xs text-white" aria-label="Move right">→</button>
                  <button type="button" onClick={() => onRemove(img)} className="rounded bg-rose-600/90 px-1.5 text-xs text-white" aria-label="Remove">✕</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { TEXTAREA };
