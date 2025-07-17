import { NextResponse } from "next/server";
import { AmmManager } from "../../../../lib/amm-manager";
import { WalletManager } from "../../../../lib/wallet-manager";
import { convertCurrencyToHex } from "@/lib/xrpl-utils"; // Import from utility file

export async function POST(request: Request) {
  try {
    const { password, wallet_addresses } = await request.json();

    if (!password || !wallet_addresses) {
      return NextResponse.json({ success: false, message: "Password and wallet addresses are required." }, { status: 400 });
    }

    const ammManager = new AmmManager();
    const walletManager = new WalletManager();

    const results: { [address: string]: { success: boolean; message: string } } = {};
    let successfulTrustlines = 0;
    let failedTrustlines = 0;

    try {
      // This already uses getDecryptedWallets, which returns decrypted Wallet objects.
      // No direct call to decryptSeed here.
      const allWallets = await walletManager.getDecryptedWallets(password);
      const walletsToProcess = allWallets.filter(wallet => wallet_addresses.includes(wallet.address));

      if (walletsToProcess.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No wallets selected or failed to decrypt with provided password",
          total_wallets: 0,
          successful: 0,
          failed: 0,
          results: {},
        });
      }

      const lawasCurrency = {
        currency: convertCurrencyToHex("LAWAS"), // Use the utility function
        issuer: "rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC",
      };
      const xrpCurrency = { currency: "XRP" };

      const lpTokenInfo = await ammManager.getAmmLpTokenInfo(ammManager["client"], lawasCurrency, xrpCurrency);

      if (!lpTokenInfo) {
        throw new Error("Could not retrieve AMM LP Token info.");
      }

      for (const wallet of walletsToProcess) {
        try {
          const hasLpTrustline = await walletManager.hasTrustline(
            wallet.address,
            lpTokenInfo.currency,
            lpTokenInfo.issuer
          );

          if (!hasLpTrustline) {
            console.log(`Setting trustline for LP Token for wallet: ${wallet.address}`);
            // ammManager.setLpTokenTrustline now expects password, walletAddresses, currency, issuer
            // We need to call it with the single wallet and its details
            const singleWalletResult = await ammManager.setLpTokenTrustline(
              password, // Pass password
              [wallet.address], // Pass single wallet address in an array
              lpTokenInfo.currency,
              lpTokenInfo.issuer
            );

            if (singleWalletResult.results[wallet.address].success) {
              results[wallet.address] = { success: true, message: "LP Trustline set successfully." };
              successfulTrustlines++;
            } else {
              results[wallet.address] = { success: false, message: `Failed to set LP Trustline: ${singleWalletResult.results[wallet.address].message}` };
              failedTrustlines++;
            }
          } else {
            results[wallet.address] = { success: true, message: "LP Trustline already exists." };
            successfulTrustlines++;
          }
        } catch (walletError: any) {
          results[wallet.address] = { success: false, message: `Failed to set LP Trustline: ${walletError.message}` };
          failedTrustlines++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Batch LP Trustline setting completed: ${successfulTrustlines} successful, ${failedTrustlines} failed`,
        total_wallets: walletsToProcess.length,
        successful: successfulTrustlines,
        failed: failedTrustlines,
        results: results,
      });

    } catch (error: any) {
      console.error("Error in batch LP Trustline setting:", error);
      return NextResponse.json({
        success: false,
        message: `Batch LP Trustline setting failed: ${error.message}`,
        total_wallets: 0,
        successful: 0,
        failed: 0,
        results: {},
      }, { status: 500 });
    } finally {
      // Disconnect client only if it was connected by this function
      // ammManager.disconnectClient(); // This is handled within setLpTokenTrustline now
    }

  } catch (error: any) {
    console.error("Error parsing request body:", error);
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }
}


