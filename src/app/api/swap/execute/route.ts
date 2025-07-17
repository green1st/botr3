import { NextRequest, NextResponse } from 'next/server';
import { SwapManager } from '@/lib/swap-manager';
import { WalletManager } from '@/lib/wallet-manager';

export async function POST(request: NextRequest) {
  try {
    const {
      wallet_addresses,
      destination_account,
      source_currency,
      source_issuer,
      destination_currency,
      destination_issuer,
      destination_amount,
      password
    } = await request.json();

    if (!wallet_addresses || !destination_account || !source_currency || 
        !destination_currency || !destination_amount || !password) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get decrypted wallets
    const walletManager = new WalletManager();
    const allWallets = await walletManager.getDecryptedWallets(password);
    const decryptedWallets = allWallets.filter(wallet => wallet_addresses.includes(wallet.address));

    if (decryptedWallets.length === 0) {
      return NextResponse.json(
        { error: 'No selected wallets found or failed to decrypt with provided password' },
        { status: 400 }
      );
    }

    const swapManager = new SwapManager();
    const results = await swapManager.executeBatchSwap(
      decryptedWallets,
      destination_account,
      source_currency,
      source_issuer,
      destination_currency,
      destination_issuer,
      destination_amount
    );
    
    return NextResponse.json({
      message: 'Swap execution completed',
      results: results
    });
  } catch (error) {
    console.error('Error executing swap:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}


