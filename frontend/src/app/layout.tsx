import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import CircuitBackground from '@/components/CircuitBackground';
import AIChatbot from '@/components/AIChatbot';
import { Analytics } from '@vercel/analytics/next';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Electrical Club Event Portal | V.S.B. Engineering College, Karur',
  description: 'Official Event Portal of the Department of Electrical and Electronics Engineering, V.S.B. Engineering College, Karur. Register and participate in ElectroQuest (Quiz) and Think Big (Idea Presentation).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col relative text-white bg-[#081B33]">
        {/* Dynamic canvas animated PCB current flow lines */}
        <CircuitBackground />
        
        {/* Header Navigation */}
        <Header />
        
        {/* Main Content Area */}
        <main className="flex-1 w-full relative z-10">{children}</main>

        {/* Global floating AI assistant */}
        <AIChatbot />
        
        {/* Vercel Web Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
