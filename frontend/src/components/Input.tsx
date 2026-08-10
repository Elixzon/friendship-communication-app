import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
};

export const Input: React.FC<InputProps> = ({ label, id, className = '', ...rest }) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 8)}`;
    return (
        <div className={`flex flex-col ${className}`}>
            {label && (
                <label htmlFor={inputId} className="text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className="border border-gray-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-600"
                {...rest}
            />
        </div>
    );
};

export default Input;
