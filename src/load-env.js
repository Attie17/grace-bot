import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __rootDir = path.resolve(path.dirname(__filename), '..');

dotenv.config({ path: path.join(__rootDir, '.env') });
dotenv.config({ path: path.join(__rootDir, '.env.local'), override: true });