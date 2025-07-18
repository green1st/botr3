import { Client, Wallet, AMMDeposit, xrpToDrops, dropsToXrp, TrustSet } from 'xrpl';
import XrplConnection from './XrplConnection';
import { WalletManager } from './wallet-manager';
import XrplSwap from './XrplSwap'; // Import XrplSwap

// Manual implementation of currencyToHex to bypass Turbopack import issues
function currencyToHex(currency: string): string {
  console.log(`currencyToHex input: ${currency}`); // Added logging
  if (currency.length === 3) {
    // Convert 3-character ASCII to 40-character hexadecimal
    const hex = currency.split('').map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase().padEnd(40, '0');
    console.log(`currencyToHex output (3-char): ${hex}`); // Added logging
    return hex;
  } else if (currency.length === 40 && /^[0-9A-Fa-f]{40}$/.test(currency)) {
    // Already a 40-character hexadecimal string
    console.log(`currencyToHex output (40-char): ${currency.toUpperCase()}`); // Added logging
    return currency.toUpperCase();
  } else if (currency.length > 3 && currency.length <= 12) { // Assuming non-standard currencies are between 4 and 12 characters
    // Convert non-standard ASCII to 40-character hexadecimal
    const hex = currency.split('').map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase().padEnd(40, '0');
    console.log(`currencyToHex output (non-standard ASCII): ${hex}`); // Added logging
    return hex;
  } else {
    const errorMessage = 'Invalid currency format. Must be 3-character ASCII, 40-character hexadecimal, or a non-standard ASCII string (4-12 characters).';
    console.error(`currencyToHex error: ${errorMessage} for input: ${currency}`); // Added logging
    throw new Error(errorMessage);
  }
}

export class AmmManager {
  private client: Client;
  private walletManager: WalletManager;
  private xrplSwap: XrplSwap; // Add XrplSwap instance

  constructor() {
    this.client = XrplConnection.getInstance().getClient();
    this.walletManager = new WalletManager();
    this.xrplSwap = new XrplSwap(); // Initialize XrplSwap
  }

  private async connectClient(): Promise<void> {
    await XrplConnection.getInstance().connect();
  }

  private async disconnectClient(): Promise<void> {
    // No need to disconnect here, XrplConnection manages its own lifecycle
  }

  public async getAmmInfo(asset1: any, asset2: any): Promise<any> {
    await this.connectClient();
    try {
      const ammInfo = await this.client.request({
        command: 'amm_info',
        asset: asset1,
        asset2: asset2,
      });
      return ammInfo.result.amm;
    } catch (error) {
      console.error('Error getting AMM info:', error);
      return null;
    } finally {
      // await this.disconnectClient();
    }
  }

  public async getAmmLpTokenInfo(client: Client, asset1: any, asset2: any): Promise<{ currency: string; issuer: string } | null> {
    try {
      if (!client.isConnected()) {
        await client.connect();
      }
      const ammInfo = await client.request({
        command: 'amm_info',
        asset: asset1,
        asset2: asset2,
      });

      if (ammInfo.result && ammInfo.result.amm && ammInfo.result.amm.lp_token) {
        return {
          currency: ammInfo.result.amm.lp_token.currency,
          issuer: ammInfo.result.amm.lp_token.issuer,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting AMM LP Token info:', error);
      return null;
    } finally {
      // No disconnect here, as client is passed in and managed externally
    }
  }

  // Modified to use XPMarket API for more accurate rate
  public async getAmmPoolRatio(asset1: any, asset2: any): Promise<{ asset1_amount: string, asset2_amount: string } | null> {
    try {
      // Assuming asset1 is XRP and asset2 is LAWAS for this specific use case
      const sourceCurrency = asset1.currency; // Should be 'XRP'
      const destinationCurrency = asset2.currency; // Should be '4C41574153000000000000000000000000000000' (LAWAS hex)
      const destinationIssuer = asset2.issuer; // Should be 'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC'

      // Convert hex LAWAS to 'LAWAS' string for XrplSwap
      const lawasString = 'LAWAS';

      const rateInfo = await this.xrplSwap.getExchangeRateFromXPMarket(
        sourceCurrency as 'XRP' | 'LAWAS' | 'RLUSD',
        lawasString as 'XRP' | 'LAWAS' | 'RLUSD'
      );

      if (rateInfo && rateInfo.rate) {
        // The rate from XPMarket is 1 unit of sourceCurrency = X units of destinationCurrency
        // So, if source is XRP and dest is LAWAS, rate is LAWAS per XRP.
        // We need to return amounts that reflect this ratio.
        // For simplicity, let's assume a base of 1 XRP.
        const xrpAmount = 1;
        const lawasAmount = xrpAmount * rateInfo.rate;

        return {
          asset1_amount: String(xrpAmount),
          asset2_amount: String(lawasAmount),
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting AMM pool ratio from XPMarket:', error);
      return null;
    }
  }

  public async setLpTokenTrustline(
    password: string,
    walletAddresses: string[],
    currency: string,
    issuer: string
  ): Promise<any> {
    await this.connectClient();
    const results: { [address: string]: { success: boolean; message: string } } = {};
    let successful = 0;
    let failed = 0;

    try {
      const allWallets = await this.walletManager.getDecryptedWallets(password);
      const walletsToProcess = allWallets.filter(wallet => walletAddresses.includes(wallet.address));

      if (walletsToProcess.length === 0) {
        return {
          success: false,
          message: "No wallets selected or failed to decrypt with provided password",
          total_wallets: 0,
          successful: 0,
          failed: 0,
          results: {},
        };
      }

      for (const wallet of walletsToProcess) {
        try {
          const trustSet: TrustSet = {
            TransactionType: 'TrustSet',
            Account: wallet.address,
            LimitAmount: {
              currency: currency,
              issuer: issuer,
              value: '100000000000000000000000000000000000000',
            },
          };

          const prepared = await this.client.autofill(trustSet);
          const signed = wallet.sign(prepared);
          const result = await this.client.submitAndWait(signed.tx_blob);

          if (result.result.engine_result === 'tesSUCCESS') {
            results[wallet.address] = { success: true, message: 'LP Trustline set successfully.' };
            successful++;
          } else {
            results[wallet.address] = { success: false, message: `LP Trustline failed: ${result.result.engine_result} - ${result.result.engine_result_message}` };
            failed++;
          }
        } catch (walletError) {
          results[wallet.address] = { success: false, message: `Failed to set LP Trustline: ${walletError.message}` };
          failed++;
        }
      }

      return {
        success: true,
        message: `Batch LP Trustline setting completed: ${successful} successful, ${failed} failed`,
        total_wallets: walletsToProcess.length,
        successful: successful,
        failed: failed,
        results: results,
      };
    } catch (error: any) {
      console.error("Error setting LP Token trustline:", error);
      throw error;
    } finally {
      // No disconnect here, as client is passed in and managed externally
    }
  }

  public async batchDepositToAmmPool(
    password: string,
    amountLawas: number | null,
    amountXRP: number | null,
    walletAddresses: string[]
  ): Promise<any> {
    await this.connectClient();
    const results: { [address: string]: { success: boolean; message: string } } = {};
    let successful = 0;
    let failed = 0;

    try {
      const allWallets = await this.walletManager.getDecryptedWallets(password);
      const walletsToProcess = allWallets.filter(wallet => walletAddresses.includes(wallet.address));

      if (walletsToProcess.length === 0) {
        return {
          success: false,
          message: "No wallets selected or failed to decrypt with provided password",
          total_wallets: 0,
          successful: 0,
          failed: 0,
          results: {},
        };
      }

      for (const wallet of walletsToProcess) {
        try {
          const ammDeposit: AMMDeposit = {
            TransactionType: 'AMMDeposit',
            Account: wallet.address,
            Asset: { currency: '4C41574153000000000000000000000000000000', issuer: 'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC' },
            Asset2: { currency: 'XRP' },
            Amount: amountLawas ? { currency: '4C41574153000000000000000000000000000000', issuer: 'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC', value: String(amountLawas) } : undefined,
            Amount2: amountXRP ? { currency: 'XRP', value: xrpToDrops(amountXRP) } : undefined,
          };

          console.log(`Preparing AMMDeposit for ${wallet.address}:`, ammDeposit);

          const prepared = await this.client.autofill(ammDeposit);
          const signed = wallet.sign(prepared);

          console.log(`Signed transaction for ${wallet.address}:`, signed.id);

          let result;
          try {
            result = await Promise.race([
              this.client.submitAndWait(signed.tx_blob),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Transaction submission timed out")), 60000)) // 60 seconds timeout
            ]);
          } catch (timeoutError: any) {
            console.error(`Transaction submission for ${wallet.address} timed out:`, timeoutError.message);
            results[wallet.address] = { success: false, message: `Transaction submission timed out: ${timeoutError.message}` };
            failed++;
            continue; // Move to the next wallet
          }

          if (result && result.result) {
            console.log(`Transaction result for ${wallet.address}:`, result.result);
            if (result.result.engine_result === 'tesSUCCESS') {
              results[wallet.address] = { success: true, message: 'AMM Deposit successful.' };
              successful++;
            } else {
              results[wallet.address] = { success: false, message: `AMM Deposit failed: ${result.result.engine_result} - ${result.result.engine_result_message}` };
              failed++;
            }
          } else {
            results[wallet.address] = { success: false, message: 'AMM Deposit failed: No result from transaction submission.' };
            failed++;
          }
        } catch (walletError: any) {
          results[wallet.address] = { success: false, message: `Failed to deposit: ${walletError.message}` };
          failed++;
        }
      }

      return {
        success: true,
        message: `Batch AMM deposit completed: ${successful} successful, ${failed} failed`,
        total_wallets: walletsToProcess.length,
        successful: successful,
        failed: failed,
        results: results,
      };
    } catch (error: any) {
      console.error("Error in batch AMM deposit API:", error);
      throw error;
    }
  }
}

