import * as path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore - import.meta.url only valid in ESM; suppressed for CJS build
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
export const PROJECT_ROOT = path.resolve(dirname, '..', '..');
//# sourceMappingURL=resolve-root.js.map