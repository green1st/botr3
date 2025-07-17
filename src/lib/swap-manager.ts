
import { Wallet, Client, Payment, xrpToDrops, dropsToXrp } from 'xrpl';
import XrplSwap from './XrplSwap';

export interface Token {
  currency: string;
  issuer: string | null;
  name: string;
}

export interface SwapResult {
  [address: string]: string | null; // address -> transaction hash or null if failed
}

export class SwapManager {
  private client: Client;
  private xrplSwap: XrplSwap;

  constructor() {
    this.client = new Client('wss://xrplcluster.com');
    this.xrplSwap = new XrplSwap();
  }

  public getSupportedTokens(): Token[] {
    return [
      {
        currency: 'XRP',
        issuer: null,
        name: 'XRP'
      },
      {
        currency: 'LAWAS',
        issuer: 'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC',
        name: 'LAWAS'
      },
      {
        currency: 'RLUSD',
        issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
        name: 'RLUSD'
      }
    ];
  }

  public async getExchangeRate(
    sourceCurrency: string,
    sourceIssuer: string | null,
    destinationCurrency: string,
    destinationIssuer: string | null,
    amount: string
  ): Promise<number> {
    try {
      // Use the XrplSwap's getExchangeRateFromXPMarket for real rates
      const rateInfo = await this.xrplSwap.getExchangeRateFromXPMarket(
        sourceCurrency as 'XRP' | 'LAWAS' | 'RLUSD',
        destinationCurrency as 'XRP' | 'LAWAS' | 'RLUSD'
      );
      
      // XPMarket API returns amount2 for 1 unit of code1. We need rate for 1 unit of sourceCurrency.
      // If source is XRP and dest is LAWAS, it returns how much LAWAS you get for 1 XRP.
      // If source is LAWAS and dest is XRP, it returns how much XRP you get for 1 LAWAS.
      // So, the rate returned by XPMarket is already in the correct direction for our use.
      return rateInfo.rate;

    } catch (error) {
      console.error('[getExchangeRate] Error getting exchange rate:', error);
      throw new Error(`Failed to get exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async executeBatchSwap(
    wallets: Wallet[],
    destinationAccount: string,
    sourceCurrency: string,
    sourceIssuer: string | null,
    destinationCurrency: string,
    destinationIssuer: string | null,
    destinationAmount: string
  ): Promise<SwapResult> {
    try {
      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      const results: SwapResult = {};

      for (const wallet of wallets) {
        try {
          console.log(`Attempting swap for wallet: ${wallet.address}`);
          
          // Use the performSwap from XrplSwap class
          const txResult = await this.xrplSwap.performSwap(
            wallet,
            parseFloat(destinationAmount),
            sourceCurrency as 'XRP' | 'LAWAS' | 'RLUSD',
            destinationCurrency as 'XRP' | 'LAWAS' | 'RLUSD'
          );

          if (txResult && txResult.result.meta && typeof txResult.result.meta === 'object' && 'TransactionResult' in txResult.result.meta) {
            if (txResult.result.meta.TransactionResult === 'tesSUCCESS') {
              results[wallet.address] = txResult.result.hash;
              console.log(`Swap successful for ${wallet.address}. Tx Hash: ${txResult.result.hash}`);
            } else {
              results[wallet.address] = null;
              console.error(`Swap failed for ${wallet.address}. Result: ${txResult.result.meta.TransactionResult}`);
            }
          } else {
            results[wallet.address] = null;
            console.error(`Swap failed for ${wallet.address}. Unknown transaction result.`);
          }
        } catch (error) {
          console.error(`Error during swap for ${wallet.address}:`, error);
          results[wallet.address] = null;
        }
      }

      return results;
    } catch (error) {
      console.error('Error executing batch swap:', error);
      throw new Error('Failed to execute batch swap');
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.disconnect();
    }
  }
}


