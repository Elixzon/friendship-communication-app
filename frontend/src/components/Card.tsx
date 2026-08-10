import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...rest }) => {
    return (
        <div className={`bg-white border border-gray-100 rounded-lg shadow-sm p-4 ${className}`} {...rest}>
            {children}
        </div>
    );
};

export default Card;
