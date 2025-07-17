import { NextRequest, NextResponse } from 'next/server';
import { TrustlineManager } from '@/lib/trustline-manager';
import { WalletManager } from '@/lib/wallet-manager';

export async function POST(request: NextRequest) {
  try {
    const { issuer, currency, limit, password } = await request.json();

    if (!issuer || !currency || !password) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get all wallets and decrypt them
    const walletManager = new WalletManager();
    const decryptedWallets = await walletManager.getDecryptedWallets(password);

    if (decryptedWallets.length === 0) {
      return NextResponse.json(
        { error: 'No wallets found or invalid password' },
        { status: 400 }
      );
    }

    const trustlineManager = new TrustlineManager();
    const result = await trustlineManager.createTrustlinesForAllWallets(
      decryptedWallets,
      issuer,
      currency,
      limit || '1000000'
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating trustlines for all wallets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

