import React from 'react';
import { Button } from '../../components/Button';

export const SessionCode: React.FC<{ code: string | null }> = ({ code }) => {
    const [copied, setCopied] = React.useState(false);

    const copy = async () => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-gray-50 border rounded-md font-mono text-lg tracking-widest">{code ?? '—'}</div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={copy} aria-label="Copy session code">
                    {copied ? 'Copied' : 'Copy'}
                </Button>
                <div aria-live="polite" className="sr-only">
                    {copied ? 'Session code copied' : ''}
                </div>
            </div>
        </div>
    );
};

export default SessionCode;
