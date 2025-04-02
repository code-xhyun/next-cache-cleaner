const fs = require("fs");
const path = require("path");
const readline = require("readline");
const os = require("os");

// Configuration
const CONFIG = {
  DRY_RUN: process.argv.includes("--dry-run"),
  MIN_DAYS: 14,
  LOG_FILE: "next-cleaner.log",
  // Directories to exclude from search
  EXCLUDED_DIRS: [
    "/System",
    "/Library",
    "/bin",
    "/sbin",
    "/private",
    "/opt",
    "/usr",
    "/var",
    "node_modules",
    ".git",
  ],
};

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    paths: [],
    dryRun: CONFIG.DRY_RUN,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--path" || args[i] === "-p") {
      if (i + 1 < args.length) {
        options.paths.push(path.resolve(args[++i]));
      }
    }
  }

  return options;
}

// Log message function
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(CONFIG.LOG_FILE, logEntry);
}

// Error logging function
function logError(error, context) {
  const errorMessage = `Error occurred (${context}): ${error.message}`;
  logMessage(errorMessage);
}

// Get search paths
function getSearchPaths() {
  const paths = [];

  // Add home directory
  paths.push(os.homedir());

  // Add all user folders in /Users directory
  try {
    const usersDir = "/Users";
    if (fs.existsSync(usersDir)) {
      const users = fs.readdirSync(usersDir);
      users.forEach((user) => {
        if (user !== "Shared" && !user.startsWith(".")) {
          paths.push(path.join(usersDir, user));
        }
      });
    }
  } catch (error) {
    logError(error, "searching user directories");
  }

  return paths;
}

// Check if folder should be deleted
function shouldDeleteFolder(folderPath) {
  try {
    const stats = fs.statSync(folderPath);
    const now = new Date();
    const modifiedDate = new Date(stats.mtime);
    const diffDays = (now - modifiedDate) / (1000 * 60 * 60 * 24);

    // Check if it's a real Next.js project by verifying package.json
    const parentDir = path.dirname(folderPath);
    const hasPackageJson = fs.existsSync(path.join(parentDir, "package.json"));

    if (!hasPackageJson) {
      logMessage(
        `Warning: No package.json found in ${parentDir}. Skipping this .next folder.`
      );
      return false;
    }

    return diffDays > CONFIG.MIN_DAYS;
  } catch (error) {
    logError(error, `checking folder (${folderPath})`);
    return false;
  }
}

// Check if path is in exclusion list
function isExcludedPath(pathToCheck) {
  return CONFIG.EXCLUDED_DIRS.some(
    (excluded) => pathToCheck.includes(excluded) || pathToCheck === excluded
  );
}

// Find .next folders to delete
async function findNextFolders(startPath, foundFolders = []) {
  try {
    if (!fs.existsSync(startPath)) {
      logMessage(`Path does not exist: ${startPath}`);
      return foundFolders;
    }

    // Check excluded paths
    if (isExcludedPath(startPath)) {
      return foundFolders;
    }

    const files = fs.readdirSync(startPath);

    for (const file of files) {
      const filePath = path.join(startPath, file);

      try {
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          if (file === ".next" && shouldDeleteFolder(filePath)) {
            foundFolders.push({
              path: filePath,
              size: await getFolderSize(filePath),
              mtime: stats.mtime,
            });
          } else if (!isExcludedPath(filePath)) {
            await findNextFolders(filePath, foundFolders);
          }
        }
      } catch (error) {
        logError(error, `processing file (${filePath})`);
      }
    }
  } catch (error) {
    logError(error, `searching directory (${startPath})`);
  }

  return foundFolders;
}

// Calculate folder size
async function getFolderSize(folderPath) {
  try {
    let size = 0;
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        size += stats.size;
      } else if (stats.isDirectory()) {
        size += await getFolderSize(filePath);
      }
    }

    return size;
  } catch (error) {
    logError(error, `calculating folder size (${folderPath})`);
    return 0;
  }
}

// Get user confirmation
async function getUserConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message + " (y/n): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

// Print help
function printHelp() {
  console.log(`
Usage: node next-cleaner.js [options]

Options:
  --path, -p <path>     Specify search path (can be used multiple times)
  --dry-run            Preview without actual deletion
  --help, -h           Display this help message

Examples:
  node next-cleaner.js --path /Users/projects --path /var/www
  node next-cleaner.js -p /Users/projects --dry-run
`);
  process.exit(0);
}

// Main function
async function main() {
  // Display help
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
  }

  const options = parseArguments();

  // Use current directory if no paths specified
  if (options.paths.length === 0) {
    options.paths.push(process.cwd());
  }

  logMessage("Starting full disk cleanup process...");
  logMessage(
    `Mode: ${CONFIG.DRY_RUN ? "DRY RUN (no actual deletion)" : "ACTUAL DELETE"}`
  );

  const searchPaths = getSearchPaths();
  logMessage(`Starting search in paths:\n${searchPaths.join("\n")}`);

  let allFoldersToDelete = [];
  for (const startPath of options.paths) {
    logMessage(`\nSearching in ${startPath}...`);
    const foldersInPath = await findNextFolders(startPath);
    allFoldersToDelete = allFoldersToDelete.concat(foldersInPath);
  }

  if (allFoldersToDelete.length === 0) {
    logMessage("No .next folders found for deletion.");
    return;
  }

  logMessage(`\nFound ${allFoldersToDelete.length} .next folders to delete.`);
  logMessage("\nFolders to be deleted:");
  allFoldersToDelete.forEach((folder) => {
    const sizeMB = (folder.size / 1024 / 1024).toFixed(2);
    const date = folder.mtime.toLocaleDateString();
    logMessage(`- ${folder.path} (${sizeMB}MB, last modified: ${date})`);
  });

  if (CONFIG.DRY_RUN) {
    logMessage("\nDRY RUN mode: No actual deletions performed.");
    return;
  }

  const confirmed = await getUserConfirmation(
    "\nDo you want to delete these folders?"
  );

  if (!confirmed) {
    logMessage("Operation cancelled.");
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const folder of allFoldersToDelete) {
    try {
      fs.rmSync(folder.path, { recursive: true, force: true });
      logMessage(`Success: Deleted ${folder.path}`);
      successCount++;
    } catch (error) {
      logError(error, `deleting folder (${folder.path})`);
      errorCount++;
    }
  }

  logMessage(
    `\nOperation completed: ${successCount} successful, ${errorCount} failed`
  );
}

// Run script
main().catch((error) => {
  logError(error, "main process");
  process.exit(1);
});
