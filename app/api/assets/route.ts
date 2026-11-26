// app/api/assets/route.ts
// REST endpoint for retrieving and adding assets

import { NextResponse } from 'next/server';
import { getAllAssets, addAsset, searchAssets } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (query) {
      const filtered = searchAssets(query);
      return NextResponse.json({ success: true, count: filtered.length, data: filtered });
    }

    const all = getAllAssets();
    return NextResponse.json({ success: true, count: all.length, data: all });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Basic validation
    if (!body.asset_code || !body.asset_name || !body.category || !body.location) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: asset_code, asset_name, category, location' },
        { status: 400 }
      );
    }

    const result = addAsset(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message, asset: result.asset });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
