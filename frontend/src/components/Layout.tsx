import React from 'react';

export const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`container ${className}`}>{children}</div>
);

export const Stack: React.FC<{ gap?: number; children: React.ReactNode; className?: string }> = ({ gap = 16, children, className = '' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap }} className={className}>
        {children}
    </div>
);

export default { Container, Stack };
