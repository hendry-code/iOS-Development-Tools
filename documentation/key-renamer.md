# Key Renamer

## Overview
The **Key Renamer** is a powerful refactoring tool for localization keys. It helps you rename keys across new translation files by mapping them through an old version of the file. This is particularly useful when developers change a key name in the code (e.g., `login_btn` -> `auth_login_button`) and you need to migrate translations from an older file structure to the new key names based on matching values.

## Concept
The tool uses three inputs:
1.  **Source File**: The file containing the *translations* you want to keep (e.g., a fully translated Albanian file with old keys).
2.  **Key-Comparable**: An old version of the base language file (e.g., old English file) that matches the keys in the Source File.
3.  **Value-Comparables**: The *new* base language files (e.g., new English file) that have the *new* keys but the *same values* as the Key-Comparable.

**Logic**: `SourceKey` -> look up value in `KeyComparable` -> find that value in `ValueComparable` -> get `NewKey`.

## Usage
1.  **Step 1: Upload Source**: Upload the translation file you want to fix (e.g., `albanian.strings` with old keys).
2.  **Step 2: Upload Key-Comp**: Upload the old English file that corresponds to the Source File.
3.  **Step 3: Upload Value-Comp**: Upload the new English file (or files) that contains the new keys.
4.  **Process**: Click **Process Renaming**. The tool will try to match values to find the new keys for your source translations.
5.  **Review & Download**: Check the logs to see which keys were renamed and download the result.

### Quick Demo
Click the **Execute Sample** button in the header to load sample files demonstrating the full key renaming workflow. It loads an Albanian translation file with old keys (e.g., `login_btn`), an old English key-comparable, and a new English value-comparable with renamed keys (e.g., `auth_login_button`). All 8 keys get renamed automatically, and the Change Log shows each mapping.
