import { lazy } from 'react';
import { resolveClientCode } from '@/config/client-code';

const clientCode = resolveClientCode();

const HomePageNKTU = lazy(() => import('./by-clients/nktu/HomePage'));
const HomePageAcme = lazy(() => import('./by-clients/acme/HomePage'));
const HomePageDefault = lazy(() => import('./by-clients/default/HomePage'));

export default function HomePage() {
  if (clientCode === 'nktu') {
    return <HomePageNKTU />;
  }
  if (clientCode === 'acme') {
    return <HomePageAcme />;
  }
  return <HomePageDefault />;
}
