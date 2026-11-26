// app/api/assets/[code]/route.ts
// Single asset operations (lookup & transfer)

import { NextResponse } from 'next/server';
import { getAssetByCode, transferAsset } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const asset = getAssetByCode(code);
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: asset });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();

    if (!body.new_employee_name) {
      return NextResponse.json(
        { success: false, error: 'new_employee_name is required for transfer' },
        { status: 400 }
      );
    }

    const result = transferAsset(code, body.new_employee_name, body.new_location);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message, asset: result.asset });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
