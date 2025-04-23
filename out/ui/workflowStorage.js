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
exports.WorkflowStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const WORKFLOWS_FILENAME = 'codessa_workflows.json';
class WorkflowStorage {
    static getStoragePath(context) {
        // Prefer workspace storage, fallback to extension global storage
        const storagePath = context.storageUri?.fsPath || context.globalStorageUri.fsPath;
        return path.join(storagePath, WORKFLOWS_FILENAME);
    }
    static async loadWorkflows(context) {
        const filePath = WorkflowStorage.getStoragePath(context);
        try {
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(raw);
            }
        }
        catch (err) {
            console.error('Failed to load workflows:', err);
        }
        return [];
    }
    static async saveWorkflows(context, workflows) {
        const filePath = WorkflowStorage.getStoragePath(context);
        try {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(workflows, null, 2), 'utf8');
        }
        catch (err) {
            console.error('Failed to save workflows:', err);
        }
    }
}
exports.WorkflowStorage = WorkflowStorage;
//# sourceMappingURL=workflowStorage.js.map