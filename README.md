# iOS Development Tools

A comprehensive suite of web-based tools designed to streamline iOS localization and development workflows. This application provides a unified interface for managing string files, converting formats, analyzing localization data, and more.

## Features

The application consists of several specialized modules accessible from a central dashboard:

### 🔄 Converters
- **Properties Converter**: Convert Java `.properties` files to iOS `.strings` format and vice versa.
- **JSON Converter**: Bidirectional conversion between JSON and iOS `.strings` files.
- **XML Converter**: Convert XML files to iOS `.strings` format.

### 🛠️ String Management
- **Combine Strings**: Consolidate multiple `.strings` files into a single file.
- **Merge Strings**: smart merging of strings files with conflict resolution.
- **Key Renamer**: Batch rename keys across multiple localization files.
- **Extract Catalog**: Extract and organize string catalogs.

### 📊 Analysis & Editing
- **Strings Analyser**: detailed analysis of `.xcstrings`, `.xml`, and other formats. Checks for missing translations, duplicate keys, and provides word counts per language.
- **File Editor**: Built-in editor to view and modify file contents directly within the app.

### 🧪 Data Generation
- **Mock Data Generator**: Create realistic, complex datasets for testing. Supports deeply nested objects, arrays, and 16+ data types (names, addresses, UUIDs, etc.). Export to JSON or CSV with instant preview.

### 🎨 User Interface
- **Modern Dashboard**: Intuitive tile-based navigation.
- **Dark/Light Mode**: Fully supported theming for comfortable usage in any environment.
- **Responsive Design**: optimized for both desktop and mobile usage.

## Tech Stack

- **Framework**: React with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **File Handling**: JSZip for archive operations

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd ios-development-tools
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and visit `http://localhost:5173` (or the URL shown in your terminal).

## Usage

1. **Dashboard**: Select the tool you need from the main grid.
2. **File Input**: Most tools support drag-and-drop or file selection for uploading your `.strings`, `.xcstrings`, `.json`, `.xml`, or `.properties` files.
3. **Processing**: Configure any specific options (e.g., source language, target format) and run the process.
4. **Output**: View results directly in the UI or download the processed files (individual files or ZIP archives).

## Project Structure

```
├── src/
│   ├── context/        # React contexts (Theme, etc.)
│   └── ...
├── components/         # specialized React components for each tool
├── services/           # Logic for file processing and conversion
├── test_files/         # Sample files for testing
├── App.tsx             # Main routing and layout logic
└── types.ts            # TypeScript definitions
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)
