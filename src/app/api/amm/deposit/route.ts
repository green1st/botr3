import { NextResponse } from 'next/server';
import { AmmManager } from '../../../../lib/amm-manager';
import { WalletManager } from '../../../../lib/wallet-manager';

const ammManager = new AmmManager();
const walletManager = new WalletManager();

export async function POST(request: Request) {
  try {
    const { walletAddress, amountLawas, amountXRP, password } = await request.json();

    if (!walletAddress || !password || (!amountLawas && !amountXRP)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const walletData = await walletManager.getWalletByAddress(walletAddress);
    if (!walletData) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const wallet = walletManager.decryptWallet(walletData, password);
    if (!wallet) {
      console.error(`Failed to decrypt wallet for address: ${walletAddress}`); // Added logging
      return NextResponse.json({ error: 'Failed to decrypt wallet' }, { status: 401 });
    }
    console.log(`Decrypted wallet address in deposit API: ${wallet.address}`); // Added logging

    const result = await ammManager.depositToAmmPool(
      wallet,
      amountLawas,
      amountXRP,
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in AMM deposit API:', error);
    return NextResponse.json({ error: error.message || 'Failed to deposit to AMM pool' }, { status: 500 });
  }
}



