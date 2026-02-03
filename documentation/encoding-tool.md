# Encoding Tool

## Overview
The **Encoding Tool** is a versatile utility for encoding and decoding text across multiple formats commonly used in web and mobile development.

## Supported Formats

| Tab | Operations | Description |
|-----|------------|-------------|
| **Base64** | Encode / Decode | Standard Base64 with Unicode support |
| **URL** | Encode / Decode | URI component encoding (`encodeURIComponent`) |
| **HTML** | Encode / Decode | HTML entity escaping (`<` → `&lt;`) |
| **Hex** | Encode / Decode | Hexadecimal representation |
| **JWT** | Decode only | Inspect JWT header and payload |

## Features
- **Live Preview**: Results update as you type
- **Direction Toggle**: Switch between encode/decode modes
- **Swap Button**: Quickly swap input/output and toggle direction
- **Copy/Paste**: One-click clipboard operations
- **Error Handling**: Clear error messages for invalid input
- **JWT Inspection**: View expiration status, issued/expiry dates

## Usage

1. **Select a format** from the tabs (Base64, URL, HTML, Hex, JWT)
2. **Choose direction** using Encode/Decode toggle (not applicable for JWT)
3. **Enter your text** in the input area
4. **View the result** in the output area (auto-updates)
5. **Copy the result** using the "Copy" button

## Examples

### Base64
- **Encode**: `Hello World` → `SGVsbG8gV29ybGQ=`
- **Decode**: `SGVsbG8gV29ybGQ=` → `Hello World`

### URL
- **Encode**: `hello world` → `hello%20world`
- **Decode**: `hello%20world` → `hello world`

### HTML
- **Encode**: `<script>` → `&lt;script&gt;`
- **Decode**: `&lt;script&gt;` → `<script>`

### JWT
Paste a JWT token to view:
- **Header**: Algorithm and token type
- **Payload**: Claims (sub, name, iat, exp, etc.)
- **Status**: Valid or Expired indicator
