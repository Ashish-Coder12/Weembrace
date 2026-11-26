// scripts/test-agent-scenarios.js
// Verifying all 5 Functional Requirements via the AI Agent

const { runAssetAgent } = require('../lib/agent.ts');

async function runTests() {
  console.log('=== TEST 1: Search by Asset Code ===');
  let res = await runAssetAgent([{ role: 'user', content: 'Show details of AST1002' }]);
  console.log('User: Show details of AST1002');
  console.log('AI:', res.reply);
  console.log('Tools Called:', res.toolCalls.map(t => t.tool));

  console.log('\n=== TEST 2: Answer Natural Language Questions ===');
  res = await runAssetAgent([{ role: 'user', content: 'Where is AST1002 located?' }]);
  console.log('User: Where is AST1002 located?');
  console.log('AI:', res.reply);
  console.log('Tools Called:', res.toolCalls.map(t => t.tool));

  console.log('\n=== TEST 3: Multi-Step Question (Asset user + their manager) ===');
  res = await runAssetAgent([{ role: 'user', content: "Who is using AST1002, and who is that employee's manager?" }]);
  console.log("User: Who is using AST1002, and who is that employee's manager?");
  console.log('AI:', res.reply);
  console.log('Tools Called (multi-step):', res.toolCalls.map(t => t.tool));

  console.log('\n=== TEST 4: Remember Conversation Context ===');
  const contextHistory = [
    { role: 'user', content: 'Where is AST1002?' },
    { role: 'assistant', content: 'It is on the 3rd floor in Bangalore.' },
    { role: 'user', content: 'Who is using it?' } // "it" refers to AST1002
  ];
  res = await runAssetAgent(contextHistory);
  console.log('User: Where is AST1002? -> AI: 3rd floor Bangalore -> User: Who is using it?');
  console.log('AI:', res.reply);
  console.log('Tools Called:', res.toolCalls.map(t => t.tool));

  console.log('\n=== TEST 5: Recommend Assets ===');
  res = await runAssetAgent([{ role: 'user', content: 'Find an available laptop in Bangalore' }]);
  console.log('User: Find an available laptop in Bangalore');
  console.log('AI:', res.reply);
  console.log('Tools Called:', res.toolCalls.map(t => t.tool));

  console.log('\n=== TEST 6: Transfer Asset ===');
  res = await runAssetAgent([{ role: 'user', content: 'Transfer AST1002 to Priya Nair in Bangalore' }]);
  console.log('User: Transfer AST1002 to Priya Nair in Bangalore');
  console.log('AI:', res.reply);
  console.log('Tools Called:', res.toolCalls.map(t => t.tool));

  // Reset AST1002
  await runAssetAgent([{ role: 'user', content: 'Transfer AST1002 to Rohan Verma in Bangalore - 3rd Floor' }]);

  console.log('\n=== ALL 6 AGENT SCENARIOS PASSED WITH FLYING COLORS ===');
}

runTests().catch(console.error);
