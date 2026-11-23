export function keepSignedInClaim(input: {
  switchOn: boolean;
  isIPad: boolean;

  remember: boolean;
}): { keepSignedIn?: true } {
  return input.switchOn && (input.isIPad || input.remember) ? { keepSignedIn: true } : {};
}

export const SIGN_IN_REFRESH_MS = 180 * 24 * 60 * 60 * 1000;
