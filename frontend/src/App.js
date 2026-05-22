import React, {
  useState, useEffect, useRef, useCallback,
  createContext, useContext,
} from "react";
import Editor from "@monaco-editor/react";
import { io as socketIO } from "socket.io-client";
import {
  FaPlay, FaStop, FaGithub, FaChevronDown, FaChevronRight,
  FaRobot, FaCog, FaSave, FaSignOutAlt, FaUser, FaLock, FaEye, FaEyeSlash,
  FaCode, FaPlus, FaTimes, FaTerminal, FaExpandAlt, FaCompressAlt,
  FaRegCopy, FaDownload, FaFolderOpen, FaFolder, FaFile,
  FaTrash, FaEdit, FaUpload, FaBolt, FaCoffee, FaEnvelope,
  FaCheckCircle, FaArrowLeft, FaExclamationTriangle, FaUsers, FaCopy,
  FaCamera, FaPalette, FaKeyboard, FaBell, FaShieldAlt, FaInfoCircle,
  FaCheck, FaMinus,
} from "react-icons/fa";
import { SiPython, SiJavascript, SiTypescript, SiRust, SiCplusplus, SiC } from "react-icons/si";
import { VscFiles, VscSourceControl, VscDebugAlt, VscSearch } from "react-icons/vsc";

/* ─────────────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────────────── */
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/* ─────────────────────────────────────────────────────────────────
   LANGUAGE CONFIG
───────────────────────────────────────────────────────────────── */
const LANGS = {
  python:     { icon: SiPython,     color: "#6a7280", label: "Python",     version: "3.11",    monacoLang: "python",     ext: "py"   },
  javascript: { icon: SiJavascript, color: "#6a7280", label: "JavaScript", version: "Node 20", monacoLang: "javascript", ext: "js"   },
  typescript: { icon: SiTypescript, color: "#6a7280", label: "TypeScript", version: "5.4",     monacoLang: "typescript", ext: "ts"   },
  java:       { icon: FaCoffee,     color: "#6a7280", label: "Java",       version: "21",      monacoLang: "java",       ext: "java" },
  c:          { icon: SiC,          color: "#6a7280", label: "C",          version: "C11",     monacoLang: "c",          ext: "c"    },
  cpp:        { icon: SiCplusplus,  color: "#6a7280", label: "C++",        version: "C++17",   monacoLang: "cpp",        ext: "cpp"  },
  rust:       { icon: SiRust,       color: "#6a7280", label: "Rust",       version: "1.78",    monacoLang: "rust",       ext: "rs"   },
};

const DEFAULT_CODE = {
  python:     `# Python 3.11\nprint("Hello, World!")\nname = input("Enter your name: ")\nprint(f"Hello, {name}!")\n`,
  javascript: `// Node 20\nconst readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nconsole.log("Hello, World!");\nrl.question("Enter your name: ", name => {\n  console.log(\`Hello, \${name}!\`);\n  rl.close();\n});\n`,
  typescript: `// TypeScript 5.4\nimport * as readline from 'readline';\nconst rl = readline.createInterface({ input: process.stdin });\nconsole.log("Hello, World!");\nrl.question("Enter your name: ", (name: string) => {\n  console.log(\`Hello, \${name}!\`);\n  rl.close();\n});\n`,
  java:       `// Java 21\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.println("Hello, World!");\n        System.out.print("Enter your name: ");\n        String name = sc.nextLine();\n        System.out.println("Hello, " + name + "!");\n    }\n}\n`,
  c:          `// C11\n#include <stdio.h>\n\nint main() {\n    char name[100];\n    printf("Hello, World!\\n");\n    printf("Enter your name: ");\n    fflush(stdout);\n    scanf("%99s", name);\n    printf("Hello, %s!\\n", name);\n    return 0;\n}\n`,
  cpp:        `// C++17\n#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string name;\n    cout << "Hello, World!" << endl;\n    cout << "Enter your name: ";\n    cin >> name;\n    cout << "Hello, " << name << "!" << endl;\n    return 0;\n}\n`,
  rust:       `// Rust 1.78\nuse std::io::{self, BufRead, Write};\n\nfn main() {\n    println!("Hello, World!");\n    print!("Enter your name: ");\n    io::stdout().flush().unwrap();\n    let stdin = io::stdin();\n    let name = stdin.lock().lines().next().unwrap().unwrap();\n    println!("Hello, {}!", name);\n}\n`,
};

const EXT_TO_LANG = { py:"python", js:"javascript", ts:"typescript", java:"java", c:"c", cpp:"cpp", cc:"cpp", rs:"rust" };

let _uid = 1;
const uid = () => _uid++;

/* ─────────────────────────────────────────────────────────────────
   DEFAULT SETTINGS
───────────────────────────────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  theme: "obsidian-gold",
  fontSize: 13,
  tabSize: 4,
  wordWrap: "on",
  minimap: false,
  fontLigatures: true,
  autoSave: false,
  autoSaveDelay: 2000,
  cursorBlinking: "smooth",
  lineNumbers: "on",
  showNotifications: true,
  soundEnabled: false,
};

const THEME_OPTIONS = [
  { value: "obsidian-gold",  label: "Obsidian Gold"  },
  { value: "slate-aurora",   label: "Slate Aurora"   },
  { value: "rosewood",       label: "Rosewood"       },
  { value: "deep-slate",     label: "Deep Slate"     },
  { value: "abyss",          label: "Abyss"          },
  { value: "tidal-noir",     label: "Tidal Noir"     },
  { value: "bioluminescent", label: "Bioluminescent" },
  { value: "void-black",     label: "Void Black"     },
  { value: "synthwave-84",   label: "Synthwave '84"  },
  { value: "forest-mist",    label: "Forest Mist"    },
  { value: "copper-circuit", label: "Copper Circuit" },
  { value: "arctic-ice",     label: "Arctic Ice"     },
  { value: "crimson-dusk",   label: "Crimson Dusk"   },
];

/* ─────────────────────────────────────────────────────────────────
   CUSTOM THEME DEFINITIONS — Editor + Global UI
───────────────────────────────────────────────────────────────── */
const CUSTOM_THEMES = {

  /* ── 1. OBSIDIAN GOLD ─────────────────────────────────────────────
     Near-black charcoal base. Warm amber-gold accents. Feels premium,
     like brushed metal and aged leather. Icons stay neutral — only
     active states get a touch of gold. Incredibly readable.
  ──────────────────────────────────────────────────────────────────── */
  "obsidian-gold": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",        foreground: "4A4438" },
      { token: "comment.block",  foreground: "4A4438" },
      { token: "string",         foreground: "C9A96E" },
      { token: "string.escape",  foreground: "E0C080" },
      { token: "number",         foreground: "D4956A" },
      { token: "variable",       foreground: "C8BFB0" },
      { token: "variable.name",  foreground: "C8BFB0" },
      { token: "keyword",        foreground: "B8924A" },
      { token: "keyword.control",foreground: "B8924A" },
      { token: "type",           foreground: "A89070" },
      { token: "type.identifier",foreground: "A89070" },
      { token: "function",       foreground: "C8BFB0" },
      { token: "operator",       foreground: "7A6E60" },
      { token: "delimiter",      foreground: "5A5248" },
      { token: "tag",            foreground: "C9A96E" },
      { token: "attribute.name", foreground: "A89070" },
    ],
    colors: {
      "editor.background":             "#14120F",
      "editor.foreground":             "#C8BFB0",
      "editor.lineHighlightBackground":"#1C1A16",
      "editor.selectionBackground":    "#2E2820",
      "editor.inactiveSelectionBackground": "#201E1A",
      "editorLineNumber.foreground":   "#3A3530",
      "editorLineNumber.activeForeground": "#7A6840",
      "editorCursor.foreground":       "#C9A96E",
      "editorGutter.background":       "#14120F",
      "editorWidget.background":       "#1C1A16",
      "editorSuggestWidget.background":"#1C1A16",
      "editorSuggestWidget.border":    "#2A2520",
      "scrollbar.shadow":              "#00000000",
      "scrollbarSlider.background":    "#2A2520",
      "scrollbarSlider.hoverBackground":"#3A3028",
    },
    ui: {
      bg: "#14120F", fg: "#C8BFB0",
      accent1: "#C9A96E", accent2: "#A89070", accent3: "#D4956A",
      iconColor: "#5A5450", iconHover: "#9A8870", activeBorder: "#C9A96E",
    },
  },

  /* ── 2. SLATE AURORA ──────────────────────────────────────────────
     Deep blue-grey slate base. Soft teal-cyan aurora glow on accents
     only. Clean, cool, and professional. Icons are a muted grey —
     nothing screams for attention. Active states shimmer subtly.
  ──────────────────────────────────────────────────────────────────── */
  "slate-aurora": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",        foreground: "3D4A58" },
      { token: "comment.block",  foreground: "3D4A58" },
      { token: "string",         foreground: "6BBFB8" },
      { token: "string.escape",  foreground: "80D0C8" },
      { token: "number",         foreground: "7AAEC8" },
      { token: "variable",       foreground: "B0C4D4" },
      { token: "variable.name",  foreground: "B0C4D4" },
      { token: "keyword",        foreground: "5A9EBF" },
      { token: "keyword.control",foreground: "5A9EBF" },
      { token: "type",           foreground: "6090A8" },
      { token: "type.identifier",foreground: "6090A8" },
      { token: "function",       foreground: "B0C4D4" },
      { token: "operator",       foreground: "4A6070" },
      { token: "delimiter",      foreground: "364858" },
      { token: "tag",            foreground: "6BBFB8" },
      { token: "attribute.name", foreground: "6090A8" },
    ],
    colors: {
      "editor.background":             "#0E1520",
      "editor.foreground":             "#B0C4D4",
      "editor.lineHighlightBackground":"#141F2E",
      "editor.selectionBackground":    "#1E3048",
      "editor.inactiveSelectionBackground": "#162436",
      "editorLineNumber.foreground":   "#243040",
      "editorLineNumber.activeForeground": "#4A7080",
      "editorCursor.foreground":       "#6BBFB8",
      "editorGutter.background":       "#0E1520",
      "editorWidget.background":       "#141F2E",
      "editorSuggestWidget.background":"#141F2E",
      "editorSuggestWidget.border":    "#1E2E40",
      "scrollbar.shadow":              "#00000000",
      "scrollbarSlider.background":    "#1E2E40",
      "scrollbarSlider.hoverBackground":"#243848",
    },
    ui: {
      bg: "#0E1520", fg: "#B0C4D4",
      accent1: "#6BBFB8", accent2: "#5A9EBF", accent3: "#7AAEC8",
      iconColor: "#3A5060", iconHover: "#6090A8", activeBorder: "#6BBFB8",
    },
  },

  /* ── 3. ROSEWOOD ──────────────────────────────────────────────────
     Very dark burgundy-brown base with warm rose and muted mauve.
     Rich, elegant, and warm. Not red or alarming — just sophisticated.
     Icons are low-key warm-grey. Feels like a luxury code editor.
  ──────────────────────────────────────────────────────────────────── */
  "rosewood": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",        foreground: "4A3038" },
      { token: "comment.block",  foreground: "4A3038" },
      { token: "string",         foreground: "C4807A" },
      { token: "string.escape",  foreground: "D49090" },
      { token: "number",         foreground: "B87870" },
      { token: "variable",       foreground: "C8B4B4" },
      { token: "variable.name",  foreground: "C8B4B4" },
      { token: "keyword",        foreground: "A86868" },
      { token: "keyword.control",foreground: "A86868" },
      { token: "type",           foreground: "987080" },
      { token: "type.identifier",foreground: "987080" },
      { token: "function",       foreground: "C8B4B4" },
      { token: "operator",       foreground: "6A5050" },
      { token: "delimiter",      foreground: "503C3C" },
      { token: "tag",            foreground: "C4807A" },
      { token: "attribute.name", foreground: "987080" },
    ],
    colors: {
      "editor.background":             "#130C0E",
      "editor.foreground":             "#C8B4B4",
      "editor.lineHighlightBackground":"#1C1214",
      "editor.selectionBackground":    "#2E1C20",
      "editor.inactiveSelectionBackground": "#20141A",
      "editorLineNumber.foreground":   "#362028",
      "editorLineNumber.activeForeground": "#6A4048",
      "editorCursor.foreground":       "#C4807A",
      "editorGutter.background":       "#130C0E",
      "editorWidget.background":       "#1C1214",
      "editorSuggestWidget.background":"#1C1214",
      "editorSuggestWidget.border":    "#281820",
      "scrollbar.shadow":              "#00000000",
      "scrollbarSlider.background":    "#281820",
      "scrollbarSlider.hoverBackground":"#361E28",
    },
    ui: {
      bg: "#130C0E", fg: "#C8B4B4",
      accent1: "#C4807A", accent2: "#987080", accent3: "#B87870",
      iconColor: "#503C40", iconHover: "#8A6060", activeBorder: "#C4807A",
    },
  },

  /* ── 4. DEEP SLATE ────────────────────────────────────────────────
     Pure dark neutral slate — almost like dark mode done perfectly.
     Neutral silver-grey text, subtle indigo-steel accents only where
     needed. No icon glow at all. Clean, zero-distraction workspace.
     The theme that gets out of your way completely.
  ──────────────────────────────────────────────────────────────────── */
  "deep-slate": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",        foreground: "3E4450" },
      { token: "comment.block",  foreground: "3E4450" },
      { token: "string",         foreground: "7A9AAA" },
      { token: "string.escape",  foreground: "8AAABB" },
      { token: "number",         foreground: "8090A0" },
      { token: "variable",       foreground: "A8B4C0" },
      { token: "variable.name",  foreground: "A8B4C0" },
      { token: "keyword",        foreground: "6880A0" },
      { token: "keyword.control",foreground: "6880A0" },
      { token: "type",           foreground: "607080" },
      { token: "type.identifier",foreground: "607080" },
      { token: "function",       foreground: "A8B4C0" },
      { token: "operator",       foreground: "485460" },
      { token: "delimiter",      foreground: "384450" },
      { token: "tag",            foreground: "7A9AAA" },
      { token: "attribute.name", foreground: "607080" },
    ],
    colors: {
      "editor.background":             "#0F1318",
      "editor.foreground":             "#A8B4C0",
      "editor.lineHighlightBackground":"#151B22",
      "editor.selectionBackground":    "#1E2A38",
      "editor.inactiveSelectionBackground": "#18222E",
      "editorLineNumber.foreground":   "#283240",
      "editorLineNumber.activeForeground": "#485E70",
      "editorCursor.foreground":       "#7A9AAA",
      "editorGutter.background":       "#0F1318",
      "editorWidget.background":       "#151B22",
      "editorSuggestWidget.background":"#151B22",
      "editorSuggestWidget.border":    "#1E2A38",
      "scrollbar.shadow":              "#00000000",
      "scrollbarSlider.background":    "#1E2A38",
      "scrollbarSlider.hoverBackground":"#253040",
    },
    ui: {
      bg: "#0F1318", fg: "#A8B4C0",
      accent1: "#7A9AAA", accent2: "#6880A0", accent3: "#8090A0",
      iconColor: "#384450", iconHover: "#607080", activeBorder: "#7A9AAA",
    },
  },

  /* ── 5. ABYSS ─────────────────────────────────────────────────────
     The deepest ocean trench. Pure black base with cold steel-blue
     and dim aqua. Almost no color — just the void and a hint of
     deep water light filtering down from miles above.
  ──────────────────────────────────────────────────────────────────── */
  "abyss": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",         foreground: "1E3040" },
      { token: "comment.block",   foreground: "1E3040" },
      { token: "string",          foreground: "3D7A8A" },
      { token: "string.escape",   foreground: "4A8F9F" },
      { token: "number",          foreground: "2E6070" },
      { token: "variable",        foreground: "8AAFC0" },
      { token: "variable.name",   foreground: "8AAFC0" },
      { token: "keyword",         foreground: "2C5F78" },
      { token: "keyword.control", foreground: "2C5F78" },
      { token: "type",            foreground: "245060" },
      { token: "type.identifier", foreground: "245060" },
      { token: "function",        foreground: "8AAFC0" },
      { token: "operator",        foreground: "1A3A4A" },
      { token: "delimiter",       foreground: "122830" },
      { token: "tag",             foreground: "3D7A8A" },
      { token: "attribute.name",  foreground: "245060" },
    ],
    colors: {
      "editor.background":              "#020810",
      "editor.foreground":              "#8AAFC0",
      "editor.lineHighlightBackground": "#060F1A",
      "editor.selectionBackground":     "#0A1E30",
      "editor.inactiveSelectionBackground": "#071525",
      "editorLineNumber.foreground":    "#0E2030",
      "editorLineNumber.activeForeground": "#1E4060",
      "editorCursor.foreground":        "#3D7A8A",
      "editorGutter.background":        "#020810",
      "editorWidget.background":        "#060F1A",
      "editorSuggestWidget.background": "#060F1A",
      "editorSuggestWidget.border":     "#0A1E30",
      "scrollbar.shadow":               "#00000000",
      "scrollbarSlider.background":     "#0A1830",
      "scrollbarSlider.hoverBackground":"#102038",
    },
    ui: {
      bg: "#020810", fg: "#8AAFC0",
      accent1: "#3D7A8A", accent2: "#2C5F78", accent3: "#2E6070",
      iconColor: "#122830", iconHover: "#245060", activeBorder: "#3D7A8A",
    },
  },

  /* ── 6. TIDAL NOIR ────────────────────────────────────────────────
     Dark stormy ocean at night. Deep navy-black with muted steel-teal
     and soft silver-foam. Feels like waves under a moonless sky.
     Clean, moody, incredibly easy on the eyes.
  ──────────────────────────────────────────────────────────────────── */
  "tidal-noir": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",         foreground: "233040" },
      { token: "comment.block",   foreground: "233040" },
      { token: "string",          foreground: "5A8FA0" },
      { token: "string.escape",   foreground: "6AA0B0" },
      { token: "number",          foreground: "4A7888" },
      { token: "variable",        foreground: "98B8C8" },
      { token: "variable.name",   foreground: "98B8C8" },
      { token: "keyword",         foreground: "3E7080" },
      { token: "keyword.control", foreground: "3E7080" },
      { token: "type",            foreground: "345E6E" },
      { token: "type.identifier", foreground: "345E6E" },
      { token: "function",        foreground: "98B8C8" },
      { token: "operator",        foreground: "203040" },
      { token: "delimiter",       foreground: "182530" },
      { token: "tag",             foreground: "5A8FA0" },
      { token: "attribute.name",  foreground: "345E6E" },
    ],
    colors: {
      "editor.background":              "#050D16",
      "editor.foreground":              "#98B8C8",
      "editor.lineHighlightBackground": "#09141F",
      "editor.selectionBackground":     "#102030",
      "editor.inactiveSelectionBackground": "#0C1828",
      "editorLineNumber.foreground":    "#152535",
      "editorLineNumber.activeForeground": "#284858",
      "editorCursor.foreground":        "#5A8FA0",
      "editorGutter.background":        "#050D16",
      "editorWidget.background":        "#09141F",
      "editorSuggestWidget.background": "#09141F",
      "editorSuggestWidget.border":     "#102030",
      "scrollbar.shadow":               "#00000000",
      "scrollbarSlider.background":     "#102030",
      "scrollbarSlider.hoverBackground":"#162838",
    },
    ui: {
      bg: "#050D16", fg: "#98B8C8",
      accent1: "#5A8FA0", accent2: "#3E7080", accent3: "#4A7888",
      iconColor: "#182530", iconHover: "#345E6E", activeBorder: "#5A8FA0",
    },
  },

  /* ── 7. BIOLUMINESCENT ────────────────────────────────────────────
     Black ocean floor lit by living light. Near-pitch black with rare
     glowing teal that appears only where needed — like organisms
     glowing in the dark. Breathtaking contrast.
  ──────────────────────────────────────────────────────────────────── */
  "bioluminescent": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",         foreground: "142830" },
      { token: "comment.block",   foreground: "142830" },
      { token: "string",          foreground: "1E7868" },
      { token: "string.escape",   foreground: "258878" },
      { token: "number",          foreground: "186858" },
      { token: "variable",        foreground: "7AB8B0" },
      { token: "variable.name",   foreground: "7AB8B0" },
      { token: "keyword",         foreground: "166058" },
      { token: "keyword.control", foreground: "166058" },
      { token: "type",            foreground: "104848" },
      { token: "type.identifier", foreground: "104848" },
      { token: "function",        foreground: "7AB8B0" },
      { token: "operator",        foreground: "0E2828" },
      { token: "delimiter",       foreground: "0A2020" },
      { token: "tag",             foreground: "1E7868" },
      { token: "attribute.name",  foreground: "104848" },
    ],
    colors: {
      "editor.background":              "#010A08",
      "editor.foreground":              "#7AB8B0",
      "editor.lineHighlightBackground": "#040F0C",
      "editor.selectionBackground":     "#081E1A",
      "editor.inactiveSelectionBackground": "#061614",
      "editorLineNumber.foreground":    "#0A2020",
      "editorLineNumber.activeForeground": "#184040",
      "editorCursor.foreground":        "#1E7868",
      "editorGutter.background":        "#010A08",
      "editorWidget.background":        "#040F0C",
      "editorSuggestWidget.background": "#040F0C",
      "editorSuggestWidget.border":     "#081E1A",
      "scrollbar.shadow":               "#00000000",
      "scrollbarSlider.background":     "#081E1A",
      "scrollbarSlider.hoverBackground":"#0E2828",
    },
    ui: {
      bg: "#010A08", fg: "#7AB8B0",
      accent1: "#1E7868", accent2: "#166058", accent3: "#186858",
      iconColor: "#0A2020", iconHover: "#104848", activeBorder: "#1E7868",
    },
  },

  /* ── 8. VOID BLACK ────────────────────────────────────────────────
     Pure black. No tint, no hue, nothing. Editor background is #000,
     UI is #0a0a0a. Text is a clean off-white. Accents are a single
     neutral grey — reserved only for active states. The rawest,
     most focused theme possible. Just you and the code.
  ──────────────────────────────────────────────────────────────────── */
  "void-black": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",         foreground: "303030" },
      { token: "comment.block",   foreground: "303030" },
      { token: "string",          foreground: "858585" },
      { token: "string.escape",   foreground: "959595" },
      { token: "number",          foreground: "787878" },
      { token: "variable",        foreground: "C0C0C0" },
      { token: "variable.name",   foreground: "C0C0C0" },
      { token: "keyword",         foreground: "707070" },
      { token: "keyword.control", foreground: "707070" },
      { token: "type",            foreground: "606060" },
      { token: "type.identifier", foreground: "606060" },
      { token: "function",        foreground: "C0C0C0" },
      { token: "operator",        foreground: "3A3A3A" },
      { token: "delimiter",       foreground: "282828" },
      { token: "tag",             foreground: "858585" },
      { token: "attribute.name",  foreground: "606060" },
    ],
    colors: {
      "editor.background":              "#000000",
      "editor.foreground":              "#C0C0C0",
      "editor.lineHighlightBackground": "#0A0A0A",
      "editor.selectionBackground":     "#1C1C1C",
      "editor.inactiveSelectionBackground": "#141414",
      "editorLineNumber.foreground":    "#242424",
      "editorLineNumber.activeForeground": "#505050",
      "editorCursor.foreground":        "#909090",
      "editorGutter.background":        "#000000",
      "editorWidget.background":        "#0A0A0A",
      "editorSuggestWidget.background": "#0A0A0A",
      "editorSuggestWidget.border":     "#1C1C1C",
      "scrollbar.shadow":               "#00000000",
      "scrollbarSlider.background":     "#1C1C1C",
      "scrollbarSlider.hoverBackground":"#282828",
    },
    ui: {
      bg: "#000000", fg: "#C0C0C0",
      accent1: "#707070", accent2: "#606060", accent3: "#787878",
      iconColor: "#282828", iconHover: "#505050", activeBorder: "#707070",
    },
  },

  /* ── 9. SYNTHWAVE '84 ─────────────────────────────────────────────
     Neon-soaked retro future. Deep purple-black base lit by hot pink,
     electric cyan, and acid yellow. Every token pops like a laser grid.
     The most vibrant, energetic theme in the set. Pure 80s fever dream.
  ──────────────────────────────────────────────────────────────────── */
  "synthwave-84": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",         foreground: "3D2A50" },
      { token: "comment.block",   foreground: "3D2A50" },
      { token: "string",          foreground: "FF6AC1" },
      { token: "string.escape",   foreground: "FF90D0" },
      { token: "number",          foreground: "F6F080" },
      { token: "variable",        foreground: "E2D9F3" },
      { token: "variable.name",   foreground: "E2D9F3" },
      { token: "keyword",         foreground: "FF7EDB" },
      { token: "keyword.control", foreground: "FF7EDB" },
      { token: "type",            foreground: "36F9F6" },
      { token: "type.identifier", foreground: "36F9F6" },
      { token: "function",        foreground: "72F1B8" },
      { token: "operator",        foreground: "FF7EDB" },
      { token: "delimiter",       foreground: "5C4B7A" },
      { token: "tag",             foreground: "FF6AC1" },
      { token: "attribute.name",  foreground: "36F9F6" },
    ],
    colors: {
      "editor.background":              "#1A0830",
      "editor.foreground":              "#E2D9F3",
      "editor.lineHighlightBackground": "#220A3C",
      "editor.selectionBackground":     "#3D1A6E",
      "editor.inactiveSelectionBackground": "#2E1255",
      "editorLineNumber.foreground":    "#3D2A50",
      "editorLineNumber.activeForeground": "#7A4A9A",
      "editorCursor.foreground":        "#FF7EDB",
      "editorGutter.background":        "#1A0830",
      "editorWidget.background":        "#220A3C",
      "editorSuggestWidget.background": "#220A3C",
      "editorSuggestWidget.border":     "#3D1A6E",
      "scrollbar.shadow":               "#00000000",
      "scrollbarSlider.background":     "#3D1A6E",
      "scrollbarSlider.hoverBackground":"#52258A",
    },
    ui: {
      bg: "#1A0830", fg: "#E2D9F3",
      accent1: "#FF7EDB", accent2: "#36F9F6", accent3: "#F6F080",
      iconColor: "#3D2A50", iconHover: "#7A4A9A", activeBorder: "#FF7EDB",
    },
  },

  /* ── 10. FOREST MIST ─────────────────────────────────────────────
     Ancient woodland at dawn. Deep moss-black with sage greens and
     muted golden amber. Feels like dew on bark and the smell of rain.
     Organic, calm, alive. The most grounding theme to code in.
  ──────────────────────────────────────────────────────────────────── */
  "forest-mist": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",         foreground: "2A3A28" },
      { token: "comment.block",   foreground: "2A3A28" },
      { token: "string",          foreground: "7AAB6A" },
      { token: "string.escape",   foreground: "8ABF78" },
      { token: "number",          foreground: "C8A85A" },
      { token: "variable",        foreground: "B8CABB" },
      { token: "variable.name",   foreground: "B8CABB" },
      { token: "keyword",         foreground: "5A8A50" },
      { token: "keyword.control", foreground: "5A8A50" },
      { token: "type",            foreground: "8A9E60" },
      { token: "type.identifier", foreground: "8A9E60" },
      { token: "function",        foreground: "B8CABB" },
      { token: "operator",        foreground: "3A5038" },
      { token: "delimiter",       foreground: "2A3C28" },
      { token: "tag",             foreground: "7AAB6A" },
      { token: "attribute.name",  foreground: "8A9E60" },
    ],
    colors: {
      "editor.background":              "#0C1208",
      "editor.foreground":              "#B8CABB",
      "editor.lineHighlightBackground": "#111A0D",
      "editor.selectionBackground":     "#1E3018",
      "editor.inactiveSelectionBackground": "#182A12",
      "editorLineNumber.foreground":    "#243820",
      "editorLineNumber.activeForeground": "#4A6A40",
      "editorCursor.foreground":        "#7AAB6A",
      "editorGutter.background":        "#0C1208",
      "editorWidget.background":        "#111A0D",
      "editorSuggestWidget.background": "#111A0D",
      "editorSuggestWidget.border":     "#1E3018",
      "scrollbar.shadow":               "#00000000",
      "scrollbarSlider.background":     "#1E3018",
      "scrollbarSlider.hoverBackground":"#283E20",
    },
    ui: {
      bg: "#0C1208", fg: "#B8CABB",
      accent1: "#7AAB6A", accent2: "#5A8A50", accent3: "#C8A85A",
      iconColor: "#2A3C28", iconHover: "#4A6A40", activeBorder: "#7AAB6A",
    },
  },

  /* ── 11. COPPER CIRCUIT ──────────────────────────────────────────
     Industrial dark steel with warm copper-bronze traces. Feels like
     looking at a PCB through a loupe — deep charcoal, copper veins,
     orange-amber glow at active points. Technical, tactile, unique.
  ──────────────────────────────────────────────────────────────────── */
  "copper-circuit": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",         foreground: "3A2C1A" },
      { token: "comment.block",   foreground: "3A2C1A" },
      { token: "string",          foreground: "C87A3A" },
      { token: "string.escape",   foreground: "E08A50" },
      { token: "number",          foreground: "D4943A" },
      { token: "variable",        foreground: "C8B49A" },
      { token: "variable.name",   foreground: "C8B49A" },
      { token: "keyword",         foreground: "A0622A" },
      { token: "keyword.control", foreground: "A0622A" },
      { token: "type",            foreground: "887050" },
      { token: "type.identifier", foreground: "887050" },
      { token: "function",        foreground: "C8B49A" },
      { token: "operator",        foreground: "584030" },
      { token: "delimiter",       foreground: "402E1E" },
      { token: "tag",             foreground: "C87A3A" },
      { token: "attribute.name",  foreground: "887050" },
    ],
    colors: {
      "editor.background":              "#0F0A04",
      "editor.foreground":              "#C8B49A",
      "editor.lineHighlightBackground": "#160E06",
      "editor.selectionBackground":     "#2E1E08",
      "editor.inactiveSelectionBackground": "#221606",
      "editorLineNumber.foreground":    "#382410",
      "editorLineNumber.activeForeground": "#6A4820",
      "editorCursor.foreground":        "#C87A3A",
      "editorGutter.background":        "#0F0A04",
      "editorWidget.background":        "#160E06",
      "editorSuggestWidget.background": "#160E06",
      "editorSuggestWidget.border":     "#2E1E08",
      "scrollbar.shadow":               "#00000000",
      "scrollbarSlider.background":     "#2E1E08",
      "scrollbarSlider.hoverBackground":"#3E2A0C",
    },
    ui: {
      bg: "#0F0A04", fg: "#C8B49A",
      accent1: "#C87A3A", accent2: "#A0622A", accent3: "#D4943A",
      iconColor: "#382410", iconHover: "#6A4820", activeBorder: "#C87A3A",
    },
  },

  /* ── 12. ARCTIC ICE ──────────────────────────────────────────────
     Polar white-blue darkness. Near-black navy with crisp ice-blue
     and cold silver. Like coding in a glacier — crystal sharp,
     hyper-clean, and almost painfully beautiful. Zero warm tones.
  ──────────────────────────────────────────────────────────────────── */
  "arctic-ice": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",         foreground: "1C2A38" },
      { token: "comment.block",   foreground: "1C2A38" },
      { token: "string",          foreground: "88D4F0" },
      { token: "string.escape",   foreground: "A8E4FF" },
      { token: "number",          foreground: "60C0E8" },
      { token: "variable",        foreground: "C8E4F0" },
      { token: "variable.name",   foreground: "C8E4F0" },
      { token: "keyword",         foreground: "50A8D8" },
      { token: "keyword.control", foreground: "50A8D8" },
      { token: "type",            foreground: "4090B8" },
      { token: "type.identifier", foreground: "4090B8" },
      { token: "function",        foreground: "C8E4F0" },
      { token: "operator",        foreground: "2A4A60" },
      { token: "delimiter",       foreground: "1C3848" },
      { token: "tag",             foreground: "88D4F0" },
      { token: "attribute.name",  foreground: "4090B8" },
    ],
    colors: {
      "editor.background":              "#060E18",
      "editor.foreground":              "#C8E4F0",
      "editor.lineHighlightBackground": "#0A1522",
      "editor.selectionBackground":     "#142A40",
      "editor.inactiveSelectionBackground": "#0E2030",
      "editorLineNumber.foreground":    "#182E42",
      "editorLineNumber.activeForeground": "#2E5878",
      "editorCursor.foreground":        "#88D4F0",
      "editorGutter.background":        "#060E18",
      "editorWidget.background":        "#0A1522",
      "editorSuggestWidget.background": "#0A1522",
      "editorSuggestWidget.border":     "#142A40",
      "scrollbar.shadow":               "#00000000",
      "scrollbarSlider.background":     "#142A40",
      "scrollbarSlider.hoverBackground":"#1C3850",
    },
    ui: {
      bg: "#060E18", fg: "#C8E4F0",
      accent1: "#88D4F0", accent2: "#50A8D8", accent3: "#60C0E8",
      iconColor: "#182E42", iconHover: "#2E5878", activeBorder: "#88D4F0",
    },
  },

  /* ── 13. CRIMSON DUSK ────────────────────────────────────────────
     The last light of a dying sun. Deep charcoal-black sky, burning
     crimson horizon, and dusty mauve twilight. Dramatic. Cinematic.
     Feels like the best sunset you've ever watched while writing code.
  ──────────────────────────────────────────────────────────────────── */
  "crimson-dusk": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",         foreground: "3A1A1A" },
      { token: "comment.block",   foreground: "3A1A1A" },
      { token: "string",          foreground: "E05A5A" },
      { token: "string.escape",   foreground: "F07070" },
      { token: "number",          foreground: "E8884A" },
      { token: "variable",        foreground: "D4B8B8" },
      { token: "variable.name",   foreground: "D4B8B8" },
      { token: "keyword",         foreground: "C03A3A" },
      { token: "keyword.control", foreground: "C03A3A" },
      { token: "type",            foreground: "A05858" },
      { token: "type.identifier", foreground: "A05858" },
      { token: "function",        foreground: "D4B8B8" },
      { token: "operator",        foreground: "602828" },
      { token: "delimiter",       foreground: "481E1E" },
      { token: "tag",             foreground: "E05A5A" },
      { token: "attribute.name",  foreground: "A05858" },
    ],
    colors: {
      "editor.background":              "#100808",
      "editor.foreground":              "#D4B8B8",
      "editor.lineHighlightBackground": "#180C0C",
      "editor.selectionBackground":     "#341010",
      "editor.inactiveSelectionBackground": "#260C0C",
      "editorLineNumber.foreground":    "#3A1818",
      "editorLineNumber.activeForeground": "#703030",
      "editorCursor.foreground":        "#E05A5A",
      "editorGutter.background":        "#100808",
      "editorWidget.background":        "#180C0C",
      "editorSuggestWidget.background": "#180C0C",
      "editorSuggestWidget.border":     "#341010",
      "scrollbar.shadow":               "#00000000",
      "scrollbarSlider.background":     "#341010",
      "scrollbarSlider.hoverBackground":"#441818",
    },
    ui: {
      bg: "#100808", fg: "#D4B8B8",
      accent1: "#E05A5A", accent2: "#C03A3A", accent3: "#E8884A",
      iconColor: "#3A1818", iconHover: "#703030", activeBorder: "#E05A5A",
    },
  },

};

function registerCustomThemes(monaco) {
  Object.entries(CUSTOM_THEMES).forEach(([themeName, themeData]) => {
    monaco.editor.defineTheme(themeName, themeData);
  });
}

function applyThemeGlobally(themeName) {
  const themeData = CUSTOM_THEMES[themeName];
  if (themeData && themeData.ui) {
    const { bg, fg, accent1, accent2, accent3 } = themeData.ui;
    document.documentElement.style.setProperty("--bg-primary", bg);
    document.documentElement.style.setProperty("--fg-primary", fg);
    document.documentElement.style.setProperty("--accent-1", accent1);
    document.documentElement.style.setProperty("--accent-2", accent2);
    document.documentElement.style.setProperty("--accent-3", accent3);
    
    // Calculate darker/lighter variants
    const bgSecondary = adjustBrightness(bg, -15);
    const bgTertiary = adjustBrightness(bg, 8);
    const borderColor = adjustBrightness(bg, 20);
    const fgSecondary = adjustBrightness(fg, -40);
    
    document.documentElement.style.setProperty("--bg-secondary", bgSecondary);
    document.documentElement.style.setProperty("--bg-tertiary", bgTertiary);
    document.documentElement.style.setProperty("--border-color", borderColor);
    document.documentElement.style.setProperty("--fg-secondary", fgSecondary);
    
    // Inject dynamic stylesheet to override ALL hardcoded colors
    injectThemeStylesheet(bg, bgSecondary, bgTertiary, borderColor, fg, fgSecondary, accent1, accent2, accent3);
  }
}

function injectThemeStylesheet(bg, bgSecondary, bgTertiary, borderColor, fg, fgSecondary, accent1, accent2, accent3) {
  // Remove old injected stylesheet if it exists
  const oldStyle = document.getElementById("theme-override-styles");
  if (oldStyle) oldStyle.remove();
  
  const fg2 = adjustBrightness(fg, -60);
  const fg3 = adjustBrightness(fg, -55);
  
  const style = document.createElement("style");
  style.id = "theme-override-styles";
  style.textContent = `
    /* ═════════════════════════════════════════════════════════════════
       MAXIMUM THEME OVERRIDE - Applied to entire document
    ═════════════════════════════════════════════════════════════════ */
    
    *, *::before, *::after { 
      transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease !important;
    }
    
    /* ROOT & BODY */
    html, body, #root { 
      background: linear-gradient(135deg, ${bg}, ${bgSecondary}) !important; 
      color: ${fg} !important;
    }
    
    /* ALL DIVS - Base styling */
    div { background-color: inherit; color: inherit; }
    
    /* ═════════════════════════════════════════════════════════════════
       BACKGROUND COLOR OVERRIDES
    ═════════════════════════════════════════════════════════════════ */
    
    /* Secondary backgrounds */
    [style*="background:#0a0a0a"], [style*="background: #0a0a0a"],
    [style*="background:#080808"], [style*="background: #080808"],
    [style*="background:#0c0c0c"], [style*="background: #0c0c0c"] { 
      background-color: ${bgSecondary} !important; 
    }
    
    /* Primary backgrounds */
    [style*="background:#0f0f0f"], [style*="background: #0f0f0f"],
    [style*="background:#1a0a0a"], [style*="background: #1a0a0a"] { 
      background-color: ${bg} !important; 
    }
    
    /* Tertiary backgrounds */
    [style*="background:#1a1a1a"], [style*="background: #1a1a1a"],
    [style*="background:#1e1e1e"], [style*="background: #1e1e1e"],
    [style*="background:#1d1f21"], [style*="background: #1d1f21"],
    [style*="background:#21222c"], [style*="background: #21222c"],
    [style*="background:#282828"], [style*="background: #282828"],
    [style*="background:#21252b"], [style*="background: #21252b"],
    [style*="background:#252525"], [style*="background: #252525"] { 
      background-color: ${bgTertiary} !important; 
    }
    
    /* Border/separator backgrounds */
    [style*="background:#141414"], [style*="background: #141414"],
    [style*="background:#111"], [style*="background: #111"],
    [style*="background:#181818"], [style*="background: #181818"],
    [style*="background:#1a1a1a"], [style*="background: #1a1a1a"],
    [style*="background:#0a1a0a"], [style*="background: #0a1a0a"],
    [style*="background:#1a0808"], [style*="background: #1a0808"] { 
      background-color: ${borderColor} !important; 
    }
    
    /* ═════════════════════════════════════════════════════════════════
       TEXT COLOR OVERRIDES
    ═════════════════════════════════════════════════════════════════ */
    
    /* Primary text colors */
    [style*="color:#e5e5e5"], [style*="color: #e5e5e5"],
    [style*="color:#d4d4d4"], [style*="color: #d4d4d4"],
    [style*="color:#c4c4c4"], [style*="color: #c4c4c4"],
    [style*="color:#c5c8c6"], [style*="color: #c5c8c6"],
    [style*="color:#f8f8f2"], [style*="color: #f8f8f2"],
    [style*="color:#abb2bf"], [style*="color: #abb2bf"],
    [style*="color:#aaa"], [style*="color: #aaa"],
    [style*="color:#c4c4c4"], [style*="color: #c4c4c4"] { 
      color: ${fg} !important; 
    }
    
    /* Secondary text colors */
    [style*="color:#666"], [style*="color: #666"],
    [style*="color:#555"], [style*="color: #555"],
    [style*="color:#484848"], [style*="color: #484848"],
    [style*="color:#303030"], [style*="color: #303030"],
    [style*="color:#444"], [style*="color: #444"],
    [style*="color:#888"], [style*="color: #888"],
    [style*="color:#56595c"], [style*="color: #56595c"],
    [style*="color:#7f8c8d"], [style*="color: #7f8c8d"],
    [style*="color:#90908a"], [style*="color: #90908a"] { 
      color: ${fgSecondary} !important; 
    }
    
    /* Tertiary text colors */
    [style*="color:#3a3a3a"], [style*="color: #3a3a3a"],
    [style*="color:#3b3b3b"], [style*="color: #3b3b3b"] { 
      color: ${fg3} !important; 
    }
    
    /* Dark text colors */
    [style*="color:#2a2a2a"], [style*="color: #2a2a2a"],
    [style*="color:#1a1a1a"], [style*="color: #1a1a1a"] { 
      color: ${fg2} !important; 
    }
    
    /* ═════════════════════════════════════════════════════════════════
       BORDER COLOR OVERRIDES
    ═════════════════════════════════════════════════════════════════ */
    
    [style*="border:#181818"], [style*="border: #181818"],
    [style*="border:#1a1a1a"], [style*="border: #1a1a1a"],
    [style*="border:#141414"], [style*="border: #141414"],
    [style*="border-color:#181818"], [style*="border-color: #181818"],
    [style*="border-color:#1a1a1a"], [style*="border-color: #1a1a1a"],
    [style*="border-color:#141414"], [style*="border-color: #141414"] { 
      border-color: ${borderColor} !important; 
    }
    
    /* ═════════════════════════════════════════════════════════════════
       UNIVERSAL ELEMENT STYLING
    ═════════════════════════════════════════════════════════════════ */
    
    /* All buttons - only set color, don't override backgrounds that are intentionally styled */
    button {
      color: ${fg} !important;
    }
    
    button:hover {
      border-color: ${borderColor} !important;
    }
    
    /* All inputs */
    input, textarea, select {
      background-color: ${bgTertiary} !important;
      color: ${fg} !important;
      border-color: ${borderColor} !important;
      caret-color: ${accent1} !important;
    }
    
    input:focus, textarea:focus, select:focus {
      border-color: ${accent1} !important;
      background-color: ${bgTertiary} !important;
    }
    
    /* All text */
    p, span, label, h1, h2, h3, h4, h5, h6 {
      color: ${fg} !important;
    }
    
    /* ═════════════════════════════════════════════════════════════════
       MONACO EDITOR
    ═════════════════════════════════════════════════════════════════ */
    
    .monaco-editor {
      background-color: ${bg} !important;
      color: ${fg} !important;
    }
    
    .monaco-editor-background {
      background-color: ${bg} !important;
    }
    
    .monaco-scroll-decoration {
      background: linear-gradient(135deg, ${bg}, ${bgSecondary}) !important;
    }
    
    /* ═════════════════════════════════════════════════════════════════
       SCROLLBARS
    ═════════════════════════════════════════════════════════════════ */
    
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: ${bgSecondary} !important;
    }
    
    ::-webkit-scrollbar-thumb {
      background: ${borderColor} !important;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: ${fgSecondary} !important;
    }
    
    /* ═════════════════════════════════════════════════════════════════
       GRADIENT OVERRIDES — only root background, not buttons/icons
    ═════════════════════════════════════════════════════════════════ */
    
    html, body, #root {
      background: ${bg} !important;
    }
  `;
  document.head.appendChild(style);
}

function adjustBrightness(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return "#" + (0x1000000 + (R * 0x10000) + (G * 0x100) + B).toString(16).slice(1);
}

/* ─────────────────────────────────────────────────────────────────
   AUTH CONTEXT
───────────────────────────────────────────────────────────────── */
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params     = new URLSearchParams(window.location.search);
    const oauthToken = params.get("oauthToken");
    const oauthUser  = params.get("oauthUser");
    const authError  = params.get("authError");

    if (oauthToken || authError) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (authError) {
      sessionStorage.setItem("authError", authError);
      setLoading(false);
      return;
    }

    if (oauthToken && oauthUser) {
      try {
        const parsed = JSON.parse(decodeURIComponent(oauthUser));
        localStorage.setItem("cide_token", oauthToken);
        setToken(oauthToken);
        setUser(parsed);
      } catch (_) {}
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem("cide_token");
    if (!stored) { setLoading(false); return; }

    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) { setToken(stored); setUser(d.user); }
        else        { localStorage.removeItem("cide_token"); }
      })
      .catch(() => localStorage.removeItem("cide_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((tok, usr) => {
    localStorage.setItem("cide_token", tok);
    setToken(tok);
    setUser(usr);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cide_token");
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(u => ({ ...u, ...updates }));
  }, []);

  const apiFetch = useCallback(
    (url, opts = {}) => {
      const tok = localStorage.getItem("cide_token");
      return fetch(`${API_URL}${url}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
          ...opts.headers,
        },
      });
    },
    []
  );

  return (
    <AuthCtx.Provider value={{ user, token, loading, login, logout, updateUser, apiFetch }}>
      {children}
    </AuthCtx.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SIMPLE ROUTER
───────────────────────────────────────────────────────────────── */
function useRoute() {
  const [route, setRoute] = useState(() => {
    const p = window.location.pathname;
    if (p === "/verify-email")   return "verify-email";
    if (p === "/reset-password") return "reset-password";
    return "signin";
  });

  const navigate = useCallback((r) => {
    const pathMap = {
      "signin":         "/",
      "signup":         "/",
      "forgot":         "/",
      "verify-email":   "/verify-email",
      "reset-password": "/reset-password",
    };
    window.history.pushState({}, "", pathMap[r] || "/");
    setRoute(r);
  }, []);

  return { route, navigate };
}

/* ─────────────────────────────────────────────────────────────────
   SHARED UI ATOMS
───────────────────────────────────────────────────────────────── */
const T = {
  root:  { fontFamily:"'Geist',sans-serif",minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden" },
  grid:  { position:"fixed",inset:0,backgroundImage:"radial-gradient(circle,#1c1c1c 1px,transparent 1px)",backgroundSize:"24px 24px",pointerEvents:"none" },
  glow1: { position:"fixed",top:"15%",left:"50%",transform:"translateX(-50%)",width:600,height:400,background:"radial-gradient(ellipse,rgba(59,130,246,0.055) 0%,transparent 70%)",pointerEvents:"none" },
  glow2: { position:"fixed",bottom:"5%",right:"10%",width:500,height:400,background:"radial-gradient(ellipse,rgba(168,139,250,0.04) 0%,transparent 70%)",pointerEvents:"none" },
  card:  { width:440,background:"#0f0f0f",border:"1px solid #1e1e1e",borderRadius:14,padding:"32px 36px",boxShadow:"0 28px 80px rgba(0,0,0,0.65)" },
  input: { width:"100%",boxSizing:"border-box",background:"#080808",border:"1px solid #1e1e1e",borderRadius:8,padding:"0 14px",height:44,color:"#d4d4d4",fontSize:13,fontFamily:"'Geist',sans-serif",outline:"none",transition:"border-color 0.15s" },
  btn:   { width:"100%",height:44,border:"none",borderRadius:8,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"opacity 0.15s" },
  label: { display:"block",fontSize:11,fontWeight:500,color:"#555",marginBottom:6,letterSpacing:0.1 },
  link:  { background:"none",border:"none",color:"#666",fontSize:12,cursor:"pointer",fontFamily:"'Geist',sans-serif",textDecoration:"underline",textUnderlineOffset:2,padding:0 },
  sep:   { display:"flex",alignItems:"center",gap:12,color:"#252525",fontSize:11,margin:"20px 0" },
  oBtn:  { flex:1,height:40,background:"#111",border:"1px solid #1e1e1e",borderRadius:8,color:"#666",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"border-color 0.15s" },
};

function BgShell({ children }) {
  return (
    <div style={T.root}>
      <div style={T.grid}/><div style={T.glow1}/><div style={T.glow2}/>
      <div style={{ position:"relative",zIndex:1,padding:20,width:"100%" }}>
        {children}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input::placeholder{color:#252525;}
        input:focus{border-color:#2e2e2e !important;}
        input:focus,button:focus{outline:none;}
        button:hover{opacity:0.85;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>
    </div>
  );
}

function Logo({ subtitle = "Professional Edition" }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:30 }}>
      <div style={{ width:36,height:36,borderRadius:9,background:"#111",border:"1px solid #1e1e1e",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <FaCode size={14} color="#e5e5e5"/>
      </div>
      <div>
        <div style={{ fontSize:16,fontWeight:700,color:"#e5e5e5",letterSpacing:-0.3 }}>CloudIDE</div>
        <div style={{ fontSize:10,color:"#333" }}>{subtitle}</div>
      </div>
    </div>
  );
}

function Flash({ type = "error", children }) {
  if (!children) return null;
  const cfg = {
    error:   { bg:"#190a0a", border:"#3d1414", color:"#fca5a5" },
    success: { bg:"#091509", border:"#14401a", color:"#86efac" },
    info:    { bg:"#080e19", border:"#1a2e50", color:"#93c5fd" },
    warning: { bg:"#190e05", border:"#3d2810", color:"#fcd34d" },
  }[type] || { bg:"#190a0a", border:"#3d1414", color:"#fca5a5" };
  return (
    <div style={{ background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:8,padding:"11px 14px",marginBottom:18,fontSize:12,color:cfg.color,lineHeight:1.65,display:"flex",gap:8,alignItems:"flex-start" }}>
      {type === "error"   && <FaExclamationTriangle size={12} style={{ flexShrink:0,marginTop:1 }}/>}
      {type === "success" && <FaCheckCircle          size={12} style={{ flexShrink:0,marginTop:1 }}/>}
      <span>{children}</span>
    </div>
  );
}

function Spinner() {
  return <div style={{ width:15,height:15,border:"2px solid rgba(0,0,0,0.2)",borderTopColor:"#080808",borderRadius:"50%",animation:"spin 0.6s linear infinite" }}/>;
}

function PasswordInput({ value, onChange, placeholder = "••••••••", onKeyDown }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{ ...T.input, paddingRight:44 }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#444",display:"flex",padding:2 }}
      >
        {show ? <FaEyeSlash size={13}/> : <FaEye size={13}/>}
      </button>
    </div>
  );
}

function OAuthButtons() {
  return (
    <>
      <div style={T.sep}>
        <div style={{ flex:1,height:1,background:"#1a1a1a" }}/>
        <span>or continue with</span>
        <div style={{ flex:1,height:1,background:"#1a1a1a" }}/>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        <button style={T.oBtn} onClick={() => window.location.href = `${API_URL}/auth/google`}>
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path fill="#ea4335" d="M5.27 9.76A7.08 7.08 0 0 1 19.05 10.8h-6.51V13.5h9.26A9.84 9.84 0 1 1 4.63 7.04l.64 2.72z"/>
            <path fill="#4285f4" d="M5.27 9.76l-.64-2.72A9.84 9.84 0 0 0 2.15 12c0 1.62.39 3.14 1.07 4.49L6.3 14a7.05 7.05 0 0 1-.52-2c0-.76.14-1.49.38-2.18l.11-.06z"/>
            <path fill="#fbbc04" d="M12 4.92a7.04 7.04 0 0 1 4.72 1.82l3.51-3.5A9.82 9.82 0 0 0 12 2.08 9.84 9.84 0 0 0 4.63 7.04l3.64 2.72A7.08 7.08 0 0 1 12 4.92z"/>
            <path fill="#34a853" d="M12 19.08a7.08 7.08 0 0 1-5.72-2.91L3.22 18.53A9.84 9.84 0 0 0 12 21.92a9.82 9.82 0 0 0 8.23-4.42l-3.68-2.86A7.05 7.05 0 0 1 12 19.08z"/>
          </svg>
          Google
        </button>
        <button style={T.oBtn} onClick={() => window.location.href = `${API_URL}/auth/github`}>
          <FaGithub size={14} color="#aaa"/>
          GitHub
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   AUTH PAGES
───────────────────────────────────────────────────────────────── */
function SignIn({ navigate }) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(sessionStorage.getItem("authError") || "");
  const [info,     setInfo]     = useState("");

  useEffect(() => { sessionStorage.removeItem("authError"); }, []);

  const submit = async () => {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      const res  = await fetch(`${API_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.notVerified) {
          setError("");
          setInfo(`Email not verified. Check your inbox, or `);
          return;
        }
        setError(data.error || "Sign in failed.");
      } else {
        login(data.token, data.user);
      }
    } catch { setError("Cannot connect to server. Is it running?"); }
    setLoading(false);
  };

  const resend = async () => {
    if (!email) { setError("Enter your email first."); return; }
    await fetch(`${API_URL}/auth/resend-verification`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setInfo("");
    setError("");
    setInfo("✅ Verification email resent! Check your inbox.");
  };

  return (
    <BgShell>
      <div style={{ ...T.card, maxWidth:440, margin:"0 auto", animation:"fadeUp 0.35s ease" }}>
        <Logo/>
        <h2 style={{ margin:"0 0 4px",fontSize:22,fontWeight:700,color:"#e5e5e5",letterSpacing:-0.4 }}>Welcome back</h2>
        <p style={{ margin:"0 0 24px",fontSize:13,color:"#444" }}>Sign in to your workspace</p>

        <Flash type="error">{error}</Flash>
        {info && (
          <div style={{ background:"#080e19",border:"1px solid #1a2e50",borderRadius:8,padding:"11px 14px",marginBottom:18,fontSize:12,color:"#93c5fd",lineHeight:1.65 }}>
            {info}
            {info.includes("or ") && (
              <button onClick={resend} style={{ ...T.link, color:"#93c5fd", fontWeight:600 }}>resend verification email</button>
            )}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={T.label}>Email</label>
          <input style={T.input} type="email" value={email} placeholder="you@example.com"
            onChange={e => { setEmail(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()} autoFocus/>
        </div>

        <div style={{ marginBottom:22 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <label style={T.label}>Password</label>
            <button style={T.link} onClick={() => navigate("forgot")}>Forgot password?</button>
          </div>
          <PasswordInput
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
        </div>

        <button onClick={submit} disabled={loading || !email || !password}
          style={{ ...T.btn, background:"#e5e5e5", color:"#080808", opacity: (!email || !password) ? 0.4 : 1 }}>
          {loading ? <Spinner/> : <><FaBolt size={11}/> Sign In</>}
        </button>

        <OAuthButtons/>

        <p style={{ margin:"22px 0 0", textAlign:"center", fontSize:13, color:"#444" }}>
          No account?{" "}
          <button style={{ ...T.link, color:"#aaa", fontWeight:600 }} onClick={() => navigate("signup")}>
            Create one free
          </button>
        </p>
      </div>
    </BgShell>
  );
}

function SignUp({ navigate }) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);

  const strength = !password ? 0
    : password.length < 8  ? 1
    : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 3
    : 2;
  const strLabel = ["", "Weak", "Fair", "Strong"];
  const strColor = ["", "#ef4444", "#f59e0b", "#22c55e"];

  const submit = async () => {
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Sign up failed.");
      else         setDone(true);
    } catch { setError("Cannot connect to server. Is it running?"); }
    setLoading(false);
  };

  if (done) return (
    <BgShell>
      <div style={{ ...T.card, maxWidth:440, margin:"0 auto", textAlign:"center", animation:"fadeUp 0.35s ease" }}>
        <div style={{ width:64,height:64,borderRadius:"50%",background:"#091509",border:"1px solid #14401a",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px" }}>
          <FaEnvelope size={26} color="#22c55e"/>
        </div>
        <h2 style={{ color:"#e5e5e5", marginBottom:8, fontSize:20, fontWeight:700 }}>Check your inbox!</h2>
        <p style={{ color:"#555", lineHeight:1.75, marginBottom:28, fontSize:14 }}>
          We sent a verification link to <strong style={{ color:"#888" }}>{email}</strong>.
          Click it to activate your account, then sign in.
        </p>
        <button onClick={() => navigate("signin")} style={{ ...T.btn, background:"#1a1a1a", color:"#aaa", border:"1px solid #222" }}>
          <FaArrowLeft size={11}/> Back to Sign In
        </button>
      </div>
    </BgShell>
  );

  return (
    <BgShell>
      <div style={{ ...T.card, maxWidth:440, margin:"0 auto", animation:"fadeUp 0.35s ease" }}>
        <Logo/>
        <h2 style={{ margin:"0 0 4px",fontSize:22,fontWeight:700,color:"#e5e5e5",letterSpacing:-0.4 }}>Create your account</h2>
        <p style={{ margin:"0 0 24px",fontSize:13,color:"#444" }}>Start coding in the cloud — free</p>

        <Flash type="error">{error}</Flash>

        <div style={{ marginBottom:14 }}>
          <label style={T.label}>Full Name</label>
          <input style={T.input} value={name} placeholder="Jane Smith"
            onChange={e => { setName(e.target.value); setError(""); }} autoFocus/>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={T.label}>Email</label>
          <input style={T.input} type="email" value={email} placeholder="you@example.com"
            onChange={e => { setEmail(e.target.value); setError(""); }}/>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={T.label}>Password</label>
          <PasswordInput value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Min. 8 characters"/>
          {password && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:7 }}>
              <div style={{ flex:1, height:2, background:"#1a1a1a", borderRadius:1 }}>
                <div style={{ width:`${(strength/3)*100}%`, height:"100%", background:strColor[strength], borderRadius:1, transition:"all 0.3s" }}/>
              </div>
              <span style={{ fontSize:10, color:strColor[strength], fontWeight:700, minWidth:32 }}>{strLabel[strength]}</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={T.label}>Confirm Password</label>
          <input
            style={{ ...T.input, borderColor: confirm && confirm !== password ? "#ef4444" : "#1e1e1e" }}
            type="password" value={confirm} placeholder="Repeat password"
            onChange={e => { setConfirm(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
          {confirm && confirm !== password && (
            <div style={{ fontSize:11, color:"#ef4444", marginTop:5 }}>Passwords don't match</div>
          )}
        </div>

        <button onClick={submit} disabled={loading || !name || !email || !password || !confirm}
          style={{ ...T.btn, background:"#e5e5e5", color:"#080808", opacity:(!name||!email||!password||!confirm)?0.4:1 }}>
          {loading ? <Spinner/> : <><FaCheckCircle size={11}/> Create Account</>}
        </button>

        <OAuthButtons/>

        <p style={{ margin:"22px 0 0", textAlign:"center", fontSize:13, color:"#444" }}>
          Already have an account?{" "}
          <button style={{ ...T.link, color:"#aaa", fontWeight:600 }} onClick={() => navigate("signin")}>Sign in</button>
        </p>
      </div>
    </BgShell>
  );
}

function VerifyEmail({ navigate }) {
  const { login } = useAuth();
  const [status, setStatus] = useState("loading");
  const [msg,    setMsg]    = useState("");

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const token   = params.get("token");
    const userId  = params.get("userId");

    if (!token || !userId) {
      setStatus("error");
      setMsg("Invalid verification link — missing token or user ID.");
      return;
    }

    fetch(`${API_URL}/auth/verify-email`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.token) {
          login(d.token, d.user);
          setStatus("success");
        } else if (d.alreadyVerified) {
          setStatus("error");
          setMsg("Email already verified. Please sign in.");
        } else {
          setStatus("error");
          setMsg(d.error || "Verification failed.");
        }
      })
      .catch(() => { setStatus("error"); setMsg("Server error. Please try again."); });
  }, [login]);

  return (
    <BgShell>
      <div style={{ ...T.card, maxWidth:420, margin:"0 auto", textAlign:"center", animation:"fadeUp 0.35s ease" }}>
        {status === "loading" && (
          <>
            <div style={{ width:48,height:48,border:"3px solid #1a1a1a",borderTopColor:"#aaa",borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto 20px" }}/>
            <p style={{ color:"#555", fontSize:14 }}>Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ width:64,height:64,borderRadius:"50%",background:"#091509",border:"1px solid #14401a",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px" }}>
              <FaCheckCircle size={28} color="#22c55e"/>
            </div>
            <h2 style={{ color:"#e5e5e5", marginBottom:8, fontSize:20, fontWeight:700 }}>Email Verified!</h2>
            <p style={{ color:"#555", marginBottom:24, fontSize:14, lineHeight:1.7 }}>Your account is ready. Taking you to the IDE…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ width:64,height:64,borderRadius:"50%",background:"#190a0a",border:"1px solid #3d1414",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px" }}>
              <FaTimes size={26} color="#ef4444"/>
            </div>
            <h2 style={{ color:"#e5e5e5", marginBottom:8, fontSize:20, fontWeight:700 }}>Verification Failed</h2>
            <p style={{ color:"#f87171", marginBottom:24, fontSize:13, lineHeight:1.7 }}>{msg}</p>
            <button onClick={() => navigate("signin")} style={{ ...T.btn, background:"#1a1a1a", color:"#aaa", border:"1px solid #222" }}>
              <FaArrowLeft size={11}/> Back to Sign In
            </button>
          </>
        )}
      </div>
    </BgShell>
  );
}

function ForgotPassword({ navigate }) {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [sent,    setSent]    = useState(false);

  const submit = async () => {
    if (!email.trim()) { setError("Please enter your email."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong.");
      else         setSent(true);
    } catch { setError("Cannot connect to server."); }
    setLoading(false);
  };

  return (
    <BgShell>
      <div style={{ ...T.card, maxWidth:420, margin:"0 auto", animation:"fadeUp 0.35s ease" }}>
        <Logo/>
        <button onClick={() => navigate("signin")} style={{ ...T.link, display:"flex", alignItems:"center", gap:5, marginBottom:20, color:"#444" }}>
          <FaArrowLeft size={10}/> Back to Sign In
        </button>

        {!sent ? (
          <>
            <h2 style={{ margin:"0 0 6px",fontSize:21,fontWeight:700,color:"#e5e5e5" }}>Forgot password?</h2>
            <p style={{ margin:"0 0 24px",fontSize:13,color:"#444",lineHeight:1.65 }}>
              Enter the email for your account and we'll send a reset link.
            </p>
            <Flash type="error">{error}</Flash>
            <div style={{ marginBottom:20 }}>
              <label style={T.label}>Email</label>
              <input style={T.input} type="email" value={email} placeholder="you@example.com"
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && submit()} autoFocus/>
            </div>
            <button onClick={submit} disabled={loading || !email}
              style={{ ...T.btn, background:"#e5e5e5", color:"#080808", opacity:!email?0.4:1 }}>
              {loading ? <Spinner/> : <><FaEnvelope size={11}/> Send Reset Link</>}
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center", paddingTop:8 }}>
            <div style={{ width:64,height:64,borderRadius:"50%",background:"#091509",border:"1px solid #14401a",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px" }}>
              <FaEnvelope size={26} color="#22c55e"/>
            </div>
            <h2 style={{ color:"#e5e5e5", marginBottom:8, fontSize:20, fontWeight:700 }}>Check your inbox</h2>
            <p style={{ color:"#555", lineHeight:1.75, marginBottom:28, fontSize:13 }}>
              If an account exists for <strong style={{ color:"#888" }}>{email}</strong>,
              you'll receive a password reset link within a few minutes.
              Also check your spam folder.
            </p>
            <button onClick={() => navigate("signin")} style={{ ...T.btn, background:"#1a1a1a", color:"#aaa", border:"1px solid #222" }}>
              <FaArrowLeft size={11}/> Back to Sign In
            </button>
          </div>
        )}
      </div>
    </BgShell>
  );
}

function ResetPassword({ navigate }) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);

  const params  = new URLSearchParams(window.location.search);
  const token   = params.get("token");
  const userId  = params.get("userId");

  const submit = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Reset failed.");
      else         setDone(true);
    } catch { setError("Cannot connect to server."); }
    setLoading(false);
  };

  if (!token || !userId) return (
    <BgShell>
      <div style={{ ...T.card, maxWidth:420, margin:"0 auto", textAlign:"center" }}>
        <Flash type="error">Invalid reset link. Please request a new one.</Flash>
        <button onClick={() => navigate("forgot")} style={{ ...T.btn, background:"#1a1a1a", color:"#aaa", border:"1px solid #222", marginTop:8 }}>
          Request New Link
        </button>
      </div>
    </BgShell>
  );

  return (
    <BgShell>
      <div style={{ ...T.card, maxWidth:420, margin:"0 auto", animation:"fadeUp 0.35s ease" }}>
        <Logo/>
        {!done ? (
          <>
            <h2 style={{ margin:"0 0 6px",fontSize:21,fontWeight:700,color:"#e5e5e5" }}>Set a new password</h2>
            <p style={{ margin:"0 0 24px",fontSize:13,color:"#444" }}>Choose a strong password for your account.</p>
            <Flash type="error">{error}</Flash>
            <div style={{ marginBottom:14 }}>
              <label style={T.label}>New Password</label>
              <PasswordInput value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Min. 8 characters"/>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={T.label}>Confirm New Password</label>
              <input
                style={{ ...T.input, borderColor: confirm && confirm !== password ? "#ef4444" : "#1e1e1e" }}
                type="password" value={confirm} placeholder="Repeat password"
                onChange={e => { setConfirm(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && submit()}
              />
            </div>
            <button onClick={submit} disabled={loading || !password || !confirm}
              style={{ ...T.btn, background:"#e5e5e5", color:"#080808", opacity:(!password||!confirm)?0.4:1 }}>
              {loading ? <Spinner/> : <><FaLock size={11}/> Reset Password</>}
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center" }}>
            <div style={{ width:64,height:64,borderRadius:"50%",background:"#091509",border:"1px solid #14401a",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px" }}>
              <FaCheckCircle size={28} color="#22c55e"/>
            </div>
            <h2 style={{ color:"#e5e5e5", marginBottom:8, fontSize:20, fontWeight:700 }}>Password Reset!</h2>
            <p style={{ color:"#555", marginBottom:28, fontSize:14, lineHeight:1.7 }}>
              Your password has been changed. You can now sign in with your new password.
            </p>
            <button onClick={() => navigate("signin")} style={{ ...T.btn, background:"#e5e5e5", color:"#080808" }}>
              <FaBolt size={11}/> Sign In
            </button>
          </div>
        )}
      </div>
    </BgShell>
  );
}

/* ─────────────────────────────────────────────────────────────────
   IDE HELPERS
───────────────────────────────────────────────────────────────── */
function useTick(ms = 1000) {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), ms); return () => clearInterval(id); }, [ms]);
  return t;
}
function useAnimVal(target) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const id = setInterval(() => { cur.current += (target - cur.current) * 0.1; setV(Math.round(cur.current)); }, 50);
    return () => clearInterval(id);
  }, [target]);
  return v;
}
function Spark({ data, color }) {
  const W = 52, H = 22, min = Math.min(...data), range = (Math.max(...data) - min) || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 2)}`).join(" ");
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function MetricRow({ label, value, unit, color, data, pct }) {
  const anim = useAnimVal(value);
  return (
    <div style={{ padding:"9px 0",borderBottom:"1px solid #1a1a1a" }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
        <span style={{ fontSize:9,color:"#444",letterSpacing:0.8,textTransform:"uppercase",fontWeight:600 }}>{label}</span>
        <span style={{ fontSize:11,color,fontFamily:"'JetBrains Mono',monospace",fontWeight:600 }}>{anim}{unit}</span>
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:7 }}>
        <div style={{ flex:1,height:2,background:"#1a1a1a",borderRadius:1 }}>
          <div style={{ width:`${Math.min(pct,100)}%`,height:"100%",background:color,borderRadius:1,transition:"width 1.2s ease" }}/>
        </div>
        <Spark data={data} color={color}/>
      </div>
    </div>
  );
}
function FileIcon({ name, lang, size = 12 }) {
  if (lang && LANGS[lang]) { const I = LANGS[lang].icon; return <I size={size} color="#6a7280"/>; }
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext && EXT_TO_LANG[ext]) { const l = EXT_TO_LANG[ext]; const I = LANGS[l].icon; return <I size={size} color="#6a7280"/>; }
  return <FaFile size={size} color="#555"/>;
}

/* ─────────────────────────────────────────────────────────────────
   IMPROVED TOGGLE
───────────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: checked
          ? "linear-gradient(135deg, #22c55e, #16a34a)"
          : "#1a1a1a",
        border: `1px solid ${checked ? "#16a34a" : "#2a2a2a"}`,
        position: "relative", cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        padding: 0, flexShrink: 0,
        boxShadow: checked ? "0 0 12px rgba(34,197,94,0.3)" : "none",
      }}
    >
      <div style={{
        position: "absolute", top: 2, left: checked ? 19 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff",
        transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      }}/>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NUMBER INPUT WITH STEPPERS
───────────────────────────────────────────────────────────────── */
function NumInput({ value, onChange, min, max, step = 1 }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      background: "#0a0a0a",
      border: "1px solid #1e1e1e",
      borderRadius: 7,
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        style={{
          background: "transparent",
          border: "none",
          color: "#666",
          padding: "7px 10px",
          cursor: value <= min ? "not-allowed" : "pointer",
          fontSize: 12,
          opacity: value <= min ? 0.3 : 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        <FaMinus size={9}/>
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        style={{
          background: "transparent",
          border: "none",
          color: "#d4d4d4",
          fontSize: 12,
          padding: "7px 4px",
          outline: "none",
          width: 55,
          fontFamily: "'JetBrains Mono',monospace",
          textAlign: "center",
        }}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        style={{
          background: "transparent",
          border: "none",
          color: "#666",
          padding: "7px 10px",
          cursor: value >= max ? "not-allowed" : "pointer",
          fontSize: 12,
          opacity: value >= max ? 0.3 : 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        <FaPlus size={9}/>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────────────────────────── */
const ToastCtx = createContext(null);
const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);

  const colors = {
    success: { bg: "#091509", border: "#14401a", color: "#86efac", icon: FaCheckCircle },
    error:   { bg: "#190a0a", border: "#3d1414", color: "#fca5a5", icon: FaExclamationTriangle },
    info:    { bg: "#080e19", border: "#1a2e50", color: "#93c5fd", icon: FaInfoCircle },
    warning: { bg: "#190e05", border: "#3d2810", color: "#fcd34d", icon: FaExclamationTriangle },
  };

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div style={{
        position: "fixed",
        bottom: 30,
        right: 30,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 9999,
        pointerEvents: "none",
      }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          const Icon = c.icon;
          return (
            <div key={t.id} style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              padding: "11px 16px",
              color: c.color,
              fontSize: 12,
              fontFamily: "'Geist',sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 9,
              minWidth: 260,
              maxWidth: 360,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              animation: "toastIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: "auto",
            }}>
              <Icon size={13} style={{ flexShrink: 0 }}/>
              <span style={{ lineHeight: 1.5 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COLLABORATIVE EDITING HOOK
───────────────────────────────────────────────────────────────── */
function useCollab({ token, activeFile, setFiles, activeId }) {
  const socketRef      = useRef(null);
  const changeLangRef  = useRef(null);
  const [roomId,       setRoomId]      = useState(null);
  const [collabUsers,  setCollabUsers] = useState([]);
  const [cursors,      setCursors]     = useState({});
  const isRemoteChange = useRef(false);

  const getSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;
    const s = socketIO(API_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = s;

    s.on("collab:state", ({ code, lang, users }) => {
      isRemoteChange.current = true;
      setFiles(fs => fs.map(f => f.id === activeId ? { ...f, code, lang, saved: false } : f));
      if (changeLangRef.current) changeLangRef.current(lang);
      setCollabUsers(users);
      isRemoteChange.current = false;
    });
    s.on("collab:users",  (users) => setCollabUsers(users));
    s.on("collab:code",   ({ code }) => {
      isRemoteChange.current = true;
      setFiles(fs => fs.map(f => f.id === activeId ? { ...f, code, saved: false } : f));
      isRemoteChange.current = false;
    });
    s.on("collab:lang", ({ lang }) => {
      isRemoteChange.current = true;
      if (changeLangRef.current) changeLangRef.current(lang);
      isRemoteChange.current = false;
    });
    s.on("collab:cursor", ({ socketId, line, column, user: cu }) => {
      setCursors(p => ({ ...p, [socketId]: { line, column, user: cu } }));
    });
    s.on("disconnect", () => { setCollabUsers([]); setCursors({}); setRoomId(null); });
    return s;
  }, [token, activeId, setFiles]);

  const joinRoom = useCallback((rid, code, lang) => {
    const s = getSocket();
    s.emit("collab:join", { roomId: rid, code, lang });
    setRoomId(rid);
    setCursors({});
  }, [getSocket]);

  const leaveRoom = useCallback(() => {
    if (!roomId) return;
    socketRef.current?.emit("collab:leave", { roomId });
    setRoomId(null);
    setCollabUsers([]);
    setCursors({});
  }, [roomId]);

  const emitCode = useCallback((code) => {
    if (!roomId || isRemoteChange.current) return;
    socketRef.current?.emit("collab:code", { roomId, code });
  }, [roomId]);

  const emitLang = useCallback((lang) => {
    if (!roomId || isRemoteChange.current) return;
    socketRef.current?.emit("collab:lang", { roomId, lang });
  }, [roomId]);

  const emitCursor = useCallback((line, column) => {
    if (!roomId) return;
    socketRef.current?.emit("collab:cursor", { roomId, line, column });
  }, [roomId]);

  useEffect(() => () => socketRef.current?.disconnect(), []);

  return { roomId, collabUsers, cursors, joinRoom, leaveRoom, emitCode, emitLang, emitCursor, isRemoteChange, changeLangRef };
}

/* ─────────────────────────────────────────────────────────────────
   PROFILE MODAL
───────────────────────────────────────────────────────────────── */
function ProfileModal({ onClose }) {
  const { user, updateUser, apiFetch, logout } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("profile");
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio]   = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: "", text: "" });

  const [uploading, setUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());

  const initials = user?.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "U";
  const avatarSrc = user?.avatar ? `${API_URL}/auth/avatar?token=${localStorage.getItem("cide_token")}&k=${avatarKey}` : null;

  const saveProfile = async () => {
    if (!name.trim()) { setMsg({ type: "error", text: "Name cannot be empty" }); return; }
    setSaving(true); setMsg({ type: "", text: "" });
    try {
      const res = await apiFetch("/auth/update-profile", {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), bio: bio.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: data.error || "Update failed" });
      } else {
        updateUser({ name: name.trim(), bio: bio.trim() });
        toast.show("Profile updated successfully", "success");
        setMsg({ type: "success", text: "✓ Profile updated successfully" });
        setTimeout(() => setMsg({ type: "", text: "" }), 3000);
      }
    } catch {
      setMsg({ type: "error", text: "Connection error. Please try again." });
    }
    setSaving(false);
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: "error", text: "Image must be under 2MB" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMsg({ type: "error", text: "Please select an image file" });
      return;
    }
    setUploading(true); setMsg({ type: "", text: "" });
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const tok = localStorage.getItem("cide_token");
      const res = await fetch(`${API_URL}/auth/upload-avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        updateUser({ avatar: data.avatar || true });
        setAvatarKey(Date.now());
        toast.show("Avatar updated successfully", "success");
        setMsg({ type: "success", text: "✓ Avatar updated successfully" });
        setTimeout(() => setMsg({ type: "", text: "" }), 3000);
      } else {
        setMsg({ type: "error", text: data.error || "Upload failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Upload failed. Please try again." });
    }
    setUploading(false);
    e.target.value = "";
  };

  const changePassword = async () => {
    if (!currentPwd || !newPwd) { setPwdMsg({ type: "error", text: "Please fill all fields" }); return; }
    if (newPwd.length < 8) { setPwdMsg({ type: "error", text: "New password must be at least 8 characters" }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ type: "error", text: "Passwords don't match" }); return; }
    setPwdSaving(true); setPwdMsg({ type: "", text: "" });
    try {
      const res = await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdMsg({ type: "error", text: data.error || "Password change failed" });
      } else {
        toast.show("Password changed successfully", "success");
        setPwdMsg({ type: "success", text: "✓ Password changed successfully" });
        setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
        setTimeout(() => setPwdMsg({ type: "", text: "" }), 3000);
      }
    } catch {
      setPwdMsg({ type: "error", text: "Connection error" });
    }
    setPwdSaving(false);
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ Are you absolutely sure?\n\nThis will permanently delete your account, all files, and all data. This cannot be undone."
    );
    if (!confirmed) return;
    const typed = window.prompt('Type "DELETE" (in capitals) to confirm:');
    if (typed !== "DELETE") return;
    try {
      const res = await apiFetch("/auth/delete-account", { method: "DELETE" });
      if (res.ok) {
        alert("Your account has been deleted.");
        logout();
      } else {
        const data = await res.json();
        setMsg({ type: "error", text: data.error || "Delete failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Connection error" });
    }
  };

  const tabs = [
    { id: "profile",  label: "Profile",  icon: FaUser },
    { id: "security", label: "Security", icon: FaShieldAlt },
    { id: "danger",   label: "Danger Zone", icon: FaExclamationTriangle },
  ];

  return (
    <div style={S.overlay} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...S.modal, width: 600, padding: 0, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg, #3b82f6, #1e40af)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <FaUser size={13} color="#fff"/>
            </div>
            <span style={{ fontSize:15, fontWeight:600, color:"#e5e5e5" }}>Account Settings</span>
          </div>
          <button onClick={onClose} style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:6, cursor:"pointer", color:"#888", display:"flex", padding:"7px" }}>
            <FaTimes size={11}/>
          </button>
        </div>

        <div style={{ display:"flex", borderBottom:"1px solid #1a1a1a", flexShrink: 0, background:"#0c0c0c" }}>
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex:1, background: tab===t.id ? "linear-gradient(180deg, rgba(59,130,246,0.08), transparent)" : "transparent", border:"none", padding:"13px 16px",
                color: tab===t.id ? "#e5e5e5" : "#555", fontSize:12, fontWeight:500,
                display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                cursor:"pointer", borderBottom: tab===t.id ? "2px solid #3b82f6" : "2px solid transparent",
                fontFamily:"'Geist',sans-serif", transition:"all 0.2s",
              }}>
                <Icon size={11}/>{t.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {tab === "profile" && (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:24 }}>
                <div style={{ position:"relative" }}>
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" referrerPolicy="no-referrer"
                      onError={e => { e.target.style.display="none"; }}
                      style={{ width:76, height:76, borderRadius:14, objectFit:"cover", border:"2px solid #1e1e1e" }}/>
                  ) : (
                    <div style={{ width:76, height:76, borderRadius:14, background:"linear-gradient(135deg, #1a1a1a, #0a0a0a)", border:"2px solid #1e1e1e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:700, color:"#666" }}>
                      {initials}
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    style={{ position:"absolute", bottom:-4, right:-4, width:28, height:28, borderRadius:"50%", background:"#3b82f6", border:"2px solid #0f0f0f", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", opacity:uploading?0.5:1, boxShadow:"0 4px 12px rgba(59,130,246,0.4)" }}>
                    {uploading ? <div style={{ width:10,height:10,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.6s linear infinite" }}/> : <FaCamera size={11}/>}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={uploadAvatar}/>
                </div>
                <div>
                  <div style={{ fontSize:17, fontWeight:600, color:"#e5e5e5", marginBottom:3 }}>{user?.name}</div>
                  <div style={{ fontSize:12, color:"#555", marginBottom:6 }}>{user?.email}</div>
                  <div style={{ fontSize:10, color:"#3a3a3a", textTransform:"capitalize", background:"#141414", display:"inline-block", padding:"3px 9px", borderRadius:5, border:"1px solid #1e1e1e" }}>
                    via {user?.provider || "email"}
                  </div>
                </div>
              </div>

              {msg.text && <Flash type={msg.type}>{msg.text}</Flash>}

              <div style={{ marginBottom:16 }}>
                <label style={{ ...T.label, color:"#666" }}>Display Name</label>
                <input style={T.input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name"/>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ ...T.label, color:"#666" }}>Email</label>
                <input style={{ ...T.input, opacity:0.5, cursor:"not-allowed" }} value={user?.email || ""} disabled/>
                <div style={{ fontSize:10, color:"#3a3a3a", marginTop:5 }}>Email cannot be changed</div>
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={{ ...T.label, color:"#666" }}>Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  maxLength={200}
                  style={{
                    width:"100%", boxSizing:"border-box", background:"#080808",
                    border:"1px solid #1e1e1e", borderRadius:8, padding:"10px 14px",
                    color:"#d4d4d4", fontSize:13, fontFamily:"'Geist',sans-serif",
                    outline:"none", resize:"vertical", minHeight:70,
                  }}
                />
                <div style={{ fontSize:10, color:"#3a3a3a", marginTop:5, textAlign:"right" }}>{bio.length}/200</div>
              </div>

              <button onClick={saveProfile} disabled={saving || !name.trim()}
                style={{ ...T.btn, height:42, background:"linear-gradient(135deg, #3b82f6, #2563eb)", color:"#fff", opacity:(!name.trim())?0.4:1, boxShadow:"0 4px 12px rgba(59,130,246,0.3)" }}>
                {saving ? <Spinner/> : <><FaSave size={11}/> Save Changes</>}
              </button>
            </div>
          )}

          {tab === "security" && (
            <div>
              <div style={{ fontSize:13, color:"#888", marginBottom:18, lineHeight:1.6 }}>
                Change your password to keep your account secure.
              </div>

              {user?.provider && user?.provider !== "email" && (
                <Flash type="warning">
                  Your account is linked via {user.provider}. Password change is only available for email accounts.
                </Flash>
              )}

              {pwdMsg.text && <Flash type={pwdMsg.type}>{pwdMsg.text}</Flash>}

              <div style={{ marginBottom:14 }}>
                <label style={{ ...T.label, color:"#666" }}>Current Password</label>
                <PasswordInput value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}/>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ ...T.label, color:"#666" }}>New Password</label>
                <PasswordInput value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 8 characters"/>
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={{ ...T.label, color:"#666" }}>Confirm New Password</label>
                <PasswordInput value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}/>
                {confirmPwd && confirmPwd !== newPwd && (
                  <div style={{ fontSize:11, color:"#ef4444", marginTop:5 }}>Passwords don't match</div>
                )}
              </div>

              <button onClick={changePassword} disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
                style={{ ...T.btn, height:42, background:"linear-gradient(135deg, #3b82f6, #2563eb)", color:"#fff", opacity:(!currentPwd || !newPwd || !confirmPwd)?0.4:1 }}>
                {pwdSaving ? <Spinner/> : <><FaLock size={11}/> Change Password</>}
              </button>

              <div style={{ marginTop:24, padding:"14px", background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <FaShieldAlt size={11} color="#3b82f6"/>
                  <span style={{ fontSize:12, fontWeight:600, color:"#aaa" }}>Account Security</span>
                </div>
                <div style={{ fontSize:11, color:"#555", lineHeight:1.7 }}>
                  <div>• Use a strong, unique password</div>
                  <div>• Don't share your password with anyone</div>
                  <div>• Sessions expire after 7 days of inactivity</div>
                </div>
              </div>
            </div>
          )}

          {tab === "danger" && (
            <div>
              <Flash type="warning">
                These actions are <strong>permanent</strong> and cannot be undone. Proceed with caution.
              </Flash>

              <div style={{ padding:"16px", background:"#190a0a", border:"1px solid #3d1414", borderRadius:8, marginTop:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <FaTrash size={12} color="#ef4444"/>
                  <span style={{ fontSize:13, fontWeight:600, color:"#fca5a5" }}>Delete Account</span>
                </div>
                <p style={{ fontSize:12, color:"#888", lineHeight:1.7, marginBottom:14 }}>
                  Once you delete your account, all your files, settings, and data will be permanently
                  erased from our servers. There is no way to recover this data.
                </p>
                <button onClick={deleteAccount}
                  style={{ background:"#3d1414", border:"1px solid #5d2020", borderRadius:6, padding:"8px 16px", color:"#fca5a5", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif", display:"flex", alignItems:"center", gap:7 }}>
                  <FaTrash size={10}/> Delete My Account Permanently
                </button>
              </div>

              <div style={{ padding:"16px", background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:8, marginTop:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <FaSignOutAlt size={12} color="#888"/>
                  <span style={{ fontSize:13, fontWeight:600, color:"#aaa" }}>Sign Out</span>
                </div>
                <p style={{ fontSize:12, color:"#555", lineHeight:1.7, marginBottom:14 }}>
                  Sign out of your account on this device. You can sign back in anytime.
                </p>
                <button onClick={() => { logout(); onClose(); }}
                  style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:6, padding:"8px 16px", color:"#aaa", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif", display:"flex", alignItems:"center", gap:7 }}>
                  <FaSignOutAlt size={10}/> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SETTINGS MODAL
───────────────────────────────────────────────────────────────── */
function SettingsModal({ onClose, settings, setSettings }) {
  const toast = useToast();
  const [tab, setTab] = useState("editor");

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const resetDefaults = () => {
    if (window.confirm("Reset all settings to defaults?")) {
      setSettings(DEFAULT_SETTINGS);
      toast.show("Settings reset to defaults", "info");
    }
  };

  const tabs = [
    { id: "editor",        label: "Editor",        icon: FaKeyboard },
    { id: "appearance",    label: "Appearance",    icon: FaPalette },
    { id: "notifications", label: "Notifications", icon: FaBell },
    { id: "about",         label: "About",         icon: FaInfoCircle },
  ];

  const Row = ({ label, hint, children }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom:"1px solid #141414" }}>
      <div style={{ flex:1, paddingRight:16 }}>
        <div style={{ fontSize:12.5, color:"#d4d4d4", fontWeight:500 }}>{label}</div>
        {hint && <div style={{ fontSize:10.5, color:"#444", marginTop:4, lineHeight:1.5 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize:10, fontWeight:700, color:"#3a3a3a", letterSpacing:1.2, textTransform:"uppercase", marginBottom:6, marginTop:8 }}>
      {children}
    </div>
  );

  return (
    <div style={S.overlay} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...S.modal, width: 640, padding: 0, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg, #a78bfa, #7c3aed)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <FaCog size={13} color="#fff"/>
            </div>
            <span style={{ fontSize:15, fontWeight:600, color:"#e5e5e5" }}>Settings</span>
          </div>
          <button onClick={onClose} style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:6, cursor:"pointer", color:"#888", display:"flex", padding:"7px" }}>
            <FaTimes size={11}/>
          </button>
        </div>

        <div style={{ display:"flex", flex: 1, overflow: "hidden" }}>
          <div style={{ width:180, borderRight:"1px solid #1a1a1a", padding:"12px 0", flexShrink: 0, background:"#0c0c0c" }}>
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  width:"100%",
                  background: tab===t.id ? "linear-gradient(90deg, rgba(167,139,250,0.12), transparent)" : "transparent",
                  border:"none",
                  padding:"11px 18px",
                  color: tab===t.id ? "#e5e5e5" : "#666",
                  fontSize:12,
                  fontWeight: tab===t.id ? 600 : 500,
                  display:"flex", alignItems:"center", gap:10,
                  cursor:"pointer",
                  borderLeft: tab===t.id ? "2px solid #a78bfa" : "2px solid transparent",
                  fontFamily:"'Geist',sans-serif",
                  textAlign:"left",
                  transition:"all 0.2s",
                }}>
                  <Icon size={12}/>{t.label}
                </button>
              );
            })}
          </div>

          <div style={{ flex:1, padding:"20px 28px", overflowY:"auto" }}>
            {tab === "editor" && (
              <div>
                <SectionTitle>Code Editor</SectionTitle>

                <Row label="Font Size" hint="Editor font size in pixels (10-24)">
                  <NumInput value={settings.fontSize} onChange={v => update("fontSize", v)} min={10} max={24}/>
                </Row>

                <Row label="Tab Size" hint="Number of spaces per tab">
                  <NumInput value={settings.tabSize} onChange={v => update("tabSize", v)} min={2} max={8}/>
                </Row>

                <Row label="Word Wrap" hint="Wrap long lines in the editor">
                  <div style={{display:"flex",gap:4}}>
                    {[{value:"on",label:"On"},{value:"off",label:"Off"}].map(opt=>(
                      <button key={opt.value} onClick={()=>update("wordWrap",opt.value)} 
                        style={{background:settings.wordWrap===opt.value?"#1a1a1a":"#0a0a0a",border:`1px solid ${settings.wordWrap===opt.value?"#3a3a3a":"#1e1e1e"}`,borderRadius:5,padding:"5px 10px",fontSize:10,color:settings.wordWrap===opt.value?"#d4d4d4":"#666",cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"all 0.15s"}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Row>

                <Row label="Line Numbers" hint="Show line numbers in gutter">
                  <div style={{display:"flex",gap:4}}>
                    {[{value:"on",label:"On"},{value:"off",label:"Off"},{value:"relative",label:"Relative"}].map(opt=>(
                      <button key={opt.value} onClick={()=>update("lineNumbers",opt.value)} 
                        style={{background:settings.lineNumbers===opt.value?"#1a1a1a":"#0a0a0a",border:`1px solid ${settings.lineNumbers===opt.value?"#3a3a3a":"#1e1e1e"}`,borderRadius:5,padding:"5px 10px",fontSize:10,color:settings.lineNumbers===opt.value?"#d4d4d4":"#666",cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"all 0.15s"}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Row>

                <Row label="Cursor Blinking" hint="Animation style for cursor">
                  <div style={{display:"flex",gap:4}}>
                    {[{value:"smooth",label:"Smooth"},{value:"blink",label:"Blink"},{value:"phase",label:"Phase"},{value:"expand",label:"Expand"},{value:"solid",label:"Solid"}].map(opt=>(
                      <button key={opt.value} onClick={()=>update("cursorBlinking",opt.value)} 
                        style={{background:settings.cursorBlinking===opt.value?"#1a1a1a":"#0a0a0a",border:`1px solid ${settings.cursorBlinking===opt.value?"#3a3a3a":"#1e1e1e"}`,borderRadius:5,padding:"5px 9px",fontSize:9,color:settings.cursorBlinking===opt.value?"#d4d4d4":"#666",cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Row>

                <Row label="Show Minimap" hint="Display code overview on the right">
                  <Toggle checked={settings.minimap} onChange={v => update("minimap", v)}/>
                </Row>

                <Row label="Font Ligatures" hint="Enable programming ligatures (=>, !==, etc.)">
                  <Toggle checked={settings.fontLigatures} onChange={v => update("fontLigatures", v)}/>
                </Row>

                <div style={{ marginTop:20 }}>
                  <SectionTitle>Auto Save</SectionTitle>
                </div>

                <Row label="Auto Save" hint="Automatically save files after changes">
                  <Toggle checked={settings.autoSave} onChange={v => update("autoSave", v)}/>
                </Row>

                {settings.autoSave && (
                  <Row label="Auto Save Delay" hint="Delay in milliseconds before saving">
                    <NumInput value={settings.autoSaveDelay} onChange={v => update("autoSaveDelay", v)} min={500} max={10000} step={500}/>
                  </Row>
                )}
              </div>
            )}

            {tab === "appearance" && (
              <div>
                <SectionTitle>Theme</SectionTitle>

                <Row label="Editor Theme" hint="Color theme for the code editor">
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {THEME_OPTIONS.map(opt=>(
                      <button key={opt.value} onClick={()=>update("theme",opt.value)} 
                        style={{background:settings.theme===opt.value?"#1a1a1a":"#0a0a0a",border:`1px solid ${settings.theme===opt.value?"#3a3a3a":"#1e1e1e"}`,borderRadius:6,padding:"6px 12px",fontSize:11,color:settings.theme===opt.value?"#d4d4d4":"#666",cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"all 0.15s"}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Row>

                <div style={{ marginTop:20, padding:"16px", background:"linear-gradient(135deg, #0a0e19, #0a0a0a)", border:"1px solid #1a2e50", borderRadius:8 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <FaInfoCircle size={12} color="#3b82f6" style={{ flexShrink:0, marginTop:2 }}/>
                    <div style={{ fontSize:11.5, color:"#93c5fd", lineHeight:1.7 }}>
                      Theme changes apply instantly. More themes and custom color schemes coming soon!
                    </div>
                  </div>
                </div>

                <div style={{ marginTop:14, padding:"16px", background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:8 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#888", marginBottom:10 }}>Theme Preview</div>
                  <div style={{ background: settings.theme.includes("light") ? "#fff" : "#1e1e1e", padding:12, borderRadius:6, border:"1px solid #1a1a1a" }}>
                    <pre style={{
                      margin:0,
                      fontFamily:"'JetBrains Mono',monospace",
                      fontSize:11,
                      color: settings.theme.includes("light") ? "#1e1e1e" : "#d4d4d4",
                      lineHeight:1.6,
                    }}>
{`function hello() {
  console.log("Welcome!");
}`}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {tab === "notifications" && (
              <div>
                <SectionTitle>Preferences</SectionTitle>

                <Row label="Show Notifications" hint="Display in-app notifications">
                  <Toggle checked={settings.showNotifications} onChange={v => update("showNotifications", v)}/>
                </Row>

                <Row label="Sound Effects" hint="Play sounds for events (run, error, etc.)">
                  <Toggle checked={settings.soundEnabled} onChange={v => update("soundEnabled", v)}/>
                </Row>

                <button
                  onClick={() => toast.show("This is a test notification!", "success")}
                  style={{
                    marginTop:18,
                    background:"#1a1a1a",
                    border:"1px solid #2a2a2a",
                    borderRadius:6,
                    padding:"8px 14px",
                    color:"#aaa",
                    fontSize:11,
                    cursor:"pointer",
                    fontFamily:"'Geist',sans-serif",
                    display:"flex",
                    alignItems:"center",
                    gap:7,
                  }}
                >
                  <FaBell size={10}/> Test Notification
                </button>
              </div>
            )}

            {tab === "about" && (
              <div>
                <div style={{ textAlign:"center", padding:"24px 0" }}>
                  <div style={{ width:72, height:72, borderRadius:16, background:"linear-gradient(135deg, #1a1a1a, #0a0a0a)", border:"1px solid #2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", boxShadow:"0 8px 24px rgba(0,0,0,0.6)" }}>
                    <FaCode size={28} color="#e5e5e5"/>
                  </div>
                  <div style={{ fontSize:20, fontWeight:700, color:"#e5e5e5", marginBottom:4 }}>CloudIDE</div>
                  <div style={{ fontSize:12, color:"#666", marginBottom:18 }}>Professional Edition · v1.0.0</div>
                </div>

                <div style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:8, padding:"14px", marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#444", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>System Info</div>
                  {[
                    ["Build",     "1.0.0 (stable)"],
                    ["Editor",    "Monaco 0.45"],
                    ["Runtime",   "Node 20.x · Docker"],
                    ["Browser",   navigator.userAgent.split(" ").slice(-2).join(" ")],
                    ["Platform",  navigator.platform],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0" }}>
                      <span style={{ fontSize:11, color:"#555" }}>{k}</span>
                      <span style={{ fontSize:11, color:"#888", fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:8, padding:"14px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#444", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Resources</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {[
                      ["Documentation", "#"],
                      ["Keyboard Shortcuts", "#"],
                      ["Report a Bug", "#"],
                      ["GitHub Repository", "#"],
                    ].map(([label, href]) => (
                      <a key={label} href={href} style={{ fontSize:12, color:"#3b82f6", textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>
                        <FaChevronRight size={8}/>{label}
                      </a>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign:"center", marginTop:18, fontSize:10, color:"#3a3a3a" }}>
                  © 2025 CloudIDE. Made with ☕ and 💻
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:"14px 24px", borderTop:"1px solid #1a1a1a", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink: 0, background:"#0c0c0c" }}>
          <button onClick={resetDefaults}
            style={{ background:"transparent", border:"1px solid #2a2a2a", borderRadius:6, padding:"7px 14px", fontSize:11, color:"#888", cursor:"pointer", fontFamily:"'Geist',sans-serif", display:"flex", alignItems:"center", gap:6 }}>
            <FaTimes size={9}/> Reset to Defaults
          </button>
          <div style={{ fontSize:10, color:"#3a3a3a", display:"flex", alignItems:"center", gap:6 }}>
            <FaCheck size={9} color="#22c55e"/> Settings save automatically
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   IDE
───────────────────────────────────────────────────────────────── */
function IDE() {
  const { user, logout, apiFetch } = useAuth();
  const toast = useToast();

  const normalizeFile = (file) => {
    const lang = file.lang || "python";
    const codeByLang = file.codeByLang || { [lang]: (file.code ?? DEFAULT_CODE[lang]) || "" };
    const code = (file.code ?? codeByLang[lang] ?? DEFAULT_CODE[lang]) || "";
    return { ...file, id: file.id || uid(), lang, code, codeByLang };
  };

  // Initialize files from localStorage or defaults
  const [files,   setFiles]   = useState(() => {
    try {
      const saved = localStorage.getItem("cide_files");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizeFile);
      }
    } catch {}
    return [normalizeFile({ id: uid(), name: "main.py", lang: "python", code: DEFAULT_CODE.python, saved: true })];
  });
  
  const [activeId, setActiveId] = useState(() => files[0]?.id);
  const activeFile = files.find(f => f.id === activeId) || files[0];

  // Persist files to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("cide_files", JSON.stringify(files));
    
    // Also save to backend if user is logged in (debounced)
    const timer = setTimeout(() => {
      if (!user) return;
      files.forEach(file => {
        apiFetch("/files", {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            language: file.lang,
            code: file.code,
            saved: true,
          }),
        }).catch(e => console.error("Failed to save file:", e));
      });
    }, 1500); // Debounce backend saves
    
    return () => clearTimeout(timer);
  }, [files, user, apiFetch]);

  // Load files from backend on login
  useEffect(() => {
    if (!user) return;
    
    apiFetch("/files")
      .then(res => res.json())
      .then(data => {
        if (data.files && Array.isArray(data.files) && data.files.length > 0) {
          const backendFiles = data.files.map(f => normalizeFile({
            id: uid(),
            name: f.fileName,
            lang: f.language,
            code: f.code,
            saved: true,
          }));
          setFiles(backendFiles);
          setActiveId(backendFiles[0].id);
        }
      })
      .catch(e => console.error("Failed to load files:", e));
  }, [user, apiFetch]);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("cide_settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  useEffect(() => {
    localStorage.setItem("cide_settings", JSON.stringify(settings));
    applyThemeGlobally(settings.theme);
  }, [settings]);

  // Apply theme on initial mount
  useEffect(() => {
    // Apply theme immediately
    applyThemeGlobally(settings.theme);
    // Also apply again after a short delay to ensure everything is rendered
    const timer = setTimeout(() => {
      applyThemeGlobally(settings.theme);
    }, 100);
    return () => clearTimeout(timer);
  }, [settings.theme]);

  const [running,      setRunning]      = useState(false);
  const [termLines,    setTermLines]    = useState([]);
  const [termInput,    setTermInput]    = useState("");
  const [inputReady,   setInputReady]   = useState(false);
  const [execMs,       setExecMs]       = useState(null);
  const [termExpanded, setTermExpanded] = useState(false);
  const sessionRef   = useRef(null);
  const sseRef       = useRef(null);
  const outBufRef    = useRef("");
  const startTimeRef = useRef(null);

  const [panel,        setPanel]        = useState("files");
  const [userMenu,     setUserMenu]     = useState(false);
  const [newFileModal, setNewFileModal] = useState(false);
  const [newFileName,  setNewFileName]  = useState("");
  const [newFileLang,  setNewFileLang]  = useState("python");
  const [renameId,     setRenameId]     = useState(null);
  const [renameVal,    setRenameVal]    = useState("");
  const [ctxMenu,      setCtxMenu]      = useState(null);

  // Folder state
  const [folders, setFolders] = useState(() => {
    try {
      const saved = localStorage.getItem("cide_folders");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [newFileInFolder,  setNewFileInFolder]  = useState(null); // folderId for new file target
  const [newFolderModal,   setNewFolderModal]   = useState(false);
  const [newFolderName,    setNewFolderName]     = useState("");
  const [folderCtxMenu,    setFolderCtxMenu]    = useState(null);
  const [renameFolderId,   setRenameFolderId]   = useState(null);
  const [renameFolderVal,  setRenameFolderVal]  = useState("");

  useEffect(() => { localStorage.setItem("cide_folders", JSON.stringify(folders)); }, [folders]);

  const createFolder = () => {
    const name = newFolderName.trim() || "New Folder";
    const id = uid();
    setFolders(fs => [...fs, { id, name }]);
    setCollapsedFolders(c => ({ ...c, [id]: false }));
    setNewFolderModal(false); setNewFolderName("");
    toast.show(`Created folder "${name}"`, "success", 1500);
  };
  const deleteFolder = (folderId) => {
    setFolders(fs => fs.filter(f => f.id !== folderId));
    // Move files in that folder back to root
    setFiles(fs => fs.map(f => f.folderId === folderId ? { ...f, folderId: null } : f));
    setFolderCtxMenu(null);
    toast.show("Folder deleted", "info", 1500);
  };
  const startRenameFolder = (folderId) => {
    const f = folders.find(x => x.id === folderId);
    setRenameFolderId(folderId); setRenameFolderVal(f?.name || "");
    setFolderCtxMenu(null);
  };
  const finishRenameFolder = (folderId) => {
    if (renameFolderVal.trim()) setFolders(fs => fs.map(f => f.id === folderId ? { ...f, name: renameFolderVal.trim() } : f));
    setRenameFolderId(null);
  };
  const toggleFolder = (folderId) => setCollapsedFolders(c => ({ ...c, [folderId]: !c[folderId] }));

  const [profileModal,  setProfileModal]  = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);

  const [cpuH] = useState(() => Array.from({ length:16 }, () => Math.random()*55+15));
  const [memH] = useState(() => Array.from({ length:16 }, () => Math.random()*40+30));
  const [netH] = useState(() => Array.from({ length:16 }, () => Math.random()*65+8));
  const [stats, setStats] = useState({ cpu:32, mem:54, net:18 });
  useEffect(() => {
    const id = setInterval(() => setStats(p => ({
      cpu: Math.min(90, Math.max(5, p.cpu + (Math.random()-0.5)*8)),
      mem: Math.min(88, Math.max(18, p.mem + (Math.random()-0.5)*4)),
      net: Math.min(95, Math.max(2,  p.net + (Math.random()-0.5)*12)),
    })), 2400);
    return () => clearInterval(id);
  }, []);

  const termBodyRef    = useRef(null);
  const termInputRef   = useRef(null);
  const fileInputRef   = useRef(null);
  const folderInputRef = useRef(null);
  const clock = useTick();

  useEffect(() => { if (termBodyRef.current) termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight; }, [termLines, inputReady]);
  useEffect(() => { if (inputReady && termInputRef.current) termInputRef.current.focus(); }, [inputReady]);

  const addLine = useCallback((type, text) => setTermLines(p => [...p, { type, text }]), []);

  const saveFile    = useCallback(() => {
    setFiles(fs => fs.map(f => f.id===activeId ? {...f,saved:true} : f));
    if (settings.showNotifications) toast.show("File saved", "success", 1500);
  }, [activeId, settings.showNotifications, toast]);

  const closeTab    = id => setFiles(fs => { const n=fs.filter(f=>f.id!==id); if(id===activeId&&n.length)setActiveId(n[n.length-1].id); return n; });
  const deleteFile  = async (id) => { 
    const file = files.find(f => f.id === id);
    if (file && user) {
      try {
        await apiFetch(`/files/${file.name}`, { method: "DELETE" });
      } catch (e) {
        console.error("Failed to delete file from backend:", e);
      }
    }
    setFiles(fs => { 
      const n=fs.filter(f=>f.id!==id); 
      if(id===activeId)setActiveId(n[0]?.id||null); 
      return n.length?n:[{id:uid(),name:"main.py",lang:"python",code:DEFAULT_CODE.python,saved:true}]; 
    }); 
    setCtxMenu(null); 
    toast.show("File deleted", "info", 1500); 
  };
  const startRename = id => { const f=files.find(x=>x.id===id); setRenameId(id); setRenameVal(f?.name||""); setCtxMenu(null); };
  const finishRename = id => { if(renameVal.trim()){const ext=renameVal.trim().split(".").pop()?.toLowerCase(),lang=EXT_TO_LANG[ext]||files.find(f=>f.id===id)?.lang||"python";setFiles(fs=>fs.map(f=>f.id===id?{...f,name:renameVal.trim(),lang}:f));} setRenameId(null); };
  const createFile  = () => {
    const ext=LANGS[newFileLang]?.ext||"py", raw=newFileName.trim()||`untitled.${ext}`, name=raw.includes(".")?raw:`${raw}.${ext}`, id=uid();
    setFiles(fs=>[...fs,{id,name,lang:newFileLang,code:DEFAULT_CODE[newFileLang]||"",saved:true,folderId:newFileInFolder??null,codeByLang:{ [newFileLang]: DEFAULT_CODE[newFileLang]||"" }}]);
    setActiveId(id); setNewFileModal(false); setNewFileName(""); setNewFileLang("python"); setNewFileInFolder(null);
    toast.show(`Created ${name}`, "success", 1500);
  };
  const openFromDisk = e => {
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{const ext=file.name.split(".").pop()?.toLowerCase(),lang=EXT_TO_LANG[ext]||"python",id=uid();setFiles(fs=>[...fs,{id,name:file.name,lang,code:ev.target.result,saved:true,codeByLang:{ [lang]: ev.target.result }}]);setActiveId(id);toast.show(`Opened ${file.name}`, "success", 1500);};
    reader.readAsText(file); e.target.value="";
  };
  const openFolderFromDisk = e => {
    const allFiles = Array.from(e.target.files);
    if (!allFiles.length) return;

    // Group files by their top-level folder (first path segment)
    const folderMap = {}; // folderName -> folderId
    const newFolderEntries = [];
    const newFileEntries = [];

    const readFile = (file) => new Promise(resolve => {
      const reader = new FileReader();
      // webkitRelativePath = "FolderName/sub/file.ext"
      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split("/");
      // parts[0] = root folder, parts[last] = filename
      // We create a folder entry per unique top-level dir, and sub-paths become the file name
      const topFolder = parts[0];
      const fileName  = parts[parts.length - 1];
      const ext = fileName.split(".").pop()?.toLowerCase();
      const lang = EXT_TO_LANG[ext] || "python";

      // Skip binary / non-text files by extension
      const textExts = new Set(["py","js","ts","jsx","tsx","java","c","cpp","cc","h","hpp","rs","go","rb","php","html","css","json","md","txt","yaml","yml","toml","sh","bash","sql","xml","csv","env","gitignore","lock"]);
      if (!textExts.has(ext)) { resolve(null); return; }

      reader.onload = ev => {
        if (!folderMap[topFolder]) {
          const fid = uid();
          folderMap[topFolder] = fid;
          newFolderEntries.push({ id: fid, name: topFolder });
        }
        const folderId = folderMap[topFolder];
        const fileId   = uid();
        newFileEntries.push({
          id: fileId, name: fileName, lang,
          code: ev.target.result, saved: true,
          folderId,
          codeByLang: { [lang]: ev.target.result },
        });
        resolve(fileId);
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });

    Promise.all(allFiles.map(readFile)).then(ids => {
      const validIds = ids.filter(Boolean);
      if (!validIds.length) { toast.show("No readable text files found", "warning"); return; }
      setFolders(fs => [...fs, ...newFolderEntries]);
      setFiles(fs => [...fs, ...newFileEntries]);
      // Open first file
      setActiveId(newFileEntries[0]?.id);
      // Expand uploaded folders
      setCollapsedFolders(c => {
        const next = { ...c };
        newFolderEntries.forEach(f => { next[f.id] = false; });
        return next;
      });
      toast.show(`Uploaded ${newFolderEntries.length} folder(s), ${validIds.length} file(s)`, "success", 2500);
    });

    e.target.value = "";
  };

  const downloadFile = () => { const b=new Blob([activeFile.code],{type:"text/plain"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=activeFile.name;a.click();URL.revokeObjectURL(a.href); toast.show(`Downloaded ${activeFile.name}`, "success", 1500); };
  const copyCode     = () => { navigator.clipboard.writeText(activeFile.code).then(() => toast.show("Code copied to clipboard", "success", 1500)).catch(()=>{}); };
  const changeLang = useCallback(lang => {
    setFiles(fs=>fs.map(f => {
      if (f.id !== activeId) return f;
      const currentLang = f.lang;
      const currentCode = f.code;
      const existing = f.codeByLang?.[lang];
      return {
        ...f,
        lang,
        code: (existing ?? DEFAULT_CODE[lang]) || "",
        saved: false,
        codeByLang: {
          ...f.codeByLang,
          [currentLang]: currentCode,
          [lang]: (existing ?? DEFAULT_CODE[lang]) || "",
        },
      };
    }));
    toast.show(`Changed to ${LANGS[lang]?.label || lang}`, "info", 1000);
  }, [activeId, toast]);

  useEffect(() => {
    if (!settings.autoSave) return;
    if (activeFile.saved) return;
    const timer = setTimeout(() => {
      setFiles(fs => fs.map(f => f.id===activeId ? {...f,saved:true} : f));
    }, settings.autoSaveDelay);
    return () => clearTimeout(timer);
  }, [activeFile.code, activeFile.saved, settings.autoSave, settings.autoSaveDelay, activeId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setNewFileModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setSettingsModal(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveFile]);

  const stopSession = useCallback(async () => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current=null; }
    if (sessionRef.current) {
      try { await apiFetch(`/run-interactive/${sessionRef.current}`, { method:"DELETE" }); } catch(_){}
      sessionRef.current = null;
    }
    setRunning(false); setInputReady(false); outBufRef.current="";
  }, [apiFetch]);

  const runCode = async () => {
    if (running) { stopSession(); return; }

    setTermLines([]); setTermInput(""); setExecMs(null);
    setRunning(true); setInputReady(false); outBufRef.current="";
    startTimeRef.current = Date.now();

    const ts = () => new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    addLine("sys", `[${ts()}] Starting ${LANGS[activeFile.lang]?.label} ${LANGS[activeFile.lang]?.version}...`);
    if (["java","rust","typescript"].includes(activeFile.lang))
      addLine("sys", `⏳ Compiling — first run may take 15-30s...`);

    let sid;
    try {
      const res  = await apiFetch("/run-interactive/start", {
        method: "POST",
        body: JSON.stringify({ code: activeFile.code, language: activeFile.lang }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to start");
      sid = data.sessionId;
    } catch(e) {
      addLine("err", `❌ ${e.message}`);
      setRunning(false); return;
    }
    sessionRef.current = sid;
    addLine("sys", `[${ts()}] Running — type input below when prompted ↓`);

    const tok = localStorage.getItem("cide_token");
    const sse = new EventSource(`${API_URL}/run-interactive/output/${sid}?token=${tok}`);
    sseRef.current = sse;

    const finish = () => {
      if (outBufRef.current.trim()) { addLine("out", outBufRef.current); }
      outBufRef.current = "";
      const ms = Date.now() - startTimeRef.current;
      setExecMs(ms);
      addLine("sys", `[${ts()}] Exited · ${ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(2)}s`}`);
      setRunning(false); setInputReady(false); sessionRef.current=null; sseRef.current=null;
    };

    sse.onmessage = e => {
      const chunk = JSON.parse(e.data);
      if (chunk.type === "stdout" || chunk.type === "stderr") {
        outBufRef.current += chunk.data;
        const parts = outBufRef.current.split("\n");
        outBufRef.current = parts.pop();
        parts.forEach(ln => addLine(chunk.type === "stderr" ? "err" : "out", ln));
        if (outBufRef.current.length > 0 && /[:?>\]]\s*$/.test(outBufRef.current)) {
          addLine(chunk.type === "stderr" ? "err" : "out", outBufRef.current);
          outBufRef.current = "";
          setInputReady(true);
        }
      }
      if (chunk.type === "exit" || chunk.type === "error") {
        if (chunk.type === "error") addLine("err", `Runtime error: ${chunk.data}`);
        finish(); sse.close();
      }
    };
    sse.onerror = () => { finish(); sse.close(); };
  };

  const sendInput = async () => {
    if (!sessionRef.current || !running) return;
    const val = termInput;
    setTermInput(""); setInputReady(false);
    addLine("in", val);
    try {
      await apiFetch(`/run-interactive/input/${sessionRef.current}`, {
        method: "POST",
        body: JSON.stringify({ input: val }),
      });
    } catch(e) { addLine("err", `Input error: ${e.message}`); }
  };

  const [collabModal,  setCollabModal]  = useState(false);
  const [joinInput,    setJoinInput]    = useState("");
  const [collabStatus, setCollabStatus] = useState("");
  const [collabCopied, setCollabCopied] = useState(false);

  const [aiMessages, setAiMessages] = useState([{ role: "assistant", text: "Hi there! Ask me to debug, explain, or improve your code." }]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const { token } = useAuth();

  const collab = useCollab({ token, activeFile, setFiles, activeId });

  useEffect(() => { collab.changeLangRef.current = changeLang; }, [changeLang, collab.changeLangRef]);

  const updateCode = useCallback(c => {
    setFiles(fs => fs.map(f => {
      if (f.id !== activeId) return f;
      const newCode = c || "";
      return {
        ...f,
        code: newCode,
        saved: false,
        codeByLang: { ...f.codeByLang, [f.lang]: newCode },
      };
    }));
    collab.emitCode(c || "");
  }, [activeId, collab]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeLangCollab = useCallback(lang => {
    changeLang(lang);
    collab.emitLang(lang);
  }, [changeLang, collab]);

  const sendAiMessage = async () => {
    if (!aiPrompt.trim()) return;
    const userMessage = aiPrompt.trim();
    setAiMessages(ms => [...ms, { role: "user", text: userMessage }]);
    setAiPrompt("");
    setAiLoading(true);

    try {
      const res = await apiFetch("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage,
          fileName: activeFile.name,
          language: activeFile.lang,
          code: activeFile.code,
        }),
      });
      const data = await res.json();
      if (res.ok && data.response) {
        setAiMessages(ms => [...ms, { role: "assistant", text: data.response }]);
      } else {
        setAiMessages(ms => [...ms, { role: "assistant", text: data.error || "I couldn't process the request." }]);
      }
    } catch (e) {
      setAiMessages(ms => [...ms, { role: "assistant", text: `Error: ${e.message}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const createRoom = async () => {
    setCollabStatus("creating");
    try {
      const res = await apiFetch("/collab/new-room");
      const { roomId } = await res.json();
      collab.joinRoom(roomId, activeFile.code, activeFile.lang);
      setCollabStatus("");
      toast.show(`Collaboration room ${roomId} created`, "success");
    } catch { setCollabStatus(""); toast.show("Failed to create room", "error"); }
  };

  const joinRoom = () => {
    const rid = joinInput.trim().toUpperCase();
    if (!rid) return;
    setCollabStatus("joining");
    collab.joinRoom(rid, activeFile.code, activeFile.lang);
    setJoinInput(""); setCollabStatus(""); setCollabModal(false);
    toast.show(`Joined room ${rid}`, "success");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(collab.roomId || "").then(() => {
      setCollabCopied(true); setTimeout(() => setCollabCopied(false), 2000);
    });
  };

  const lineColor = { out:"#d4d4d4", err:"#f87171", sys:"#555", in:"#eab308" };
  const lineCount = activeFile.code.split("\n").length;
  const LCfg      = LANGS[activeFile.lang] || LANGS.python;
  const LIcon     = LCfg.icon;
  const initials  = user?.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "U";
  const avatarSrc = user?.avatar ? `${API_URL}/auth/avatar?token=${localStorage.getItem("cide_token")}` : null;

  return (
    <div style={S.root} onClick={() => { setUserMenu(false); setCtxMenu(null); setFolderCtxMenu(null); }}>

      <div style={S.titlebar}>
        <div style={S.tbLeft}>
          <div style={S.winDots}>
            <span style={{...S.dot,background:"#ef4444"}}/><span style={{...S.dot,background:"#f59e0b"}}/><span style={{...S.dot,background:"#22c55e"}}/>
          </div>
          <div style={S.brand}><div style={S.brandBox}><FaCode size={11} color="#fff"/></div><span style={S.brandTxt}>CloudIDE</span></div>
        </div>

        <div style={S.tabs}>
          {files.map(f => { const cfg=LANGS[f.lang],Icon=cfg?.icon; return (
            <div key={f.id} onClick={() => setActiveId(f.id)} style={{...S.tab,...(f.id===activeId?S.tabOn:{})}}>
              {Icon&&<Icon size={11} color={f.id===activeId?"#9aa3b0":"#444"}/>}
              <span style={{maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
              {!f.saved&&<span style={S.dot2}/>}
              <button style={S.tabX} onClick={e=>{e.stopPropagation();closeTab(f.id);}}><FaTimes size={9}/></button>
            </div>); })}
          <button style={S.tabNew} onClick={() => setNewFileModal(true)} title="New file (Ctrl+N)"><FaPlus size={9}/></button>
        </div>

        <div style={S.tbRight}>
          {collab.collabUsers.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:3, marginRight:4 }}>
              {collab.collabUsers.slice(0,5).map(u => (
                <div key={u.socketId} title={u.name}
                  style={{ width:20, height:20, borderRadius:5, border:`2px solid ${u.color}`,
                    background:"#1a1a1a", display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:8, fontWeight:700, color:u.color, overflow:"hidden", flexShrink:0 }}>
                  {u.avatar
                    ? <img src={u.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : u.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { const themes=THEME_OPTIONS.map(t=>t.value); const idx=themes.indexOf(settings.theme); const next=themes[(idx+1)%themes.length]; setSettings(s=>({...s,theme:next})); }} title="Toggle theme" style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:"1px solid #181818",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:10,color:"#444",fontFamily:"'Geist',sans-serif",transition:"all 0.2s",marginRight:6}}>
            <FaPalette size={10} color="#666"/>
            <span style={{fontSize:9}}>{settings.theme.includes("light")?"Light":"Dark"}</span>
          </button>
          <button onClick={() => setCollabModal(true)}
            style={{ display:"flex",alignItems:"center",gap:5,background:collab.roomId?"#0a1a0a":"transparent",
              border:`1px solid ${collab.roomId?"#142814":"#181818"}`,borderRadius:5,padding:"3px 8px",
              cursor:"pointer",fontSize:10,color:collab.roomId?"#22c55e":"#444",fontFamily:"'Geist',sans-serif" }}>
            <FaUsers size={10} color={collab.roomId?"#22c55e":"#444"}/>
            {collab.roomId ? `Room ${collab.roomId}` : "Collab"}
          </button>
          <div style={S.livePill}><span style={S.liveDot}/>Live</div>
          <div style={{position:"relative"}} onClick={e=>e.stopPropagation()}>
            <button onClick={() => setUserMenu(x=>!x)} style={S.userBtn}>
              {avatarSrc
                ? <img src={avatarSrc} alt="" referrerPolicy="no-referrer"
                    onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }}
                    style={{width:22,height:22,borderRadius:5,objectFit:"cover"}}/>
                : null}
              <div style={{...S.userAv, display: avatarSrc ? "none" : "flex"}}>{initials}</div>
              <span style={S.userTxt}>{user?.name?.split(" ")[0]}</span>
              <FaChevronDown size={9} color="#444"/>
            </button>
            {userMenu && (
              <div style={S.ddMenu}>
                <div style={S.ddTop}>
                  {avatarSrc
                    ? <img src={avatarSrc} alt="" referrerPolicy="no-referrer"
                        onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }}
                        style={{width:34,height:34,borderRadius:8,objectFit:"cover",flexShrink:0}}/>
                    : null}
                  <div style={{...S.ddAv, display: avatarSrc ? "none" : "flex"}}>{initials}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:"#d4d4d4"}}>{user?.name}</div>
                    <div style={{fontSize:10,color:"#444",marginTop:1}}>{user?.email}</div>
                    <div style={{fontSize:9,color:"#333",marginTop:2,textTransform:"capitalize"}}>via {user?.provider}</div>
                  </div>
                </div>
                <div style={S.ddDiv}/>
                <button style={S.ddItem} onClick={() => { setProfileModal(true); setUserMenu(false); }}>
                  <FaUser size={11} color="#444"/><span>Profile</span>
                </button>
                <button style={S.ddItem} onClick={() => { setSettingsModal(true); setUserMenu(false); }}>
                  <FaCog size={11} color="#444"/><span>Settings</span>
                  <span style={{ marginLeft:"auto", fontSize:9, color:"#333", fontFamily:"'JetBrains Mono',monospace" }}>⌘,</span>
                </button>
                <div style={S.ddDiv}/>
                <button onClick={logout} style={{...S.ddItem,color:"#f87171"}}><FaSignOutAlt size={11} color="#f87171"/><span>Sign out</span></button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={S.body}>

        <div style={S.actBar}>
          {[["files",VscFiles],["search",VscSearch],["git",VscSourceControl],["debug",VscDebugAlt],["ai",FaRobot]].map(([id,Icon]) => (
            <button key={id} onClick={() => setPanel(p=>p===id?null:id)} style={{...S.actBtn,...(panel===id?S.actOn:{})}}>
              <Icon size={18}/>{panel===id&&<div style={S.actBar2}/>}
            </button>))}
          <div style={{flex:1}}/>
          <button style={S.actBtn} onClick={() => setSettingsModal(true)} title="Settings (Ctrl+,)"><FaCog size={16}/></button>
        </div>

        {panel && (
          <div style={S.sidebar} onClick={e=>e.stopPropagation()}>
            {panel==="files" && (
              <>
                <div style={S.sbHead}><span style={S.sbTitle}>Explorer</span>
                  <div style={{display:"flex",gap:4}}>
                    <button style={S.sbBtn} onClick={() => { setNewFileInFolder(null); setNewFileModal(true); }} title="New file"><FaPlus size={10}/></button>
                    <button style={S.sbBtn} onClick={() => setNewFolderModal(true)} title="New folder"><FaFolder size={10}/></button>
                    <button style={S.sbBtn} onClick={() => fileInputRef.current?.click()} title="Upload file"><FaFile size={10}/></button>
                    <button style={S.sbBtn} onClick={() => folderInputRef.current?.click()} title="Upload folder from computer"><FaUpload size={10}/></button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={openFromDisk} accept=".py,.js,.ts,.java,.c,.cpp,.cc,.rs"/>
                <input ref={folderInputRef} type="file" style={{display:"none"}} onChange={openFolderFromDisk} webkitdirectory="" mozdirectory="" directory="" multiple/>
                <div style={{flex:1,overflowY:"auto",padding:"4px 0"}} onClick={()=>{setFolderCtxMenu(null);setCtxMenu(null);}}>
                  <div style={S.treeSection}><FaFolderOpen size={9} color="#555"/><span>WORKSPACE</span></div>

                  {/* ── Folders ── */}
                  {folders.map(folder => {
                    const isCollapsed = collapsedFolders[folder.id];
                    const folderFiles = files.filter(f => f.folderId === folder.id);
                    return (
                      <div key={folder.id}>
                        {/* Folder row */}
                        <div
                          onContextMenu={e=>{e.preventDefault();e.stopPropagation();setFolderCtxMenu({id:folder.id,x:e.clientX,y:e.clientY});setCtxMenu(null);}}
                          onClick={e=>{e.stopPropagation();toggleFolder(folder.id);}}
                          style={{...S.treeRow,paddingLeft:10,gap:4,userSelect:"none"}}
                        >
                          {isCollapsed
                            ? <FaChevronRight size={8} color="#3a3a3a"/>
                            : <FaChevronDown  size={8} color="#3a3a3a"/>}
                          {isCollapsed
                            ? <FaFolder     size={12} color="#8a7a40" style={{flexShrink:0}}/>
                            : <FaFolderOpen size={12} color="#c9a96e" style={{flexShrink:0}}/>}
                          {renameFolderId === folder.id ? (
                            <input autoFocus value={renameFolderVal}
                              onChange={e=>setRenameFolderVal(e.target.value)}
                              onBlur={()=>finishRenameFolder(folder.id)}
                              onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter")finishRenameFolder(folder.id);if(e.key==="Escape")setRenameFolderId(null);}}
                              onClick={e=>e.stopPropagation()}
                              style={{flex:1,background:"#1a1a1a",border:"1px solid #333",borderRadius:3,color:"#d4d4d4",fontSize:11,padding:"1px 5px",outline:"none",fontFamily:"'JetBrains Mono',monospace"}}/>
                          ) : (
                            <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#aaa",fontWeight:500}}>{folder.name}</span>
                          )}
                          <button
                            onClick={e=>{e.stopPropagation();setNewFileInFolder(folder.id);setNewFileModal(true);}}
                            title="New file in folder"
                            style={{background:"none",border:"none",color:"#3a3a3a",cursor:"pointer",padding:"2px 3px",display:"flex",alignItems:"center",borderRadius:3,opacity:0,transition:"opacity 0.15s"}}
                            onMouseEnter={e=>e.currentTarget.style.opacity="1"}
                            onMouseLeave={e=>e.currentTarget.style.opacity="0"}
                          ><FaPlus size={8}/></button>
                        </div>
                        {/* Files inside folder */}
                        {!isCollapsed && folderFiles.map(f => (
                          <div key={f.id} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCtxMenu({id:f.id,x:e.clientX,y:e.clientY});setFolderCtxMenu(null);}}>
                            {renameId===f.id ? (
                              <div style={{...S.treeRow,paddingLeft:36}}>
                                <input autoFocus value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                                  onBlur={()=>finishRename(f.id)} onKeyDown={e=>{if(e.key==="Enter")finishRename(f.id);if(e.key==="Escape")setRenameId(null);}}
                                  style={{flex:1,background:"#1a1a1a",border:"1px solid #333",borderRadius:3,color:"#d4d4d4",fontSize:11,padding:"1px 5px",outline:"none",fontFamily:"'JetBrains Mono',monospace"}}/>
                              </div>
                            ) : (
                              <div onClick={()=>setActiveId(f.id)} style={{...S.treeRow,...(f.id===activeId?S.treeRowOn:{}),paddingLeft:36}}>
                                <FileIcon name={f.name} lang={f.lang} size={12}/>
                                <span style={{flex:1,fontSize:12,marginLeft:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                                {!f.saved&&<span style={{width:5,height:5,borderRadius:"50%",background:"#888",flexShrink:0}}/>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* ── Root-level files (no folder) ── */}
                  {files.filter(f => !f.folderId).map(f => (
                    <div key={f.id} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCtxMenu({id:f.id,x:e.clientX,y:e.clientY});setFolderCtxMenu(null);}}>
                      {renameId===f.id ? (
                        <div style={{...S.treeRow,paddingLeft:20}}>
                          <input autoFocus value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                            onBlur={()=>finishRename(f.id)} onKeyDown={e=>{if(e.key==="Enter")finishRename(f.id);if(e.key==="Escape")setRenameId(null);}}
                            style={{flex:1,background:"#1a1a1a",border:"1px solid #333",borderRadius:3,color:"#d4d4d4",fontSize:11,padding:"1px 5px",outline:"none",fontFamily:"'JetBrains Mono',monospace"}}/>
                        </div>
                      ) : (
                        <div onClick={() => setActiveId(f.id)} style={{...S.treeRow,...(f.id===activeId?S.treeRowOn:{}),paddingLeft:20}}>
                          <FileIcon name={f.name} lang={f.lang} size={12}/>
                          <span style={{flex:1,fontSize:12,marginLeft:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                          {!f.saved&&<span style={{width:5,height:5,borderRadius:"50%",background:"#888",flexShrink:0}}/>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{padding:"8px 10px",borderTop:"1px solid #141414",display:"flex",gap:6}}>
                  <button onClick={() => { setNewFileInFolder(null); setNewFileModal(true); }} style={S.sbAction}><FaPlus size={9}/><span>New File</span></button>
                  <button onClick={() => setNewFolderModal(true)} style={S.sbAction}><FaFolder size={9}/><span>New Folder</span></button>
                  <button onClick={() => folderInputRef.current?.click()} style={S.sbAction} title="Upload a folder from your computer"><FaUpload size={9}/><span>Upload</span></button>
                </div>
              </>
            )}
            {panel==="ai" && (
              <>
                <div style={S.sbHead}><span style={S.sbTitle}>AI Assistant</span></div>
                <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                  <div style={{flex:1,padding:"10px",overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
                    {aiMessages.map((msg, idx) => (
                      <div key={idx} style={{alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "100%"}}>
                        <div style={{
                          background: msg.role === "user" ? "#1b3a5b" : "#141414",
                          border: msg.role === "user" ? "1px solid #264f7a" : "1px solid #222",
                          borderRadius: 10,
                          padding: "10px 12px",
                          color: msg.role === "user" ? "#d4e8ff" : "#ccc",
                          fontSize: 12,
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{padding:"8px",borderTop:"1px solid #141414",display:"flex",gap:6}}>
                    <textarea
                      placeholder="Ask AI..."
                      rows={2}
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                      style={{flex:1,background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:6,color:"#aaa",fontSize:11,fontFamily:"'Geist',sans-serif",padding:"6px 8px",resize:"none",outline:"none"}}
                    />
                    <button
                      onClick={sendAiMessage}
                      disabled={aiLoading || !aiPrompt.trim()}
                      style={{
                        background: aiLoading ? "#222" : "#1a1a1a",
                        border: "none",
                        color: "#fff",
                        borderRadius: 6,
                        padding: "0 14px",
                        cursor: aiLoading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}>
                      {aiLoading ? "Loading..." : <FaPlay size={9}/>}
                    </button>
                  </div>
                </div>
              </>
            )}
            {(panel==="search"||panel==="git"||panel==="debug") && (
              <><div style={S.sbHead}><span style={S.sbTitle}>{panel==="search"?"Search":panel==="git"?"Source Control":"Debug"}</span></div>
              <div style={{padding:"14px",fontSize:11,color:"#2a2a2a"}}>Coming soon</div></>
            )}
          </div>
        )}

        <div style={S.edCol}>

          <div style={S.edBar}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#444"}}>
                <LIcon size={11} color={LCfg.color}/><FaChevronRight size={8} color="#2a2a2a"/><span style={{color:"#666"}}>{activeFile.name}</span>
              </div>
              <div style={S.sep}/><span style={S.meta}>{lineCount} lines</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{display:"flex",gap:2,marginRight:4,maxWidth:500,overflowX:"auto"}}>
                {Object.entries(LANGS).map(([key,cfg]) => { const I=cfg.icon; return (
                  <button key={key} onClick={() => changeLangCollab(key)} title={`${cfg.label} ${cfg.version}`}
                    style={{...S.langBtn,...(activeFile.lang===key?{background:"#1a1a1a",borderColor:"#2a2a2a"}:{}),flexShrink:0}}>
                    <I size={11} color={activeFile.lang===key?"#9aa3b0":"#3a3a3a"}/>
                    <span style={{color:activeFile.lang===key?"#aaa":"#3a3a3a",fontSize:10}}>{cfg.label}</span>
                  </button>); })}
              </div>
              <div style={S.sep}/>
              <button onClick={copyCode}    style={S.ico} title="Copy"><FaRegCopy  size={11}/></button>
              <button onClick={saveFile}    style={S.ico} title="Save (Ctrl+S)"><FaSave     size={11}/></button>
              <button onClick={downloadFile} style={S.ico} title="Download"><FaDownload size={11}/></button>
              <div style={S.sep}/>
              <button onClick={runCode} style={{...S.runBtn,...(running?S.runStop:S.runGo)}}>
                {running?<><FaStop size={10}/><span>Stop</span></>:<><FaPlay size={10}/><span>Run</span></>}
              </button>
            </div>
          </div>

          <div style={{flex:1,overflow:"hidden",position:"relative"}}>
            <Editor key={activeFile.id} height="100%" theme={settings.theme} language={LCfg.monacoLang}
              value={activeFile.code} onChange={updateCode}
              beforeMount={(monaco) => {
                registerCustomThemes(monaco);
              }}
              onMount={(editor) => {
                editor.onDidChangeCursorPosition(e => {
                  collab.emitCursor(e.position.lineNumber, e.position.column);
                });
              }}
              options={{
                fontSize: settings.fontSize,
                fontFamily: "'JetBrains Mono',monospace",
                fontLigatures: settings.fontLigatures,
                lineNumbers: settings.lineNumbers,
                minimap: { enabled: settings.minimap },
                scrollBeyondLastLine: false,
                renderLineHighlight: "line",
                cursorBlinking: settings.cursorBlinking,
                tabSize: settings.tabSize,
                wordWrap: settings.wordWrap,
                padding: { top: 16, bottom: 16 },
                scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
                overviewRulerBorder: false,
              }}/>
            {collab.roomId && Object.entries(collab.cursors).map(([sid, {line, user: cu}]) => cu && (
              <div key={sid} style={{position:"absolute",top:0,right:8,pointerEvents:"none",zIndex:10,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,paddingTop:6}}>
                <div style={{display:"flex",alignItems:"center",gap:4,background:cu.color+"22",border:`1px solid ${cu.color}44`,borderRadius:4,padding:"2px 7px"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:cu.color,flexShrink:0}}/>
                  <span style={{fontSize:9,color:cu.color,fontFamily:"'Geist',sans-serif",fontWeight:600}}>{cu.name?.split(" ")[0]} · L{line}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{...S.term,height:termExpanded?"55%":"34%"}}>
            <div style={S.termBar}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <FaTerminal size={9} color="#555"/>
                <span style={{fontSize:11,color:"#555"}}>Terminal</span>
                {running && <span style={{fontSize:9,color:"#22c55e",background:"#0a1a0a",border:"1px solid #142814",borderRadius:4,padding:"1px 7px",display:"flex",alignItems:"center",gap:4}}><span style={{width:4,height:4,borderRadius:"50%",background:"#22c55e",display:"inline-block",animation:"pulse 1s ease-in-out infinite"}}/>running</span>}
                {inputReady && running && <span style={{fontSize:9,color:"#eab308",background:"#1a1500",border:"1px solid #3a2800",borderRadius:4,padding:"1px 7px"}}>⌨ waiting for input</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {execMs!==null && <span style={S.timeBadge}>{execMs<1000?`${execMs}ms`:`${(execMs/1000).toFixed(2)}s`}</span>}
                <button style={S.ico} onClick={() => { setTermLines([]); setExecMs(null); }}><span style={{fontSize:9,color:"#444"}}>Clear</span></button>
                <button style={S.ico} onClick={() => setTermExpanded(x=>!x)}>{termExpanded?<FaCompressAlt size={9} color="#444"/>:<FaExpandAlt size={9} color="#444"/>}</button>
              </div>
            </div>

            <div ref={termBodyRef} style={S.termBody} onClick={() => { if(inputReady&&termInputRef.current)termInputRef.current.focus(); }}>
              <div style={{color:"#222",fontSize:11,marginBottom:8}}>{user?.name?.split(" ")[0]?.toLowerCase()}@cloudide:~$ <span style={{color:"#2a2a2a"}}>ready</span></div>
              {termLines.length===0&&!running&&<div style={{color:"#2a2a2a",fontSize:12}}>Press <span style={{color:"#3a3a3a"}}>Run</span> to execute. Programs using <span style={{color:"#555"}}>input()</span> work directly — type here when prompted.</div>}

              {termLines.map((line,i) => (
                <div key={i} style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.85,color:lineColor[line.type]||"#d4d4d4",wordBreak:"break-all",whiteSpace:"pre-wrap"}}>
                  {line.type==="in"&&<span style={{color:"#555",userSelect:"none"}}>{">"} </span>}{line.text}
                </div>
              ))}

              {running&&!inputReady&&(
                <div style={{display:"flex",gap:4,alignItems:"center",marginTop:4}}>
                  {[0,1,2].map(i=><div key={i} style={{width:3,height:3,borderRadius:"50%",background:"#333",animation:`fade 1.1s ${i*0.18}s ease-in-out infinite`}}/>)}
                  <span style={{fontSize:10,color:"#333",marginLeft:4}}>Running...</span>
                </div>
              )}

              {inputReady&&running&&(
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,padding:"6px 12px",background:"#060e06",border:"1px solid #22c55e44",borderRadius:5}}>
                  <span style={{color:"#22c55e",fontSize:13,fontFamily:"'JetBrains Mono',monospace",userSelect:"none",flexShrink:0}}>{">"}</span>
                  <input ref={termInputRef} value={termInput} onChange={e=>setTermInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();sendInput();}}}
                    style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#eab308",fontSize:13,fontFamily:"'JetBrains Mono',monospace",caretColor:"#22c55e"}}
                    placeholder="type your input and press Enter…" autoFocus/>
                  <button onClick={sendInput} style={{background:"#0a2a0a",border:"1px solid #22c55e44",borderRadius:4,color:"#22c55e",fontSize:10,padding:"4px 12px",cursor:"pointer",fontFamily:"'Geist',sans-serif",flexShrink:0}}>Enter ↵</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={S.rightPanel}>
          <div style={{padding:"12px 14px 6px"}}>
            <div style={S.mpHead}>Environment</div>
            {[["Runtime",`${LCfg.label} ${LCfg.version}`],["Container","Docker · Isolated"],["Status",running?"● Running":"○ Idle"],["Auth","JWT · 7d"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                <span style={{fontSize:10,color:"#3a3a3a"}}>{k}</span>
                <span style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:k==="Status"?(running?"#22c55e":"#555"):"#666"}}>{v}</span>
              </div>))}
          </div>
          <div style={S.mpDiv}/>
          <div style={{padding:"10px 14px 6px"}}>
            <div style={S.mpHead}>Resources</div>
            <MetricRow label="CPU"    value={Math.round(stats.cpu)} unit="%"    color="#3b82f6" data={cpuH} pct={stats.cpu}/>
            <MetricRow label="Memory" value={Math.round(stats.mem)} unit="%"    color="#8b5cf6" data={memH} pct={stats.mem}/>
            <MetricRow label="Network" value={Math.round(stats.net)} unit=" MB/s" color="#10b981" data={netH} pct={stats.net}/>
          </div>
          <div style={S.mpDiv}/>
          <div style={{padding:"10px 14px 6px"}}>
            <div style={S.mpHead}>Open Files</div>
            {files.slice(0,6).map(f=>{const cfg=LANGS[f.lang],I=cfg?.icon;return(
              <div key={f.id} onClick={()=>setActiveId(f.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0",cursor:"pointer"}}>
                {I&&<I size={10} color={f.id===activeId?"#9aa3b0":"#333"}/>}
                <span style={{fontSize:10,color:f.id===activeId?"#888":"#333",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                {!f.saved&&<span style={{width:4,height:4,borderRadius:"50%",background:"#555",flexShrink:0}}/>}
              </div>);})}
          </div>
          <div style={{flex:1}}/><div style={S.mpDiv}/>
          <div style={{padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",color:"#444",letterSpacing:1}}>{clock.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
            <div style={{fontSize:9,color:"#222",marginTop:3}}>{clock.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}</div>
          </div>
        </div>
      </div>

      <div style={S.statusBar}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#444"}}><span style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>main</div>
          <span style={S.sb}>Docker</span><span style={S.sb}>{files.length} file{files.length!==1?"s":""}</span>
          {settings.autoSave && <span style={{...S.sb, color:"#22c55e"}}>● Auto Save</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={S.sb}>Ln {lineCount}</span><span style={S.sb}>UTF-8</span>
          <div style={{display:"flex",alignItems:"center",gap:4}}><LIcon size={10} color={LCfg.color}/><span style={{...S.sb,color:"#444"}}>{LCfg.label} {LCfg.version}</span></div>
        </div>
      </div>

      {profileModal && <ProfileModal onClose={() => setProfileModal(false)}/>}
      {settingsModal && <SettingsModal onClose={() => setSettingsModal(false)} settings={settings} setSettings={setSettings}/>}

      {newFolderModal && (
        <div style={S.overlay} onMouseDown={e => { if (e.target === e.currentTarget) { setNewFolderModal(false); setNewFolderName(""); } }}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg, #c9a96e, #a87a3a)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <FaFolder size={12} color="#fff"/>
                </div>
                <span style={{fontSize:14,fontWeight:600,color:"#d4d4d4"}}>New Folder</span>
              </div>
              <button onClick={()=>{setNewFolderModal(false);setNewFolderName("");}} style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:6,cursor:"pointer",color:"#888",display:"flex",padding:"7px"}}><FaTimes size={11}/></button>
            </div>
            <label style={{display:"block",fontSize:11,color:"#444",marginBottom:6}}>Folder Name</label>
            <input autoFocus value={newFolderName} onChange={e=>setNewFolderName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&createFolder()}
              placeholder="my-folder"
              style={{width:"100%",background:"#080808",border:"1px solid #1e1e1e",borderRadius:7,padding:"0 12px",height:40,color:"#d4d4d4",fontSize:13,fontFamily:"'JetBrains Mono',monospace",outline:"none",marginBottom:20}}/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>{setNewFolderModal(false);setNewFolderName("");}} style={{background:"transparent",border:"1px solid #1e1e1e",borderRadius:6,padding:"8px 16px",fontSize:12,color:"#555",cursor:"pointer",fontFamily:"'Geist',sans-serif"}}>Cancel</button>
              <button onClick={createFolder} style={{background:"linear-gradient(135deg, #c9a96e, #a87a3a)",border:"none",borderRadius:6,padding:"8px 18px",fontSize:12,fontWeight:600,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"'Geist',sans-serif",boxShadow:"0 4px 12px rgba(201,169,110,0.3)"}}><FaFolder size={10}/> Create</button>
            </div>
          </div>
        </div>
      )}

      {folderCtxMenu && (
        <div style={{...S.ctxMenu,top:folderCtxMenu.y,left:folderCtxMenu.x}} onClick={e=>e.stopPropagation()}>
          <button style={S.ctxItem} onClick={()=>startRenameFolder(folderCtxMenu.id)}><FaEdit size={10} color="#555"/><span>Rename</span></button>
          <button style={S.ctxItem} onClick={()=>{setNewFileInFolder(folderCtxMenu.id);setFolderCtxMenu(null);setNewFileModal(true);}}><FaPlus size={10} color="#555"/><span>New File Here</span></button>
          <div style={{height:1,background:"#1a1a1a",margin:"2px 0"}}/>
          <button style={{...S.ctxItem,color:"#f87171"}} onClick={()=>deleteFolder(folderCtxMenu.id)}><FaTrash size={10} color="#f87171"/><span>Delete</span></button>
        </div>
      )}

      {newFileModal && (
        <div style={S.overlay} onMouseDown={e => { if (e.target === e.currentTarget) { setNewFileModal(false); setNewFileInFolder(null); } }}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{display:"flex", alignItems:"center", gap:10}}>
                <div style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg, #22c55e, #16a34a)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <FaPlus size={11} color="#fff"/>
                </div>
                <span style={{fontSize:14,fontWeight:600,color:"#d4d4d4"}}>New File{newFileInFolder ? ` in "${folders.find(f=>f.id===newFileInFolder)?.name||""}"` : ""}</span>
              </div>
              <button onClick={() => setNewFileModal(false)} style={{background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:6, cursor:"pointer", color:"#888", display:"flex", padding:"7px"}}><FaTimes size={11}/></button>
            </div>
            <label style={{display:"block",fontSize:11,color:"#444",marginBottom:6}}>File Name</label>
            <input autoFocus value={newFileName} onChange={e=>setNewFileName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createFile()}
              placeholder={`untitled.${LANGS[newFileLang]?.ext||"py"}`}
              style={{width:"100%",background:"#080808",border:"1px solid #1e1e1e",borderRadius:7,padding:"0 12px",height:40,color:"#d4d4d4",fontSize:13,fontFamily:"'JetBrains Mono',monospace",outline:"none",marginBottom:16}}/>
            <label style={{display:"block",fontSize:11,color:"#444",marginBottom:8}}>Language</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
              {Object.entries(LANGS).map(([key,cfg])=>{const I=cfg.icon;return(
                <button key={key} onClick={()=>setNewFileLang(key)} style={{display:"flex",alignItems:"center",gap:6,background:newFileLang===key?"#1a1a1a":"#0a0a0a",border:`1px solid ${newFileLang===key?"#3a3a3a":"#1e1e1e"}`,borderRadius:6,padding:"7px 11px",cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"all 0.15s"}}>
                  <I size={13} color={newFileLang===key?"#9aa3b0":"#444"}/><span style={{fontSize:11,color:newFileLang===key?"#aaa":"#444"}}>{cfg.label}</span>
                </button>);})}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>{setNewFileModal(false);setNewFileInFolder(null);}} style={{background:"transparent",border:"1px solid #1e1e1e",borderRadius:6,padding:"8px 16px",fontSize:12,color:"#555",cursor:"pointer",fontFamily:"'Geist',sans-serif"}}>Cancel</button>
              <button onClick={createFile} style={{background:"linear-gradient(135deg, #22c55e, #16a34a)",border:"none",borderRadius:6,padding:"8px 18px",fontSize:12,fontWeight:600,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"'Geist',sans-serif",boxShadow:"0 4px 12px rgba(34,197,94,0.3)"}}><FaPlus size={10}/> Create</button>
            </div>
          </div>
        </div>
      )}

      {ctxMenu && (
        <div style={{...S.ctxMenu,top:ctxMenu.y,left:ctxMenu.x}} onClick={e=>e.stopPropagation()}>
          <button style={S.ctxItem} onClick={()=>startRename(ctxMenu.id)}><FaEdit size={10} color="#555"/><span>Rename</span></button>
          <button style={S.ctxItem} onClick={()=>{setActiveId(ctxMenu.id);setCtxMenu(null);}}><FaFile size={10} color="#555"/><span>Open</span></button>
          <div style={{height:1,background:"#1a1a1a",margin:"2px 0"}}/>
          <button style={{...S.ctxItem,color:"#f87171"}} onClick={()=>deleteFile(ctxMenu.id)}><FaTrash size={10} color="#f87171"/><span>Delete</span></button>
        </div>
      )}

      {collabModal && (
        <div style={S.overlay} onMouseDown={e => { if (e.target === e.currentTarget) setCollabModal(false); }}>
          <div style={{...S.modal, width:480}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg, #22c55e, #16a34a)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <FaUsers size={12} color="#fff"/>
                </div>
                <span style={{fontSize:14,fontWeight:600,color:"#d4d4d4"}}>Collaborative Editing</span>
              </div>
              <button onClick={() => setCollabModal(false)} style={{background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:6, cursor:"pointer", color:"#888", display:"flex", padding:"7px"}}><FaTimes size={11}/></button>
            </div>

            {collab.roomId ? (
              <div>
                <div style={{background:"#091509",border:"1px solid #14401a",borderRadius:8,padding:"14px 16px",marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:11,color:"#22c55e",fontWeight:600}}>● Session Active</span>
                    <span style={{fontSize:10,color:"#444"}}>{collab.collabUsers.length} user{collab.collabUsers.length!==1?"s":""} online</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,background:"#0a0a0a",border:"1px solid #1e1e1e",borderRadius:6,padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:"#e5e5e5",letterSpacing:3,textAlign:"center",fontWeight:700}}>
                      {collab.roomId}
                    </div>
                    <button onClick={copyRoomId}
                      style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:6,padding:"8px 12px",cursor:"pointer",color:collabCopied?"#22c55e":"#666",fontSize:11,fontFamily:"'Geist',sans-serif",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                      <FaCopy size={10}/>{collabCopied?"Copied!":"Copy ID"}
                    </button>
                  </div>
                  <p style={{fontSize:10,color:"#444",marginTop:8,lineHeight:1.6}}>Share this room ID with your collaborator. Both editors sync in real-time.</p>
                </div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:10,color:"#3a3a3a",fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8}}>In This Room</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {collab.collabUsers.map(u => (
                      <div key={u.socketId} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",background:"#111",borderRadius:6,border:`1px solid ${u.color}22`}}>
                        <div style={{width:26,height:26,borderRadius:6,border:`2px solid ${u.color}`,background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:u.color,overflow:"hidden",flexShrink:0}}>
                          {u.avatar?<img src={u.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:u.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,color:"#d4d4d4",fontWeight:500}}>{u.name}</div>
                          <div style={{fontSize:10,color:"#444"}}>{u.email}</div>
                        </div>
                        <div style={{width:6,height:6,borderRadius:"50%",background:u.color}}/>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => { collab.leaveRoom(); setCollabModal(false); toast.show("Left collaboration room", "info"); }}
                  style={{width:"100%",height:40,border:"1px solid #3d1414",borderRadius:6,background:"#190a0a",color:"#f87171",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Geist',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <FaTimes size={10}/> Leave Session
                </button>
              </div>
            ) : (
              <div>
                <p style={{fontSize:12,color:"#555",lineHeight:1.7,marginBottom:20}}>
                  Start a session and share the room ID, or enter a friend's ID to join their session. Code, language, and cursors all sync live.
                </p>
                <div style={{background:"#080e08",border:"1px solid #142814",borderRadius:8,padding:"16px",marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#22c55e",marginBottom:6}}>Create a New Room</div>
                  <p style={{fontSize:11,color:"#444",lineHeight:1.6,marginBottom:12}}>You'll get a room ID to share. Your current file's code is the starting point.</p>
                  <button onClick={() => { createRoom(); setCollabModal(false); }}
                    disabled={collabStatus==="creating"}
                    style={{width:"100%",height:40,border:"none",borderRadius:6,background:"linear-gradient(135deg, #22c55e, #16a34a)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Geist',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6,opacity:collabStatus==="creating"?0.6:1,boxShadow:"0 4px 12px rgba(34,197,94,0.3)"}}>
                    {collabStatus==="creating"
                      ? <><div style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/> Creating…</>
                      : <><FaUsers size={11}/> Create Room</>}
                  </button>
                </div>
                <div style={{background:"#0a0a0a",border:"1px solid #1e1e1e",borderRadius:8,padding:"16px"}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:6}}>Join an Existing Room</div>
                  <p style={{fontSize:11,color:"#444",lineHeight:1.6,marginBottom:10}}>Enter the room ID your collaborator shared with you.</p>
                  <div style={{display:"flex",gap:8}}>
                    <input value={joinInput} onChange={e=>setJoinInput(e.target.value.toUpperCase())}
                      onKeyDown={e=>e.key==="Enter"&&joinRoom()}
                      placeholder="e.g. A3F9C2B1" maxLength={8}
                      style={{flex:1,background:"#080808",border:"1px solid #1e1e1e",borderRadius:6,padding:"0 12px",height:40,color:"#d4d4d4",fontSize:13,fontFamily:"'JetBrains Mono',monospace",outline:"none",letterSpacing:2}}/>
                    <button onClick={joinRoom} disabled={!joinInput.trim()}
                      style={{height:40,padding:"0 18px",border:"none",borderRadius:6,background:"#e5e5e5",color:"#080808",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Geist',sans-serif",opacity:!joinInput.trim()?0.4:1}}>
                      Join
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Geist:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#1f1f1f;border-radius:3px;}
        ::-webkit-scrollbar-thumb:hover{background:#2f2f2f;}
        input::placeholder,textarea::placeholder{color:#252525;}
        input:focus,textarea:focus,button:focus{outline:none;}
        button:hover{opacity:0.85;}
        button:active{transform:scale(0.97);}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes fade{0%,100%{opacity:0.15}50%{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:0.35}50%{opacity:1}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 5px rgba(59,130,246,0.3)}50%{box-shadow:0 0 15px rgba(59,130,246,0.6)}}
      `}</style>
    </div>
  );
}

const S = {
  root:{fontFamily:"'Geist',sans-serif",height:"100vh",background:"#0a0a0a",color:"#e5e5e5",display:"flex",flexDirection:"column",overflow:"hidden"},
  titlebar:{height:40,background:"#0f0f0f",borderBottom:"1px solid #181818",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",flexShrink:0,zIndex:20},
  tbLeft:{display:"flex",alignItems:"center",gap:14,minWidth:180},
  winDots:{display:"flex",gap:6},
  dot:{width:11,height:11,borderRadius:"50%",cursor:"pointer"},
  dot2:{width:5,height:5,borderRadius:"50%",background:"#666",flexShrink:0},
  brand:{display:"flex",alignItems:"center",gap:7},
  brandBox:{width:21,height:21,background:"linear-gradient(135deg, #e5e5e5, #aaa)",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center"},
  brandTxt:{fontSize:13,fontWeight:700,color:"#c4c4c4",letterSpacing:-0.3},
  tabs:{display:"flex",alignItems:"center",flex:1,justifyContent:"center",overflow:"hidden"},
  tab:{display:"flex",alignItems:"center",gap:5,padding:"0 12px",height:40,fontSize:11,color:"#484848",cursor:"pointer",border:"none",background:"transparent",borderBottom:"2px solid transparent",whiteSpace:"nowrap",flexShrink:0,fontFamily:"'Geist',sans-serif",transition:"all 0.15s"},
  tabOn:{color:"#c4c4c4",borderBottomColor:"#c4c4c4",background:"#0a0a0a"},
  tabX:{background:"none",border:"none",color:"#444",padding:1,display:"flex",alignItems:"center",borderRadius:2,cursor:"pointer",marginLeft:2},
  tabNew:{background:"none",border:"none",color:"#333",padding:"0 8px",height:40,display:"flex",alignItems:"center",cursor:"pointer",flexShrink:0},
  tbRight:{display:"flex",alignItems:"center",gap:6,minWidth:180,justifyContent:"flex-end"},
  livePill:{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#22c55e",background:"#0a1a0a",border:"1px solid #142814",borderRadius:5,padding:"2px 8px",fontWeight:500},
  liveDot:{width:5,height:5,borderRadius:"50%",background:"#22c55e",display:"inline-block",animation:"pulse 2s ease-in-out infinite"},
  ico:{background:"none",border:"none",color:"#484848",cursor:"pointer",padding:5,display:"flex",alignItems:"center",borderRadius:4,transition:"all 0.15s"},
  userBtn:{display:"flex",alignItems:"center",gap:7,background:"transparent",border:"1px solid #181818",borderRadius:7,padding:"4px 9px",cursor:"pointer",transition:"all 0.15s"},
  userAv:{width:22,height:22,borderRadius:5,background:"linear-gradient(135deg, #1a1a1a, #0a0a0a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#666"},
  userTxt:{fontSize:12,fontWeight:500,color:"#666"},
  ddMenu:{position:"absolute",top:"calc(100% + 6px)",right:0,background:"#0f0f0f",border:"1px solid #181818",borderRadius:10,width:240,boxShadow:"0 20px 60px rgba(0,0,0,0.8)",zIndex:200,overflow:"hidden",animation:"slideIn 0.12s ease"},
  ddTop:{display:"flex",alignItems:"center",gap:10,padding:"14px"},
  ddAv:{width:34,height:34,borderRadius:8,background:"linear-gradient(135deg, #1a1a1a, #0a0a0a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#555",flexShrink:0},
  ddDiv:{height:1,background:"#141414",margin:"2px 0"},
  ddItem:{display:"flex",alignItems:"center",gap:9,width:"100%",background:"transparent",border:"none",color:"#666",cursor:"pointer",padding:"10px 14px",fontSize:12,fontFamily:"'Geist',sans-serif",textAlign:"left",transition:"all 0.15s"},
  body:{display:"flex",flex:1,overflow:"hidden"},
  actBar:{width:44,background:"#0f0f0f",borderRight:"1px solid #181818",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:4,flexShrink:0},
  actBtn:{width:44,height:44,background:"none",border:"none",color:"#303030",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",transition:"all 0.15s"},
  actOn:{color:"#c4c4c4"},
  actBar2:{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:2,height:18,background:"#c4c4c4",borderRadius:"0 1px 1px 0"},
  sidebar:{width:224,background:"#0f0f0f",borderRight:"1px solid #181818",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"},
  sbHead:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px 8px",borderBottom:"1px solid #141414",flexShrink:0},
  sbTitle:{fontSize:9,fontWeight:700,color:"#3a3a3a",letterSpacing:1,textTransform:"uppercase"},
  sbBtn:{background:"none",border:"none",color:"#3a3a3a",cursor:"pointer",padding:3,display:"flex",alignItems:"center",borderRadius:3,transition:"all 0.15s"},
  treeSection:{display:"flex",alignItems:"center",gap:5,padding:"4px 14px",fontSize:9,color:"#2a2a2a",fontWeight:700,letterSpacing:0.8},
  treeRow:{display:"flex",alignItems:"center",padding:"4px 14px",cursor:"pointer",gap:0,transition:"background 0.1s"},
  treeRowOn:{background:"#141414"},
  sbAction:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,background:"#141414",border:"1px solid #1a1a1a",borderRadius:5,padding:"5px 0",fontSize:10,color:"#555",cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"all 0.15s"},
  edCol:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  edBar:{height:36,background:"#0f0f0f",borderBottom:"1px solid #181818",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px",flexShrink:0},
  sep:{width:1,height:13,background:"#181818",margin:"0 3px"},
  meta:{fontSize:10,color:"#2a2a2a",fontFamily:"'JetBrains Mono',monospace"},
  langBtn:{background:"transparent",border:"1px solid transparent",cursor:"pointer",borderRadius:5,padding:"2px 8px",display:"flex",alignItems:"center",gap:4,fontFamily:"'Geist',sans-serif",transition:"all 0.15s"},
  runBtn:{display:"flex",alignItems:"center",gap:6,border:"none",borderRadius:6,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"all 0.15s"},
  runGo:{background:"linear-gradient(135deg, #22c55e, #16a34a)",color:"#fff",boxShadow:"0 2px 10px rgba(34,197,94,0.35)",border:"none"},
  runStop:{background:"linear-gradient(135deg, #ef4444, #dc2626)",color:"#fff",border:"none",boxShadow:"0 2px 10px rgba(239,68,68,0.35)"},
  term:{background:"#080808",borderTop:"1px solid #181818",display:"flex",flexDirection:"column",flexShrink:0,transition:"height 0.2s ease"},
  termBar:{height:34,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px",borderBottom:"1px solid #111",flexShrink:0},
  timeBadge:{fontSize:10,color:"#22c55e",background:"#0a1a0a",border:"1px solid #142814",borderRadius:4,padding:"1px 7px",fontFamily:"'JetBrains Mono',monospace"},
  termBody:{flex:1,overflowY:"auto",padding:"10px 16px",fontFamily:"'JetBrains Mono',monospace",cursor:"text"},
  rightPanel:{width:194,background:"#0f0f0f",borderLeft:"1px solid #181818",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"},
  mpHead:{fontSize:9,fontWeight:700,color:"#2a2a2a",letterSpacing:1,textTransform:"uppercase",marginBottom:8},
  mpDiv:{height:1,background:"#141414"},
  statusBar:{height:22,background:"#0f0f0f",borderTop:"1px solid #141414",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",flexShrink:0},
  sb:{fontSize:10,color:"#2a2a2a"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,animation:"fadeIn 0.15s ease"},
  modal:{background:"#0f0f0f",border:"1px solid #1e1e1e",borderRadius:12,padding:"24px",width:440,boxShadow:"0 24px 80px rgba(0,0,0,0.8)",animation:"modalIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)"},
  ctxMenu:{position:"fixed",background:"#111",border:"1px solid #1a1a1a",borderRadius:8,width:160,boxShadow:"0 12px 40px rgba(0,0,0,0.8)",zIndex:400,overflow:"hidden",animation:"slideIn 0.1s ease"},
  ctxItem:{display:"flex",alignItems:"center",gap:9,width:"100%",background:"transparent",border:"none",color:"#666",cursor:"pointer",padding:"9px 12px",fontSize:12,fontFamily:"'Geist',sans-serif",textAlign:"left",transition:"all 0.1s"},
};

/* ─────────────────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────────────────── */
function AppRouter() {
  const { user, loading } = useAuth();
  const { route, navigate } = useRoute();

  if (loading) return (
    <div style={{ minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16 }}>
      <div style={{ width:36,height:36,border:"3px solid #1a1a1a",borderTopColor:"#aaa",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
      <span style={{ color:"#333",fontSize:12,fontFamily:"'Geist',sans-serif" }}>Loading CloudIDE…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (user) return <IDE/>;

  if (route === "verify-email")   return <VerifyEmail   navigate={navigate}/>;
  if (route === "reset-password") return <ResetPassword navigate={navigate}/>;
  if (route === "signup")         return <SignUp         navigate={navigate}/>;
  if (route === "forgot")         return <ForgotPassword navigate={navigate}/>;
  return <SignIn navigate={navigate}/>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter/>
      </ToastProvider>
    </AuthProvider>
  );
}
