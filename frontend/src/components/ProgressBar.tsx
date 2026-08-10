import React from 'react';

export const ProgressBar: React.FC<{ value: number; max?: number } & React.HTMLAttributes<HTMLDivElement>> = ({ value, max = 100, className = '', ...rest }) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
        <div className={`w-full bg-gray-100 rounded-md h-3 ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} {...rest}>
            <div className="h-3 rounded-md bg-primary" style={{ width: `${pct}%` }} />
        </div>
    );
};

export default ProgressBar;
