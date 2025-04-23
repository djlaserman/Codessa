// Developer test script for workflow storage
const fs = require('fs');
const path = require('path');

const storageDir = process.argv[2] || '.';
const filePath = path.join(storageDir, 'codessa_workflows.json');

if (!fs.existsSync(filePath)) {
    console.error('No codessa_workflows.json found in:', storageDir);
    process.exit(1);
}

try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const workflows = JSON.parse(raw);
    console.log('Loaded workflows:', workflows.length);
    workflows.forEach((wf, i) => {
        console.log(`Workflow ${i + 1}: ${wf.name} (${wf.steps.length} steps)`);
    });
    process.exit(0);
} catch (err) {
    console.error('Failed to read or parse workflows:', err);
    process.exit(2);
}
