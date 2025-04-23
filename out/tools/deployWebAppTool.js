"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployWebAppTool = exports.DeployWebAppTool = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
const advancedWebTools_1 = require("./advancedWebTools");
class DeployWebAppTool {
    constructor() {
        this.id = 'deployWebApp';
        this.name = 'Deploy Web App (Advanced)';
        this.description = 'Deploys web apps and manages deployment status with advanced options.';
        this.actions = {
            'deploy': {
                id: 'deploy', name: 'Deploy Web App', description: 'Deploy a JavaScript web application using a deployment provider.',
                inputSchema: { type: 'object', properties: { projectPath: { type: 'string' }, provider: { type: 'string' }, args: { type: 'string' } }, required: ['projectPath', 'provider'] },
                async execute(input) {
                    const projectPath = input.projectPath;
                    const provider = input.provider;
                    const args = input.args || '';
                    if (!projectPath || !provider) {
                        return { success: false, error: "'projectPath' and 'provider' are required." };
                    }
                    let cwd = projectPath;
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 && !projectPath.match(/^.:\\/) && !projectPath.startsWith('/')) {
                        cwd = vscode.workspace.workspaceFolders[0].uri.fsPath + '/' + projectPath;
                    }
                    let command = '';
                    if (provider === 'netlify') {
                        command = `npx netlify deploy --dir . ${args}`;
                    }
                    else if (provider === 'vercel') {
                        command = `npx vercel --prod ${args}`;
                    }
                    else {
                        return { success: false, error: `Unsupported provider: ${provider}` };
                    }
                    try {
                        const result = await new Promise((resolve, reject) => {
                            cp.exec(command, { cwd }, (err, stdout, stderr) => {
                                if (err && !stdout)
                                    return reject(stderr || err.message);
                                resolve(stdout || stderr);
                            });
                        });
                        return { success: true, output: result.trim() };
                    }
                    catch (error) {
                        return { success: false, error: `Deployment failed: ${error.message || error}` };
                    }
                }
            },
            'status': new advancedWebTools_1.WebDeployStatusTool(),
        };
    }
    async execute(input, context) {
        const actionId = input.action || 'deploy';
        const actionTool = this.actions[actionId];
        if (!actionTool) {
            return { success: false, error: `Unknown deploy action: ${actionId}. Available actions: ${Object.keys(this.actions).join(', ')}` };
        }
        const actionInput = { ...input };
        delete actionInput.action;
        return actionTool.execute(actionInput, context);
    }
}
exports.DeployWebAppTool = DeployWebAppTool;
exports.deployWebAppTool = new DeployWebAppTool();
//# sourceMappingURL=deployWebAppTool.js.map