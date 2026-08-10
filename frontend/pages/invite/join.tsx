import React from 'react';
import { useRouter } from 'next/router';
import { Container } from '../../src/components/Layout';
import Card from '../../src/components/Card';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { useInvite } from '../../src/contexts/InviteContext';

export default function JoinSession() {
    const router = useRouter();
    const { code: qcode } = router.query as { code?: string };
    const { joinSession } = useInvite();
    const [code, setCode] = React.useState(qcode ?? '');
    const [name, setName] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const onJoin = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await joinSession(code.trim().toUpperCase(), name || 'Guest');
            router.push('/invite/waiting');
        } catch (err) {
            setError((err as Error).message || 'Failed to join');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (qcode) setCode(String(qcode));
    }, [qcode]);

    return (
        <Container>
            <div className="max-w-xl mx-auto py-12">
                <h1 className="text-2xl font-semibold mb-4">Join a session</h1>
                <form onSubmit={onJoin}>
                    <Card>
                        {error && (
                            <div role="alert" aria-live="assertive" className="mb-3 px-3 py-2 bg-red-50 text-red-800 border border-red-100 rounded">
                                {error}
                            </div>
                        )}
                        <label className="block mb-2 font-medium">Session code</label>
                        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" />

                        <label className="block mt-4 mb-2 font-medium">Your name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we call you?" />

                        <div className="mt-6 flex justify-end">
                            <Button type="submit" disabled={loading}>{loading ? 'Joining…' : 'Join'}</Button>
                        </div>
                    </Card>
                </form>
            </div>
        </Container>
    );
}
