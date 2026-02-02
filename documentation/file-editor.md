# File Editor

## Overview
The **File Editor** is a powerful, code-aware editor designed for managing localization and configuration files. It combines the ease of a text editor with IDE-like features such as syntax highlighting, validation, and multi-tab management.

## Features
- **Multi-Tab Interface**: Open and edit multiple files simultaneously.
- **Syntax Highlighting**: Color-coded text for `.json`, `.xml`, and `.strings` files.
- **Smart Validation**:
    - **JSON**: Detects syntax errors and invalid structure.
    - **XML**: Checks for unclosed tags and malformed elements.
    - **.strings**: Validates key-value pair formatting.
- **Advanced Find & Replace**:
    - Toggle **Case Sensitive**, **Whole Word**, and **Regex** modes.
    - Highlight all occurrences of search terms.
    - Replace single or all matches.
- **Editing Tools**:
    - **Undo/Redo**: Full history support for safe editing.
    - **Go to Line**: Jump specific line numbers instantly.
    - **Format**: Auto-format JSON content with one click.
    - **Context Menu**: Right-click to Copy, Duplicate, or Delete lines.
- **File Stats**: Real-time word, line, character, and key counts.

## Usage
1. **Open Files**:
   - Drag & drop files or click the upload button.
   - Files open in separate tabs at the top.
2. **Edit**:
   - standard typing with syntax highlighting.
   - **Undo/Redo**: `Cmd/Ctrl + Z` and `Cmd/Ctrl + Shift + Z`.
   - **Context Menu**: Right-click any line for quick actions.
3. **Search & Replace**:
   - Press `Cmd/Ctrl + F` to open the search bar.
   - Use the toggles for Regex `.*`, Case `Aa`, or Whole Word `\b`.
4. **Download**:
   - Click the **Download** icon to save the current file.
   - The editor will verify content before saving.
