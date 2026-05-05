#!/usr/bin/env node
/**
 * scripts/patch-maps.js
 *
 * react-native-maps@1.27.x imports `{ codegenNativeCommands }` from
 * 'react-native', but React Native 0.79 does NOT export this utility from
 * its public package index (it lives at
 * react-native/Libraries/Utilities/codegenNativeCommands internally).
 *
 * This script patches the three affected react-native-maps source files to
 * use the direct internal import path instead, so Metro can resolve them.
 *
 * Run automatically via postinstall. Safe to re-run: idempotent.
 */

const fs = require('fs');
const path = require('path');

const MAPS_SRC = path.join(__dirname, '../node_modules/react-native-maps/src');

const FILES_TO_PATCH = [
  'MapViewNativeComponent.ts',
  'MapMarkerNativeComponent.ts',
  path.join('specs', 'NativeComponentMarker.ts'),
];

const OLD_IMPORT = `import {codegenNativeCommands} from 'react-native';`;
const NEW_IMPORT = `// patched by scripts/patch-maps.js — RN 0.79 does not export codegenNativeCommands
// @ts-ignore
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';`;

const OLD_IMPORT2 = `import {codegenNativeComponent, codegenNativeCommands} from 'react-native';`;
const NEW_IMPORT2 = `import {codegenNativeComponent} from 'react-native';
// patched by scripts/patch-maps.js — RN 0.79 does not export codegenNativeCommands
// @ts-ignore
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';`;

if (!fs.existsSync(MAPS_SRC)) {
  console.log('patch-maps: react-native-maps/src not found, skipping.');
  process.exit(0);
}

let anyPatched = false;

for (const file of FILES_TO_PATCH) {
  const filePath = path.join(MAPS_SRC, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('patched by scripts/patch-maps.js')) {
    continue; // already patched
  }

  let patched = content;

  // Handle the combined import case (codegenNativeComponent + codegenNativeCommands)
  if (patched.includes(OLD_IMPORT2)) {
    patched = patched.replace(OLD_IMPORT2, NEW_IMPORT2);
  } else if (patched.includes(OLD_IMPORT)) {
    patched = patched.replace(OLD_IMPORT, NEW_IMPORT);
  }

  if (patched !== content) {
    fs.writeFileSync(filePath, patched, 'utf8');
    console.log(`patch-maps: patched ${file} ✓`);
    anyPatched = true;
  }
}

if (!anyPatched) {
  console.log('patch-maps: all files already patched or no matching imports found.');
}
