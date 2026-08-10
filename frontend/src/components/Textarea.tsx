import React from 'react';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
};

export const Textarea: React.FC<TextareaProps> = ({ label, id, className = '', ...rest }) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 8)}`;
    return (
        <div className={`flex flex-col ${className}`}>
            {label && (
                <label htmlFor={textareaId} className="text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <textarea
                id={textareaId}
                className="border border-gray-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-600 min-h-[120px]"
                {...rest}
            />
        </div>
    );
};

export default Textarea;
