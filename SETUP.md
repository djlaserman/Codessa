# Codessa Setup Guide

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. If you encounter TypeScript errors, install the following packages:

```bash
npm install @types/diff --save-dev
npm install openai axios --save
```

4. Compile the extension:

```bash
npm run compile
```

5. Press F5 in VS Code to launch the extension in debug mode

## Configuration

The extension requires configuration for the different LLM providers:

1. For OpenAI:
   - Set your API key in `Settings > Codessa > Providers > OpenAI > API Key`

2. For Ollama:
   - Install Ollama locally: https://ollama.com/
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