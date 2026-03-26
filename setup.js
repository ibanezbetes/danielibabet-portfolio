const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'images');
const destDir = path.join(__dirname, 'public', 'images');

fs.mkdirSync(destDir, { recursive: true });

function copyToDest(filename, destFolder) {
  const src = path.join(srcDir, filename);
  const dest = path.join(__dirname, destFolder, filename);
  
  if (fs.existsSync(src)) {
    // Ensure destination directory exists
    fs.mkdirSync(path.join(__dirname, destFolder), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`Copied ${filename} to ${destFolder}/`);
  } else {
    console.warn(`Warning: ${filename} not found in ${srcDir}`);
  }
}

copyToDest('profile.png', 'public/images');
copyToDest('nttdata.png', 'public/images');
copyToDest('favicon.ico', 'src/app');
