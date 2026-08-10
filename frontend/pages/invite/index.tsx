import React from 'react';
import Link from 'next/link';
import { Container, Stack } from '../../src/components/Layout';
import Button from '../../src/components/Button';
import Card from '../../src/components/Card';

export default function InviteLanding() {
    return (
        <Container>
            <div className="max-w-2xl mx-auto py-12">
                <h1 className="text-3xl font-semibold mb-4">Invite people to your session</h1>
                <p className="text-gray-600 mb-6">Create a temporary session code, share with people, and meet in the waiting room.</p>

                <Stack gap={16}>
                    <Card>
                        <h2 className="text-lg font-medium mb-2">Create a session</h2>
                        <Link href="/invite/create" legacyBehavior>
                            <a>
                                <Button>Get started</Button>
                            </a>
                        </Link>
                    </Card>

                    <Card>
                        <h2 className="text-lg font-medium mb-2">Join with a code</h2>
                        <Link href="/invite/join" legacyBehavior>
                            <a>
                                <Button variant="ghost">Enter a code</Button>
                            </a>
                        </Link>
                    </Card>
                </Stack>
            </div>
        </Container>
    );
}
