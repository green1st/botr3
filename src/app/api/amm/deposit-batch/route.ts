import { NextResponse } from 'next/server';
import { AmmManager } from '@/lib/amm-manager';

const ammManager = new AmmManager();

export async function POST(request: Request) {
  try {
    const { password, amountLawas, amountXRP, wallet_addresses } = await request.json();

    if (!password || (!amountLawas && !amountXRP) || !wallet_addresses) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const batchResults = await ammManager.batchDepositToAmmPool(
      password,
      amountLawas,
      amountXRP,
      wallet_addresses
    );

    return NextResponse.json(batchResults);
  } catch (error: any) {
    console.error('Error in batch AMM deposit API:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute batch AMM deposit' }, { status: 500 });
  }
}


