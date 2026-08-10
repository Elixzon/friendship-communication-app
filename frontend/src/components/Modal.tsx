import React from 'react';

export const Modal: React.FC<React.PropsWithChildren<{
    open: boolean;
    onClose: () => void;
    title?: string;
}>> = ({ open, onClose, title, children }) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const previouslyFocused = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
        if (!open) return;
        previouslyFocused.current = document.activeElement as HTMLElement | null;
        // focus the modal container
        const el = containerRef.current;
        const focusable = el?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        (focusable ?? el)?.focus();

        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Tab') {
                // simple focus trap
                const focusableEls = el?.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusableEls || focusableEls.length === 0) return;
                const first = focusableEls[0];
                const last = focusableEls[focusableEls.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            if (previouslyFocused.current) previouslyFocused.current.focus();
        };
    }, [open, onClose]);

    if (!open) return null;
    const titleId = title ? 'modal-title' : undefined;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
            <div
                ref={containerRef}
                tabIndex={-1}
                className="bg-white rounded-md shadow-lg z-10 max-w-lg w-full p-6"
            >
                {title && (
                    <h2 id={titleId} className="text-lg font-semibold mb-2">
                        {title}
                    </h2>
                )}
                <div>{children}</div>
                <div className="mt-4 text-right">
                    <button className="px-3 py-2 bg-gray-100 rounded-md" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
