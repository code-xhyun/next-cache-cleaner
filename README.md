# next-cache-cleaner

A CLI tool that automatically cleans up `.next` cache folders in Next.js projects.

## Key Features

- Automatic detection of old `.next` cache folders across your system
- Identifies cache folders based on last modification date (default: 14 days)
- Validates genuine Next.js projects (package.json verification)
- Supports Dry Run mode
- Detailed logging functionality

## Installation

```bash
git clone https://github.com/code-xhyun/next-cache-cleaner.git
cd next-cache-cleaner

```

## Usage

Basic usage:
```bash
node next-cleaner.js
```

Specify target paths:
```bash
node next-cleaner.js --path /path/to/projects
```

Dry Run mode (preview without actual deletion):
```bash
node next-cleaner.js --dry-run
```

## Options

- `--path`, `-p`: Specify search paths (multiple paths allowed)
- `--dry-run`: Run in preview mode without actual deletion
- `--help`, `-h`: Display help information

## Configuration

You can modify the following settings in the CONFIG object within `next-cleaner.js`:

- `MIN_DAYS`: Minimum age of cache folders to delete (default: 14 days)
- `LOG_FILE`: Log file name
- `EXCLUDED_DIRS`: List of directories to exclude from search

## Precautions

- Always review the list of folders to be deleted before execution
- For critical projects, it's recommended to test first using the `--dry-run` option
- Non-Next.js projects (those without package.json) are automatically skipped

## Logging

All operations are recorded in the `next-cleaner.log` file.

## License

MIT

## Contributing

Issues and PRs are always welcome. Before contributing, please:

1. Create an issue first
2. Write test code
3. Update documentation

## Author

[code-xhyun](https://github.com/code-xhyun)