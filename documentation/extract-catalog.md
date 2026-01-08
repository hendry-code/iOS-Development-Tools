# Extract Catalog

## Overview
The **Extract Catalog** tool is designed to reverse-engineer String Catalogs (`.xcstrings`). It extracts translations from a unified catalog file back into legacy formats like `.strings` (for iOS) and `.xml` (for Android).

## Features
- **Reverse Extraction**: Turns a modern `.xcstrings` file into separate files for each language.
- **Multi-Platform Support**:
    - **iOS**: Generates legacy `.strings` files.
    - **Android**: Generates `strings.xml` files formatted for Android project structure.
- **Zip Download**: Download all extracted files at once as a `.zip` archive.
- **Preview**: View the content of extracted files before downloading.

## Usage
1. **Upload Catalog**:
   - Drag and drop your `.xcstrings` file into the "Source Catalog" zone.
2. **Extract**:
   - Click **Extract Strings**.
3. **Download**:
   - Use the individual **Download** buttons for specific files.
   - Or click **Download All (Zip)** to get everything in one package.
