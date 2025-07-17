
import { NextResponse } from 'next/server';
import { AmmManager } from '../../../../lib/amm-manager';

const ammManager = new AmmManager();

export async function POST(request: Request) {
  try {
    const { walletAddress, amountLawas, amountXRP, password } = await request.json();

    if (!walletAddress || !password || (!amountLawas && !amountXRP)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await ammManager.depositToAmmPool(
      walletAddress,
      amountLawas,
      amountXRP,
      password
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in AMM deposit API:', error);
    return NextResponse.json({ error: error.message || 'Failed to deposit to AMM pool' }, { status: 500 });
  }
}


