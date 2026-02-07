#!/bin/bash
set -x
echo "=== Node version ==="
node --version
echo "=== NPM version ==="
npm --version
echo "=== Working directory ==="
pwd
echo "=== Files ==="
ls -la
echo "=== Package.json before ==="
cat package.json
echo "=== Stripping devDependencies ==="
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete pkg.devDependencies;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('Done');
"
echo "=== Package.json after ==="
cat package.json
echo "=== Running npm install ==="
npm install --legacy-peer-deps 2>&1
echo "=== Install exit code: $? ==="
