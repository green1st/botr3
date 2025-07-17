import { NextRequest, NextResponse } from 'next/server';
import { TrustlineManager } from '@/lib/trustline-manager';
import { WalletManager } from '@/lib/wallet-manager';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, issuer, currency, limit, password } = await request.json();

    if (!wallet_address || !issuer || !currency || !password) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get and decrypt wallet
    const walletManager = new WalletManager();
    const walletData = await walletManager.getWalletByAddress(wallet_address);
    
    if (!walletData) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    const wallet = walletManager.decryptWallet(walletData, password);
    if (!wallet) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      );
    }

    const trustlineManager = new TrustlineManager();
    const result = await trustlineManager.createTrustline(
      wallet,
      issuer,
      currency,
      limit || '1000000'
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating trustline:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

