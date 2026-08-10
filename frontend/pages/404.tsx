import Link from 'next/link';
import { Container } from '../src/components/Layout';
import Button from '../src/components/Button';

export default function NotFound() {
    return (
        <Container>
            <div className="max-w-xl mx-auto py-12">
                <h1 className="text-3xl font-semibold mb-3">Page not found</h1>
                <p className="text-gray-600 mb-6">This page does not exist or the link is no longer valid.</p>
                <Link href="/" legacyBehavior>
                    <a><Button>Go to EchoDiary</Button></a>
                </Link>
            </div>
        </Container>
    );
}
