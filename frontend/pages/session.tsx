import React from 'react';
import { useRouter } from 'next/router';
import { Container } from '../src/components/Layout';
import Card from '../src/components/Card';
import Button from '../src/components/Button';
import WaitingList from '../src/components/invite/WaitingList';
import { useInvite } from '../src/contexts/InviteContext';

type Question = {
    id: number;
    text: string;
    category: string;
    index: number;
    total: number;
};

export default function SessionPage() {
    const router = useRouter();

    const {
        sessionCode,
        participants,
        participantId,
        sessionStarted,
        sessionCompleted,
        reset,
    } = useInvite();

    const [question, setQuestion] = React.useState<Question | null>(null);
    const [answer, setAnswer] = React.useState('');
    const [loadingQuestion, setLoadingQuestion] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);
    const [waiting, setWaiting] = React.useState(false);
    const [finished, setFinished] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    /*
     * IMPORTANT:
     * Your participant ID is stored by the invite flow.
     * We try the common localStorage keys used by the app.
     */
    const getParticipantId = () => {
        if (typeof window === 'undefined') return null;

        const possibleKeys = [
            'participantId',
            'participant_id',
            'friendship_participant_id',
            'sessionParticipantId',
        ];

        for (const key of possibleKeys) {
            const value = window.localStorage.getItem(key);
            if (value) return value;
        }

        // Also check the stored invite/session object if one exists.
        const possibleObjects = [
            'invite',
            'session',
            'friendshipSession',
        ];

        for (const key of possibleObjects) {
            try {
                const raw = window.localStorage.getItem(key);
                if (!raw) continue;

                const data = JSON.parse(raw);

                if (data?.participantId) return data.participantId;
                if (data?.participant_id) return data.participant_id;
                if (data?.participant?.id) return data.participant.id;
            } catch {
                // Ignore invalid localStorage JSON.
            }
        }

        return null;
    };

    const loadQuestion = React.useCallback(async () => {
        if (!sessionCode) return;

        setLoadingQuestion(true);
        setError(null);
        setWaiting(false);

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/session/${encodeURIComponent(
                    sessionCode
                )}/question`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.detail || 'Failed to load question');
            }

            if (data.finished) {
                setFinished(true);
                setQuestion(null);
                return;
            }

            setQuestion(data.question);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load question'
            );
        } finally {
            setLoadingQuestion(false);
        }
    }, [sessionCode]);

    React.useEffect(() => {
        if (sessionCode && sessionStarted) {
            loadQuestion();
        }
    }, [sessionCode, sessionStarted, loadQuestion]);

    React.useEffect(() => {
        const handleNextQuestion = () => {
            setAnswer('');
            setFinished(false);
            loadQuestion();
        };
        const handleSessionCompleted = () => {
            setWaiting(false);
            setFinished(true);
            setQuestion(null);
        };

        window.addEventListener('friendship-question-next', handleNextQuestion);
        window.addEventListener('friendship-session-completed', handleSessionCompleted);
        return () => {
            window.removeEventListener('friendship-question-next', handleNextQuestion);
            window.removeEventListener('friendship-session-completed', handleSessionCompleted);
        };
    }, [loadQuestion]);

    React.useEffect(() => {
        if (sessionCompleted) {
            setWaiting(false);
            setFinished(true);
            setQuestion(null);
            setLoadingQuestion(false);
        }
    }, [sessionCompleted]);

    const submitAnswer = async () => {
        if (!sessionCode || !question || !answer.trim()) {
            return;
        }


        if (!participantId) {
            setError(
                'Participant ID was not found. Please leave and join the session again.'
            );
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/session/${encodeURIComponent(
                    sessionCode
                )}/answer`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        participant_id: participantId,
                        question_index: question.index,
                        answer: answer.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.detail || 'Failed to submit answer'
                );
            }

            setAnswer('');

            if (data.status === 'waiting') {
                setWaiting(true);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to submit answer'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const leaveSession = () => {
        reset();
        router.replace('/');
    };

    if (!sessionCode || !sessionStarted) {
        return (
            <Container>
                <div className="max-w-xl mx-auto py-12">
                    <h1 className="text-2xl font-semibold mb-3">
                        No active session
                    </h1>

                    <p className="text-gray-600 mb-6">
                        Create or join a session to continue.
                    </p>

                    <Button onClick={() => router.replace('/')}>
                        Go to Friendship Communication
                    </Button>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <div className="max-w-3xl mx-auto py-12">

                {/* HEADER */}
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold mb-2">
                        Friendship Session
                    </h1>

                    <p className="text-gray-600">
                        Session code:{' '}
                        <span className="font-mono font-semibold">
                            {sessionCode}
                        </span>
                    </p>
                </div>

                {/* PARTICIPANTS */}
                <Card>
                    <h2 className="text-lg font-medium mb-3">
                        Participants
                    </h2>

                    <WaitingList participants={participants} />
                </Card>

                {/* ERROR */}
                {error && (
                    <div
                        role="alert"
                        className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
                    >
                        {error}
                    </div>
                )}

                {/* LOADING */}
                {loadingQuestion && !finished && (
                    <Card>
                        <div className="py-8 text-center">
                            <p className="text-gray-500">
                                Loading your question...
                            </p>
                        </div>
                    </Card>
                )}

                {/* QUESTION */}
                {!loadingQuestion && question && !finished && !waiting && (
                    <Card>
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-gray-500">
                                    Question {question.index + 1} of{' '}
                                    {question.total}
                                </span>

                                <span className="text-xs rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                                    {question.category}
                                </span>
                            </div>

                            <h2 className="text-2xl font-semibold leading-relaxed">
                                {question.text}
                            </h2>
                        </div>

                        <textarea
                            value={answer}
                            onChange={(event) =>
                                setAnswer(event.target.value)
                            }
                            placeholder="Write your honest answer..."
                            rows={6}
                            maxLength={5000}
                            disabled={submitting}
                            className="w-full rounded-lg border border-gray-300 p-4 outline-none focus:border-gray-500 resize-none"
                        />

                        <div className="mt-2 text-right text-xs text-gray-400">
                            {answer.length}/5000
                        </div>

                        <div className="mt-5">
                            <Button
                                onClick={submitAnswer}
                                disabled={
                                    submitting || !answer.trim()
                                }
                            >
                                {submitting
                                    ? 'Submitting...'
                                    : 'Submit answer'}
                            </Button>
                        </div>

                        <p className="mt-4 text-sm text-gray-500">
                            Your answer is private. Your friend will not
                            see what you wrote.
                        </p>
                    </Card>
                )}

                {/* WAITING FOR FRIEND */}
                {waiting && !finished && (
                    <Card>
                        <div className="py-10 text-center">
                            <div className="text-4xl mb-4">
                                💭
                            </div>

                            <h2 className="text-xl font-semibold mb-2">
                                Waiting for your friend...
                            </h2>

                            <p className="text-gray-500">
                                Your answer has been recorded privately.
                                We&apos;ll move forward when both of you
                                have answered.
                            </p>
                        </div>
                    </Card>
                )}

                {/* FINISHED */}
                {finished && (
                    <Card>
                        <div className="py-10 text-center">
                            <div className="text-5xl mb-4">
                                ❤️
                            </div>

                            <h2 className="text-2xl font-semibold mb-3">
                                You&apos;ve both finished.
                            </h2>

                            <p className="text-gray-600">
                                Your private answers are being used to
                                understand what this friendship may be
                                leaving unspoken.
                            </p>
                        </div>
                    </Card>
                )}

                {/* LEAVE */}
                <div className="mt-6">
                    <Button
                        variant="ghost"
                        onClick={leaveSession}
                    >
                        Leave session
                    </Button>
                </div>
            </div>
        </Container>
    );
}
