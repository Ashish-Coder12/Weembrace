// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XYZ Technologies - AI Asset Assistant',
  description: 'AI-Powered IT Asset Management Assistant with autonomous agentic tool calling',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
