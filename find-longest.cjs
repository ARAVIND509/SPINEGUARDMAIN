const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\ARAVIND\\.gemini\\antigravity\\brain\\69a411f7-4c47-414b-bec2-b6831c0cc2a0\\.system_generated\\logs\\transcript_full.jsonl', 'utf8').split('\n');
let maxLen = 0;
let longest = '';
lines.forEach(l => {
    if (l.includes('"type":"USER_INPUT"') && l.length > maxLen) {
        maxLen = l.length;
        longest = l;
    }
});
try {
    const data = JSON.parse(longest);
    fs.writeFileSync('prompt.txt', data.content);
} catch (e) {
    console.log("Parse error", e.message);
}
