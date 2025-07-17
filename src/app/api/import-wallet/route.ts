import { NextRequest, NextResponse } from 'next/server';
import { WalletManager } from '@/lib/wallet-manager';

export async function POST(request: NextRequest) {
  try {
    const { seed, private_key, password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!seed && !private_key) {
      return NextResponse.json(
        { error: 'Either seed or private_key is required' },
        { status: 400 }
      );
    }

    const walletManager = new WalletManager();
    let wallet;

    if (seed) {
      wallet = await walletManager.importWalletFromSeed(seed, password);
    } else {
      wallet = await walletManager.importWalletFromPrivateKey(private_key, password);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Wallet imported successfully',
      wallet: wallet
    });
  } catch (error) {
    console.error('Error importing wallet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import wallet' },
      { status: 500 }
    );
  }
}

