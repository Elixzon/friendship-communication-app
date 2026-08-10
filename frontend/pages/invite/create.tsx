import React from 'react';
import { useRouter } from 'next/router';
import { Container, Stack } from '../../src/components/Layout';
import Card from '../../src/components/Card';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import SessionCode from '../../src/components/invite/SessionCode';
import ShareActions from '../../src/components/invite/ShareActions';
import { useInvite } from '../../src/contexts/InviteContext';

export default function CreateSession() {
    const { createSession, sessionCode } = useInvite();
    const [name, setName] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const router = useRouter();

    const onCreate = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await createSession(name || 'Host');
            // go to consent before waiting room
            router.push('/invite/consent');
        } catch (err) {
            setError((err as Error).message || 'Failed to create');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <div className="max-w-xl mx-auto py-12">
                <h1 className="text-2xl font-semibold mb-4">Create a session</h1>
                <form onSubmit={onCreate}>
                    <Stack gap={12}>
                        <Card>
                            {error && (
                                <div role="alert" aria-live="assertive" className="mb-3 px-3 py-2 bg-red-50 text-red-800 border border-red-100 rounded">
                                    {error}
                                </div>
                            )}
                            <label className="block mb-2 font-medium">Your name</label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" />
                        </Card>

                        <Card>
                            <h2 className="text-sm text-gray-600 mb-2">Session code</h2>
                            <SessionCode code={sessionCode} />
                            <div className="mt-3">
                                <ShareActions code={sessionCode} />
                            </div>
                        </Card>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create session'}</Button>
                        </div>
                    </Stack>
                </form>
            </div>
        </Container>
    );
}
