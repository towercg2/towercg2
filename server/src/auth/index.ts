export type AuthnFunction = (clientId: string, clientSecret: string) => Promise<boolean>;

export function SinglePassword(plaintext: string): AuthnFunction {
  return async (clientId: string, clientSecret: string) => clientSecret === plaintext;
}

export function LookupAuth(credentials: { [clientId: string]: string }): AuthnFunction {
  return async (clientId: string, clientSecret: string) => credentials[clientId] === clientSecret;
}
