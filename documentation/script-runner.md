# Script Runner

## Overview
The **Script Runner** is an advanced developer tool that allows you to execute custom JavaScript or Python scripts directly within the dashboard. It is designed for ad-hoc processing of files without needing a separate terminal or local script setup.

## Features
- **Multi-Language Support**: Run scripts in **JavaScript** or **Python** (via Pyodide).
- **File Access**: Scripts have access to uploaded file contents via a global `files` variable.
- **Supported File Types**: Upload `.json`, `.txt`, `.xcstrings`, `.strings`, `.stringsdict`, `.xml`, `.csv`, `.plist` files.
- **Built-in API**:
    - `files`: Array of file objects with `name`, `content`, `size`, and `type`.
    - `console`: Standard logging methods (`log`, `warn`, `error`) capture output to the on-screen console.
    - `output(fileName, content)`: Emit a downloadable file. Call multiple times for multiple output files.
- **Snippets**: Includes built-in code snippets for common tasks (e.g., iterating through JSON files, parsing strings).

## Usage
1. **Upload Data**: Add files you want to process to the "Source Files" panel.
2. **Write Script**:
   - Select your language (JS or Python).
   - Write your logic in the editor.
   - Use the **API Help** menu to see available variables and copy snippets.
3. **Run**: Click **Run Script** to execute.
4. **Output**: View logs and results in the bottom "Output" panel.
5. **Download**: If your script calls `output()`, modified files appear in the "Output Files" section with download buttons.

### Quick Demo
Click the **Execute Sample** button in the header to open the sample picker popover. Choose from the following examples:

#### Analysis Samples
| Sample | Description |
|--------|-------------|
| **JSON (.json)** | Parse JSON data, compute stats, format a report |
| **Text (.txt)** | Word count, line stats, checklist detection |
| **String Catalog (.xcstrings)** | Parse Xcode string catalogs, list languages, find missing translations |
| **Strings (.strings)** | Parse iOS key-value pairs, detect sections, validate format |
| **Strings Dict (.stringsdict)** | Parse plist XML, extract plural rules and variations |
| **Android XML (.xml)** | Parse Android resources, extract strings/plurals/arrays |

#### Transform Samples (with `output()`)
| Sample | Description |
|--------|-------------|
| **XCStrings — Add Missing Keys** | Adds placeholder translations for all missing languages and emits the modified catalog |
| **Strings — Sort Keys A-Z** | Sorts all key-value pairs alphabetically and emits the sorted file |

Transform samples demonstrate the `output()` API — after execution, a downloadable file appears in the Output Files section.
