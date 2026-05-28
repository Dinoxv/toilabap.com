import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'pay.toilabap.com | Admin Portal',
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
