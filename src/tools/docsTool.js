"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentationTool = exports.DocumentationTool = void 0;
var logger_1 = require("../logger");
var llmService_1 = require("../llm/llmService");
/**
 * A tool for searching documentation or asking general knowledge questions.
 * This is currently implemented as a pass-through to the LLM, but could be extended
 * to use web search or other documentation sources.
 */
var DocumentationTool = /** @class */ (function () {
    function DocumentationTool() {
        this.id = 'docs';
        this.name = 'Documentation Search';
        this.description = 'Searches for technical documentation or answers general knowledge questions.';
        this.inputSchema = {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The search or documentation query.' }
            },
            required: ['query']
        };
        // Configuration for the LLM to use for research
        this.researchLLMConfig = {
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            options: { temperature: 0.3 }
        };
    }
    DocumentationTool.prototype.execute = function (input, _context) {
        return __awaiter(this, void 0, void 0, function () {
            var query, provider, systemPrompt, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = input.query;
                        if (!query) {
                            return [2 /*return*/, { success: false, error: "'query' parameter is required." }];
                        }
                        logger_1.logger.info("Documentation search requested for: \"".concat(query, "\""));
                        // In a real implementation, we might call a search API or a dedicated service
                        // For now, let's use the LLM as a fallback
                        logger_1.logger.warn("Using LLM for documentation search. This may not be accurate for recent information.");
                        provider = llmService_1.llmService.getProviderForConfig(this.researchLLMConfig);
                        if (!provider) {
                            return [2 /*return*/, { success: false, error: "LLM provider for documentation search not found or configured." }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        systemPrompt = "You are a documentation researcher. Your task is to answer the following query with accurate, technical information.\nBe concise but thorough. Include code examples where appropriate. If you don't know the answer, say so instead of making things up.\nOnly answer what is asked - do not try to provide additional information beyond the scope of the query.";
                        return [4 /*yield*/, provider.generate({
                                prompt: query,
                                systemPrompt: systemPrompt,
                                modelId: this.researchLLMConfig.modelId,
                                options: this.researchLLMConfig.options
                            })];
                    case 2:
                        result = _a.sent();
                        if (result.error) {
                            return [2 /*return*/, { success: false, error: "Documentation search failed: ".concat(result.error) }];
                        }
                        return [2 /*return*/, { success: true, output: result.content }];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error("Error during documentation search for query \"".concat(query, "\":"), error_1);
                        return [2 /*return*/, { success: false, error: "Documentation search failed: ".concat(error_1.message || error_1) }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return DocumentationTool;
}());
exports.DocumentationTool = DocumentationTool;
exports.documentationTool = new DocumentationTool();
