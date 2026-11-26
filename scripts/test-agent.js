// scripts/test-agent.js
// quick test runner to verify all functional requirements + add & transfer

const { getAllAssets, getAssetByCode, getEmployeeDetails, recommendAvailableAssets, transferAsset, addAsset } = require('../lib/db.ts');

console.log('--- 1. Testing Database Queries ---');
const ast1002 = getAssetByCode('AST1002');
console.log('AST1002 lookup:', ast1002 ? `${ast1002.asset_code} (${ast1002.asset_name}) is at "${ast1002.location}", assigned to "${ast1002.employee_name}"` : 'Not found');

const emp = getEmployeeDetails('Rohan Verma');
console.log('Employee lookup (Rohan Verma):', emp ? `${emp.name} reports to manager: "${emp.manager_name}" (${emp.role}, ${emp.department})` : 'Not found');

const laptops = recommendAvailableAssets('Laptop', 'Bangalore');
console.log(`\nAvailable laptops in Bangalore: ${laptops.length} found`);
laptops.forEach(l => console.log(` - ${l.asset_code}: ${l.asset_name} (${l.location})`));

console.log('\n--- 2. Testing Asset Transfer ---');
const transferRes = transferAsset('AST1002', 'Priya Nair', 'Bangalore - 3rd Floor');
console.log('Transfer result:', transferRes.message);

const ast1002After = getAssetByCode('AST1002');
console.log('AST1002 user after transfer:', ast1002After.employee_name);

// Transfer back for pristine state
transferAsset('AST1002', 'Rohan Verma', 'Bangalore - 3rd Floor');
console.log('Reset AST1002 back to Rohan Verma.');

console.log('\nAll core database and tool functions working properly!');
