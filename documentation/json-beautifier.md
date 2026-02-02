# JSON Beautifier

## Overview
The **JSON Beautifier** is a versatile utility for working with JSON data. It goes beyond simple formatting to include validation, minification, conversions, and advanced analysis tools like diffing and querying.

## Features
- **Formatting**:
    - Beautify with 2 or 4 spaces.
    - Minify to remove whitespace.
- **Validation**: Checks for syntax errors and valid JSON structure.
- **Visualizers**:
    - **Code View**: Standard editor with syntax highlighting.
    - **Tree View**: Interactive tree to explore nested JSON structures.
- **Advanced Tools**:
    - **Diff Mode**: Compare two JSON inputs side-by-side to find differences.
    - **Query**: Use JMESPath syntax to extract specific data from your JSON.
    - **String Escaping**: Escape JSON for inclusion in code strings or unescape standard strings back to JSON.
- **Converters**: Convert JSON to XML, YAML, or CSV.
- **Load from URL**: Fetch JSON directly from an API endpoint.

## Usage
1. **Input**:
   - Paste JSON directly, upload a file, or use **Load URL**.
2. **Format**:
   - Use the toolbar buttons for **2sp**, **4sp**, or **Mini**.
3. **Advanced Modes**:
   - **Diff**: Click **Diff** in the header to open a second pane. Paste the modified JSON to see additions/deletions highlighted.
   - **Query**: Click **Query** to open the search bar. Enter a JMESPath query (e.g., `users[*].name`) to filter the output.
   - **Escape/Unescape**: Use the **Esc** / **Unesc** buttons in the toolbar to transform the text.
4. **Convert**: Use the toolbar to output as **XML**, **YAML**, or **CSV**.
