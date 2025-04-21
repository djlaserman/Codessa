"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptManager = void 0;
var config_1 = require("../config");
var logger_1 = require("../logger");
var defaultPrompts_1 = require("./defaultPrompts");
var PromptManager = /** @class */ (function () {
    function PromptManager() {
        this.systemPrompts = {};
        this.variables = {};
        this.loadPrompts();
        this.loadVariables();
    }
    PromptManager.prototype.loadPrompts = function () {
        var userPrompts = (0, config_1.getSystemPrompts)();
        // Merge default and user prompts, user prompts override defaults
        this.systemPrompts = __assign(__assign({}, defaultPrompts_1.defaultSystemPrompts), userPrompts);
        logger_1.logger.info("Loaded ".concat(Object.keys(this.systemPrompts).length, " system prompts."));
    };
    PromptManager.prototype.loadVariables = function () {
        this.variables = (0, config_1.getPromptVariables)();
        logger_1.logger.info("Loaded ".concat(Object.keys(this.variables).length, " prompt variables."));
    };
    PromptManager.prototype.getSystemPrompt = function (name, additionalVars) {
        if (additionalVars === void 0) { additionalVars = {}; }
        var promptTemplate = this.systemPrompts[name];
        if (!promptTemplate) {
            logger_1.logger.warn("System prompt named '".concat(name, "' not found."));
            // Fallback to a generic default if name not found
            promptTemplate = this.systemPrompts['default_coder'];
            if (!promptTemplate)
                return undefined; // No fallback either
        }
        // Combine global and task-specific variables
        var allVars = __assign(__assign({}, this.variables), additionalVars);
        // Replace placeholders like {variable_name}
        try {
            var filledPrompt = promptTemplate.replace(/\{(\w+)\}/g, function (match, varName) {
                return allVars[varName] !== undefined ? String(allVars[varName]) : match; // Keep placeholder if var not found
            });
            return filledPrompt;
        }
        catch (error) {
            logger_1.logger.error("Error processing prompt template '".concat(name, "':"), error);
            return promptTemplate; // Return unprocessed template on error
        }
    };
    PromptManager.prototype.listPromptNames = function () {
        return Object.keys(this.systemPrompts);
    };
    /**
     * Gets the description of a prompt by extracting the first line or returning a default
     */
    PromptManager.prototype.getPromptDescription = function (name) {
        var promptTemplate = this.systemPrompts[name];
        if (!promptTemplate)
            return undefined;
        // Extract the first line as the description
        var firstLine = promptTemplate.split('\n')[0].trim();
        if (firstLine.startsWith('#') || firstLine.startsWith('//')) {
            return firstLine.replace(/^[#/\s]+/, '').trim();
        }
        return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
    };
    return PromptManager;
}());
exports.promptManager = new PromptManager();
