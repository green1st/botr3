
import { Wallet, xrpToDrops } from 'xrpl';
import XrplConnection from './XrplConnection';
import axios from 'axios';

type Currency = 'XRP' | 'LAWAS' | 'RLUSD';

interface OnTheDEXPairData {
  base: { currency: string; issuer?: string };
  quote: { currency: string; issuer?: string } | string;
  last: number;
  // ... other fields like ago24, num_trades, pc24, price_hi, price_lo, price_mid, trend, volume_base, volume_quote, volume_usd, time
}

interface OnTheDEXResponse {
  pairs: OnTheDEXPairData[];
}

class XrplSwap {
  private xrplConnection: XrplConnection;

  public LAWAS_ISSUER = 'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC'
  public RLUSD_ISSUER = 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'

  constructor() {
    this.xrplConnection = XrplConnection.getInstance();
  }

  public async getExchangeRateFromXPMarket(sourceCurrency: Currency, destinationCurrency: Currency): Promise<{ rate: number, hasPool: boolean, raw?: any }> {
    console.log(`[getExchangeRateFromXPMarket] Fetching exchange rate for: ${sourceCurrency} to ${destinationCurrency}`);
    const API_BASE_URL = 'https://api.xpmarket.com/api/swap/impact';
    let payload: any;

    if (sourceCurrency === 'XRP' && destinationCurrency === 'LAWAS') {
      payload = {
        code1: 'XRP',
        code2: 'LAWAS',
        issuer2: this.LAWAS_ISSUER,
        amount: 1
      };
    } else if (sourceCurrency === 'LAWAS' && destinationCurrency === 'XRP') {
      payload = {
        code1: 'LAWAS',
        issuer1: this.LAWAS_ISSUER,
        code2: 'XRP',
        amount: 1
      };
    } else if (sourceCurrency === 'XRP' && destinationCurrency === 'RLUSD') {
      payload = {
        code1: 'XRP',
        code2: 'RLUSD',
        issuer2: this.RLUSD_ISSUER,
        amount: 1
      };
    } else if (sourceCurrency === 'RLUSD' && destinationCurrency === 'XRP') {
      payload = {
        code1: 'RLUSD',
        issuer1: this.RLUSD_ISSUER,
        code2: 'XRP',
        amount: 1
      };
    } else if (sourceCurrency === 'LAWAS' && destinationCurrency === 'RLUSD') {
      payload = {
        code1: 'LAWAS',
        issuer1: this.LAWAS_ISSUER,
        code2: 'RLUSD',
        issuer2: this.RLUSD_ISSUER,
        amount: 1
      };
    } else if (sourceCurrency === 'RLUSD' && destinationCurrency === 'LAWAS') {
      payload = {
        code1: 'RLUSD',
        issuer1: this.RLUSD_ISSUER,
        code2: 'LAWAS',
        issuer2: this.LAWAS_ISSUER,
        amount: 1
      };
    } else {
      throw new Error('Invalid currency pair for XPMarket API lookup.');
    }

    try {
      const response = await axios.post(API_BASE_URL, payload, {
        params: payload
      });
      const data: any = response.data;
      // const exchangeRate = parseFloat(data.rate);
      const exchangeRate = parseFloat(data.amount2);

      const hasPool = data?.pool?.hasPool === true;
      console.log(`[getExchangeRateFromXPMarket] Exchange rate: ${exchangeRate}, AMM pool available: ${hasPool}`);

      return { rate: exchangeRate, hasPool, raw: data };
    } catch (error: any) {
      console.error('[getExchangeRateFromXPMarket] Error fetching exchange rate:', error.message);
      return { rate: 1, hasPool: false };
    }
  }

  private formatCurrencyForOnTheDEX(currency: Currency): string {
    if (currency === 'XRP') {
      return 'XRP';
    } else if (currency === 'LAWAS') {
      return `LAWAS.${this.LAWAS_ISSUER}`;
    } else if (currency === 'RLUSD') {
      return `RLUSD.${this.RLUSD_ISSUER}`;
    } else {
      throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  // API from onthedex
  public async getExchangeRate(sourceCurrency: Currency, destinationCurrency: Currency): Promise<{ rate: number, foundRate: boolean, raw?: OnTheDEXResponse }> {
    console.log(`[getExchangeRate] Fetching exchange rate for: ${sourceCurrency} to ${destinationCurrency} from OnTheDEX.live`);
    const API_BASE_URL = 'https://api.onthedex.live/public/v1/ticker';

    const formattedSource = this.formatCurrencyForOnTheDEX(sourceCurrency);
    const formattedDestination = this.formatCurrencyForOnTheDEX(destinationCurrency);

    // OnTheDEX uses BASE:QUOTE format. The 'last' price in the response will be 1 BASE = X QUOTE.
    // So, if you want to know how much DestinationCurrency you get for 1 SourceCurrency,
    // the pair path should be SourceCurrency:DestinationCurrency.
    const pairPath = `${formattedSource}:${formattedDestination}`;
    const requestUrl = `${API_BASE_URL}/${pairPath}`;

    try {
      const response = await axios.get<OnTheDEXResponse>(requestUrl);
      const data: OnTheDEXResponse = response.data;

      if (data.pairs && data.pairs.length > 0) {
        const pairData = data.pairs[0];
        // The 'last' key represents the last traded price.
        // If the pair requested was SourceCurrency:DestinationCurrency,
        // then 'last' means 1 SourceCurrency = X DestinationCurrency.
        const exchangeRate = pairData.last;

        console.log(`[getExchangeRate] Exchange rate: ${exchangeRate}, Raw data:`, data);
        return { rate: exchangeRate, foundRate: true, raw: data };
      } else {
        console.log(`[getExchangeRate] No data found for pair: ${pairPath}`);
        return { rate: 0, foundRate: false, raw: data };
      }
    } catch (error: any) {
      console.error('[getExchangeRate] Error fetching exchange rate:', error.message);
      // Return a default or error state. Adjust as per your error handling strategy.
      return { rate: 0, foundRate: false };
    }
  }

  public async performSwap(
    senderWallet: Wallet,
    amount: number,
    sourceCurrency: Currency,
    destinationCurrency: Currency,
    lawasCoinIssuer: string = 'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC',
    lawasCoinTokenId: string = '4C41574153000000000000000000000000000000',
    rlusdCoinIssuer: string = 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
    rlusdCoinTokenId: string = '524C555344000000000000000000000000000000'  // Correct RLUSD token ID
  ): Promise<any> {
    const client = this.xrplConnection.getClient();
    if (!client.isConnected()) {
      await client.connect();
      console.log('[performSwap] Client reconnected.');
    }

    let transactionAmount: any
    let transactionSendMax: any
    let transactionPaths: any[] | undefined;
    const SLIPPAGE_PERCENTAGE = 0.01; // 1% slippage tolerance

    // Get exchange rate from XPMarket API
    const exchangeInfo = await this.getExchangeRateFromXPMarket(sourceCurrency, destinationCurrency);
    if (exchangeInfo.rate == 0) {
      console.warn(`[performSwap] No AMM pool available for ${sourceCurrency} <-> ${destinationCurrency}`);
    }

    const exchangeRate = exchangeInfo.rate;
    console.log(`[performSwap] Using exchange rate: ${exchangeRate}`);

    if (sourceCurrency === 'XRP' && destinationCurrency === 'LAWAS') {
      // Swap XRP to Lawas Coin (Payment transaction)
      // Amount: LAWAS (what we want to receive)
      // SendMax: XRP (what we are willing to pay)
      let amountLawasToReceive = amount * exchangeRate; 
      // Apply slippage tolerance: reduce the expected amount to receive
      amountLawasToReceive = amountLawasToReceive * (1 - SLIPPAGE_PERCENTAGE);
      
      console.log(`[performSwap] XRP to LAWAS: Selling ${amount} XRP, expecting ${amountLawasToReceive.toFixed(6)} LAWAS (with slippage)`);
      transactionAmount = {
        currency: lawasCoinTokenId,
        issuer: lawasCoinIssuer,
        value: amountLawasToReceive.toFixed(6), // Round to 10 decimal places for issued currency
      }
      transactionSendMax = xrpToDrops(amount) // Amount of XRP to pay
    } else if (sourceCurrency === 'LAWAS' && destinationCurrency === 'XRP') {
      // Swap Lawas Coin to XRP (Payment transaction)
      // Amount: XRP (what we want to receive)
      // SendMax: LAWAS (what we are willing to pay)
      let amountXrpToReceive = amount * exchangeRate; 
      // Apply slippage tolerance: reduce the expected amount to receive
      amountXrpToReceive = amountXrpToReceive * (1 - SLIPPAGE_PERCENTAGE);

      console.log(`[performSwap] LAWAS to XRP: Selling ${amount} LAWAS, expecting ${amountXrpToReceive.toFixed(6)} XRP (with slippage)`);
      transactionAmount = xrpToDrops(amountXrpToReceive.toFixed(6)) // Amount of XRP to receive
      transactionSendMax = {
        currency: lawasCoinTokenId,
        issuer: lawasCoinIssuer,
        value: amount.toFixed(6), // Round LAWAS amount to 10 decimal places
      }
    } else if (sourceCurrency === 'XRP' && destinationCurrency === 'RLUSD') {
      // Swap XRP to RLUSD (Payment transaction)
      let amountRLUSDToReceive = amount * exchangeRate;
      amountRLUSDToReceive = amountRLUSDToReceive * (1 - SLIPPAGE_PERCENTAGE);

      console.log(`[performSwap] XRP to RLUSD: Selling ${amount} XRP, expecting ${amountRLUSDToReceive.toFixed(6)} RLUSD (with slippage)`);
      transactionAmount = {
        currency: rlusdCoinTokenId,
        issuer: rlusdCoinIssuer,
        value: amountRLUSDToReceive.toFixed(6),
      };
      transactionSendMax = xrpToDrops(amount);
    } else if (sourceCurrency === 'RLUSD' && destinationCurrency === 'XRP') {
      // Swap RLUSD to XRP (Payment transaction)
      let amountXRPToReceive = amount * exchangeRate;
      amountXRPToReceive = amountXRPToReceive * (1 - SLIPPAGE_PERCENTAGE);

      console.log(`[performSwap] RLUSD to XRP: Selling ${amount} RLUSD, expecting ${amountXRPToReceive.toFixed(6)} XRP (with slippage)`);
      transactionAmount = xrpToDrops(amountXRPToReceive.toFixed(6));
      transactionSendMax = {
        currency: rlusdCoinTokenId,
        issuer: rlusdCoinIssuer,
        value: amount.toFixed(6),
      };
    } else if (sourceCurrency === 'LAWAS' && destinationCurrency === 'RLUSD') {
      // Swap LAWAS to RLUSD (Payment transaction)
      let amountRLUSDToReceive = amount * exchangeRate;
      amountRLUSDToReceive = amountRLUSDToReceive * (1 - SLIPPAGE_PERCENTAGE);

      console.log(`[performSwap] LAWAS to RLUSD: Selling ${amount} LAWAS, expecting ${amountRLUSDToReceive.toFixed(6)} RLUSD (with slippage)`);
      transactionAmount = {
        currency: rlusdCoinTokenId,
        issuer: rlusdCoinIssuer,
        value: amountRLUSDToReceive.toFixed(6),
      };
      transactionSendMax = {
        currency: lawasCoinTokenId,
        issuer: lawasCoinIssuer,
        value: amount.toFixed(6),
      };

      transactionPaths = [
        [
          {
            currency: 'XRP' // Jalur melalui XRP
          }
        ]
      ];
    } else if (sourceCurrency === 'RLUSD' && destinationCurrency === 'LAWAS') {
      // Swap RLUSD to LAWAS (Payment transaction)
      let amountLAWASToReceive = amount * exchangeRate;
      amountLAWASToReceive = amountLAWASToReceive * (1 - SLIPPAGE_PERCENTAGE);

      console.log(`[performSwap] RLUSD to LAWAS: Selling ${amount} RLUSD, expecting ${amountLAWASToReceive.toFixed(6)} LAWAS (with slippage)`);
      transactionAmount = {
        currency: lawasCoinTokenId,
        issuer: lawasCoinIssuer,
        value: amountLAWASToReceive.toFixed(6),
      };
      transactionSendMax = {
        currency: rlusdCoinTokenId,
        issuer: rlusdCoinIssuer,
        value: amount.toFixed(6),
      };

      transactionPaths = [
        [
          {
            currency: 'XRP' // Jalur melalui XRP
          }
        ]
      ];
    } else {
      throw new Error('Invalid swap direction specified.');
    }

    const prepared = await client.autofill({
      TransactionType: 'Payment',
      Account: senderWallet.address,
      Destination: senderWallet.address, // Self-payment for swap
      Amount: transactionAmount,
      SendMax: transactionSendMax,
      ...(transactionPaths && { Paths: transactionPaths }),
      Flags: 2147614720,
    })

    console.log(`[performSwap] Prepared transaction: ${JSON.stringify(prepared)}`);

    const signed = senderWallet.sign(prepared)
    const tx = await client.submitAndWait(signed.tx_blob)
    console.log(`[performSwap] Transaction result: ${JSON.stringify(tx)}`);
    
    if (tx.result.meta && typeof tx.result.meta === 'object' && 'TransactionResult' in tx.result.meta) {
      if (tx.result.meta.TransactionResult === 'tesSUCCESS') {
        console.log(`[performSwap] Transaction successful: ${tx.result.hash}`);
      } else {
        console.error(`[performSwap] Transaction failed with result: ${tx.result.meta.TransactionResult}`);
        if (tx.result.meta.TransactionResult === 'tecPATH_DRY') {
          console.error('[performSwap] tecPATH_DRY: No liquidity or path found for the swap. This might be due to insufficient funds, incorrect trustlines, or no active offers on the DEX.');
        } else if (tx.result.meta.TransactionResult === 'tecNO_PERMISSION') {
          console.error('[performSwap] tecNO_PERMISSION: The account does not have permission to perform this operation. Check account settings and trustlines.');
        } else if (tx.result.meta.TransactionResult === 'tecUNFUNDED_PAYMENT') {
          console.error('[performSwap] tecUNFUNDED_PAYMENT: The account does not have enough funds to cover the transaction cost or the SendMax amount.');
        }
      }
    } else {
      console.error('[performSwap] Transaction failed: Unknown result structure.');
    }

    return tx
  }

}

export default XrplSwap;


