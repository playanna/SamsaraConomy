const fs = require('fs');
const path = require('path');

// 🔒 Manually load GitHub config from .env file (ignores global env)
const dotenvPath = path.resolve(__dirname, '../.env');
let GITHUB_USERNAME = 'your-username';
let GITHUB_REPO_NAME = 'your-repo';
let GITHUB_BRANCH = 'master';

if (fs.existsSync(dotenvPath)) {
    const envLines = fs.readFileSync(dotenvPath, 'utf8')
        .split('\n')
        .map(line => line.trim());

    for (const line of envLines) {
        if (line.startsWith('GITHUB_USERNAME=')) {
            GITHUB_USERNAME = line.split('=')[1].trim();
        } else if (line.startsWith('GITHUB_REPO_NAME=')) {
            GITHUB_REPO_NAME = line.split('=')[1].trim();
        } else if (line.startsWith('GITHUB_BRANCH=')) {
            GITHUB_BRANCH = line.split('=')[1].trim();
        }
    }
}

/**
 * Generate a GitHub raw URL for an image
 * @param {string} imagePath - Path to the image in the repository (e.g., "images/realms/secthall/sectinitial.jpeg")
 * @param {string} commit - Optional commit hash, defaults to branch
 * @returns {string} - Full GitHub raw URL
 */
function generateGitHubImageUrl(imagePath, commit = null) {
    const ref = commit || GITHUB_BRANCH;
    return `https://github.com/${GITHUB_USERNAME}/${GITHUB_REPO_NAME}/blob/${ref}/${imagePath}?raw=true`;
}

/**
 * Generate a GitHub raw URL with a specific commit hash
 * @param {string} imagePath - Path to the image in the repository
 * @param {string} commitHash - Specific commit hash
 * @returns {string} - Full GitHub raw URL with commit hash
 */
function generateGitHubImageUrlWithCommit(imagePath, commitHash) {
    return `https://github.com/${GITHUB_USERNAME}/${GITHUB_REPO_NAME}/blob/${commitHash}/${imagePath}?raw=true`;
}

module.exports = {
    generateGitHubImageUrl,
    generateGitHubImageUrlWithCommit,
    GITHUB_USERNAME,
    GITHUB_REPO_NAME,
    GITHUB_BRANCH
};