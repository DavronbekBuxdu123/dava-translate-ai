'use client';
import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
export function Providers({ children }: { children: React.ReactNode }) { const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } })); return <ThemeProvider attribute="class" defaultTheme="system" enableSystem><QueryClientProvider client={client}>{children}<Toaster richColors position="bottom-right" /></QueryClientProvider></ThemeProvider>; }
