# XML Converter

## Overview
The **XML Converter** specializes in converting various iOS localization formats into Android-compatible XML. This is a key tool for teams maintaining feature parity across iOS and Android apps.

## Features
- **Input Variety**: Accepts `.strings`, `.stringsdict`, `.xcstrings`, and `.json`.
- **Android Output**: Generates `strings.xml` formatted for Android resources.
- **Bulk Extraction**: When converting from `.xcstrings` (which holds multiple languages), it generates the folder structure (`values-fr`, `values-es`, etc.) automatically.
- **Zip Download**: Download all generated folders and files in a single `.zip` archive.

## Usage
1. **Upload**: Add your source file.
2. **Convert**: Click **Convert to XML**.
3. **Download**:
   - Download individual `strings.xml` files.
   - Or click **Download All (ZIP)** for the complete folder structure.
