export type Participant = {
    id: string;
    displayName: string;
    joinedAt: string;
    consent?: boolean;
};

export type SessionResponse = {
    sessionCode: string;
    participants: Participant[];
    status?: string;
    completed?: boolean;
};

export const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${apiBase}${path}`;
    let response: Response;
    try {
        response = await fetch(url, options);
    } catch (cause) {
        throw new Error(`Network error while calling ${url}`, { cause });
    }

    const text = await response.text();
    let data: unknown = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (cause) {
            throw new Error(`Invalid JSON response from ${url} (HTTP ${response.status})`, { cause });
        }
    }
    if (!response.ok) {
        const body = data as { detail?: string; message?: string } | null;
        const message = body?.detail || body?.message || response.statusText || 'API request failed';
        const error = new Error(message) as Error & { status?: number };
        error.status = response.status;
        throw error;
    }
    return data as T;
}

export async function createSession(displayName: string): Promise<SessionResponse> {
    return apiFetch<SessionResponse>('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
    });
}

export async function joinSession(code: string, displayName: string): Promise<{ id: string; displayName: string; joinedAt: string; consent?: boolean }> {
    return apiFetch<{ id: string; displayName: string; joinedAt: string; consent?: boolean }>('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, displayName }),
    });
}

export async function getSession(code: string): Promise<SessionResponse> {
    return apiFetch<SessionResponse>(`/api/session/${encodeURIComponent(code)}`);
}

export async function postConsent(code: string, participantId: string, consent: boolean): Promise<void> {
    await apiFetch('/api/session/' + encodeURIComponent(code) + '/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, consent }),
    });
}

export async function postStart(code: string): Promise<void> {
    await apiFetch('/api/session/' + encodeURIComponent(code) + '/start', {
        method: 'POST',
    });
}

export async function listParticipants(code: string): Promise<Participant[]> {
    return apiFetch<Participant[]>('/api/session/' + encodeURIComponent(code) + '/participants');
}
