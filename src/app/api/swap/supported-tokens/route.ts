import { NextResponse } from 'next/server';
import { SwapManager } from '@/lib/swap-manager';

export async function GET() {
  try {
    const swapManager = new SwapManager();
    const tokens = swapManager.getSupportedTokens();
    
    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error fetching supported tokens:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

