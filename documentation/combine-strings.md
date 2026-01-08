# Combine Strings

## Overview
The **Combine Strings** tool allows you to merge multiple `.strings`, `.stringsdict`, and `.xml` files into a single unified catalog or Android XML file. This is useful for consolidating translations from different sources or converting legacy formats into modern catalogs.

## Features
- **File Support**: Supports `.strings`, `.stringsdict`, and Android `.xml` files.
- **Smart Merging**: parses input files and merges them into a single dataset.
- **Conflict Resolution**: (Implicit) Later loaded files may override earlier keys if duplicates exist (based on typical merge logic).
- **Dual Output**:
    - **iOS Catalog**: Generates a `.xcstrings` (String Catalog) compatible format.
    - **Android XML**: Generates `strings.xml` for Android, organized by language folders (e.g., `values-fr`, `values-es`).
- **Project Saving**: Automatically saves your current workspace (loaded files and settings) to local storage so you can resume later.

## Usage
1. **Upload Files**:
   - Drag and drop files into the "Input Files" area.
   - Or click "Add Files" to browse your file system.
2. **Manage Inputs**:
   - You can manually edit the detected language code for each file if needed.
   - Remove files using the 'X' button.
3. **Combine**:
   - Click the **Combine Strings** button to process the files.
4. **Download**:
   - For iOS: Preview the generated content and click **Download .xcstrings**.
   - For Android: Toggle the tab to "Android (.xml)" and download individual language files.
