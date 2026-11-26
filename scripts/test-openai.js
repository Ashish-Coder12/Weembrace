// scripts/test-openai.js
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// read env.local
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const match = envContent.match(/OPENAI_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : process.env.OPENAI_API_KEY;

console.log('Testing key starting with:', apiKey.substring(0, 15) + '...');

const openai = new OpenAI({ apiKey });

async function test() {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hello in 3 words' }]
    });
    console.log('SUCCESS from OpenAI:', res.choices[0].message.content);
  } catch (err) {
    console.error('OpenAI Error:', err.message);
  }
}

test();
