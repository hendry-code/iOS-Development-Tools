# Strings Analyser

## Overview
The **Strings Analyser** provides deep insights into your localization files (`.xcstrings` and `.xml`). It helps you track translation progress, identify duplicates, and count words to estimate translation costs.

## Features
- **Translation Status**: Break down progress by language (Translated vs. Pending vs. Missing).
- **Duplicate Detection**:
    - **Exact Duplicates**: Finds identical values used across different keys.
    - **Loose Matches**: Identifies potential duplicates with minor differences (case sensitivity, whitespace).
- **Word Count**: Calculates total words across all files and per language.
- **Reporting**: Export the full analysis as a JSON report.

## Usage
## Usage
1.  **Upload**:
    -   Drop individual `.xcstrings`, `.xml`, or `.xliff` files.
    -   **New**: Drop an entire `.xcloc` folder (or any folder) to scan for supported localized files.
2.  **Select Files**: If multiple files or a folder is dropped, a selection modal will appear allowing you to choose which files to import.
3.  **Analyze**: The dashboard automatically updates with:
   - **Language Breakdown**: Tables showing percentages and counts.
   - **Duplicate Detection**: Lists of repeated string values.
   - **Word Count**: Total word counts for budgeting.
3. **Export**: Click **Export Report** to save the data for offline review.

### Quick Demo
Click the **Execute Sample** button in the header to load a sample `.xcstrings` catalog that demonstrates every analysis feature:
- **Language Breakdown**: 4 languages — English (100%), Spanish (100%), French (75%, 2 pending), German (50%, missing keys)
- **Duplicate Detection**: "OK" appears in both `confirm_ok` and `dialog_accept` (exact duplicate); "Cancel" vs "cancel" shows as a loose match
- **Word Count**: Rich multi-word strings for meaningful per-language word totals
