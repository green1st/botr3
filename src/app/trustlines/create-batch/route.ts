import { NextResponse } from 'next/server';
import { WalletManager } from '@/lib/wallet-manager';
import { Client, TrustSet, xrpToDrops } from 'xrpl';

export async function POST(req: Request) {
  try {
    const { wallet_addresses, issuer, currency, limit, password } = await req.json();

    if (!wallet_addresses || !Array.isArray(wallet_addresses) || wallet_addresses.length === 0) {
      return NextResponse.json({ success: false, message: 'No wallet addresses provided' }, { status: 400 });
    }
    if (!issuer || !currency || !limit || !password) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const walletManager = new WalletManager();
    const client = new Client(process.env.XRPL_NODE || 'wss://xrplcluster.com');
    await client.connect();

    const results: { [key: string]: any } = {};
    let successfulCount = 0;
    let failedCount = 0;

    for (const address of wallet_addresses) {
      try {
        const walletData = walletManager.getWalletByAddress(address);
        if (!walletData) {
          results[address] = { success: false, message: 'Wallet not found in manager' };
          failedCount++;
          continue;
        }

        const decryptedSeed = walletManager.decryptSeed(walletData.encryptedSeed, password);
        const wallet = Wallet.fromSeed(decryptedSeed);

        const trustlineTx: TrustSet = {
          TransactionType: 'TrustSet',
          Account: wallet.address,
          LimitAmount: {
            currency: currency,
            issuer: issuer,
            value: limit,
          },
        };

        const prepared = await client.autofill(trustlineTx);
        const signed = wallet.sign(prepared);
        const submitResult = await client.submitAndWait(signed.tx_blob);

        if (submitResult.result.engine_result === 'tesSUCCESS') {
          results[address] = { success: true, message: 'Trustline created', tx_hash: signed.hash };
          successfulCount++;
        } else {
          results[address] = { success: false, message: `Failed to create trustline: ${submitResult.result.engine_result_message}` };
          failedCount++;
        }
      } catch (error: any) {
        results[address] = { success: false, message: `Failed to create trustline: ${error.message}` };
        failedCount++;
      }
    }

    await client.disconnect();

    return NextResponse.json({
      success: true,
      message: `Batch trustline creation completed: ${successfulCount} successful, ${failedCount} failed`,
      total_wallets: wallet_addresses.length,
      successful: successfulCount,
      failed: failedCount,
      results: results,
    });

  } catch (error: any) {
    console.error('Error in batch trustline creation:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


