export const wsBase = (
  process.env.NEXT_PUBLIC_WS_BASE_URL ?? 'ws://127.0.0.1:8000'
).replace(/\/$/, '');

export type InviteMessage =
  | {
      type: 'participant.joined';
      participant: {
        id: string;
        displayName: string;
        joinedAt: string;
        consent?: boolean;
      };
    }
  | {
      type: 'participant.left';
      participantId: string;
    }
  | {
      type: 'consent.updated';
      participantId: string;
      consent: boolean;
    }
  | {
      type: 'host.started';
    }
  | {
      type: 'question.next';
      currentQuestion: number;
      totalQuestions: number;
    }
  | {
      type: 'session.completed';
    }
  | {
      type: 'session.closed';
    };

export type WebSocketHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: InviteMessage) => void;
};

export function createInviteWebSocket(
  code: string,
  participantId?: string,
  handlers: WebSocketHandlers = {}
): WebSocket {
  const url =
    `${wsBase}/ws/session/${encodeURIComponent(code)}` +
    (participantId
      ? `?participantId=${encodeURIComponent(participantId)}`
      : '');

  const socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    handlers.onOpen?.();
  });

  socket.addEventListener('close', () => {
    handlers.onClose?.();
  });

  socket.addEventListener('error', (event) => {
    handlers.onError?.(event);
  });

  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data) as InviteMessage;
      handlers.onMessage?.(data);
    } catch {
      // Ignore invalid WebSocket messages.
    }
  });

  return socket;
}
