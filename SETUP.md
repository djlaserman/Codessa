# Codessa Setup Guide

This guide will help you install, configure, and launch Codessa for development or use in Visual Studio Code.

---

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/djlaserman/codessa.git
   cd codessa
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **(Optional) If you encounter TypeScript or dependency errors:**
   ```bash
   npm install @types/diff --save-dev
   npm install openai axios --save
   # Add any other provider SDKs as needed
   ```

4. **Compile the extension:**
   ```bash
   npm run compile
   ```

5. **Launch in VS Code:**
   - Open the folder in VS Code
   - Press `F5` to start the extension in debug mode

---

## Configuration

Codessa supports multiple LLM providers. Configure your providers in VS Code settings:

### 1. OpenAI
- Set your API key in `Settings > Codessa > Providers > OpenAI > API Key`

### 2. Ollama (Local Models)
- Download and install from [ollama.com](https://ollama.com/)
- Run `ollama serve` to start the server
- Default URL: `http://localhost:11434`
   - Run `ollama serve` to start the server
   - The default URL is http://localhost:11434

3. For Google AI (Gemini) and Mistral AI:
   - Set API keys in the appropriate settings

## Troubleshooting

### TypeScript errors:

If you see errors about missing modules:

1. Check that you've installed all dependencies with `npm install`
2. Make sure tsconfig.json has the correct lib settings:
   ```json
   "lib": ["ES2020", "DOM"]
   ```
3. Use the .npmrc settings provided in this repository

### Extension not loading:

1. Check the Developer Console (Help > Toggle Developer Tools)
2. Ensure you have the right VS Code version (1.85.0+)
3. Check extension logs in the "Codessa" output channel 