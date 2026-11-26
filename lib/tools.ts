// lib/tools.ts
// agent tool definitions and tool execution handlers

import {
  getAssetByCode,
  searchAssets,
  getEmployeeDetails,
  recommendAvailableAssets,
  addAsset,
  transferAsset,
  getAllAssets
} from './db';

// OpenAI tool definitions schema
export const agentTools = [
  {
    type: 'function' as const,
    function: {
      name: 'lookup_asset',
      description: 'Look up specific asset information using an Asset Code (e.g., AST1002, ast1002, AST-1002) or keywords (device name, location, user).',
      parameters: {
        type: 'object',
        properties: {
          asset_code: {
            type: 'string',
            description: 'The asset code, e.g., AST1002'
          },
          query: {
            type: 'string',
            description: 'Search term or keywords'
          }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'lookup_employee',
      description: 'Find employee details such as department, role, location, and who their manager is. Crucial for multi-step questions like finding an asset user\'s manager.',
      parameters: {
        type: 'object',
        properties: {
          name_or_id: {
            type: 'string',
            description: 'Employee name or employee ID (e.g., Rohan Verma or EMP101)'
          }
        },
        required: ['name_or_id']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'recommend_assets',
      description: 'Recommend available unassigned assets based on category (Laptop, Monitor, Peripheral, Tablet) and/or office location (Bangalore, Mumbai, Pune, Delhi, Hyderabad).',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Asset category such as Laptop, Monitor, Tablet, etc.'
          },
          location: {
            type: 'string',
            description: 'Office location or city such as Bangalore, Mumbai, Pune, Delhi, Hyderabad'
          }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_new_asset',
      description: 'Add a new IT asset to the company inventory with details like code, name, category, location, and optional assigned employee.',
      parameters: {
        type: 'object',
        properties: {
          asset_code: {
            type: 'string',
            description: 'Asset code, e.g., AST1030'
          },
          asset_name: {
            type: 'string',
            description: 'Asset brand and model name, e.g. MacBook Pro 14 M3 or Dell 27 Monitor'
          },
          category: {
            type: 'string',
            description: 'Category: Laptop, Monitor, Peripheral, Tablet, Network, Mobile'
          },
          location: {
            type: 'string',
            description: 'Office location or floor, e.g. Bangalore - 3rd Floor'
          },
          employee_name: {
            type: 'string',
            description: 'Optional name of employee it is assigned to'
          },
          purchase_date: {
            type: 'string',
            description: 'Optional purchase date YYYY-MM-DD'
          }
        },
        required: ['asset_code', 'asset_name', 'category', 'location']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'transfer_asset',
      description: 'Transfer an IT asset from one employee to another, and optionally update its location.',
      parameters: {
        type: 'object',
        properties: {
          asset_code: {
            type: 'string',
            description: 'The asset code to transfer, e.g., AST1002'
          },
          new_employee_name: {
            type: 'string',
            description: 'Clean name of the employee receiving the asset (e.g. Priya Nair)'
          },
          new_location: {
            type: 'string',
            description: 'Optional new location/floor for the asset'
          }
        },
        required: ['asset_code', 'new_employee_name']
      }
    }
  }
];

// Tool execution router
export async function executeTool(name: string, args: Record<string, any>) {
  switch (name) {
    case 'lookup_asset': {
      let code = args.asset_code;
      if (!code && args.query) {
        const m = args.query.match(/AST[-\s]?\d{3,4}/i);
        if (m) code = m[0];
      }
      if (code) {
        const item = getAssetByCode(code);
        if (item) {
          return { found: true, asset: item };
        }
      }
      if (args.query || args.asset_code) {
        const term = args.query || args.asset_code;
        const list = searchAssets(term);
        if (list.length > 0) {
          return { found: true, count: list.length, assets: list };
        }
      }
      return { found: false, message: `No asset found matching "${args.asset_code || args.query}"` };
    }

    case 'lookup_employee': {
      const emp = getEmployeeDetails(args.name_or_id);
      if (emp) {
        return { found: true, employee: emp };
      }
      return { found: false, message: `No employee found matching "${args.name_or_id}"` };
    }

    case 'recommend_assets': {
      const items = recommendAvailableAssets(args.category, args.location);
      return {
        found: items.length > 0,
        count: items.length,
        category: args.category || 'all',
        location: args.location || 'all',
        recommendations: items
      };
    }

    case 'add_new_asset': {
      const res = addAsset({
        asset_code: args.asset_code,
        asset_name: args.asset_name,
        category: args.category,
        location: args.location,
        employee_name: args.employee_name,
        purchase_date: args.purchase_date
      });
      return res;
    }

    case 'transfer_asset': {
      const res = transferAsset(args.asset_code, args.new_employee_name, args.new_location);
      return res;
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
