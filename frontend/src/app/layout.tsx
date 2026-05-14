import { AppLayout } from '@/components/layout';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
