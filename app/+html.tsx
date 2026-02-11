import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ backgroundColor: '#0A0A0A' }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        {/* Safari top/bottom bar color */}
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="color-scheme" content="dark" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Gat Room" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html {
            background-color: #0A0A0A !important;
            height: 100%;
          }
          body {
            background-color: #0A0A0A !important;
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            overscroll-behavior: none;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            /* Fill the safe areas with our dark color */
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
          }
          #root {
            background-color: #0A0A0A !important;
            display: flex;
            height: 100%;
            flex-direction: column;
          }

          /* Kill Safari autofill yellow/white background */
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active,
          textarea:-webkit-autofill,
          textarea:-webkit-autofill:hover,
          textarea:-webkit-autofill:focus,
          textarea:-webkit-autofill:active {
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: #FFFFFF !important;
            background-color: transparent !important;
            box-shadow: 0 0 0 30px #1E1E1E inset !important;
            transition: background-color 5000s ease-in-out 0s;
            caret-color: #FFFFFF;
          }

          /* Prevent zoom on iOS */
          input, textarea, select {
            font-size: 16px !important;
            touch-action: manipulation;
          }

          /* Remove tap highlight */
          * {
            -webkit-tap-highlight-color: transparent;
          }
        `}} />
      </head>
      <body style={{ backgroundColor: '#0A0A0A' }}>{children}</body>
    </html>
  );
}
