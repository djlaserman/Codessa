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
exports.FileChunkingService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../../logger");
const config_1 = require("../../config");
const text_splitter_1 = require("langchain/text_splitter");
const types_1 = require("../types");
const langchainMemory_1 = require("./langchainMemory");
const uuid_1 = require("uuid");
/**
 * File chunking service
 * Handles chunking files into smaller pieces for memory storage
 */
class FileChunkingService {
    /**
     * Chunk a file and store in memory
     * @param filePath Path to the file
     * @returns Array of memory entries
     */
    static async chunkFile(filePath) {
        try {
            // Read file
            const content = fs.readFileSync(filePath, 'utf-8');
            // Get file extension
            const extension = path.extname(filePath).toLowerCase();
            // Get chunking settings
            const chunkSize = (0, config_1.getConfig)('memory.fileChunking.chunkSize', 1000);
            const chunkOverlap = (0, config_1.getConfig)('memory.fileChunking.chunkOverlap', 200);
            const maxChunksPerFile = (0, config_1.getConfig)('memory.fileChunking.maxChunksPerFile', 100);
            // Create text splitter
            const splitter = new text_splitter_1.RecursiveCharacterTextSplitter({
                chunkSize,
                chunkOverlap,
                separators: this.getSeparatorsForExtension(extension)
            });
            // Split text into chunks
            const chunks = await splitter.splitText(content);
            // Limit number of chunks
            const limitedChunks = chunks.slice(0, maxChunksPerFile);
            // Create memory entries
            const memoryEntries = [];
            for (let i = 0; i < limitedChunks.length; i++) {
                const chunk = limitedChunks[i];
                // Create memory entry
                const memoryEntry = {
                    id: `file_chunk_${(0, uuid_1.v4)()}`,
                    content: chunk,
                    timestamp: Date.now(),
                    metadata: {
                        source: types_1.MemorySource.FILE,
                        type: types_1.MemoryType.FILE,
                        filePath,
                        extension,
                        chunkIndex: i,
                        totalChunks: limitedChunks.length,
                        tags: ['file', `ext:${extension.replace('.', '')}`]
                    }
                };
                // Add to memory
                const addedEntry = await langchainMemory_1.langchainMemoryProvider.addMemory({
                    content: memoryEntry.content,
                    metadata: memoryEntry.metadata
                });
                memoryEntries.push(addedEntry);
            }
            logger_1.logger.info(`Chunked file ${filePath} into ${memoryEntries.length} chunks`);
            return memoryEntries;
        }
        catch (error) {
            logger_1.logger.error(`Failed to chunk file ${filePath}:`, error);
            throw error;
        }
    }
    /**
     * Chunk a workspace folder and store in memory
     * @param folderPath Path to the folder
     * @param includePatterns Array of glob patterns to include
     * @param excludePatterns Array of glob patterns to exclude
     * @returns Array of memory entries
     */
    static async chunkWorkspace(folderPath, includePatterns = ['**/*.{js,ts,jsx,tsx,py,java,c,cpp,cs,go,rb,php,html,css,md,json}'], excludePatterns = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']) {
        try {
            // Find files
            const files = await vscode.workspace.findFiles(includePatterns.length === 1 ? includePatterns[0] : `{${includePatterns.join(',')}}`, excludePatterns.length === 1 ? excludePatterns[0] : `{${excludePatterns.join(',')}}`);
            // Chunk each file
            const memoryEntries = [];
            for (const file of files) {
                try {
                    const fileEntries = await this.chunkFile(file.fsPath);
                    memoryEntries.push(...fileEntries);
                }
                catch (error) {
                    logger_1.logger.error(`Failed to chunk file ${file.fsPath}:`, error);
                    // Continue with next file
                }
            }
            logger_1.logger.info(`Chunked workspace ${folderPath} into ${memoryEntries.length} chunks from ${files.length} files`);
            return memoryEntries;
        }
        catch (error) {
            logger_1.logger.error(`Failed to chunk workspace ${folderPath}:`, error);
            throw error;
        }
    }
    /**
     * Get separators for file extension
     * @param extension File extension
     * @returns Array of separators
     */
    static getSeparatorsForExtension(extension) {
        // Default separators
        const defaultSeparators = ['\n\n', '\n', ' ', ''];
        switch (extension) {
            case '.js':
            case '.ts':
            case '.jsx':
            case '.tsx':
            case '.java':
            case '.c':
            case '.cpp':
            case '.cs':
            case '.go':
                return [
                    '\nfunction ', '\nclass ', '\ninterface ', '\nenum ', '\nconst ', '\nlet ', '\nvar ',
                    '\nexport ', '\nimport ', '\n\n', '\n', ' ', ''
                ];
            case '.py':
                return [
                    '\ndef ', '\nclass ', '\n\n', '\n', ' ', ''
                ];
            case '.rb':
                return [
                    '\ndef ', '\nclass ', '\nmodule ', '\n\n', '\n', ' ', ''
                ];
            case '.php':
                return [
                    '\nfunction ', '\nclass ', '\ninterface ', '\ntrait ', '\n\n', '\n', ' ', ''
                ];
            case '.html':
            case '.xml':
                return [
                    '>\n<', '>\n  <', '>\n    <', '>\n', '\n<', '\n', ' ', ''
                ];
            case '.md':
                return [
                    '\n## ', '\n### ', '\n#### ', '\n##### ', '\n###### ',
                    '\n- ', '\n* ', '\n1. ', '\n\n', '\n', ' ', ''
                ];
            case '.json':
                return [
                    ',\n  "', ',\n    "', ',\n', '\n', ' ', ''
                ];
            default:
                return defaultSeparators;
        }
    }
}
exports.FileChunkingService = FileChunkingService;
//# sourceMappingURL=fileChunking.js.map