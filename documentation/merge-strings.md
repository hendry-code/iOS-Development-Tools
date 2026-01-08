# Merge Strings

## Overview
**Merge Strings** is a sophisticated tool designed to consolidate multiple `.strings` translations into a master `.xcstrings` (String Catalog) file. This ensures that new translations are correctly added to your main catalog without manual copy-pasting.

## Features
- **Catalog Integration**: Updates an existing `.xcstrings` source catalog.
- **Multi-File Support**: Add multiple `.strings` files at once.
- **Language Detection**: Automatically attempts to guess the language code from filenames (e.g., `fr.strings`, `es.lproj/Localizable.strings`).
- **Conflict Handling**: Merges separate language files into the unified catalog structure.

## Usage
1. **Source Catalog**: Upload your main `.xcstrings` file.
2. **Translations**:
   - Upload one or more `.strings` files containing the translations you want to add.
   - Verify the language code for each uploaded file (e.g., `en`, `fr`).
3. **Merge**: Click **Merge Files**.
4. **Download**: Save the updated `.xcstrings` file.
