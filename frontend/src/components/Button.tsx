import React from 'react';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', className = '', children, ...rest }, ref) => {
        const base = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
        const variants: Record<string, string> = {
            primary: 'bg-primary text-white hover:bg-primary-600 focus:ring-primary-600',
            ghost: 'bg-transparent text-fg hover:bg-gray-100 focus:ring-gray-300',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600'
        };
        const sizes: Record<string, string> = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-base',
            lg: 'px-6 py-3 text-lg'
        };

        const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

        return (
            <button ref={ref} className={cls} {...rest}>
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
