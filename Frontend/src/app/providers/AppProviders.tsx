/**
 * AppProviders
 *
 * Composes all application-level React context providers in the correct order.
 * Adding a new global provider means editing this file only — not App.tsx.
 *
 * Provider order (outer → inner):
 *   ThemeProvider → AuthProvider → children
 */

import React from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { AuthProvider }  from '../../context/AuthContext';
import { APP_CONFIG }    from '../config/appConfig';

interface AppProvidersProps {
  children: React.ReactNode;
}

/** Reads the active theme so sonner's <Toaster> can render its own
 *  light/dark surface instead of defaulting to always-light. Must live
 *  inside <ThemeProvider> to consume useTheme(). */
const ThemedToaster: React.FC = () => {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme={theme}
      duration={APP_CONFIG.TOAST_DURATION_MS}
      toastOptions={{
        style: { fontFamily: 'inherit', fontSize: '13px', fontWeight: 500 },
      }}
    />
  );
};

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
  <ThemeProvider>
    <AuthProvider>
      {/* Global toast notifications — single instance for the whole app */}
      <ThemedToaster />
      {children}
    </AuthProvider>
  </ThemeProvider>
);
