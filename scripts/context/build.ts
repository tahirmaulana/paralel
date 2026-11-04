import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'CONTEXT.md');

// HANYA abaikan folder yang benar-benar tidak perlu (library/dependency/build)
const IGNORE_DIRS = [
  '.git', 'node_modules', '.next', 'dist', 'build', 
  'coverage', 'out', 'cache', 'broadcast', '.wrangler', '.turbo',
  'contracts/lib/forge-std'
];

// HANYA abaikan file lockfile (karena ukurannya bisa puluhan ribu baris dan tidak penting untuk logika)
const IGNORE_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'CONTEXT.md'
];

// Abaikan file gambar/biner agar tidak merusak format teks
const BINARY_EXTS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', 
  '.zip', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.svg'
];

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

    if (IGNORE_FILES.includes(file)) continue;
    if (IGNORE_DIRS.some(ignore => relativePath.startsWith(ignore) || relativePath.includes(`/${ignore}/`))) continue;

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function buildContext() {
  console.log('🔍 Memindai seluruh file (termasuk file rahasia & .env)...');
  const allFiles = getAllFiles(ROOT_DIR);
  
  let markdown = `# PARALEL Project Context\n\nGenerated at ${new Date().toISOString()}\n\n`;
  let processedCount = 0;

  for (const file of allFiles) {
    const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
    const ext = path.extname(file).toLowerCase();
    
    // FORMAT PEMISAH
    markdown += `==========\n`;
    markdown += `/${relativePath}\n`;
    markdown += `==========\n`;

    if (BINARY_EXTS.includes(ext)) {
       markdown += `*(Binary file omitted)*\n\n`;
       continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');
      markdown += `${content}\n\n`;
      processedCount++;
    } catch (e: any) {
      markdown += `*(Error reading file: ${e.message})*\n\n`;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');
  console.log(`✅ Selesai! Context lengkap dibuat di: ${OUTPUT_FILE}`);
  console.log(`📦 Total file dimasukkan: ${processedCount}`);
}

buildContext();