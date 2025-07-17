import { NextRequest, NextResponse } from 'next/server';
import { SwapManager } from '@/lib/swap-manager';

export async function POST(request: NextRequest) {
  try {
    const { source_currency, source_issuer, destination_currency, destination_issuer, amount } = await request.json();

    const swapManager = new SwapManager();
    const rate = await swapManager.getExchangeRate(
      source_currency,
      source_issuer,
      destination_currency,
      destination_issuer,
      amount
    );
    
    return NextResponse.json({ rate });
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

