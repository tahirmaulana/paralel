export interface SecretStoreBinding {
  get(): Promise<string>;
}

export interface Env {
  APP_ENV: string;
  ARBITRUM_RPC_URL: SecretStoreBinding;
  DATABASE_URL: SecretStoreBinding;
  RELAYER_PRIVATE_KEY: SecretStoreBinding;
}
