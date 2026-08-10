import React from 'react';
import {
    createInviteWebSocket,
    InviteMessage,
} from '../websocket';

import {
    createSession as createSessionApi,
    getSession,
    joinSession as joinSessionApi,
    postConsent,
    postStart,
} from '../api';

import type { Participant } from '../api';

type InviteState = {
    sessionCode: string | null;
    participants: Participant[];
    consentGiven: boolean;
    participantId: string | null;
    sessionStarted: boolean;
    sessionCompleted: boolean;
};

type InviteActions = {
    createSession: (name?: string) => Promise<string>;
    joinSession: (code: string, name: string) => Promise<void>;
    setConsent: (value: boolean) => Promise<void>;
    startSession: () => Promise<void>;
    reset: () => void;
};

const InviteContext = React.createContext<
    (InviteState & InviteActions) | undefined
>(undefined);

const STORAGE_KEYS = {
    sessionCode: 'friendship_session_code',
    participantId: 'friendship_participant_id',
    consent: 'friendship_consent',
    sessionStarted: 'friendship_session_started',
    sessionCompleted: 'friendship_session_completed',
};

export const InviteProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [sessionCode, setSessionCode] =
        React.useState<string | null>(null);

    const [participants, setParticipants] =
        React.useState<Participant[]>([]);

    const [consentGiven, setConsentGiven] =
        React.useState(false);

    const [participantId, setParticipantId] =
        React.useState<string | null>(null);

    const [sessionStarted, setSessionStarted] =
        React.useState(false);

    const [sessionCompleted, setSessionCompleted] =
        React.useState(false);

    const wsRef =
        React.useRef<WebSocket | null>(null);

    const reconnectTimerRef =
        React.useRef<number | null>(null);

    const shouldReconnectRef =
        React.useRef(false);

    const participantIdRef =
        React.useRef<string | null>(null);

    const sessionCodeRef =
        React.useRef<string | null>(null);

    React.useEffect(() => {
        participantIdRef.current = participantId;
    }, [participantId]);

    React.useEffect(() => {
        sessionCodeRef.current = sessionCode;
    }, [sessionCode]);

    /*
     * ---------------------------------------------------------
     * Storage
     * ---------------------------------------------------------
     */

    const clearStoredSession = React.useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.removeItem(
            STORAGE_KEYS.sessionCode
        );

        window.localStorage.removeItem(
            STORAGE_KEYS.participantId
        );

        window.localStorage.removeItem(
            STORAGE_KEYS.consent
        );

        window.localStorage.removeItem(
            STORAGE_KEYS.sessionStarted
        );

        window.localStorage.removeItem(
            STORAGE_KEYS.sessionCompleted
        );
    }, []);

    /*
     * ---------------------------------------------------------
     * WebSocket disconnect
     * ---------------------------------------------------------
     */

    const disconnectWs = React.useCallback(() => {
        shouldReconnectRef.current = false;

        if (reconnectTimerRef.current !== null) {
            window.clearTimeout(
                reconnectTimerRef.current
            );

            reconnectTimerRef.current = null;
        }

        try {
            wsRef.current?.close();
        } catch {
            // Ignore WebSocket close errors.
        }

        wsRef.current = null;
    }, []);

    /*
     * ---------------------------------------------------------
     * WebSocket message handling
     * ---------------------------------------------------------
     */

    const handleWebSocketMessage =
        React.useCallback(
            (message: InviteMessage) => {
                /*
                 * Participant joined
                 */
                if (
                    message.type ===
                    'participant.joined'
                ) {
                    setParticipants((previous) => {
                        if (
                            previous.some(
                                (participant) =>
                                    participant.id ===
                                    message
                                        .participant
                                        .id
                            )
                        ) {
                            return previous;
                        }

                        return [
                            ...previous,
                            message.participant,
                        ];
                    });

                    return;
                }

                /*
                 * Participant left
                 */
                if (
                    message.type ===
                    'participant.left'
                ) {
                    setParticipants((previous) =>
                        previous.filter(
                            (participant) =>
                                participant.id !==
                                message.participantId
                        )
                    );

                    return;
                }

                /*
                 * Consent updated
                 */
                if (
                    message.type ===
                    'consent.updated'
                ) {
                    setParticipants((previous) =>
                        previous.map(
                            (participant) =>
                                participant.id ===
                                    message.participantId
                                    ? {
                                        ...participant,
                                        consent:
                                            message.consent,
                                    }
                                    : participant
                        )
                    );

                    if (
                        message.participantId ===
                        participantIdRef.current
                    ) {
                        setConsentGiven(
                            message.consent
                        );

                        if (
                            typeof window !==
                            'undefined'
                        ) {
                            window.localStorage.setItem(
                                STORAGE_KEYS.consent,
                                String(
                                    message.consent
                                )
                            );
                        }
                    }

                    return;
                }

                /*
                 * Host started
                 */
                if (
                    message.type ===
                    'host.started'
                ) {
                    setSessionStarted(true);

                    if (
                        typeof window !==
                        'undefined'
                    ) {
                        window.localStorage.setItem(
                            STORAGE_KEYS.sessionStarted,
                            'true'
                        );
                    }

                    return;
                }

                /*
                 * Both participants answered.
                 *
                 * The backend sends question.next.
                 * We notify pages/session.tsx so it
                 * can fetch the current question.
                 */
                if (
                    (message as any).type ===
                    'question.next'
                ) {
                    window.dispatchEvent(
                        new CustomEvent(
                            'friendship-question-next',
                            {
                                detail: {
                                    currentQuestion:
                                        (
                                            message as any
                                        )
                                            .currentQuestion,
                                    totalQuestions:
                                        (
                                            message as any
                                        )
                                            .totalQuestions,
                                },
                            }
                        )
                    );

                    return;
                }

                /*
                 * Session completed
                 */
                if (
                    (message as any).type ===
                    'session.completed'
                ) {
                    setSessionCompleted(true);

                    if (
                        typeof window !==
                        'undefined'
                    ) {
                        window.localStorage.setItem(
                            STORAGE_KEYS.sessionCompleted,
                            'true'
                        );
                    }

                    window.dispatchEvent(
                        new CustomEvent(
                            'friendship-session-completed'
                        )
                    );

                    return;
                }

                /*
                 * Session closed
                 */
                if (
                    message.type ===
                    'session.closed'
                ) {
                    disconnectWs();

                    setSessionCode(null);
                    setParticipants([]);
                    setConsentGiven(false);
                    setParticipantId(null);
                    setSessionStarted(false);
                    setSessionCompleted(false);

                    clearStoredSession();

                    return;
                }
            },
            [
                disconnectWs,
                clearStoredSession,
            ]
        );

    /*
     * ---------------------------------------------------------
     * Open WebSocket
     * ---------------------------------------------------------
     */

    const openWs = React.useCallback(
        (
            code: string,
            pid?: string | null
        ) => {
            const socket =
                createInviteWebSocket(
                    code,
                    pid ?? undefined,
                    {
                        onMessage:
                            handleWebSocketMessage,

                        onClose: () => {
                            if (
                                !shouldReconnectRef.current
                            ) {
                                return;
                            }

                            if (
                                wsRef.current !==
                                socket
                            ) {
                                return;
                            }

                            if (
                                reconnectTimerRef.current !==
                                null
                            ) {
                                return;
                            }

                            reconnectTimerRef.current =
                                window.setTimeout(
                                    () => {
                                        reconnectTimerRef.current =
                                            null;

                                        if (
                                            !shouldReconnectRef.current
                                        ) {
                                            return;
                                        }

                                        const code =
                                            sessionCodeRef.current;

                                        const pid =
                                            participantIdRef.current;

                                        if (code) {
                                            openWs(
                                                code,
                                                pid
                                            );
                                        }
                                    },
                                    1000
                                );
                        },
                    }
                );

            wsRef.current = socket;
        },
        [handleWebSocketMessage]
    );

    /*
     * ---------------------------------------------------------
     * Connect WebSocket
     * ---------------------------------------------------------
     */

    const connectWs = React.useCallback(
        (
            code: string,
            pid?: string | null
        ) => {
            disconnectWs();

            shouldReconnectRef.current = true;

            openWs(code, pid);
        },
        [
            disconnectWs,
            openWs,
        ]
    );

    /*
     * ---------------------------------------------------------
     * Restore session after browser refresh
     * ---------------------------------------------------------
     */

    React.useEffect(() => {
        if (
            typeof window === 'undefined'
        ) {
            return;
        }

        const savedCode =
            window.localStorage.getItem(
                STORAGE_KEYS.sessionCode
            );

        const savedParticipantId =
            window.localStorage.getItem(
                STORAGE_KEYS.participantId
            );

        const savedConsent =
            window.localStorage.getItem(
                STORAGE_KEYS.consent
            );

        const savedStarted =
            window.localStorage.getItem(
                STORAGE_KEYS.sessionStarted
            );

        const savedCompleted =
            window.localStorage.getItem(
                STORAGE_KEYS.sessionCompleted
            );

        if (
            !savedCode ||
            !savedParticipantId
        ) {
            return;
        }

        const restoreSession =
            async () => {
                try {
                    const code =
                        savedCode.toUpperCase();

                    const session =
                        await getSession(
                            code
                        );

                    if (!session) {
                        clearStoredSession();
                        return;
                    }

                    setSessionCode(code);

                    setParticipantId(
                        savedParticipantId
                    );

                    setParticipants(
                        session.participants ??
                        []
                    );

                    const participant =
                        session.participants?.find(
                            (item) =>
                                item.id ===
                                savedParticipantId
                        );

                    if (participant) {
                        setConsentGiven(
                            participant.consent ??
                            savedConsent ===
                            'true'
                        );
                    } else {
                        setConsentGiven(
                            savedConsent ===
                            'true'
                        );
                    }

                    const started =
                        session.status ===
                        'started' ||
                        session.status ===
                        'completed' ||
                        savedStarted ===
                        'true';

                    const completed =
                        session.status ===
                        'completed' ||
                        savedCompleted ===
                        'true';

                    setSessionStarted(
                        started
                    );

                    setSessionCompleted(
                        completed
                    );

                    connectWs(
                        code,
                        savedParticipantId
                    );
                } catch (error) {
                    console.error(
                        'Failed to restore session:',
                        error
                    );
                }
            };

        void restoreSession();
    }, [
        clearStoredSession,
        connectWs,
    ]);

    /*
     * ---------------------------------------------------------
     * Create session
     * ---------------------------------------------------------
     */

    const createSession = async (
        name?: string
    ): Promise<string> => {
        const data =
            await createSessionApi(
                name ?? 'Host'
            );

        const code =
            data.sessionCode.toUpperCase();

        const hostParticipant =
            data.participants?.[0];

        const pid =
            hostParticipant?.id ?? null;

        const consent =
            hostParticipant?.consent ??
            false;

        setSessionCode(code);

        setParticipants(
            data.participants ?? []
        );

        setParticipantId(pid);

        setConsentGiven(consent);

        setSessionStarted(false);

        setSessionCompleted(false);

        if (
            typeof window !==
            'undefined'
        ) {
            window.localStorage.setItem(
                STORAGE_KEYS.sessionCode,
                code
            );

            if (pid) {
                window.localStorage.setItem(
                    STORAGE_KEYS.participantId,
                    pid
                );
            }

            window.localStorage.setItem(
                STORAGE_KEYS.consent,
                String(consent)
            );

            window.localStorage.setItem(
                STORAGE_KEYS.sessionStarted,
                'false'
            );

            window.localStorage.setItem(
                STORAGE_KEYS.sessionCompleted,
                'false'
            );
        }

        connectWs(
            code,
            pid
        );

        return code;
    };

    /*
     * ---------------------------------------------------------
     * Join session
     * ---------------------------------------------------------
     */

    const joinSession = async (
        code: string,
        name: string
    ): Promise<void> => {
        const normalizedCode =
            code.toUpperCase();

        const data =
            await joinSessionApi(
                normalizedCode,
                name
            );

        const session =
            await getSession(
                normalizedCode
            );

        const started =
            session.status ===
            'started' ||
            session.status ===
            'completed';

        const completed =
            session.status ===
            'completed';

        setParticipantId(data.id);

        setConsentGiven(
            data.consent ?? false
        );

        setSessionCode(
            normalizedCode
        );

        setParticipants(
            session.participants ??
            []
        );

        setSessionStarted(
            started
        );

        setSessionCompleted(
            completed
        );

        if (
            typeof window !==
            'undefined'
        ) {
            window.localStorage.setItem(
                STORAGE_KEYS.sessionCode,
                normalizedCode
            );

            window.localStorage.setItem(
                STORAGE_KEYS.participantId,
                data.id
            );

            window.localStorage.setItem(
                STORAGE_KEYS.consent,
                String(
                    data.consent ?? false
                )
            );

            window.localStorage.setItem(
                STORAGE_KEYS.sessionStarted,
                String(started)
            );

            window.localStorage.setItem(
                STORAGE_KEYS.sessionCompleted,
                String(completed)
            );
        }

        connectWs(
            normalizedCode,
            data.id
        );
    };

    /*
     * ---------------------------------------------------------
     * Consent
     * ---------------------------------------------------------
     */

    const setConsent = async (
        value: boolean
    ): Promise<void> => {
        if (
            !sessionCode ||
            !participantId
        ) {
            throw new Error(
                'No session or participant selected'
            );
        }

        await postConsent(
            sessionCode,
            participantId,
            value
        );

        setConsentGiven(value);

        setParticipants(
            (previous) =>
                previous.map(
                    (participant) =>
                        participant.id ===
                            participantId
                            ? {
                                ...participant,
                                consent:
                                    value,
                            }
                            : participant
                )
        );

        if (
            typeof window !==
            'undefined'
        ) {
            window.localStorage.setItem(
                STORAGE_KEYS.consent,
                String(value)
            );
        }
    };

    /*
     * ---------------------------------------------------------
     * Start session
     * ---------------------------------------------------------
     */

    const startSession =
        async (): Promise<void> => {
            if (!sessionCode) {
                throw new Error(
                    'No session selected'
                );
            }

            await postStart(
                sessionCode
            );

            setSessionStarted(true);

            setSessionCompleted(false);

            if (
                typeof window !==
                'undefined'
            ) {
                window.localStorage.setItem(
                    STORAGE_KEYS.sessionStarted,
                    'true'
                );

                window.localStorage.setItem(
                    STORAGE_KEYS.sessionCompleted,
                    'false'
                );
            }
        };

    /*
     * ---------------------------------------------------------
     * Reset / Leave session
     * ---------------------------------------------------------
     */

    const reset = () => {
        disconnectWs();

        setSessionCode(null);

        setParticipants([]);

        setConsentGiven(false);

        setParticipantId(null);

        setSessionStarted(false);

        setSessionCompleted(false);

        clearStoredSession();
    };

    /*
     * ---------------------------------------------------------
     * Provider
     * ---------------------------------------------------------
     */

    return (
        <InviteContext.Provider
            value={{
                sessionCode,
                participants,
                consentGiven,
                participantId,
                sessionStarted,
                sessionCompleted,

                createSession,
                joinSession,
                setConsent,
                startSession,
                reset,
            }}
        >
            {children}
        </InviteContext.Provider>
    );
};

/*
 * ---------------------------------------------------------
 * Hook
 * ---------------------------------------------------------
 */

export function useInvite() {
    const context =
        React.useContext(
            InviteContext
        );

    if (!context) {
        throw new Error(
            'useInvite must be used inside InviteProvider'
        );
    }

    return context;
}