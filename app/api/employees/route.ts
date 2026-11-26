// app/api/employees/route.ts
// Employee lookup endpoint (handles manager and org hierarchy queries)

import { NextResponse } from 'next/server';
import { getEmployeeDetails } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nameOrId = searchParams.get('q');

    if (!nameOrId) {
      return NextResponse.json({ success: false, error: 'Query parameter q is required' }, { status: 400 });
    }

    const emp = getEmployeeDetails(nameOrId);
    if (!emp) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: emp });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
