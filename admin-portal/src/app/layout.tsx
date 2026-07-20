import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Electrical Club Admin Portal | V.S.B. Engineering College, Karur',
  description: 'Administrator management panel for department events.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col relative text-white bg-[#081B33]">
        <main className="flex-1 w-full relative z-10">{children}</main>
      </body>
    </html>
  );
}
