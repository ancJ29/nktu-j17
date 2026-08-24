if (window.location.hostname.includes('localhost')) {
  sessionStorage.__c_mngt_admin_key__ = import.meta.env.VITE_APP_C_MNGT_ADMIN_ACCESS_KEY;
  sessionStorage.__gen_client_sso_admin_key__ = import.meta.env.VITE_APP_CREDO_SSO_ADMIN_ACCESS_KEY;
  localStorage.__NO_TUNNEL__ = 'true';
}
