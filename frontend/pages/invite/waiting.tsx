import React from 'react';
import { useRouter } from 'next/router';
import { Container } from '../../src/components/Layout';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import SessionCode from '../../src/components/invite/SessionCode';
import WaitingList from '../../src/components/invite/WaitingList';
import { useInvite } from '../../src/contexts/InviteContext';
import Loader from '../../src/components/Loader';

export default function WaitingRoom() {
    const { sessionCode, participants, startSession, sessionStarted } = useInvite();
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const router = useRouter();

    const [statusMsg, setStatusMsg] = React.useState<string | null>(null);

    const onStart = async () => {
        if (!sessionCode) return;
        setLoading(true);
        setError(null);
        try {
            await startSession();
            setStatusMsg('Session started. Opening session…');
        } catch (err) {
            setError((err as Error).message || 'Failed to start session');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (sessionStarted) {
            setStatusMsg('Session started. Opening session…');
            const timer = window.setTimeout(() => {
                router.replace('/session');
            }, 300);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [sessionStarted, router]);

    return (
        <Container>
            <div className="max-w-3xl mx-auto py-12">
                <h1 className="text-2xl font-semibold mb-4">Waiting room</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <h2 className="text-lg font-medium mb-2">Session</h2>
                        <SessionCode code={sessionCode} />
                        <div className="mt-4">
                            <Button variant="ghost" onClick={() => navigator?.clipboard?.writeText(sessionCode ?? '')}>Copy link</Button>
                        </div>
                    </Card>

                    <Card>
                        <h2 className="text-lg font-medium mb-2">Participants</h2>
                        <WaitingList participants={participants} />
                    </Card>
                </div>

                <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <Loader />
                        <div className="text-sm text-gray-500">Waiting for participants…</div>
                    </div>
                    <div>
                        <Button onClick={onStart} disabled={loading}>{loading ? 'Starting…' : 'Start session'}</Button>
                    </div>
                </div>
                {error && (
                    <div role="alert" aria-live="assertive" className="mt-3 px-3 py-2 bg-red-50 text-red-800 border border-red-100 rounded">
                        {error}
                    </div>
                )}
                <div aria-live="polite" className="mt-3 text-sm text-green-700">
                    {statusMsg}
                </div>
            </div>
        </Container>
    );
}
