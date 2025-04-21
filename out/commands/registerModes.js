"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModes = registerModes;
const operationMode_1 = require("../modes/operationMode");
const askMode_1 = require("../modes/askMode");
const chatMode_1 = require("../modes/chatMode");
const debugMode_1 = require("../modes/debugMode");
const editMode_1 = require("../modes/editMode");
const agentMode_1 = require("../modes/agentMode");
const multiAgentMode_1 = require("../modes/multiAgentMode");
const logger_1 = require("../logger");
/**
 * Register all operation modes
 */
async function registerModes(context) {
    try {
        logger_1.logger.info('Registering operation modes...');
        // Register modes
        operationMode_1.operationModeRegistry.registerMode(new askMode_1.AskMode());
        operationMode_1.operationModeRegistry.registerMode(new chatMode_1.ChatMode());
        operationMode_1.operationModeRegistry.registerMode(new debugMode_1.DebugMode());
        operationMode_1.operationModeRegistry.registerMode(new editMode_1.EditMode());
        operationMode_1.operationModeRegistry.registerMode(new agentMode_1.AgentMode());
        operationMode_1.operationModeRegistry.registerMode(new multiAgentMode_1.MultiAgentMode());
        // Set default mode
        operationMode_1.operationModeRegistry.setDefaultMode('chat');
        // Initialize modes
        await operationMode_1.operationModeRegistry.initializeModes(context);
        logger_1.logger.info('Operation modes registered successfully');
    }
    catch (error) {
        logger_1.logger.error('Error registering operation modes:', error);
        throw error;
    }
}
//# sourceMappingURL=registerModes.js.map