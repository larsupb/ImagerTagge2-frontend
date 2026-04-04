"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-zinc-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded text-white"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
