import React from 'react';
import { useRouter } from 'next/router';
import { Container } from '../../src/components/Layout';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { useInvite } from '../../src/contexts/InviteContext';

export default function Consent() {
    const { consentGiven, setConsent } = useInvite();
    const router = useRouter();
    const [agree, setAgree] = React.useState(consentGiven);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const onContinue = async () => {
        setLoading(true);
        setError(null);
        try {
            await setConsent(agree);
            router.push('/invite/waiting');
        } catch (err) {
            setError((err as Error).message || 'Failed to save consent');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <div className="max-w-2xl mx-auto py-12">
                <h1 className="text-2xl font-semibold mb-4">Consent</h1>
                <Card>
                    <p className="text-gray-700 mb-4">By joining this session you agree to share your audio and presence for the duration of the session. This is mocked in the demo and no data leaves your browser.</p>
                    <div className="flex items-start gap-3">
                        <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                        <label htmlFor="agree">I consent to participate in this session (mock)</label>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 items-end">
                        {error && (
                            <div role="alert" aria-live="assertive" className="w-full px-3 py-2 bg-red-50 text-red-800 border border-red-100 rounded">
                                {error}
                            </div>
                        )}
                        <Button onClick={onContinue} disabled={!agree || loading}>{loading ? 'Saving…' : 'Continue'}</Button>
                    </div>
                </Card>
            </div>
        </Container>
    );
}
