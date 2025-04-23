# Codessa - The goddess of code

Codessa is a powerful, agentic AI coding assistant for Visual Studio Code. It integrates multiple large language model (LLM) providers—including OpenAI, Ollama (local models), Google AI (Gemini), and Mistral AI—directly into your development workflow. Codessa is open source for non-commercial use (GPL-3.0), with a dual license for commercial users (see License section below).

## Features

- **Multi-Provider Support**: Seamlessly use OpenAI, Ollama (local models), Google Gemini, Mistral, and more
- **Agentic Superpowers**: Customizable AI agents for code generation, editing, refactoring, and documentation
- **Powerful Tools**: File operations, documentation search, diff/patch, and more
- **Code Generation & Editing**: Generate and edit code using natural language prompts
- **Custom Agents**: Create specialized agents for different tasks and workflows
- **Extensible**: Easily add new providers, agents, or tools
- **Open Source for Non-Commercial Use**: Contribute and collaborate under GPL-3.0

---

## Installation

Install from the VS Code Marketplace or manually:

1. Clone this repository
2. Install dependencies: `npm install`
3. Compile: `npm run compile`
4. Press F5 in VS Code to launch in debug mode

---

## Configuration

Codessa requires configuration to connect to your chosen LLM providers.

### OpenAI
- Set your API key in the extension settings:  
  **Settings** > **Codessa** > **Providers** > **OpenAI** > **API Key**

### Ollama (Local Models)
1. Install Ollama from [ollama.com](https://ollama.com/)
2. Run `ollama serve` to start the server
3. The default URL is `http://localhost:11434`

### Other Providers
- Configure additional providers via the Codessa settings panel.

---

## Usage

Codessa provides several commands accessible from the Command Palette (`Ctrl+Shift+P`):

- `Codessa: Run General Task with Agent...` — Run a task with AI
- `Codessa: Edit Code with Agent...` — Edit selected code with AI
- `Codessa: Generate Code with Agent...` — Generate new code using AI
- `Codessa: Configure Settings...` — Access extension settings

Agents have access to tools for file operations, code search, and more. Codessa is designed for extensibility and advanced workflows.

---

## Development

### Building and Running

```bash
npm install
npm run compile
```

Press F5 in VS Code to launch with debugging.

### Project Structure
- Standard VS Code extension layout
- Core logic in `src/`
- Provider abstraction for LLMs
- Agent framework and tool system
- UI components for settings and workflows

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to participate in Codessa development.

- Fork the repository and submit pull requests
- Report bugs and request features via GitHub Issues
- All contributors must follow the Code of Conduct

---

## License

**Dual License Model:**

- **Open Source (Default):**
  - Codessa is licensed under the GNU General Public License v3.0 (GPL-3.0) for non-commercial use.  
    See [LICENSE](LICENSE) for details.
  - You must disclose source code for any distributed version and retain copyright.
- **Commercial License:**
  - For proprietary or commercial use (without GPL-3.0 obligations), you must obtain a separate commercial license.
  - Contact the author (djlaserman@gmail.com) for arrangements and written permission.

| Use Case                 | License    | Source Disclosure | Contact Required? |
|--------------------------|------------|-------------------|-------------------|
| Open-Source Projects     | GPL-3.0    | Yes               | No                |
| Proprietary / Commercial | Commercial | No                | Yes               |

---

## Contact

- Email: djlaserman@gmail.com
- GitHub: [djlaserman](https://github.com/djlaserman)

---

© 2025 Isaki Dube. All rights reserved.

---

## Installation

Install from the VS Code Marketplace or download from GitHub and follow these steps:

1. Clone this repository
2. Install dependencies: `npm install`
3. Compile: `npm run compile`
4. Press F5 in VS Code to launch in debug mode

## Configuration

Codessa requires configuration to connect to LLM providers:

### OpenAI

Set your API key in the extension settings:
- **Settings** > **Codessa** > **Providers** > **OpenAI** > **API Key**

### Ollama (Local Models)

1. Install Ollama from [ollama.com](https://ollama.com/)
2. Run `ollama serve` to start the server
3. The default URL is `http://localhost:11434`

## Usage

Codessa provides several commands accessible from the Command Palette (Ctrl+Shift+P):

- `Codessa: Run General Task with Agent...` - Run a task with AI
- `Codessa: Edit Code with Agent...` - Edit selected code with AI
- `Codessa: Generate Code with Agent...` - Generate new code using AI
- `Codessa: Configure Settings...` - Access extension settings

## Tools

Codessa provides agents with access to tools:

