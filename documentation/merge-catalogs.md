# Merge String Catalogs

## Overview
**Merge String Catalogs** is a powerful tool designed to consolidate multiple `.xcstrings` (String Catalog) files into a single master catalog. It features a sophisticated conflict resolution system that detects keys defined in multiple files and allows you to choose which version to keep.

## Features
- **Smart Conflict Analysis**: Automatically detects when the same key exists in multiple files with different values.
- **Visual Conflict Resolution**: Side-by-side comparison of conflicting values to choose the correct one.
- **Bulk Actions**: Resolve all conflicts by favoring a specific file.
- **Detailed Reporting**: View a summary of merged keys, missing translations, and potential issues.
- **Live Preview**: See the merged JSON output in real-time as you resolve conflicts.

## Usage
1. **Upload Files**:
   - Drag & Drop multiple `.xcstrings` files into the upload zone.
   - Or click the upload area to select files from your computer.

2. **Review Warnings**:
   - The tool will warn you if the source languages of the uploaded files do not match (e.g., merging a file with `sourceLanguage: "en"` and another with `"fr"`).

3. **Resolve Conflicts**:
   - If keys overlap, they will appear in the **Conflicts** list.
   - Click on a conflict to expand it.
   - Review the conflicting values (displayed as JSON snippets).
   - Click the version you want to keep.
   - **Bulk Resolve**: Use the buttons under the conflict list to "Resolve all using [Filename]" if you trust one source over others.

4. **Merge**:
   - Once all conflicts are resolved (or if there were none), click **Merge Catalogs**.

5. **Download**:
   - Review the output in the result panel.
   - Click **Download .xcstrings** to save the merged file.

### Quick Demo
Click the **Execute Sample** button in the header to load two sample `.xcstrings` catalogs (`AppStrings` and `SettingsStrings`). They share a conflicting `auth_login` key with different translations ("Sign In" vs "Log In"). The tool auto-resolves the conflict using Catalog A and merges all 5 unique keys into a single output with report stats.
