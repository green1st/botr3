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
    }client: Client, asset1: any, asset2: any): Promise<{ currency: string; issuer: string } | null> {
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
            results[wallet.address] = { success: false, message: `Failed to set LP Trustline: ${result.result.engine_result_message}` };
            failed++;
          }
        } catch (walletError: any) {
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
    } catch (error) {
      console.error('Error setting LP Token trustline:', error);
      throw erro    } finally {
      // await this.disconnectClient(); // Removed to keep connection open for submitAndWait
    }   wallet: Wallet,
    amountLawas: number | null,
    amountXRP: number | null
  ): Promise<any> {
    await this.connectClient();
    console.log('depositToAmmPool called with wallet:', wallet.address); // Added logging
    try {
      if (!wallet || !wallet.address) {
        throw new Error('Wallet object is invalid or missing address.');
      }

      const lawasCurrency = {
        currency: '4C41574153000000000000000000000000000000', // Hardcoded hex for LAWAS
        issuer: 'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC',
      };
      const xrpCurrency = { currency: 'XRP' };

          const ammDeposit: AMMDeposit = {
            TransactionType: 'AMMDeposit',
            Account: wallet.address as string, // Ensure Account is explicitly set as string
            Asset: lawasCurrency,
            Asset2: xrpCurrency,
          };

      if (amountLawas) {
        ammDeposit.Amount = { currency: lawasCurrency.currency, issuer: lawasCurrency.issuer, value: String(amountLawas) };
      }
      if (amountXRP) {
        ammDeposit.Amount2 = xrpToDrops(amountXRP);
      }

      const prepared = await this.client.autofill(ammDeposit);
      const signed = wallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      return result;
    } catch (error) {
      console.error('Error depositing to AMM pool:', error);
      throw error;
    } finally {
      // await this.disconnectClient();
    }
    password: string,
    amountLawas: number | null,
    amountXRP: number | null,
    walletAddresses: string[] // Added walletAddresses parameter
  ): Promise<any> {
    await this.connectClient();
    const results: { [address: string]: { success: boolean; message: string } } = {};
    let successfulDeposits = 0;
    let failedDeposits = 0;

    try {
      const allWallets = await this.walletManager.getDecryptedWallets(password);
      const walletsToProcess = allWallets.filter(wallet => walletAddresses.includes(wallet.address));

      console.log("Decrypted wallets for batch deposit:", walletsToProcess.map(w => w.address));
      console.log("Number of wallets retrieved for batch deposit:", walletsToProcess.length); // Added logging

      if (walletsToProcess.length === 0) {
        return {
          success: true,
          message: "Batch AMM deposit completed: 0 successful, 0 failed",
          total_wallets: 0,
          successful: 0,
          failed: 0,
          results: {},
        };
      }

      const lawasCurrency = {
        currency: '4C41574153000000000000000000000000000000', // Hardcoded hex for LAWAS
        issuer: 'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC',
      };
      const xrpCurrency = { currency: 'XRP' };

      for (const wallet of walletsToProcess) {
        try {
          // Check if account exists before attempting deposit
          const accountExists = await this.walletManager.checkAccountExistence(wallet.address);
          if (!accountExists) {
            results[wallet.address] = { success: false, message: 'Account not found. Skipping this wallet.' };
            failedDeposits++;
            continue; // Skip to the next wallet
          }

          const amount1 = amountLawas ? String(amountLawas) : undefined;
          const amount2 = amountXRP ? xrpToDrops(amountXRP) : undefined;

          if (!amount1 && !amount2) {
            results[wallet.address] = { success: false, message: "No deposit amount specified." };
            failedDeposits++;
            continue;
          }

          // Get current ledger sequence for LastLedgerSequence
          const ledgerInfo = await this.client.request({ command: 'ledger', ledger_index: 'current' });
          console.log(`Ledger Info for ${wallet.address}:`, ledgerInfo); // Added logging
          const currentLedgerSequence = ledgerInfo.result.ledger.ledger_index; // Corrected access
          console.log(`Current Ledger Sequence for ${wallet.address}:`, currentLedgerSequence); // Added logging
          const lastLedgerSequence = currentLedgerSequence + 20; // Increased expiry window
          console.log(`Calculated LastLedgerSequence for ${wallet.address}:`, lastLedgerSequence); // Added logging

          const ammDeposit: AMMDeposit = {
            TransactionType: 'AMMDeposit',
            Account: wallet.address,
            Asset: lawasCurrency,
            Asset2: xrpCurrency,
            // LastLedgerSequence: lastLedgerSequence, // This line was causing the issue by being overwritten by autofill
          };

          if (amount1) {
            ammDeposit.Amount = { currency: lawasCurrency.currency, issuer: lawasCurrency.issuer, value: amount1 };
          }
          if (amount2) {
            ammDeposit.Amount2 = xrpToDrops(amountXRP);
          }

      const prepared = await this.client.autofill(ammDeposit);
      prepared.LastLedgerSequence = lastLedgerSequence; // Set LastLedgerSequence AFTER autofill
      prepared.Account = wallet.address; // Explicitly set Account after autofill
      console.log(`Prepared transaction for ${wallet.address} (after explicit Account set):`, prepared);

      const signed = wallet.sign(prepared);
      console.log(`Signed transaction for ${wallet.address}:`, signed);

      let result;
      try {
        result = await Promise.race([
          this.client.submitAndWait(signed.tx_blob),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction submission timed out')), 30000)) // 30 seconds timeout
        ]);
        console.log(`Transaction result for ${wallet.address}:`, result);
      } catch (submitError: any) {
        console.error(`Error submitting transaction for ${wallet.address}:`, submitError);
        results[wallet.address] = { success: false, message: `Failed to submit transaction: ${submitError.message || JSON.stringify(submitError)}` };
        failedDeposits++;
        continue;
      }

      if (result && result.result && result.result.engine_result === 'tesSUCCESS') {
            results[wallet.address] = { success: true, message: 'Deposit successful.' };
            successfulDeposits++;
          } else {
            results[wallet.address] = { success: false, message: `Deposit failed: ${result.result.engine_result_message}` };
            failedDeposits++;
          }
        } catch (walletError: any) {
          results[wallet.address] = { success: false, message: `Failed to deposit: ${walletError.message}` };
          failedDeposits++;
        }
      }

      return {
        success: true,
        message: `Batch AMM deposit completed: ${successfulDeposits} successful, ${failedDeposits} failed`,
        total_wallets: walletsToProcess.length,
        successful: successfulDeposits,
        failed: failedDeposits,
        results: {},
      };
    } catch (error: any) {
      console.error('Error in batch AMM deposit:', error);
      return {
        success: false,
        message: `Batch AMM deposit failed: ${error.message}`,
        total_wallets: 0,
        successful: 0,
        failed: 0,
        results: {},
      };
    } finally {
      // await this.disconnectClient(); // Removed to keep connection open for submitAndWait
    }
  }
}









