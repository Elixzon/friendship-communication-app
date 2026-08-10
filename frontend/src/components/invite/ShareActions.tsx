import React from 'react';
import { Button } from '../../components/Button';

export const ShareActions: React.FC<{ code: string | null }> = ({ code }) => {
    const [sharing, setSharing] = React.useState(false);
    const [msg, setMsg] = React.useState<string | null>(null);

    const share = async () => {
        if (!code) return;
        setSharing(true);
        const url = `${location.origin}/invite/join?code=${encodeURIComponent(code)}`;
        const shareNavigator = navigator as Navigator & {
            share?: (data: ShareData) => Promise<void>;
        };
        if (shareNavigator.share) {
            try {
                await shareNavigator.share({ title: 'Join my session', text: 'Join with this link', url });
                setMsg('Shared using system share');
            } catch {
                setMsg('Sharing was cancelled');
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                setMsg('Link copied to clipboard');
            } catch {
                setMsg('Clipboard access is unavailable');
            }
        }
        setTimeout(() => setSharing(false), 600);
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <Button onClick={share} variant="ghost">{sharing ? 'Sharing…' : 'Share'}</Button>
                <Button
                    variant="ghost"
                    onClick={async () => {
                        setMsg('Pretend SMS share — link copied');
                        try {
                            await navigator.clipboard.writeText(`${location.origin}/invite/join?code=${encodeURIComponent(code ?? '')}`);
                        } catch {
                            setMsg('Clipboard access is unavailable');
                        }
                    }}
                >
                    SMS
                </Button>
            </div>
            <div aria-live="polite" className="text-sm text-gray-500">
                {msg}
            </div>
        </div>
    );
};

export default ShareActions;
