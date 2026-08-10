import React from 'react';
import { Participant } from '../../api';
import Badge from '../Badge';

export const WaitingList: React.FC<{ participants: Participant[] }> = ({ participants }) => {
    if (!participants || participants.length === 0) return <div className="text-sm text-gray-500">No participants yet</div>;
    return (
        <ul className="space-y-2">
            {participants.map((p) => (
                <li key={p.id} className="flex items-center justify-between bg-white border rounded-md p-3">
                    <div>
                        <div className="font-medium">{p.displayName}</div>
                        <div className="text-xs text-gray-400">Joined just now</div>
                    </div>
                    <Badge tone="default">{p.id === 'host' ? 'Host' : 'Guest'}</Badge>
                </li>
            ))}
        </ul>
    );
};

export default WaitingList;
