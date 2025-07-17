import { NextResponse } from 'next/server';
import { WalletManager } from '@/lib/wallet-manager';
import { Client, TrustSet, Wallet } from 'xrpl';

export async function POST(request: Request) {
  try {
    const { password, wallet_addresses } = await request.json();

    if (!password || !wallet_addresses || !Array.isArray(wallet_addresses)) {
      return NextResponse.json({ success: false, message: 'Password and wallet addresses (array) are required.' }, { status: 400 });
    }

    const walletManager = new WalletManager();
    const client = new Client("wss://v-xrpl.r3store.io");
    await client.connect();

    const results: { [address: string]: { success: boolean; message: string } } = {};
    let successfulTrustlines = 0;
    let failedTrustlines = 0;

    try {
      const allWallets = await walletManager.getDecryptedWallets(password);
      const walletsToProcess = allWallets.filter(wallet => wallet_addresses.includes(wallet.address));

      if (walletsToProcess.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No wallets selected or failed to decrypt with provided password',
          total_wallets: 0,
          successful: 0,
          failed: 0,
          results: {},
        });
      }

      const lawasCurrency = {
        currency: 'LAWAS', // Changed to ASCII representation
        issuer: 'rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC',
      };

      for (const wallet of walletsToProcess) {
        try {
          const hasLawasTrustline = await walletManager.hasTrustline(
            wallet.address,
            lawasCurrency.currency,
            lawasCurrency.issuer
          );

          if (!hasLawasTrustline) {
            console.log(`Setting LAWAS trustline for wallet: ${wallet.address}`);
            const trustSet: TrustSet = {
              TransactionType: 'TrustSet',
              Account: wallet.address,
              LimitAmount: {
                currency: lawasCurrency.currency,
                issuer: lawasCurrency.issuer,
                value: '100000000000000000000000000000000000000', // Large limit
              },
            };

            const prepared = await client.autofill(trustSet);
            const signed = wallet.sign(prepared);
            const result = await client.submitAndWait(signed.tx_blob);

            if (result.result.engine_result === 'tesSUCCESS') {
              results[wallet.address] = { success: true, message: 'LAWAS Trustline set successfully.' };
              successfulTrustlines++;
            } else {
              results[wallet.address] = { success: false, message: `Failed to set LAWAS Trustline: ${result.result.engine_result_message}` };
              failedTrustlines++;
            }
          } else {
            results[wallet.address] = { success: true, message: 'LAWAS Trustline already exists.' };
            successfulTrustlines++;
          }
        } catch (walletError: any) {
          results[wallet.address] = { success: false, message: `Failed to set LAWAS Trustline: ${walletError.message}` };
          failedTrustlines++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `LAWAS Trustline setting completed: ${successfulTrustlines} successful, ${failedTrustlines} failed`,
        total_wallets: walletsToProcess.length,
        successful: successfulTrustlines,
        failed: failedTrustlines,
        results: results,
      });

    } catch (error: any) {
      console.error('Error in LAWAS Trustline setting:', error);
      return NextResponse.json({
        success: false,
        message: `LAWAS Trustline setting failed: ${error.message}`,
        total_wallets: 0,
        successful: 0,
        failed: 0,
        results: {},
      }, { status: 500 });
    } finally {
      await client.disconnect();
    }

  } catch (error: any) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
  }
}


