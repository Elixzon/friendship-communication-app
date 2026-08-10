import React from 'react';

export const Badge: React.FC<{ children: React.ReactNode; tone?: 'default' | 'success' | 'danger' } & React.HTMLAttributes<HTMLSpanElement>> = ({
    children,
    tone = 'default',
    className = '',
    ...rest
}) => {
    const tones: Record<string, string> = {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        danger: 'bg-red-100 text-red-800'
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]} ${className}`} {...rest}>
            {children}
        </span>
    );
};

export default Badge;
