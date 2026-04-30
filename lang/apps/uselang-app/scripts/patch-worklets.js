#!/usr/bin/env node
/**
 * scripts/patch-worklets.js
 *
 * react-native-worklets@0.7.4 ships with "exports": {} which blocks Node.js 12+
 * from resolving the /plugin subpath used by react-native-css-interop/babel.js
 * (pulled in by nativewind). This script adds the missing export entry so Babel
 * can find the plugin at transform time.
 *
 * Run automatically via postinstall. Safe to re-run: idempotent.
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(
  __dirname,
  '../node_modules/react-native-worklets/package.json'
);

if (!fs.existsSync(pkgPath)) {
  console.log('patch-worklets: package not found, skipping.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (pkg.exports && pkg.exports['./plugin']) {
  console.log('patch-worklets: already patched, nothing to do.');
  process.exit(0);
}

pkg.exports = {
  '.': {
    require: './lib/module/index.js',
    default: './lib/module/index.js',
  },
  './plugin': './plugin/index.js',
  './plugin/index': './plugin/index.js',
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('patch-worklets: patched react-native-worklets/plugin export ✓');
