import { AppLayout } from '@/components/Layout';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
