import path from 'node:path';

// Each package installs its own eslint independently (no npm workspace —
// see CLAUDE.md), so there's no hoisted binary to call from root. Route
// staged files to the eslint installed in their own package directory.
const cmd = (dir) => (files) =>
  `bash -c "cd ${dir} && npx eslint ${files.map((f) => `'${path.relative(path.resolve(dir), f)}'`).join(' ')}"`;

export default {
  'Management/**/*.{js,jsx}': cmd('Management'),
  'Services/shared/contracts/**/*.js': cmd('Services/shared/contracts'),
  'Services/lead-service/**/*.js': cmd('Services/lead-service'),
  'Services/billing-service/**/*.js': cmd('Services/billing-service'),
  'Services/package-service/**/*.js': cmd('Services/package-service'),
};
