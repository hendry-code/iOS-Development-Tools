# JSON to Swift Codable

## Overview
The **JSON to Swift Codable** tool automates the process of creating Swift `Decodable` structs from JSON data. It saves iOS developers time by instantly generating boilerplate code that matches their API responses.

## Features
- **Instant Conversion**: Paste JSON and get valid Swift code immediately.
- **Configurable Output**:
    - **Root Struct Name**: Customize the name of the main struct (default: `Welcome`).
    - **CodingKeys**: Toggle generation of `CodingKeys` enum for custom property mapping.
    - **Optional Wrappers**: Option to force all properties to be optional (`?`).
- **Error Handling**: Detects invalid JSON and warns the user.

## Usage
1. **Configure**: Set your desired root struct name and toggle options like "Generate CodingKeys".
2. **Input**: Paste your JSON object into the left panel.
3. **Result**: The right panel updates in real-time with the generated Swift structs.
4. **Copy**: Click the copy icon in the code block to use the code in your Xcode project.

### Quick Demo
Click the **Execute Sample** button to load a rich JSON sample featuring:
- **Nested objects** (`address` with street, city, zip)
- **Arrays of objects** (`recent_orders`)
- **Nullable fields** (`profile_image: null`)
- **snake_case keys** for CodingKeys generation
- **Mixed types** (String, Int, Double, Bool)

Toggle the configuration options to see how the Swift output changes in real-time.
