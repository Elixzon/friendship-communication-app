import React from 'react';
import { Container, Stack } from '../src/components/Layout';
import Button from '../src/components/Button';
import Input from '../src/components/Input';
import Textarea from '../src/components/Textarea';
import Card from '../src/components/Card';
import Badge from '../src/components/Badge';
import Loader from '../src/components/Loader';
import ProgressBar from '../src/components/ProgressBar';
import Modal from '../src/components/Modal';

export default function Showcase() {
    const [open, setOpen] = React.useState(false);
    return (
        <Container>
            <h1 className="text-2xl font-semibold my-6">Component Showcase</h1>
            <Stack gap={16}>
                <Card>
                    <h2 className="text-lg font-medium mb-2">Buttons</h2>
                    <div className="flex gap-2">
                        <Button>Primary</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="danger">Danger</Button>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-lg font-medium mb-2">Form controls</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Input label="Name" placeholder="Your name" />
                        <Textarea label="Reflection" placeholder="A short reflection" />
                    </div>
                </Card>

                <Card>
                    <h2 className="text-lg font-medium mb-2">Badge, Loader, Progress</h2>
                    <div className="flex items-center gap-4">
                        <Badge>New</Badge>
                        <Loader />
                        <div style={{ width: 200 }}>
                            <ProgressBar value={40} />
                        </div>
                    </div>
                </Card>

                <Card>
                    <h2 className="text-lg font-medium mb-2">Modal</h2>
                    <Button onClick={() => setOpen(true)}>Open Modal</Button>
                    <Modal open={open} onClose={() => setOpen(false)} title="Sample Modal">
                        <p>This is a simple modal for the showcase.</p>
                    </Modal>
                </Card>
            </Stack>
        </Container>
    );
}
