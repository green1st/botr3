
import { Wallet, Client, TrustSet, xrpToDrops } from 'xrpl';
import { getDatabase } from './database';

export interface TrustlineResult {
  success: boolean;
  message: string;
  transaction_hash?: string;
}

export interface ReserveRequirements {
  base_reserve_xrp: number;
  owner_reserve_xrp: number;
  total_reserve_xrp: number;
  description: string;
}

export class TrustlineManager {
  private client: Client;
  private db = getDatabase();

  constructor() {
    this.client = new Client("wss://v-xrpl.r3store.io");
  }

  private currencyToHex(currency: string): string {
    if (currency.length === 3) {
      return currency;
    }
    return currency.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').padEnd(40, '0');
  }

  public async createTrustline(
    wallet: Wallet,
    issuerAddress: string,
    currencyCode: string,
    limitAmount: string
  ): Promise<TrustlineResult> {
    try {
      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      const trustSetTx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: wallet.address,
        LimitAmount: {
          issuer: issuerAddress,
          currency: this.currencyToHex(currencyCode),
          value: limitAmount,
        },
      };

      const preparedTx = await this.client.autofill(trustSetTx);
      const signedTx = wallet.sign(preparedTx);
      const txResult = await this.client.submitAndWait(signedTx.tx_blob);

      if (txResult.result.meta && typeof txResult.result.meta === 'object' && 'TransactionResult' in txResult.result.meta) {
        if (txResult.result.meta.TransactionResult === 'tesSUCCESS') {
          return {
            success: true,
            message: `Trustline created successfully for ${currencyCode}`,
            transaction_hash: txResult.result.hash,
          };
        } else {
          return {
            success: false,
            message: `Failed to create trustline: ${txResult.result.meta.TransactionResult}`,
          };
        }
      } else {
        return {
          success: false,
          message: 'Failed to create trustline: Unknown transaction result',
        };
      }
    } catch (error) {
      console.error('Error creating trustline:', error);
      return {
        success: false,
        message: `Failed to create trustline: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  public async createTrustlinesForAll(
    wallets: Wallet[],
    issuerAddress: string,
    currencyCode: string,
    limitAmount: string
  ): Promise<any> {
    const results: { [address: string]: TrustlineResult } = {};
    let successful = 0;
    let failed = 0;

    for (const wallet of wallets) {
      const result = await this.createTrustline(
        wallet,
        issuerAddress,
        currencyCode,
        limitAmount
      );
      results[wallet.address] = result;
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      message: `Trustline creation completed: ${successful} successful, ${failed} failed`,
      total_wallets: wallets.length,
      successful,
      failed,
      results,
    };
  }

  public async getTrustlinesForWallet(walletAddress: string): Promise<any> {
    try {
      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      const response = await this.client.request({
        command: 'account_lines',
        account: walletAddress,
      });

      return {
        success: true,
        trustlines: response.result.lines,
      };
    } catch (error) {
      console.error('Error getting trustlines:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async getAllWalletsTrustlines(walletAddresses: string[]): Promise<any> {
    try {
      const walletsTrustlines: any[] = [];

      for (const address of walletAddresses) {
        const result = await this.getTrustlinesForWallet(address);
        walletsTrustlines.push({
          wallet_address: address,
          trustlines: result.success ? result.trustlines : [],
        });
      }

      return {
        success: true,
        wallets_trustlines: walletsTrustlines,
      };
    } catch (error) {
      console.error('Error getting all wallets trustlines:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public getReserveRequirements(numTrustlines: number = 0): ReserveRequirements {
    const BASE_RESERVE_XRP = 1.0; // Updated December 2024
    const OWNER_RESERVE_XRP = 0.2; // Updated December 2024
    
    const totalReserve = BASE_RESERVE_XRP + (numTrustlines * OWNER_RESERVE_XRP);
    
    return {
      base_reserve_xrp: BASE_RESERVE_XRP,
      owner_reserve_xrp: OWNER_RESERVE_XRP,
      total_reserve_xrp: totalReserve,
      description: `Base reserve: ${BASE_RESERVE_XRP} XRP + ${numTrustlines} trustlines × ${OWNER_RESERVE_XRP} XRP = ${totalReserve} XRP total reserve required`
    };
  }

  public async disconnect(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.disconnect();
    }
  }
}


