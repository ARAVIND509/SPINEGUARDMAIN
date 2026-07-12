const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\ARAVIND\\.gemini\\antigravity\\brain\\69a411f7-4c47-414b-bec2-b6831c0cc2a0\\.system_generated\\logs\\transcript_full.jsonl', 'utf8').split('\n');
const userLines = lines.filter(l => l.includes('"type":"USER_INPUT"') && l.includes('Phase 5'));
if (userLines.length > 0) {
    const data = JSON.parse(userLines[0]);
    console.log(data.content);
} else {
    console.log("Not found");
}
