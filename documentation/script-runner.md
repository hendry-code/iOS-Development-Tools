# Script Runner

## Overview
The **Script Runner** is an advanced developer tool that allows you to execute custom JavaScript or Python scripts directly within the dashboard. It is designed for ad-hoc processing of files without needing a separate terminal or local script setup.

## Features
- **Multi-Language Support**: Run scripts in **JavaScript** or **Python** (via Pyodide).
- **File Access**: Scripts have access to uploaded file contents via a global `files` variable.
- **Built-in API**:
    - `files`: Array of file objects with `name`, `content`, `size`, and `type`.
    - `console`: Standard logging methods (`log`, `warn`, `error`) capture output to the on-screen console.
- **Snippets**: Includes built-in code snippets for common tasks (e.g., iterating through JSON files, parsing strings).

## Usage
1. **Upload Data**: Add files you want to process to the "Source Files" panel.
2. **Write Script**:
   - Select your language (JS or Python).
   - Write your logic in the editor.
   - Use the **API Help** menu to see available variables and copy snippets.
3. **Run**: Click **Run Script** to execute.
4. **Output**: View logs and results in the bottom "Output" panel.

### Quick Demo
Click the **Execute Sample** button in the header to instantly load a sample JSON source file and a demo script. The script will auto-execute, giving you a working example of how the tool processes files, logs output, and returns results.
