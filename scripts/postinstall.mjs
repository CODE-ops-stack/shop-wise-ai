import { chmodSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const binDir = join(process.cwd(), 'node_modules', '.bin');

if (!existsSync(binDir)) {
  process.exit(0);
}

for (const entry of readdirSync(binDir)) {
  try {
    chmodSync(join(binDir, entry), 0o755);
  } catch {
    // Ignore on platforms that don't support chmod (e.g. Windows).
  }
}