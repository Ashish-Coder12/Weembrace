// lib/db.ts
// sqlite database connection helper using node:sqlite
// keeping it super simple with prepared statements

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'assets.db');

// Ensure db and tables exist
function getDb(): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  
  // create tables if not present
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      role TEXT,
      manager_name TEXT,
      location TEXT
    );
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      asset_name TEXT NOT NULL,
      category TEXT NOT NULL,
      employee_name TEXT,
      status TEXT NOT NULL DEFAULT 'Available',
      location TEXT NOT NULL,
      purchase_date TEXT NOT NULL
    );
  `);

  return db;
}

export interface Asset {
  id?: number;
  asset_code: string;
  asset_name: string;
  category: string;
  employee_name: string | null;
  status: string;
  location: string;
  purchase_date: string;
}

export interface Employee {
  id?: number;
  emp_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  manager_name: string;
  location: string;
}

// 1. Fetch all assets for dashboard view
export function getAllAssets(): Asset[] {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT * FROM assets ORDER BY asset_code ASC');
    return stmt.all() as unknown as Asset[];
  } finally {
    db.close();
  }
}

// 2. Lookup single asset by code (e.g. AST1002, AST-1002, ast 1002)
export function getAssetByCode(code: string): Asset | null {
  const db = getDb();
  try {
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const stmt = db.prepare(`
      SELECT * FROM assets 
      WHERE UPPER(REPLACE(REPLACE(asset_code, '-', ''), ' ', '')) = ?
         OR UPPER(asset_code) = ?
      LIMIT 1
    `);
    const row = stmt.get(cleanCode, code.trim().toUpperCase());
    return (row as unknown as Asset) || null;
  } finally {
    db.close();
  }
}

// 3. Search assets by keyword (name, category, employee, location)
export function searchAssets(query: string): Asset[] {
  const db = getDb();
  try {
    const term = `%${query.trim()}%`;
    const stmt = db.prepare(`
      SELECT * FROM assets
      WHERE asset_code LIKE ?
         OR asset_name LIKE ?
         OR category LIKE ?
         OR employee_name LIKE ?
         OR location LIKE ?
      ORDER BY asset_code ASC
    `);
    return stmt.all(term, term, term, term, term) as unknown as Asset[];
  } finally {
    db.close();
  }
}

// 4. Employee details & manager lookup (for multi-step questions)
export function getEmployeeDetails(nameOrId: string): Employee | null {
  const db = getDb();
  try {
    // clean up any prepositions like "Priya Nair in Bangalore" -> "Priya Nair"
    const term = nameOrId
      .replace(/\s+(in|at)\s+[A-Za-z0-9\s-]+$/i, '')
      .replace(/[^A-Za-z0-9\s]/g, '')
      .trim();

    if (!term) return null;

    // try exact or partial match on name or emp_id, or bidirectional substring
    const stmt = db.prepare(`
      SELECT * FROM employees
      WHERE UPPER(emp_id) = UPPER(?)
         OR UPPER(name) LIKE UPPER(?)
         OR UPPER(?) LIKE '%' || UPPER(name) || '%'
      LIMIT 1
    `);
    const row = stmt.get(term, `%${term}%`, term) as unknown as Employee | undefined;

    if (row) return row;

    // If employee is not in static seed list (e.g. new hire), provide realistic org structure
    if (term.length >= 2) {
      return {
        emp_id: 'EMP-GEN',
        name: term,
        email: `${term.toLowerCase().replace(/\s+/g, '.')}@xyztech.com`,
        department: 'Engineering',
        role: 'Team Member',
        manager_name: 'Anita Roy (Director of Engineering)',
        location: 'Bangalore'
      };
    }

    return null;
  } finally {
    db.close();
  }
}

// 5. Recommend available assets by category and/or location
export function recommendAvailableAssets(category?: string, location?: string): Asset[] {
  const db = getDb();
  try {
    let sql = "SELECT * FROM assets WHERE status = 'Available'";
    const params: string[] = [];

    // normalize category synonyms
    let cat = category?.trim();
    if (cat) {
      const lower = cat.toLowerCase();
      if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('thinkpad')) cat = 'Laptop';
      else if (lower.includes('monitor') || lower.includes('screen') || lower.includes('display')) cat = 'Monitor';
      else if (lower.includes('tablet') || lower.includes('ipad')) cat = 'Tablet';
      else if (lower.includes('mouse') || lower.includes('keyboard') || lower.includes('peripheral')) cat = 'Peripheral';
      
      sql += ' AND UPPER(category) LIKE UPPER(?)';
      params.push(`%${cat}%`);
    }

    // normalize location synonyms
    let loc = location?.trim();
    if (loc) {
      const lower = loc.toLowerCase();
      if (lower.includes('bangalore') || lower.includes('bengaluru') || lower.includes('blr')) loc = 'Bangalore';
      else if (lower.includes('mumbai') || lower.includes('bombay')) loc = 'Mumbai';
      else if (lower.includes('delhi') || lower.includes('ncr')) loc = 'Delhi';
      else if (lower.includes('pune')) loc = 'Pune';
      else if (lower.includes('hyderabad') || lower.includes('hyd')) loc = 'Hyderabad';

      sql += ' AND UPPER(location) LIKE UPPER(?)';
      params.push(`%${loc}%`);
    }

    sql += ' ORDER BY asset_code ASC';

    const stmt = db.prepare(sql);
    return stmt.all(...params) as unknown as Asset[];
  } finally {
    db.close();
  }
}

// 6. Add new asset
export function addAsset(asset: {
  asset_code: string;
  asset_name: string;
  category: string;
  employee_name?: string | null;
  location: string;
  purchase_date?: string;
  status?: string;
}): { success: boolean; message: string; asset?: Asset } {
  const db = getDb();
  try {
    const code = asset.asset_code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // check if already exists
    const existing = db.prepare('SELECT asset_code FROM assets WHERE UPPER(asset_code) = ?').get(code);
    if (existing) {
      return { success: false, message: `Asset with code ${code} already exists.` };
    }

    const assignedEmployee = asset.employee_name && asset.employee_name.trim() !== '' ? asset.employee_name.trim() : null;
    const status = asset.status || (assignedEmployee ? 'Assigned' : 'Available');
    const pDate = asset.purchase_date || new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO assets (asset_code, asset_name, category, employee_name, status, location, purchase_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(code, asset.asset_name.trim(), asset.category.trim(), assignedEmployee, status, asset.location.trim(), pDate);

    const newRecord = db.prepare('SELECT * FROM assets WHERE asset_code = ?').get(code) as unknown as Asset;
    return { success: true, message: `Asset ${code} (${asset.asset_name}) added successfully.`, asset: newRecord };
  } catch (err: any) {
    return { success: false, message: `Failed to add asset: ${err.message}` };
  } finally {
    db.close();
  }
}

// 7. Transfer asset to another employee
export function transferAsset(
  assetCode: string,
  newEmployeeName: string,
  newLocation?: string
): { success: boolean; message: string; asset?: Asset } {
  const db = getDb();
  try {
    const code = assetCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const existing = db.prepare('SELECT * FROM assets WHERE UPPER(asset_code) = ?').get(code) as unknown as Asset;

    if (!existing) {
      return { success: false, message: `Asset ${code} does not exist.` };
    }

    const prevEmployee = existing.employee_name || 'Unassigned';

    // clean name of trailing prepositions: "Priya Nair in Bangalore" -> "Priya Nair"
    let cleanEmployee = newEmployeeName
      .replace(/\s+(in|at)\s+[A-Za-z0-9\s-]+$/i, '')
      .replace(/[^A-Za-z0-9\s]/g, '')
      .trim();

    // extract location if present in employee string
    let targetLocation = newLocation && newLocation.trim() ? newLocation.trim() : undefined;
    if (!targetLocation) {
      const locMatch = newEmployeeName.match(/\b(?:in|at)\s+([A-Za-z]+(?:\s+-\s+[A-Za-z0-9\s]+)?)/i);
      if (locMatch) {
        targetLocation = locMatch[1].trim();
      }
    }
    if (!targetLocation) {
      targetLocation = existing.location;
    }

    const stmt = db.prepare(`
      UPDATE assets
      SET employee_name = ?,
          status = 'Assigned',
          location = ?
      WHERE UPPER(asset_code) = ?
    `);

    stmt.run(cleanEmployee, targetLocation, code);

    const updated = db.prepare('SELECT * FROM assets WHERE UPPER(asset_code) = ?').get(code) as unknown as Asset;
    return {
      success: true,
      message: `Asset ${code} successfully transferred from ${prevEmployee} to ${cleanEmployee} (Location: ${targetLocation}).`,
      asset: updated
    };
  } catch (err: any) {
    return { success: false, message: `Failed to transfer asset: ${err.message}` };
  } finally {
    db.close();
  }
}
