export interface SecretStoreBinding {
  get(): Promise<string>;
}

export interface Env {
  APP_ENV: string;
  USER_ADMIN_WALLET: string;
  ARBITRUM_RPC_URL: SecretStoreBinding;
  DATABASE_URL: SecretStoreBinding;
}
