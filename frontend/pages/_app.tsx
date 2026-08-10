import '../src/styles/globals.css';
import type { AppProps } from 'next/app';
import React from 'react';
import { InviteProvider } from '../src/contexts/InviteContext';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <InviteProvider>
            <Component {...pageProps} />
        </InviteProvider>
    );
}
