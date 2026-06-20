const fs = require('fs');
const path = require('path');

const files = [
  "app/bookings/page.tsx",
  "app/coupons/page.tsx",
  "app/customer-display/page.tsx",
  "app/customers/page.tsx",
  "app/orders/page.tsx",
  "app/payments/page.tsx",
  "app/products/page.tsx",
  "app/profile/page.tsx",
  "app/reports/page.tsx",
  "app/self-order/page.tsx",
  "app/settings/page.tsx",
  "app/settings/profile/page.tsx",
  "app/tables/page.tsx"
];

const basePath = path.join(__dirname, 'frontend');

files.forEach(file => {
  const filePath = path.join(basePath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Background colors
    content = content.replace(/bg-surface-950/g, 'bg-cafe-bg');
    content = content.replace(/bg-surface-900/g, 'bg-cafe-bg');
    content = content.replace(/bg-surface-800/g, 'bg-cafe-warm');
    content = content.replace(/bg-surface-700/g, 'bg-cafe-warm');
    content = content.replace(/bg-surface/g, 'bg-cafe-surface');

    // Text colors
    content = content.replace(/text-text-primary/g, 'text-cafe-text');
    content = content.replace(/text-text-secondary/g, 'text-cafe-text-secondary');
    content = content.replace(/text-text-muted/g, 'text-cafe-text-secondary');

    // Brand colors
    content = content.replace(/text-brand-primary/g, 'text-cafe-accent');
    content = content.replace(/text-brand-400/g, 'text-cafe-accent');
    content = content.replace(/text-brand-500/g, 'text-cafe-accent');
    content = content.replace(/text-brand-700/g, 'text-cafe-dark');
    content = content.replace(/bg-brand-primary/g, 'bg-cafe-accent');
    content = content.replace(/bg-brand-500\/15/g, 'bg-cafe-accent/12');
    content = content.replace(/bg-brand-500\/20/g, 'bg-cafe-accent/10');
    content = content.replace(/bg-brand-500/g, 'bg-cafe-accent');
    content = content.replace(/from-brand-500/g, 'from-cafe-accent');
    content = content.replace(/to-brand-700/g, 'to-cafe-dark');
    content = content.replace(/hover:bg-brand-primary\/20/g, 'hover:bg-cafe-accent/10');
    content = content.replace(/focus:border-brand-500\/50/g, 'focus:border-cafe-accent/40');
    content = content.replace(/hover:text-brand-primary/g, 'hover:text-cafe-accent');
    content = content.replace(/hover:border-brand-500\/30/g, 'hover:border-cafe-accent/25');

    // Border
    content = content.replace(/border-border/g, 'border-cafe-border');

    // Status colors
    content = content.replace(/bg-blue-500\/15 text-blue-400/g, 'bg-cafe-accent/12 text-cafe-accent');
    content = content.replace(/bg-amber-500\/15 text-amber-400/g, 'bg-cafe-dark/10 text-cafe-dark');
    content = content.replace(/bg-emerald-500\/15 text-emerald-400/g, 'bg-cafe-surface/30 text-[#5A6448]');
    content = content.replace(/bg-red-500\/15 text-red-400/g, 'bg-[rgba(180,60,30,0.10)] text-[#B43C1E]');
    
    // Badge stock colors
    content = content.replace(/bg-red-500\/15 px-2 py-0\.5 text-xs font-medium text-red-400/g, 'bg-[rgba(180,60,30,0.10)] px-2 py-0.5 text-xs font-medium text-[#B43C1E]');
    content = content.replace(/bg-amber-500\/15 px-2 py-0\.5 text-xs font-medium text-amber-400/g, 'bg-cafe-dark/10 px-2 py-0.5 text-xs font-medium text-cafe-dark');

    // Glass variables -> tokens
    content = content.replace(/bg-\[var\(--glass-border\)\]/g, 'bg-cafe-warm/50');
    content = content.replace(/hover:bg-\[var\(--glass-border\)\]/g, 'hover:bg-cafe-warm/50');
    content = content.replace(/bg-\[var\(--glass-secondary\)\]/g, 'bg-cafe-glass');

    // Misc
    content = content.replace(/placeholder-surface-500/g, 'placeholder-cafe-text-secondary');
    content = content.replace(/bg-surface-500\/15/g, 'bg-cafe-warm/50');
    content = content.replace(/divide-white\/5/g, 'divide-cafe-border/50');
    content = content.replace(/gradient-text/g, 'text-cafe-accent font-display');

    // Remove framer-motion references (we are going simpler)
    content = content.replace(/import \{ motion \} from "framer-motion";\n/g, '');
    content = content.replace(/<motion\.div/g, '<div');
    content = content.replace(/<\/motion\.div>/g, '</div>');
    content = content.replace(/ variants={container}/g, '');
    content = content.replace(/ variants={item}/g, '');
    content = content.replace(/ initial="hidden"/g, '');
    content = content.replace(/ animate="show"/g, '');
    content = content.replace(/ whileHover=\{\{.*?\}\}/g, '');
    content = content.replace(/ whileTap=\{\{.*?\}\}/g, '');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${file}`);
  }
});

console.log("Token migration complete!");
