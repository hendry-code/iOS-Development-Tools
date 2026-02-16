# Properties Converter

## Overview
The **Properties Converter** allows you to convert mobile localization files (iOS `.strings` and Android `.xml`) into Java `.properties` format. This is essential for backend services or legacy Java applications that need to share translations with mobile apps.

## Features
- **Input Formats**: Supports `.strings`, `.stringsdict`, and `.xml`.
- **Java Properties Output**: Generates standard key-value pairs (`key=value`) compatible with Java `Properties` class.
- **Encoding**: Handles special characters and escaping suitable for `.properties` files.

## Usage
1. **Add Files**:
   - Drop `.strings` or `.xml` files into the input zone.
2. **Convert**:
   - Click **Convert to Properties**.
3. **Result**:
   - Copy the output code or use it directly in your Java project.

### Quick Demo
Click the **Execute Sample** button to load a sample `Localizable.strings` and `strings.xml` file. The converter merges keys from both formats into a single `.properties` output, showcasing multi-format input support.
