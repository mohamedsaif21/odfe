const { execSync } = require('child_process');

try {
  // First get the list of files to remove from cache
  console.log("Running git rm --cached...");
  const cmd = `git rm -rf --cached frontend/node_modules backend/node_modules frontend/.next frontend/out build dist frontend/tsconfig.tsbuildinfo backend/tsconfig.tsbuildinfo`;
  execSync(cmd, { stdio: 'inherit' });
  
  console.log("Git rm complete. Adding changes...");
  execSync(`git add .gitignore`, { stdio: 'inherit' });
  execSync(`git commit -m "Clean up repository: remove generated files and add proper .gitignore"`, { stdio: 'inherit' });
  
  console.log("Cleanup successful");
} catch (e) {
  console.error("Error during cleanup:", e.message);
}
