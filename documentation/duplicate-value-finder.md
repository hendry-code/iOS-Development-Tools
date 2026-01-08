# Duplicate Value Finder

## Overview
The **Duplicate Value Finder** helps iterate on localization quality by finding inconsistent or redundant translations. It scans multiple files to find identical *translation values* that are used for different *keys*.

## Features
- **Cross-File Search**: Upload multiple files (e.g., `Localizable.strings`, `Infoplist.strings`) to search across all of them simultaneously.
- **Detailed Report**: shows the duplicate text, how many times it appears, and a list of every key and file where it is used.
- **Quick Actions**: Copy keys directly from the result list to refactor your code.

## Usage
1. **Upload**: Drag and drop your localization files (`.strings`, `.json`, `.xml`, etc.).
2. **Review**: The tool automatically lists all values that appear more than once.
3. **Investigate**: Expand any item to see exactly which keys share that text.
4. **Refactor**: Use the copy button to grab the keys and consolidate them in your project if needed.
