import { cSsoConnector } from '@credo/connectors/connector';

type CredoSSOApi = typeof cSsoConnector;
export const credoSSOApi: CredoSSOApi = cSsoConnector;
