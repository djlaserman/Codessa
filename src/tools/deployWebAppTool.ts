import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import { WebDeployStatusTool } from './advancedWebTools';

export class DeployWebAppTool implements ITool {
    readonly id = 'deployWebApp';
    readonly name = 'Deploy Web App (Advanced)';
    readonly description = 'Deploys web apps and manages deployment status with advanced options.';
    readonly actions: { [key: string]: ITool } = {
        'deploy': {
            id: 'deploy', name: 'Deploy Web App', description: 'Deploy a JavaScript web application using a deployment provider.',
            inputSchema: { type: 'object', properties: { projectPath: { type: 'string' }, provider: { type: 'string' }, args: { type: 'string' } }, required: ['projectPath', 'provider'] },
            async execute(input: ToolInput) {
                const projectPath = input.projectPath as string;
                const provider = input.provider as string;
                const args = input.args as string || '';
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
                } else if (provider === 'vercel') {
                    command = `npx vercel --prod ${args}`;
                } else {
                    return { success: false, error: `Unsupported provider: ${provider}` };
                }
                try {
                    const result = await new Promise<string>((resolve, reject) => {
                        cp.exec(command, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout) return reject(stderr || err.message);
                            resolve(stdout || stderr);
                        });
                    });
                    return { success: true, output: result.trim() };
                } catch (error: any) {
                    return { success: false, error: `Deployment failed: ${error.message || error}` };
                }
            }
        },
        'status': new WebDeployStatusTool(),
    };
    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        const actionId = input.action as string || 'deploy';
        const actionTool = this.actions[actionId];
        if (!actionTool) {
            return { success: false, error: `Unknown deploy action: ${actionId}. Available actions: ${Object.keys(this.actions).join(', ')}` };
        }
        const actionInput = { ...input };
        delete actionInput.action;
        return actionTool.execute(actionInput, context);
    }
}

export const deployWebAppTool = new DeployWebAppTool();
