import { FinancialLayoutClient } from './components/financial-layout-client';

export default function FinancialModelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return <FinancialLayoutClient params={params}>{children}</FinancialLayoutClient>;
}
