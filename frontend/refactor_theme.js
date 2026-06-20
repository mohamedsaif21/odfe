const fs = require('fs');
const path = require('path');

const srcDirs = ['./app', './components'];
const fileExtensions = ['.tsx', '.ts', '.jsx', '.js'];

const classMap = {
  // Text Colors
  'text-white': 'text-text-primary',
  'text-black': 'text-text-primary',
  'text-gray-900': 'text-text-primary',
  'text-gray-800': 'text-text-primary',
  'text-gray-700': 'text-text-secondary',
  'text-gray-600': 'text-text-secondary',
  'text-gray-500': 'text-text-muted',
  'text-gray-400': 'text-text-muted',
  'text-gray-300': 'text-text-secondary',
  'text-surface-300': 'text-text-secondary',
  'text-surface-400': 'text-text-muted',
  'text-surface-500': 'text-text-muted',
  'hover:text-white': 'hover:text-brand-primary',
  'hover:text-gray-900': 'hover:text-brand-primary',
  'hover:text-black': 'hover:text-brand-primary',

  // Background Colors
  'bg-white/5': 'bg-[var(--glass-secondary)]',
  'bg-white/10': 'bg-[var(--glass-border)]',
  'bg-black/5': 'bg-[var(--glass-secondary)]',
  'bg-black/10': 'bg-[var(--glass-border)]',
  'bg-gray-900': 'bg-surface',
  'bg-gray-800': 'bg-surface',
  'bg-gray-100': 'bg-surface',
  'bg-gray-50': 'bg-surface',
  'bg-white': 'bg-surface',
  'bg-black': 'bg-bg',
  'hover:bg-white/5': 'hover:bg-[var(--glass-border)]',
  'hover:bg-white/10': 'hover:bg-brand-primary/20',

  // Border Colors
  'border-white/10': 'border-border',
  'border-white/5': 'border-border',
  'border-black/10': 'border-border',
  'border-black/5': 'border-border',
  'border-gray-800': 'border-border',
  'border-gray-700': 'border-border',
  'border-gray-200': 'border-border',
  'border-gray-100': 'border-border',
};

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fileExtensions.includes(path.extname(fullPath))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Special handling: do not replace text-white if it is inside btn-primary
      // Wait, we're doing a simple string replace for now.
      
      // Let's replace using regex to ensure whole word match for classes
      for (const [oldClass, newClass] of Object.entries(classMap)) {
        // Escape special chars in oldClass for regex
        const escapedOldClass = oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Look for the class with word boundaries or space/quote boundaries
        // class="... bg-white/5 ..."
        const regex = new RegExp(`(?<=['"\\s\`])` + escapedOldClass + `(?=['"\\s\`])`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, newClass);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

for (const dir of srcDirs) {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  }
}
console.log('Done refactoring theme classes.');
