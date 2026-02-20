import React, { useState, useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Play, Upload, Trash2, Copy, FileText, Terminal, Code2, File, Info, X, Check, Sparkles, ChevronDown, Download } from 'lucide-react';
import { DragDropZone } from './DragDropZone';
import { ResizableLayout } from './ResizableLayout';
import { VerticalSplitPane } from './VerticalSplitPane';

interface ScriptRunnerViewProps {
    onBack: () => void;
}

interface ScriptFile {
    id: string;
    name: string;
    content: string;
    size: number;
    type: string;
}

interface OutputFile {
    name: string;
    content: string;
    size: number;
}

declare global {
    interface Window {
        loadPyodide: (config: { indexURL: string }) => Promise<any>;
    }
}

// --- Sample Data for Multiple File Types ---
interface SampleEntry {
    label: string;
    badge: string;
    badgeColor: string;
    fileName: string;
    fileType: string;
    content: string;
    script: string;
    pythonScript: string;
}

const SAMPLES: SampleEntry[] = [
    {
        label: 'JSON File (.json)',
        badge: 'JSON',
        badgeColor: 'from-yellow-500 to-amber-600',
        fileName: 'sample_apps.json',
        fileType: 'json',
        content: JSON.stringify([
            { name: 'PhotoSync Pro', version: '3.2.1', platform: 'iOS', downloads: 142500, rating: 4.7 },
            { name: 'TaskFlow', version: '1.8.0', platform: 'iOS', downloads: 89300, rating: 4.5 },
            { name: 'BudgetWise', version: '2.0.4', platform: 'iPadOS', downloads: 51200, rating: 4.2 },
            { name: 'FitTrack Elite', version: '5.1.0', platform: 'iOS', downloads: 230000, rating: 4.9 },
            { name: 'NoteVault', version: '1.3.2', platform: 'macOS', downloads: 34800, rating: 4.0 }
        ], null, 2),
        script: `// 📊 App Analytics Report
// Demonstrates JSON parsing and data aggregation.

const file = files[0];
const apps = JSON.parse(file.content);

console.log("📁 Processing: " + file.name);
console.log("   Found " + apps.length + " apps\\n");

const totalDownloads = apps.reduce((sum, a) => sum + a.downloads, 0);
const avgRating = (apps.reduce((sum, a) => sum + a.rating, 0) / apps.length).toFixed(1);
const topApp = apps.reduce((best, a) => a.downloads > best.downloads ? a : best);

console.log("📈 Total Downloads: " + totalDownloads.toLocaleString());
console.log("⭐ Average Rating:  " + avgRating);
console.log("🏆 Top App:         " + topApp.name + " (" + topApp.downloads.toLocaleString() + " downloads)");
console.log("");

apps.sort((a, b) => b.downloads - a.downloads);
apps.forEach((app, i) => {
    const bar = "█".repeat(Math.round(app.downloads / totalDownloads * 30));
    console.log((i + 1) + ". " + app.name.padEnd(16) + " v" + app.version + "  ⭐" + app.rating + "  " + bar + " " + app.downloads.toLocaleString());
});

return {
    file: file.name,
    totalApps: apps.length,
    totalDownloads,
    averageRating: parseFloat(avgRating),
    topApp: topApp.name
};
`,
        pythonScript: String.raw`# 📊 App Analytics Report
# Demonstrates JSON parsing and data aggregation.
import json

file = files[0]
apps = json.loads(file["content"])

print(f"📁 Processing: {file['name']}")
print(f"   Found {len(apps)} apps\n")

total_downloads = sum(a["downloads"] for a in apps)
avg_rating = sum(a["rating"] for a in apps) / len(apps)
top_app = max(apps, key=lambda a: a["downloads"])

print(f"📈 Total Downloads: {total_downloads:,}")
print(f"⭐ Average Rating:  {avg_rating:.1f}")
print(f"🏆 Top App:         {top_app['name']} ({top_app['downloads']:,} downloads)")
print()

apps.sort(key=lambda a: a["downloads"], reverse=True)
for i, app in enumerate(apps):
    bar = "█" * round(app["downloads"] / total_downloads * 30)
    print(f"{i+1}. {app['name']:<16} v{app['version']}  ⭐{app['rating']}  {bar} {app['downloads']:,}")

print(f"\n✅ Done — {len(apps)} apps analyzed.")
`,
    },
    {
        label: 'Text File (.txt)',
        badge: 'TXT',
        badgeColor: 'from-slate-400 to-slate-500',
        fileName: 'sample_notes.txt',
        fileType: 'txt',
        content: `Meeting Notes - iOS Localization Sprint
========================================

Date: February 2026
Team: Mobile Platform

Agenda:
1. Migrate all .strings files to .xcstrings catalogs
2. Audit untranslated keys across 12 languages
3. Automate plural rule validation for Turkish and Arabic
4. Set up CI checks for missing translations

Action Items:
- [ ] Export current .strings to .xcstrings using the converter tool
- [ ] Run String Analyser on all catalogs to find gaps
- [ ] Add unit tests for stringsdict plural variations
- [x] Update build scripts to support new catalog format
- [x] Document the migration process for other teams

Notes:
The new xcstrings format provides better plural handling and
reduces merge conflicts in Git. All teams should migrate by Q2.

Attendees: Alice, Bob, Charlie, Diana, Eve
`,
        script: `// 📝 Text File Analyser
// Demonstrates line-by-line text processing, word counting,
// and pattern matching on plain text files.

const file = files[0];
const content = file.content;
const lines = content.split('\\n');

console.log("📄 File: " + file.name);
console.log("   Size: " + file.size + " bytes\\n");

// Basic stats
const nonEmpty = lines.filter(l => l.trim().length > 0);
const words = content.split(/\\s+/).filter(w => w.length > 0);
const chars = content.replace(/\\s/g, '').length;

console.log("📊 Statistics:");
console.log("   Total lines:     " + lines.length);
console.log("   Non-empty lines: " + nonEmpty.length);
console.log("   Word count:      " + words.length);
console.log("   Characters:      " + chars);
console.log("");

// Find checklist items
const todos = lines.filter(l => l.includes('[ ]'));
const done  = lines.filter(l => l.includes('[x]'));

console.log("✅ Checklist:");
console.log("   Completed: " + done.length);
console.log("   Remaining: " + todos.length);
todos.forEach(t => console.log("   ⬜ " + t.trim()));

return { lines: lines.length, words: words.length, todos: todos.length, done: done.length };
`,
        pythonScript: String.raw`# 📝 Text File Analyser
# Demonstrates line/word counting and checklist detection.

file = files[0]
content = file["content"]
lines = content.split("\n")
words = content.split()

print(f"📄 File: {file['name']}")
print(f"   Type: Plain Text\n")
print(f"📏 Statistics:")
print(f"   Lines: {len(lines)}")
print(f"   Words: {len(words)}")
print(f"   Characters: {len(content)}\n")

todos = [l for l in lines if "[ ]" in l]
done = [l for l in lines if "[x]" in l]

print("✅ Checklist:")
print(f"   Completed: {len(done)}")
print(f"   Remaining: {len(todos)}")
for t in todos:
    print(f"   ⬜ {t.strip()}")
`,
    },
    {
        label: 'String Catalog (.xcstrings)',
        badge: 'XCS',
        badgeColor: 'from-blue-500 to-indigo-600',
        fileName: 'Localizable.xcstrings',
        fileType: 'xcstrings',
        content: JSON.stringify({
            sourceLanguage: 'en',
            version: '1.0',
            strings: {
                welcome_title: {
                    extractionState: 'manual',
                    localizations: {
                        en: { stringUnit: { state: 'translated', value: 'Welcome' } },
                        fr: { stringUnit: { state: 'translated', value: 'Bienvenue' } },
                        de: { stringUnit: { state: 'translated', value: 'Willkommen' } },
                        ja: { stringUnit: { state: 'translated', value: 'ようこそ' } },
                        es: { stringUnit: { state: 'needs_review', value: 'Bienvenido' } }
                    }
                },
                login_button: {
                    extractionState: 'manual',
                    localizations: {
                        en: { stringUnit: { state: 'translated', value: 'Sign In' } },
                        fr: { stringUnit: { state: 'translated', value: 'Se connecter' } },
                        de: { stringUnit: { state: 'translated', value: 'Anmelden' } }
                    }
                },
                items_count: {
                    extractionState: 'manual',
                    localizations: {
                        en: {
                            variations: {
                                plural: {
                                    one: { stringUnit: { state: 'translated', value: '%lld item' } },
                                    other: { stringUnit: { state: 'translated', value: '%lld items' } }
                                }
                            }
                        },
                        fr: {
                            variations: {
                                plural: {
                                    one: { stringUnit: { state: 'translated', value: '%lld élément' } },
                                    other: { stringUnit: { state: 'translated', value: '%lld éléments' } }
                                }
                            }
                        }
                    }
                },
                settings_title: {
                    extractionState: 'manual',
                    localizations: {
                        en: { stringUnit: { state: 'translated', value: 'Settings' } }
                    }
                },
                delete_confirm: {
                    extractionState: 'manual',
                    comment: 'Shown when user tries to delete an item',
                    localizations: {
                        en: { stringUnit: { state: 'translated', value: 'Are you sure you want to delete this?' } },
                        fr: { stringUnit: { state: 'translated', value: 'Voulez-vous vraiment supprimer ceci ?' } },
                        de: { stringUnit: { state: 'translated', value: 'Möchten Sie das wirklich löschen?' } },
                        ja: { stringUnit: { state: 'translated', value: 'これを削除してもよろしいですか？' } },
                        es: { stringUnit: { state: 'translated', value: '¿Está seguro de que desea eliminar esto?' } }
                    }
                }
            }
        }, null, 2),
        script: `// 🌍 XCStrings Catalog Analyser
// Demonstrates how to parse an .xcstrings file (JSON-based),
// list all keys, languages, and find missing translations.

const file = files[0];
const catalog = JSON.parse(file.content);

console.log("📦 String Catalog: " + file.name);
console.log("   Source Language: " + catalog.sourceLanguage);
console.log("   Version: " + catalog.version + "\\n");

const keys = Object.keys(catalog.strings);
console.log("🔑 Total Keys: " + keys.length);

// Collect all languages
const allLanguages = new Set();
keys.forEach(key => {
    const locs = catalog.strings[key].localizations || {};
    Object.keys(locs).forEach(lang => allLanguages.add(lang));
});
const languages = Array.from(allLanguages).sort();
console.log("🌐 Languages: " + languages.join(", ") + "\\n");

// Per-key breakdown
console.log("📋 Key Details:");
console.log("─".repeat(60));

const missing = [];
keys.forEach(key => {
    const entry = catalog.strings[key];
    const locs = entry.localizations || {};
    const translatedLangs = Object.keys(locs);
    const missingLangs = languages.filter(l => !translatedLangs.includes(l));
    const hasPlurals = Object.values(locs).some(l => l.variations);

    let status = "✅";
    if (missingLangs.length > 0) status = "⚠️";

    console.log(status + " " + key);
    console.log("   Translated: " + translatedLangs.join(", "));
    if (hasPlurals) console.log("   📐 Has plural variations");
    if (missingLangs.length > 0) {
        console.log("   ❌ Missing: " + missingLangs.join(", "));
        missing.push({ key, missingLangs });
    }
});

console.log("\\n📊 Summary:");
console.log("   Total keys:    " + keys.length);
console.log("   Languages:     " + languages.length);
console.log("   Fully translated: " + (keys.length - missing.length));
console.log("   Missing translations: " + missing.length);

return { keys: keys.length, languages: languages.length, missing: missing.length };
`,
        pythonScript: String.raw`# 🌍 XCStrings Catalog Analyser
# Demonstrates parsing an .xcstrings catalog (JSON-based).
import json

file = files[0]
catalog = json.loads(file["content"])

print(f"🧩 String Catalog: {file['name']}")
print(f"   Source Language: {catalog['sourceLanguage']}")
print(f"   Version: {catalog['version']}\n")

keys = list(catalog["strings"].keys())
print(f"🔑 Total Keys: {len(keys)}")

# Collect all languages
all_langs = set()
for key in keys:
    locs = catalog["strings"][key].get("localizations", {})
    all_langs.update(locs.keys())
languages = sorted(all_langs)
print(f"🌐 Languages: {', '.join(languages)}")

print("\n■ Key Details:")
print("─" * 60)

missing = []
for key in keys:
    entry = catalog["strings"][key]
    locs = entry.get("localizations", {})
    translated = list(locs.keys())
    missing_langs = [l for l in languages if l not in translated]
    has_plurals = any(
        "variations" in locs.get(l, {}) for l in translated
    )
    status = "✅" if not missing_langs else "⚠️"
    if has_plurals:
        status += " 🔢"
    print(f"  {status} {key}")
    print(f"       Translated: {', '.join(translated)}")
    if missing_langs:
        print(f"       Missing: {', '.join(missing_langs)}")
        missing.extend([(key, l) for l in missing_langs])

print(f"\n📊 Summary: {len(keys)} keys, {len(languages)} languages, {len(missing)} missing")
`,
    },
    {
        label: 'Strings File (.strings)',
        badge: 'STR',
        badgeColor: 'from-emerald-500 to-green-600',
        fileName: 'Localizable.strings',
        fileType: 'strings',
        content: `/* General */
"app_name" = "My Awesome App";
"ok_button" = "OK";
"cancel_button" = "Cancel";

/* Authentication */
"login_title" = "Welcome Back";
"login_email_placeholder" = "Enter your email";
"login_password_placeholder" = "Enter your password";
"login_submit" = "Sign In";
"login_forgot_password" = "Forgot Password?";
"login_create_account" = "Create Account";

/* Home Screen */
"home_greeting" = "Hello, %@!";
"home_subtitle" = "What would you like to do today?";
"home_recent_items" = "Recent Items";
"home_no_items" = "No items yet. Tap + to add one.";

/* Settings */
"settings_title" = "Settings";
"settings_notifications" = "Notifications";
"settings_dark_mode" = "Dark Mode";
"settings_language" = "Language";
"settings_version" = "Version %@ (Build %@)";

/* Errors */
"error_network" = "Unable to connect. Please check your internet connection.";
"error_generic" = "Something went wrong. Please try again.";
"error_invalid_email" = "Please enter a valid email address.";
`,
        script: `// 📜 .strings File Parser
// Demonstrates how to parse iOS .strings key-value pairs,
// detect comments/sections, and validate the format.

const file = files[0];
const lines = file.content.split('\\n');

console.log("📄 Parsing: " + file.name);
console.log("   Lines: " + lines.length + "\\n");

const entries = [];
const sections = [];
let currentSection = "(No Section)";
const errors = [];

lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Detect section comments like /* Section Name */
    const sectionMatch = trimmed.match(/^\\/\\*\\s*(.+?)\\s*\\*\\//);
    if (sectionMatch) {
        currentSection = sectionMatch[1];
        sections.push(currentSection);
        return;
    }

    // Parse key = value pairs
    const kvMatch = trimmed.match(/^"(.+?)"\\s*=\\s*"(.*)";\\s*$/);
    if (kvMatch) {
        entries.push({ key: kvMatch[1], value: kvMatch[2], section: currentSection, line: i + 1 });
        return;
    }

    // Flag non-empty lines that don't match expected patterns
    if (trimmed.length > 0 && !trimmed.startsWith('//')) {
        errors.push({ line: i + 1, content: trimmed });
    }
});

// Print sections
console.log("📂 Sections Found: " + sections.length);
sections.forEach(s => console.log("   • " + s));
console.log("");

// Print entries grouped by section
console.log("🔑 Parsed Entries: " + entries.length);
console.log("─".repeat(55));

let lastSection = "";
entries.forEach(e => {
    if (e.section !== lastSection) {
        console.log("\\n  [" + e.section + "]");
        lastSection = e.section;
    }
    const preview = e.value.length > 35 ? e.value.substring(0, 35) + "…" : e.value;
    console.log("   " + e.key.padEnd(30) + " → " + preview);
});

// Check for duplicates
const keySet = new Set();
const duplicates = [];
entries.forEach(e => {
    if (keySet.has(e.key)) duplicates.push(e.key);
    keySet.add(e.key);
});

console.log("\\n📊 Summary:");
console.log("   Entries:    " + entries.length);
console.log("   Sections:   " + sections.length);
console.log("   Duplicates: " + duplicates.length);
if (errors.length > 0) {
    console.log("   ⚠️ Format warnings: " + errors.length);
    errors.forEach(e => console.log("     Line " + e.line + ": " + e.content));
}

return { entries: entries.length, sections: sections.length, duplicates: duplicates.length };
`,
        pythonScript: String.raw`# 📜 iOS .strings File Parser
# Demonstrates parsing key="value" pairs from .strings files.
import re

file = files[0]
content = file["content"]
lines = content.split("\n")

print(f"📄 Parsing: {file['name']}")
print(f"   Type: Apple .strings\n")

entries = []
sections = []
warnings = []

for line_num, line in enumerate(lines, 1):
    stripped = line.strip()
    if not stripped:
        continue
    # Section comment
    sec_match = re.match(r'/\*\s*(.+?)\s*\*/', stripped)
    if sec_match:
        sections.append(sec_match.group(1))
        continue
    # Key-value pair
    kv_match = re.match(r'^"(.+?)"\s*=\s*"(.*)";\s*$', stripped)
    if kv_match:
        entries.append({"key": kv_match.group(1), "value": kv_match.group(2), "line": line_num})
    elif stripped and not stripped.startswith("//"):
        warnings.append(f"Line {line_num}: {stripped}")

print(f"📂 Sections ({len(sections)}): {' | '.join(sections)}")
print(f"🔑 Entries: {len(entries)}")
print("─" * 55)

for e in entries:
    print(f"   {e['key']:<20} → {e['value']}")

if warnings:
    print(f"\n⚠️ Warnings ({len(warnings)}):")
    for w in warnings:
        print(f"   {w}")

print(f"\n✅ Parsed {len(entries)} key-value pairs from {len(sections)} sections.")
`,
    },
    {
        label: 'Strings Dict (.stringsdict)',
        badge: 'DICT',
        badgeColor: 'from-purple-500 to-violet-600',
        fileName: 'Localizable.stringsdict',
        fileType: 'stringsdict',
        content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>zero</key>
            <string>No items</string>
            <key>one</key>
            <string>%d item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
    <key>days_remaining</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@days@</string>
        <key>days</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>zero</key>
            <string>No days remaining</string>
            <key>one</key>
            <string>%d day remaining</string>
            <key>two</key>
            <string>%d days remaining</string>
            <key>few</key>
            <string>%d days remaining</string>
            <key>many</key>
            <string>%d days remaining</string>
            <key>other</key>
            <string>%d days remaining</string>
        </dict>
    </dict>
    <key>unread_messages</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@messages@</string>
        <key>messages</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>%d unread message</string>
            <key>other</key>
            <string>%d unread messages</string>
        </dict>
    </dict>
</dict>
</plist>`,
        script: `// 📐 .stringsdict Plural Rules Analyser
// Demonstrates parsing .stringsdict plist XML to extract
// plural rule keys and their variations.

const file = files[0];
const content = file.content;

console.log("📄 Parsing: " + file.name);
console.log("   Type: stringsdict (Plist XML)\\n");

// Simple XML tag parser for plist structure
const keyRegex = /<key>([^<]+)<\\/key>/g;
const stringRegex = /<string>([^<]*)<\\/string>/g;

// Extract all key-string pairs
const allKeys = [];
let match;
while ((match = keyRegex.exec(content)) !== null) {
    allKeys.push({ tag: 'key', value: match[1], index: match.index });
}

// Find top-level plural rule keys (direct children of root dict)
// These are keys followed by a dict containing NSStringLocalizedFormatKey
const pluralRules = [];
const knownPluralForms = ['zero', 'one', 'two', 'few', 'many', 'other'];
let currentKey = null;
let insideRule = false;
let currentForms = [];
let formatKey = null;

const lines = content.split('\\n');
let depth = 0;
let ruleDepth = -1;

lines.forEach(line => {
    const trimmed = line.trim();

    if (trimmed === '<dict>') depth++;
    if (trimmed === '</dict>') {
        if (depth === ruleDepth && insideRule) {
            pluralRules.push({
                key: currentKey,
                formatKey: formatKey,
                forms: [...currentForms]
            });
            insideRule = false;
            currentForms = [];
            formatKey = null;
        }
        depth--;
    }

    const km = trimmed.match(/^<key>(.+?)<\\/key>$/);
    if (km) {
        const k = km[1];
        if (depth === 1) {
            currentKey = k;
        }
        if (k === 'NSStringLocalizedFormatKey') {
            insideRule = true;
            ruleDepth = depth;
        }
        if (insideRule && knownPluralForms.includes(k)) {
            currentForms.push(k);
        }
    }

    const sm = trimmed.match(/^<string>(.+?)<\\/string>$/);
    if (sm && insideRule && !formatKey && trimmed.includes('%#@')) {
        formatKey = sm[1];
    }
});

console.log("🔑 Plural Rules Found: " + pluralRules.length);
console.log("─".repeat(55));

pluralRules.forEach((rule, i) => {
    console.log("\\n" + (i + 1) + ". " + rule.key);
    console.log("   Format: " + (rule.formatKey || 'N/A'));
    console.log("   Forms:  " + rule.forms.join(", "));
    const missingForms = knownPluralForms.filter(f => !rule.forms.includes(f));
    if (missingForms.length > 0 && missingForms.length < 5) {
        console.log("   ⚠️ Optional missing: " + missingForms.join(", "));
    }
});

console.log("\\n📊 Summary:");
console.log("   Total plural keys: " + pluralRules.length);
const totalForms = pluralRules.reduce((sum, r) => sum + r.forms.length, 0);
console.log("   Total variations:  " + totalForms);

return { pluralKeys: pluralRules.length, totalVariations: totalForms };
`,
        pythonScript: String.raw`# 📦 .stringsdict Plural Rules Analyser
# Demonstrates parsing plist XML to extract plural rules.
import re

file = files[0]
content = file["content"]

print(f"📄 Parsing: {file['name']}")
print(f"   Type: stringsdict (Plist XML)\n")

known_forms = ['zero', 'one', 'two', 'few', 'many', 'other']
lines = content.split("\n")

plural_rules = []
current_key = None
current_forms = []
format_key = None
depth = 0
rule_depth = -1

for line in lines:
    stripped = line.strip()
    if stripped == "<dict>":
        depth += 1
    elif stripped == "</dict>":
        if depth == rule_depth and current_key:
            plural_rules.append({
                "key": current_key,
                "format": format_key,
                "forms": current_forms[:]
            })
            current_key = None
            current_forms = []
            format_key = None
            rule_depth = -1
        depth -= 1
    key_match = re.match(r'<key>(.+?)</key>', stripped)
    if key_match:
        k = key_match.group(1)
        if depth == 2 and k not in ['NSStringLocalizedFormatKey']:
            current_key = k
            rule_depth = depth
        if k == 'NSStringLocalizedFormatKey':
            fmt_match = re.search(r'<string>(.*?)</string>', stripped)
            if fmt_match:
                format_key = fmt_match.group(1)
        if k in known_forms:
            current_forms.append(k)

if current_key and current_forms:
    plural_rules.append({
        "key": current_key,
        "format": format_key,
        "forms": current_forms[:]
    })

print(f"🔑 Plural Rules Found: {len(plural_rules)}")
print("─" * 40)

total_var = 0
for i, rule in enumerate(plural_rules):
    print(f"\n{i+1}. {rule['key']}")
    if rule['format']:
        print(f"     Format: {rule['format']}")
    print(f"     Forms: {', '.join(rule['forms'])}")
    total_var += len(rule['forms'])

print(f"\n📊 Total: {len(plural_rules)} rules, {total_var} variations")
`,
    },
    {
        label: 'Android XML (.xml)',
        badge: 'XML',
        badgeColor: 'from-orange-500 to-red-600',
        fileName: 'strings.xml',
        fileType: 'xml',
        content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- App Info -->
    <string name="app_name">My Application</string>
    <string name="app_tagline">Build something amazing</string>

    <!-- Authentication -->
    <string name="login_title">Welcome Back</string>
    <string name="login_email_hint">Email address</string>
    <string name="login_password_hint">Password</string>
    <string name="login_button">Sign In</string>
    <string name="login_forgot">Forgot your password?</string>
    <string name="signup_button">Create Account</string>

    <!-- Home Screen -->
    <string name="home_greeting">Hello, %1$s!</string>
    <string name="home_subtitle">What\'s on your mind today?</string>

    <!-- Plurals -->
    <plurals name="items_count">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
    <plurals name="photos_count">
        <item quantity="one">%d photo</item>
        <item quantity="other">%d photos</item>
    </plurals>

    <!-- String Arrays -->
    <string-array name="planets">
        <item>Mercury</item>
        <item>Venus</item>
        <item>Earth</item>
        <item>Mars</item>
        <item>Jupiter</item>
    </string-array>

    <!-- Errors -->
    <string name="error_network">Network error. Please try again.</string>
    <string name="error_timeout">Request timed out.</string>
    <string name="error_unknown">An unexpected error occurred.</string>
</resources>`,
        script: `// 📱 Android XML Resources Analyser
// Demonstrates parsing Android strings.xml to extract
// <string>, <plurals>, and <string-array> resources.

const file = files[0];
const content = file.content;

console.log("📄 Parsing: " + file.name);
console.log("   Type: Android resources XML\\n");

// Extract <string> elements
const stringRegex = /<string\\s+name="([^"]+)">(.*?)<\\/string>/g;
const strings = [];
let m;
while ((m = stringRegex.exec(content)) !== null) {
    strings.push({ name: m[1], value: m[2] });
}

// Extract <plurals> elements
const pluralsRegex = /<plurals\\s+name="([^"]+)">[\\s\\S]*?<\\/plurals>/g;
const itemRegex = /<item\\s+quantity="([^"]+)">(.*?)<\\/item>/g;
const plurals = [];
while ((m = pluralsRegex.exec(content)) !== null) {
    const items = [];
    let im;
    while ((im = itemRegex.exec(m[0])) !== null) {
        items.push({ quantity: im[1], value: im[2] });
    }
    plurals.push({ name: m[1], items });
}

// Extract <string-array> elements
const arrayRegex = /<string-array\\s+name="([^"]+)">[\\s\\S]*?<\\/string-array>/g;
const simpleItemRegex = /<item>(.*?)<\\/item>/g;
const arrays = [];
while ((m = arrayRegex.exec(content)) !== null) {
    const items = [];
    let im;
    while ((im = simpleItemRegex.exec(m[0])) !== null) {
        items.push(im[1]);
    }
    arrays.push({ name: m[1], items });
}

// Extract comments as sections
const commentRegex = /<!--\\s*(.+?)\\s*-->/g;
const sections = [];
while ((m = commentRegex.exec(content)) !== null) {
    sections.push(m[1]);
}

console.log("📂 Sections: " + sections.join(" | "));
console.log("");

// Print strings
console.log("📝 Strings (" + strings.length + "):");
console.log("─".repeat(55));
strings.forEach(s => {
    const preview = s.value.length > 40 ? s.value.substring(0, 40) + "…" : s.value;
    console.log("   " + s.name.padEnd(25) + " → " + preview);
});

// Print plurals
if (plurals.length > 0) {
    console.log("\\n📐 Plurals (" + plurals.length + "):");
    console.log("─".repeat(55));
    plurals.forEach(p => {
        console.log("   " + p.name + ":");
        p.items.forEach(it => console.log("     [" + it.quantity + "] " + it.value));
    });
}

// Print arrays
if (arrays.length > 0) {
    console.log("\\n📚 String Arrays (" + arrays.length + "):");
    console.log("─".repeat(55));
    arrays.forEach(a => {
        console.log("   " + a.name + ": [" + a.items.join(", ") + "]");
    });
}

console.log("\\n📊 Summary:");
console.log("   Strings:       " + strings.length);
console.log("   Plural groups: " + plurals.length);
console.log("   String arrays: " + arrays.length);

return { strings: strings.length, plurals: plurals.length, arrays: arrays.length };
`,
        pythonScript: String.raw`# 📱 Android XML Resources Analyser
# Demonstrates parsing Android strings.xml to extract resources.
import re

file = files[0]
content = file["content"]

print(f"📄 Parsing: {file['name']}")
print(f"   Type: Android resources XML\n")

# Extract <string> elements
strings = re.findall(r'<string\s+name="([^"]+)">(.*?)</string>', content)

# Extract <!-- comment --> sections
sections = re.findall(r'<!--\s*(.+?)\s*-->', content)

# Extract <plurals> elements
plurals = []
for name in re.findall(r'<plurals\s+name="([^"]+)">', content):
    block = re.search(rf'<plurals\s+name="{name}">[\s\S]*?</plurals>', content)
    if block:
        items = re.findall(r'<item\s+quantity="([^"]+)">(.*?)</item>', block.group())
        plurals.append({"name": name, "items": items})

# Extract <string-array> elements
arrays = []
for name in re.findall(r'<string-array\s+name="([^"]+)">', content):
    block = re.search(rf'<string-array\s+name="{name}">[\s\S]*?</string-array>', content)
    if block:
        items = re.findall(r'<item>(.*?)</item>', block.group())
        arrays.append({"name": name, "items": items})

if sections:
    print(f"📂 Sections: {' | '.join(sections)}")

print(f"\n📝 Strings ({len(strings)}):")
print("─" * 55)
for name, value in strings:
    print(f"   {name:<20} → {value}")

if plurals:
    print(f"\n🔢 Plurals ({len(plurals)}):")
    print("─" * 55)
    for p in plurals:
        forms = ", ".join(f"{q}='{v}'" for q, v in p["items"])
        print(f"   {p['name']}: {forms}")

if arrays:
    print(f"\n📚 String Arrays ({len(arrays)}):")
    print("─" * 55)
    for a in arrays:
        print(f"   {a['name']}: [{', '.join(a['items'])}]")

print(f"\n📊 Summary:")
print(f"   Strings:       {len(strings)}")
print(f"   Plural groups: {len(plurals)}")
print(f"   String arrays: {len(arrays)}")
`,
    },
    // --- Transform Samples (demonstrate output() API) ---
    {
        label: 'XCStrings — Add Missing Keys',
        badge: '✏️',
        badgeColor: 'from-cyan-500 to-blue-600',
        fileName: 'Localizable.xcstrings',
        fileType: 'xcstrings',
        content: JSON.stringify({
            sourceLanguage: 'en',
            version: '1.0',
            strings: {
                welcome_title: {
                    extractionState: 'manual',
                    localizations: {
                        en: { stringUnit: { state: 'translated', value: 'Welcome' } },
                        fr: { stringUnit: { state: 'translated', value: 'Bienvenue' } },
                        de: { stringUnit: { state: 'translated', value: 'Willkommen' } }
                    }
                },
                login_button: {
                    extractionState: 'manual',
                    localizations: {
                        en: { stringUnit: { state: 'translated', value: 'Sign In' } }
                    }
                },
                settings_title: {
                    extractionState: 'manual',
                    localizations: {
                        en: { stringUnit: { state: 'translated', value: 'Settings' } },
                        fr: { stringUnit: { state: 'translated', value: 'Paramètres' } }
                    }
                }
            }
        }, null, 2),
        script: `// ✏️ XCStrings — Add Missing Translations
// This script finds keys with missing language translations
// and adds placeholder entries. The modified catalog is
// emitted as a downloadable file via output().

const file = files[0];
const catalog = JSON.parse(file.content);
const keys = Object.keys(catalog.strings);

// Collect all languages used across the catalog
const allLangs = new Set();
keys.forEach(key => {
    const locs = catalog.strings[key].localizations || {};
    Object.keys(locs).forEach(l => allLangs.add(l));
});
const languages = Array.from(allLangs).sort();

console.log("🌍 Languages found: " + languages.join(", "));
console.log("🔑 Total keys: " + keys.length + "\\n");

let addedCount = 0;
keys.forEach(key => {
    const entry = catalog.strings[key];
    if (!entry.localizations) entry.localizations = {};

    const existing = Object.keys(entry.localizations);
    const missing = languages.filter(l => !existing.includes(l));

    if (missing.length > 0) {
        const englishValue = entry.localizations.en?.stringUnit?.value || key;
        missing.forEach(lang => {
            entry.localizations[lang] = {
                stringUnit: {
                    state: 'needs_review',
                    value: "[" + lang.toUpperCase() + "] " + englishValue
                }
            };
            addedCount++;
        });
        console.log("  ✅ " + key + "  ← added: " + missing.join(", "));
    }
});

console.log("\\n📊 Added " + addedCount + " placeholder translations.");

// Emit the modified catalog as a downloadable file
output("Localizable_Complete.xcstrings", JSON.stringify(catalog, null, 2));

return { keysProcessed: keys.length, translationsAdded: addedCount };
`,
        pythonScript: String.raw`# ✏️ XCStrings — Add Missing Translations
# Adds placeholder entries for missing language translations.
import json

file = files[0]
catalog = json.loads(file["content"])
keys = list(catalog["strings"].keys())

# Collect all languages
all_langs = set()
for key in keys:
    locs = catalog["strings"][key].get("localizations", {})
    all_langs.update(locs.keys())
languages = sorted(all_langs)

print(f"🌍 Languages found: {', '.join(languages)}")
print(f"🔑 Total keys: {len(keys)}\n")

added_count = 0
for key in keys:
    entry = catalog["strings"][key]
    if "localizations" not in entry:
        entry["localizations"] = {}
    existing = list(entry["localizations"].keys())
    missing = [l for l in languages if l not in existing]
    if missing:
        en_value = entry["localizations"].get("en", {}).get("stringUnit", {}).get("value", key)
        for lang in missing:
            entry["localizations"][lang] = {
                "stringUnit": {
                    "state": "needs_review",
                    "value": f"[{lang.upper()}] {en_value}"
                }
            }
            added_count += 1
        print(f"  ✅ {key}  ← added: {', '.join(missing)}")

print(f"\n📊 Added {added_count} placeholder translations.")
output("Localizable_Complete.xcstrings", json.dumps(catalog, indent=2, ensure_ascii=False))
`,
    },
    {
        label: 'Strings — Sort Keys A-Z',
        badge: '🔤',
        badgeColor: 'from-lime-500 to-emerald-600',
        fileName: 'Localizable.strings',
        fileType: 'strings',
        content: `/* Navigation */
"tab_settings" = "Settings";
"tab_home" = "Home";
"tab_profile" = "Profile";
"tab_search" = "Search";

/* Messages */
"msg_welcome" = "Welcome back!";
"msg_goodbye" = "See you later!";
"msg_error" = "Something went wrong.";
"msg_confirm" = "Are you sure?";

/* Buttons */
"btn_submit" = "Submit";
"btn_cancel" = "Cancel";
"btn_delete" = "Delete";
"btn_add" = "Add New";
`,
        script: `// 🔤 Strings — Sort Keys Alphabetically
// This script parses a .strings file, sorts all key-value
// pairs alphabetically, and outputs a clean sorted file.

const file = files[0];
const lines = file.content.split('\\n');

console.log("📄 Parsing: " + file.name + "\\n");

// Parse all entries and comments
const entries = [];
lines.forEach(line => {
    const trimmed = line.trim();
    const kvMatch = trimmed.match(/^"(.+?)"\\s*=\\s*"(.*)";\\s*$/);
    if (kvMatch) {
        entries.push({ key: kvMatch[1], value: kvMatch[2] });
    }
});

console.log("🔑 Found " + entries.length + " entries");

// Sort alphabetically by key
entries.sort((a, b) => a.key.localeCompare(b.key));

console.log("🔤 Sorted A → Z\\n");

// Build the sorted output
const sortedLines = entries.map(e => '"' + e.key + '" = "' + e.value + '";');
const sortedContent = sortedLines.join('\\n') + '\\n';

// Log the sorted result
entries.forEach((e, i) => {
    console.log((i + 1).toString().padStart(2) + ". " + e.key);
});

// Emit the sorted file for download
output("Localizable_Sorted.strings", sortedContent);

console.log("\\n✅ Sorted file emitted for download.");
return { totalEntries: entries.length };
`,
        pythonScript: String.raw`# 🔤 Strings — Sort Keys Alphabetically
# Parses a .strings file, sorts key-value pairs A-Z,
# and emits the sorted file for download.
import re

file = files[0]
lines = file["content"].split("\n")

print(f"📄 Parsing: {file['name']}\n")

# Parse entries
entries = []
for line in lines:
    m = re.match(r'^"(.+?)"\s*=\s*"(.*)";\s*$', line.strip())
    if m:
        entries.append((m.group(1), m.group(2)))

print(f"🔑 Found {len(entries)} entries")

# Sort
entries.sort(key=lambda e: e[0])

print("🔤 Sorted A → Z\n")

# Build output
sorted_lines = [f'"{k}" = "{v}";' for k, v in entries]
sorted_content = "\n".join(sorted_lines) + "\n"

for i, (k, v) in enumerate(entries):
    print(f"{i+1:>2}. {k}")

output("Localizable_Sorted.strings", sorted_content)
print("\n✅ Sorted file emitted for download.")
`,
    },
];

export const ScriptRunnerView: React.FC<ScriptRunnerViewProps> = ({ onBack }) => {
    const [files, setFiles] = useState<ScriptFile[]>([]);
    const [script, setScript] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
    const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
    const [isPyodideLoading, setIsPyodideLoading] = useState(false);
    const [pyodide, setPyodide] = useState<any>(null);

    const [isRunningSample, setIsRunningSample] = useState(false);
    const [showSampleMenu, setShowSampleMenu] = useState(false);
    const sampleMenuRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scriptInputRef = useRef<HTMLInputElement>(null);

    // Close sample menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (sampleMenuRef.current && !sampleMenuRef.current.contains(e.target as Node)) {
                setShowSampleMenu(false);
            }
        };
        if (showSampleMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSampleMenu]);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleCopySnippet = (id: string, code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const loadPyodideRuntime = async () => {
        if (pyodide) return pyodide;

        setIsPyodideLoading(true);
        try {
            if (!window.loadPyodide) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                document.body.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }

            const py = await window.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
            });
            setPyodide(py);
            return py;
        } catch (err: any) {
            console.error('Failed to load Pyodide:', err);
            setConsoleOutput(prev => [...prev, `[SYSTEM ERROR] Failed to load Python environment: ${err.message}`]);
            throw err;
        } finally {
            setIsPyodideLoading(false);
        }
    };

    const handleDownloadFile = (file: OutputFile) => {
        const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRun = async () => {
        setConsoleOutput([]);
        setOutput('');
        setOutputFiles([]);

        if (language === 'javascript') {
            try {
                const logs: string[] = [];
                const emittedFiles: OutputFile[] = [];
                const safeConsole = {
                    log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
                    info: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
                    warn: (...args: any[]) => logs.push("[WARN] " + args.map(a => String(a)).join(' ')),
                    error: (...args: any[]) => logs.push("[ERROR] " + args.map(a => String(a)).join(' ')),
                };
                const safeOutput = (name: string, content: string) => {
                    emittedFiles.push({ name, content, size: new Blob([content]).size });
                };

                const runScript = new Function('files', 'console', 'output', script);
                const result = runScript(files, safeConsole, safeOutput);

                setConsoleOutput(logs);
                setOutputFiles(emittedFiles);

                if (result !== undefined) {
                    if (typeof result === 'object') {
                        setOutput(JSON.stringify(result, null, 2));
                    } else {
                        setOutput(String(result));
                    }
                } else {
                    setOutput('Script executed successfully (no return value)');
                }

            } catch (err: any) {
                setConsoleOutput(prev => [...prev, `[EXECUTION ERROR]: ${err.message}`]);
            }
        } else {
            // Python execution
            try {
                const py = await loadPyodideRuntime();
                const emittedFiles: OutputFile[] = [];

                // Redirect Python stdout to our console
                py.setStdout({
                    batched: (msg: string) => {
                        setConsoleOutput(prev => [...prev, msg]);
                    }
                });

                // Register output() function for Python
                py.globals.set("_js_output", (name: string, content: string) => {
                    emittedFiles.push({ name, content, size: new Blob([content]).size });
                });

                // Convert files to Python-friendly structure
                const filesData = files.map(f => ({
                    name: f.name,
                    content: f.content,
                    size: f.size,
                    type: f.type
                }));

                // Make files available in Python global scope
                py.globals.set("files_js", filesData);

                // Bootstrap script to convert js proxy to python list of dicts + define output()
                await py.runPythonAsync(`
files = []
for f in files_js:
    files.append({
        "name": f.name,
        "content": f.content,
        "size": f.size,
        "type": f.type
    })

def output(name, content):
    _js_output(name, content)
`);

                const result = await py.runPythonAsync(script);

                setOutputFiles(emittedFiles);

                if (result !== undefined) {
                    setOutput(String(result));
                } else {
                    setOutput('Script executed successfully (no return value)');
                }

            } catch (err: any) {
                setConsoleOutput(prev => [...prev, `[PYTHON ERROR]: ${err.message}`]);
            }
        }
    };

    const handleExecuteSample = useCallback(async (sample: SampleEntry) => {
        setIsRunningSample(true);
        setShowSampleMenu(false);
        setOutputFiles([]);
        setConsoleOutput([]);
        setOutput('');

        const contentStr = sample.content;
        const sampleFile: ScriptFile = {
            id: 'sample_' + Date.now(),
            name: sample.fileName,
            content: contentStr,
            size: new Blob([contentStr]).size,
            type: sample.fileType
        };

        const isJS = language === 'javascript';
        const chosenScript = isJS ? sample.script : sample.pythonScript;

        setFiles([sampleFile]);
        setScript(chosenScript);

        if (isJS) {
            try {
                const logs: string[] = [];
                const emittedFiles: OutputFile[] = [];
                const safeConsole = {
                    log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
                    info: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
                    warn: (...args: any[]) => logs.push("[WARN] " + args.map(a => String(a)).join(' ')),
                    error: (...args: any[]) => logs.push("[ERROR] " + args.map(a => String(a)).join(' ')),
                };
                const safeOutput = (name: string, content: string) => {
                    emittedFiles.push({ name, content, size: new Blob([content]).size });
                };

                const runScript = new Function('files', 'console', 'output', chosenScript);
                const result = runScript([sampleFile], safeConsole, safeOutput);

                setConsoleOutput(logs);
                setOutputFiles(emittedFiles);

                if (result !== undefined) {
                    if (typeof result === 'object') {
                        setOutput(JSON.stringify(result, null, 2));
                    } else {
                        setOutput(String(result));
                    }
                } else {
                    setOutput('Script executed successfully (no return value)');
                }
            } catch (err: any) {
                setConsoleOutput([`[EXECUTION ERROR]: ${err.message}`]);
            } finally {
                setIsRunningSample(false);
            }
        } else {
            // Python execution (async)
            try {
                const py = await loadPyodideRuntime();
                const emittedFiles: OutputFile[] = [];

                py.setStdout({
                    batched: (msg: string) => {
                        setConsoleOutput(prev => [...prev, msg]);
                    }
                });

                py.globals.set("_js_output", (name: string, content: string) => {
                    emittedFiles.push({ name, content, size: new Blob([content]).size });
                });

                const filesData = [{
                    name: sampleFile.name,
                    content: sampleFile.content,
                    size: sampleFile.size,
                    type: sampleFile.type
                }];
                py.globals.set("files_js", filesData);

                await py.runPythonAsync(`
files = []
for f in files_js:
    files.append({
        "name": f.name,
        "content": f.content,
        "size": f.size,
        "type": f.type
    })

def output(name, content):
    _js_output(name, content)
`);

                const result = await py.runPythonAsync(chosenScript);

                setOutputFiles(emittedFiles);

                if (result !== undefined) {
                    setOutput(String(result));
                } else {
                    setOutput('Script executed successfully (no return value)');
                }
            } catch (err: any) {
                setConsoleOutput(prev => [...prev, `[PYTHON ERROR]: ${err.message}`]);
            } finally {
                setIsRunningSample(false);
            }
        }
    }, [language, pyodide]);

    const processFiles = (fileList: FileList) => {
        Array.from(fileList).forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setFiles(prev => [...prev, {
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        content: reader.result as string,
                        size: file.size,
                        type: file.name.split('.').pop() || 'txt'
                    }]);
                }
            };
            reader.readAsText(file);
        });
    };

    const handleInputFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(e.target.files);
        if (e.target) e.target.value = '';
    };

    const handleScriptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setScript(reader.result);
                }
            };
            reader.readAsText(file);
        }
        if (e.target) e.target.value = '';
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    // --- Panel Renderers ---

    const renderFilePanel = () => (
        <div className="flex flex-col h-full bg-slate-900/50">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2 text-slate-300">
                    <File className="text-blue-400" size={16} />
                    <span className="text-sm font-semibold">Source Files ({files.length})</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setFiles([])} title="Clear All" className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-rose-400">
                        <Trash2 size={14} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} title="Add Files" className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white bg-slate-700/50">
                        <Upload size={14} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleInputFilesChange} />
                </div>
            </div>

            <DragDropZone
                onFilesDropped={processFiles}
                className="flex-1 overflow-y-auto p-2"
                isDraggingClass="bg-indigo-500/10"
            >
                {files.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm pointer-events-none">
                        <Upload size={32} className="mb-2 opacity-50" />
                        <p>Drag & drop files here</p>
                        <p className="text-xs opacity-60 mt-1">or click upload button</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {files.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400 font-mono text-xs font-bold uppercase shrink-0">
                                        {file.type.slice(0, 3)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm text-slate-200 truncate font-medium">{file.name}</span>
                                        <span className="text-xs text-slate-500">{formatSize(file.size)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                    className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </DragDropZone>
        </div>
    );

    const renderScriptPanel = () => (
        <div className="flex flex-col h-full relative border-l md:border-l-0 border-r md:border-r-0 border-slate-700">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2 text-slate-300">
                    <Code2 className="text-yellow-400" size={16} />
                    <span className="text-sm font-semibold">Script</span>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'javascript' | 'python')}
                        className="ml-2 bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 outline-none focus:border-indigo-500"
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className={`p-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-colors ${showHelp ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Info size={14} />
                        <span className="hidden sm:inline">API Help</span>
                    </button>
                    <button onClick={() => scriptInputRef.current?.click()} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white flex items-center gap-1.5 text-xs">
                        <Upload size={14} />
                        <span className="hidden sm:inline">Load Script</span>
                    </button>
                    <input type="file" ref={scriptInputRef} className="hidden" accept=".js,.ts,.txt" onChange={handleScriptFileChange} />
                </div>
            </div>

            <div className="flex-1 relative">
                {showHelp && (
                    <div className="absolute inset-0 z-10 bg-slate-900/95 backdrop-blur-sm p-6 overflow-y-auto">
                        <div className="max-w-xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Info size={20} className="text-indigo-400" /> Scripting API
                                </h2>
                                <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-800 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <h3 className="font-bold text-white mb-2">Global Variables</h3>
                                    <ul className="space-y-4">
                                        <li>
                                            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-bold">files</code>
                                            <div className="mt-1 text-slate-400 mb-2">Array of file objects currently loaded.</div>
                                            <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-slate-400 overflow-x-auto border border-slate-800">
                                                {files.length > 0 ? `// Example based on your uploaded file:
[
  {
    name: "${files[0].name}",
    type: "${files[0].type}",
    size: ${files[0].size},
    content: "${files[0].content.substring(0, 50).replace(/\n/g, '\\n')}..."
  }${files.length > 1 ? `,\n  ... (${files.length - 1} more files)` : ''}
]` : `// No files loaded. Example structure:
[
  {
    name: "example.json",
    type: "json", 
    size: 1024,
    content: "..."
  }
]`}
                                            </pre>
                                        </li>
                                        <li>
                                            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-bold">console</code>
                                            <div className="mt-1 text-slate-400">Standard console methods: <code>log</code>, <code>warn</code>, <code>error</code>, <code>info</code></div>
                                        </li>
                                        <li>
                                            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-bold">output</code>
                                            <div className="mt-1 text-slate-400 mb-2">Emit a downloadable file. Call multiple times for multiple files.</div>
                                            <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800">
                                                {`// Emit a modified file for download
output("Modified.xcstrings", JSON.stringify(data, null, 2));

// Emit multiple files
output("file1.strings", content1);
output("file2.strings", content2);`}
                                            </pre>
                                        </li>
                                    </ul>
                                </div>

                            </div>

                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <h3 className="font-bold text-white mb-2">Code Snippets ({language === 'javascript' ? 'JavaScript' : 'Python'})</h3>

                                {language === 'javascript' ? (
                                    // JavaScript Snippets
                                    <>
                                        {files.length > 0 && files[0].type === 'json' ? (
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="text-xs font-bold text-indigo-300 uppercase">JSON Processing</div>
                                                    <button
                                                        onClick={() => handleCopySnippet('json', `files.forEach(f => {
  if (f.type === 'json') {
    const data = JSON.parse(f.content);
    console.log("Parsed " + f.name);
    // ... work with data
  }
});`)}
                                                        className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'json'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Copy Snippet"
                                                    >
                                                        {copiedSnippet === 'json' ? (
                                                            <>
                                                                <Check size={12} />
                                                                <span className="text-[10px] font-bold">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <Copy size={12} />
                                                        )}
                                                    </button>
                                                </div>
                                                <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                    {`files.forEach(f => {
  if (f.type === 'json') {
    const data = JSON.parse(f.content);
    console.log("Parsed " + f.name);
    // ... work with data
  }
});`}
                                                </pre>
                                            </div>
                                        ) : files.length > 0 && (files[0].type === 'strings' || files[0].type === 'xcstrings') ? (
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="text-xs font-bold text-indigo-300 uppercase">Strings Parsing</div>
                                                    <button
                                                        onClick={() => handleCopySnippet('strings', `files.forEach(f => {
  const lines = f.content.split('\\n');
  console.log("Reading " + f.name + ": " + lines.length + " lines");
});`)}
                                                        className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'strings'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Copy Snippet"
                                                    >
                                                        {copiedSnippet === 'strings' ? (
                                                            <>
                                                                <Check size={12} />
                                                                <span className="text-[10px] font-bold">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <Copy size={12} />
                                                        )}
                                                    </button>
                                                </div>
                                                <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                    {`files.forEach(f => {
  const lines = f.content.split('\\n');
  console.log("Reading " + f.name + ": " + lines.length + " lines");
});`}
                                                </pre>
                                            </div>
                                        ) : (
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="text-xs font-bold text-indigo-300 uppercase">General Iteration</div>
                                                    <button
                                                        onClick={() => handleCopySnippet('general', `files.forEach(file => {
  console.log("Processing " + file.name);
});`)}
                                                        className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'general'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Copy Snippet"
                                                    >
                                                        {copiedSnippet === 'general' ? (
                                                            <>
                                                                <Check size={12} />
                                                                <span className="text-[10px] font-bold">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <Copy size={12} />
                                                        )}
                                                    </button>
                                                </div>
                                                <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                    {`files.forEach(file => {
  console.log("Processing " + file.name);
});`}
                                                </pre>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    // Python Snippets
                                    <>
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="text-xs font-bold text-indigo-300 uppercase">General Iteration</div>
                                                <button
                                                    onClick={() => handleCopySnippet('py_general', `for file in files:
    print(f"Processing {file['name']} ({file['size']} bytes)")
`)}
                                                    className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'py_general'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                        }`}
                                                    title="Copy Snippet"
                                                >
                                                    {copiedSnippet === 'py_general' ? (
                                                        <>
                                                            <Check size={12} />
                                                            <span className="text-[10px] font-bold">Copied!</span>
                                                        </>
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                </button>
                                            </div>
                                            <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                {`for file in files:
    print(f"Processing {file['name']} ({file['size']} bytes)")`}
                                            </pre>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="text-xs font-bold text-indigo-300 uppercase">JSON Processing</div>
                                                <button
                                                    onClick={() => handleCopySnippet('py_json', `import json

for f in files:
    if f['type'] == 'json':
        data = json.loads(f['content'])
        print(f"Parsed {f['name']} keys: {list(data.keys())}")`)}
                                                    className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'py_json'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                        }`}
                                                    title="Copy Snippet"
                                                >
                                                    {copiedSnippet === 'py_json' ? (
                                                        <>
                                                            <Check size={12} />
                                                            <span className="text-[10px] font-bold">Copied!</span>
                                                        </>
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                </button>
                                            </div>
                                            <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                {`import json

for f in files:
    if f['type'] == 'json':
        data = json.loads(f['content'])
        print(f"Parsed {f['name']} keys: {list(data.keys())}")`}
                                            </pre>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <Editor
                    height="100%"
                    defaultLanguage={language}
                    language={language}
                    theme="vs-dark"
                    value={script}
                    onChange={(value) => setScript(value || '')}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 }
                    }}
                />
                {!script && !showHelp && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-600">
                        <div className="text-center">
                            <p>Type your script here...</p>
                            <p className="text-xs mt-1">or click "Load Script" to upload a file</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderOutputPanel = () => (
        <div className="flex flex-col h-full min-w-[200px]">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-2 text-slate-300">
                    <Terminal className="text-green-400" size={16} />
                    <span className="text-sm font-semibold">Output</span>
                </div>
                <button
                    onClick={() => navigator.clipboard.writeText(output)}
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    title="Copy Output"
                >
                    <Copy size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden bg-black/40 flex flex-col">
                {/* Output Files Section */}
                {outputFiles.length > 0 && (
                    <div className="flex-shrink-0 border-b border-slate-700">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-950/40 border-b border-emerald-800/30">
                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Download size={11} />
                                Output Files ({outputFiles.length})
                            </div>
                        </div>
                        <div className="p-2 space-y-1.5 bg-slate-900/60 max-h-[140px] overflow-y-auto custom-scrollbar">
                            {outputFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg border border-slate-700/60 hover:border-emerald-600/40 transition-colors group">
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                        <div className="w-7 h-7 rounded bg-emerald-900/40 border border-emerald-700/30 flex items-center justify-center shrink-0">
                                            <FileText size={13} className="text-emerald-400" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs text-slate-200 font-medium truncate">{file.name}</span>
                                            <span className="text-[10px] text-slate-500">{formatSize(file.size)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadFile(file)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 hover:text-emerald-200 rounded-md border border-emerald-600/30 hover:border-emerald-500/50 transition-all active:scale-95 shrink-0"
                                    >
                                        <Download size={12} />
                                        Download
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-hidden">
                    <VerticalSplitPane initialTopHeight={30}>
                        {/* Top: Console Logs */}
                        <div className="h-full flex flex-col bg-black/20">
                            <div className="flex items-center justify-between px-3 py-1 bg-slate-900/50 border-b border-slate-800 flex-shrink-0">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Console</div>
                                <button onClick={() => setConsoleOutput([])} className="text-[10px] text-slate-600 hover:text-slate-400">Clear</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                                {consoleOutput.length === 0 ? (
                                    <span className="text-slate-700 text-xs italic opacity-50">No console output...</span>
                                ) : (
                                    consoleOutput.map((log, i) => (
                                        <div key={i} className="font-mono text-xs text-slate-400 mb-1 border-b border-white/5 pb-1 last:border-0 font-light break-all whitespace-pre-wrap">
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Bottom: Result */}
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between px-3 py-1 bg-slate-900/50 border-b border-slate-800 flex-shrink-0">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Result</div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <pre className="font-mono text-xs sm:text-sm text-green-400 whitespace-pre-wrap break-all">
                                    {output || <span className="text-slate-700 italic">Script return value will appear here...</span>}
                                </pre>
                            </div>
                        </div>
                    </VerticalSplitPane>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
            {/* Header */}
            <header className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md flex-shrink-0 relative z-50">
                <button onClick={onBack} className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                        Script Runner
                    </h1>
                    <p className="text-slate-400 text-sm">run JS/TS scripts on multiple files</p>
                </div>
                <div className="ml-auto flex items-center space-x-3">
                    <div className="relative" ref={sampleMenuRef}>
                        <button
                            onClick={() => setShowSampleMenu(!showSampleMenu)}
                            className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400/60 rounded-lg font-semibold active:scale-95 transition-all text-sm"
                            title="Load a sample file and script, then auto-run to see how Script Runner works"
                        >
                            <Sparkles size={16} />
                            <span className="hidden sm:inline">Execute Sample</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showSampleMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Sample Popover Menu */}
                        {showSampleMenu && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-2.5 border-b border-slate-700 bg-slate-800/80">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Choose a sample file type</p>
                                </div>
                                <div className="py-1.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                                    {SAMPLES.map((sample, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleExecuteSample(sample)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-700/70 transition-colors group"
                                        >
                                            <div className={`w-10 h-7 rounded-md bg-gradient-to-br ${sample.badgeColor} flex items-center justify-center text-white text-[9px] font-black tracking-tight shadow-md shrink-0`}>
                                                {sample.badge}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm text-slate-200 font-medium group-hover:text-white transition-colors">{sample.label}</span>
                                                <span className="text-[11px] text-slate-500 truncate">{sample.fileName}</span>
                                            </div>
                                            <Play size={14} className="ml-auto text-slate-600 group-hover:text-amber-400 transition-colors shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleRun}
                        className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-green-900/20 active:scale-95 transition-all text-sm sm:text-base"
                    >
                        <Play size={18} fill="currentColor" />
                        <span className="hidden sm:inline ml-2">Run Script</span>
                    </button>
                </div>
            </header>

            {/* Main Content using ResizableLayout */}
            <div className="flex-1 flex overflow-hidden">
                <ResizableLayout>
                    {renderFilePanel()}
                    {renderScriptPanel()}
                    {renderOutputPanel()}
                </ResizableLayout>
            </div>
        </div>
    );
};
