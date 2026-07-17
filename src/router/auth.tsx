import { lazy } from 'react';

export const GuestLayout = lazy(() =>
  import('../layouts/GuestLayout').then((module) => ({
    default: module.GuestLayout,
  })),
);

export const ForgotPasswordPage = lazy(() =>
  import('../pages/auth').then((module) => ({ default: module.ForgotPasswordPage })),
);

export const LogoutPage = lazy(() =>
  import('../pages/auth').then((module) => ({ default: module.LogoutPage })),
);

export const LoginPage = lazy(() =>
  import('../pages/auth').then((module) => ({ default: module.LoginPage })),
);

export const LoginViaQRCodePage = lazy(() =>
  import('../pages/auth').then((module) => ({ default: module.LoginViaQRCodePage })),
);

export const RegisterPage = lazy(() =>
  import('../pages/auth').then((module) => ({ default: module.RegisterPage })),
);

export const ResetPasswordPage = lazy(() =>
  import('../pages/auth').then((module) => ({ default: module.ResetPasswordPage })),
);
