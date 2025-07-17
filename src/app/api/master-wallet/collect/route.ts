import { NextRequest, NextResponse } from 'next/server';
import { MasterWalletManager } from '@/lib/master-wallet';
import { WalletManager } from '@/lib/wallet-manager';

export async function POST(request: NextRequest) {
  try {
    const { wallet_addresses, password, memo } = await request.json();

    if (!wallet_addresses || wallet_addresses.length === 0) {
      return NextResponse.json(
        { error: 'No wallet addresses provided' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Get decrypted wallets
    const walletManager = new WalletManager();
    const decryptedWallets = [];
    
    for (const address of wallet_addresses) {
      const walletData = await walletManager.getWalletByAddress(address);
      if (walletData) {
        const wallet = walletManager.decryptWallet(walletData, password);
        if (wallet) {
          decryptedWallets.push(wallet);
        }
      }
    }

    if (decryptedWallets.length === 0) {
      return NextResponse.json(
        { error: 'Failed to decrypt wallets with provided password' },
        { status: 400 }
      );
    }

    const masterWalletManager = new MasterWalletManager();
    const result = await masterWalletManager.collectFromWallets(
      decryptedWallets,
      memo || ''
    );
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error collecting from wallets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

