export function isConfiguredUserAdminWallet(
  wallet: string,
  configuredWallets = process.env.USER_ADMIN_WALLET ?? '',
): boolean {
  const normalizedWallet = wallet.toLowerCase();
  return configuredWallets
    .split(',')
    .some((configuredWallet) =>
      configuredWallet.trim().toLowerCase() === normalizedWallet,
    );
}
