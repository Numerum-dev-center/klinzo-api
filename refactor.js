const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function refactorDtos() {
  const srcDir = path.join(__dirname, 'src');
  const files = [];
  walkDir(srcDir, (f) => files.push(f));

  // 1. Rename request -> requests, response -> responses directories
  const dirs = new Set(files.map(f => path.dirname(f)));
  const renames = [];
  dirs.forEach(d => {
    if (d.endsWith('/dto/request')) renames.push({ old: d, new: d + 's' });
    if (d.endsWith('/dto/response')) renames.push({ old: d, new: d + 's' });
  });

  renames.forEach(r => {
    if (fs.existsSync(r.old)) {
      if (!fs.existsSync(r.new)) fs.mkdirSync(r.new, { recursive: true });
      fs.readdirSync(r.old).forEach(f => {
        const target = path.join(r.new, f);
        // Only move if it doesn't exist, else we might overwrite newer files
        if (!fs.existsSync(target) || fs.statSync(target).size < fs.statSync(path.join(r.old, f)).size) {
           fs.renameSync(path.join(r.old, f), target);
        } else {
           fs.unlinkSync(path.join(r.old, f));
        }
      });
      fs.rmdirSync(r.old);
    }
  });

  // Re-fetch files after dir renames
  const currentFiles = [];
  walkDir(srcDir, (f) => currentFiles.push(f));

  // 2. Move root DTOs into requests/responses
  currentFiles.forEach(f => {
    if (!f.endsWith('.ts')) return;
    const dirname = path.dirname(f);
    const basename = path.basename(f);
    
    // We only care about files directly in a "dto" directory
    if (dirname.endsWith('/dto')) {
      let targetDir = null;
      if (basename.endsWith('.dto.ts')) targetDir = path.join(dirname, 'requests');
      else if (basename.endsWith('.response.ts')) targetDir = path.join(dirname, 'responses');
      
      if (targetDir) {
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        const targetFile = path.join(targetDir, basename);
        if (!fs.existsSync(targetFile)) {
          fs.renameSync(f, targetFile);
        }
      }
    }
  });

  // 3. Update all imports in all .ts files
  const allTsFiles = [];
  walkDir(srcDir, (f) => {
    if (f.endsWith('.ts')) allTsFiles.push(f);
  });

  allTsFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let changed = false;

    // Replace: import ... from '.../dto/request/X' -> '.../dto/requests/X'
    if (content.includes('/dto/request/')) {
      content = content.replace(/\/dto\/request\//g, '/dto/requests/');
      changed = true;
    }
    if (content.includes('/dto/response/')) {
      content = content.replace(/\/dto\/response\//g, '/dto/responses/');
      changed = true;
    }

    // Match lines like: import { X } from './dto/create-x.dto';
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') && lines[i].includes('/dto/')) {
        // If it imports a .dto or .response directly from /dto/ without requests/responses
        if (!lines[i].includes('/dto/requests/') && !lines[i].includes('/dto/responses/')) {
           // We can guess based on the file name at the end
           if (lines[i].includes('.dto')) {
             lines[i] = lines[i].replace(/\/dto\//g, '/dto/requests/');
             changed = true;
           } else if (lines[i].includes('.response')) {
             lines[i] = lines[i].replace(/\/dto\//g, '/dto/responses/');
             changed = true;
           }
        }
      }
    }

    if (changed) {
      fs.writeFileSync(f, lines.join('\n'), 'utf8');
    }
  });

  console.log("Refactoring complete");
}

refactorDtos();
