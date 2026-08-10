import React from 'react';

export const Loader: React.FC<{ size?: number; label?: string }> = ({ size = 24, label }) => {
    const aria = label ? { 'aria-label': label } : { 'aria-hidden': true };
    return (
        <svg
            role="img"
            {...aria}
            width={size}
            height={size}
            viewBox="0 0 50 50"
            className="animate-spin"
        >
            <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="5" fill="none" opacity="0.2" />
            <path d="M45 25a20 20 0 0 0-20-20" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
        </svg>
    );
};

export default Loader;
