import { lazy } from 'react';

export const GuestLayout = lazy(() =>
  import('../layouts/GuestLayout').then((module) => ({
    default: module.GuestLayout,
  })),
);

export const LogoutPage = lazy(() =>
  import('../pages/auth').then((module) => ({ default: module.LogoutPage })),
);

export const SignInPage = lazy(() =>
  import('../pages/auth').then((module) => ({ default: module.SignInPage })),
);

export const AccessViaQRCodePage = lazy(() =>
  import('../pages/auth').then((module) => ({ default: module.AccessViaQRCodePage })),
);
