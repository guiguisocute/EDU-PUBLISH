#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

function validate(yamlPath, schemaPath, label) {
  if (!fs.existsSync(yamlPath)) {
    console.error(`[validate] ERROR: ${label} not found at ${yamlPath}`);
    return false;
  }
  const data = YAML.parse(fs.readFileSync(yamlPath, 'utf-8'));
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const valid = ajv.validate(schema, data);
  if (!valid) {
    console.error(`[validate] ${label} validation failed:`);
    for (const err of ajv.errors) {
      console.error(`  - ${err.instancePath || '(root)'}: ${err.message}`);
    }
    return false;
  }
  console.log(`[validate] ${label} OK`);
  return true;
}

const results = [
  validate(
    path.join(ROOT, 'config', 'site.yaml'),
    path.join(ROOT, 'schemas', 'site.schema.json'),
    'site.yaml'
  ),
  validate(
    path.join(ROOT, 'config', 'widgets.yaml'),
    path.join(ROOT, 'schemas', 'widgets.schema.json'),
    'widgets.yaml'
  ),
];

if (results.some(r => !r)) {
  process.exit(1);
}
