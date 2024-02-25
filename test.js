const path = require('path');

// Relative path to the file
const relativePath = './app/wg0-post-up.sh';

// Resolve the full path
const fullPath = path.resolve(__dirname, relativePath);

console.log('Full path of ./app/wg0-post-up.sh:', fullPath);