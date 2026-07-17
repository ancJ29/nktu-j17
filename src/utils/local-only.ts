if (window.location.hostname.includes('localhost')) {
  sessionStorage.__c_mngt_admin_key__ = import.meta.env.VITE_APP_C_MNGT_ADMIN_ACCESS_KEY;
  sessionStorage.__gen_client_sso_admin_key__ = import.meta.env.VITE_APP_CREDO_SSO_ADMIN_ACCESS_KEY;

  localStorage.__NO_TUNNEL__ = 'true';
  
  
  
  if (import.meta.env.VITE_APP_ADMIN_CONFIG_RAW) {
    localStorage.__X_ADMIN_CONFIG__ = import.meta.env.VITE_APP_ADMIN_CONFIG_RAW;
  }
  const isDebug = localStorage.__X_ADMIN_CONFIG__ === 'CCeTvzKkd5rxNqvTK2Vy';
  if (isDebug) {
    
    localStorage.__X_ADMIN_CONFIG__ = 'CCeTvzKkd5rxNqvTK2Vy';
    sessionStorage.__c_mngt_admin_key__ = 'oRrRYXXce83xGI8DSTLKhgGJv';
    sessionStorage.__fake_data_trusted_service_key__ = 'bd527b9op3a64u9kjntqd889apu2w392';
    sessionStorage.__fake_data_storage_service_code__ = 'c-mngt';
    sessionStorage.__fake_data_storage_access_key__ =
      'cbYea9VUqG8EtvjriYgj74tx0gw5YdcKbB1k8tze0S2f8K4ovzq93KhqDRKM2pJ0';
    sessionStorage.__fake_data_storage_internal_access_key__ =
      'b63f52a09e8119eb0f12300da7c0060c4dee9e58312c15a002f0164a685198bd';
    sessionStorage.__gen_client_sso_admin_key__ = 'ylH2Mb4M6ih1fyHyU8kfTaAbAO1UzGSigpweIcEwp9yj';
  }
  console.log('local config applied!!!');
}
