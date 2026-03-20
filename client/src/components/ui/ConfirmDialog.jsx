import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer la suppression',
  message = 'Cette action est irréversible. Voulez-vous continuer ?',
  confirmLabel = 'Confirmer',
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        {/* Icône d'avertissement */}
        <div
          className="flex items-center justify-center h-14 w-14 rounded-full bg-red-100"
          aria-hidden="true"
        >
          <ExclamationTriangleIcon className="h-7 w-7 text-red-600" />
        </div>

        {/* Message de confirmation */}
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>

        {/* Boutons d'action */}
        <div className="flex gap-3 w-full pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn-secondary flex-1"
            aria-label="Annuler l'action"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
            aria-label={confirmLabel}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                <span>Suppression…</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
