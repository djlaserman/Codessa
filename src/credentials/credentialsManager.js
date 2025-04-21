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
exports.credentialsManager = exports.CredentialsManager = void 0;
var logger_1 = require("../logger");
/**
 * Manages secure storage and retrieval of API credentials
 * using VS Code's built-in SecretStorage API
 */
var CredentialsManager = /** @class */ (function () {
    function CredentialsManager(context) {
        this.keyPrefix = 'codessa.credentials.';
        this.secretStorage = context.secrets;
    }
    /**
     * Get the singleton instance of CredentialsManager
     */
    CredentialsManager.getInstance = function (context) {
        if (!CredentialsManager.instance) {
            if (!context) {
                throw new Error('CredentialsManager must be initialized with a context first');
            }
            CredentialsManager.instance = new CredentialsManager(context);
        }
        return CredentialsManager.instance;
    };
    /**
     * Store a credential securely
     * @param providerId The ID of the provider (e.g., 'openai', 'anthropic')
     * @param key The key name (e.g., 'apiKey', 'organizationId')
     * @param value The value to store
     */
    CredentialsManager.prototype.storeCredential = function (providerId, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var storageKey, error_1, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        storageKey = this.getStorageKey(providerId, key);
                        return [4 /*yield*/, this.secretStorage.store(storageKey, value)];
                    case 1:
                        _a.sent();
                        logger_1.logger.info("Stored credential for ".concat(providerId, ".").concat(key));
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        logger_1.logger.error("Failed to store credential for ".concat(providerId, ".").concat(key, ":"), error_1);
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        throw new Error("Failed to store credential: ".concat(errorMessage));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Retrieve a credential
     * @param providerId The ID of the provider
     * @param key The key name
     * @returns The stored value, or undefined if not found
     */
    CredentialsManager.prototype.getCredential = function (providerId, key) {
        return __awaiter(this, void 0, void 0, function () {
            var storageKey, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        storageKey = this.getStorageKey(providerId, key);
                        return [4 /*yield*/, this.secretStorage.get(storageKey)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error("Failed to retrieve credential for ".concat(providerId, ".").concat(key, ":"), error_2);
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete a stored credential
     * @param providerId The ID of the provider
     * @param key The key name
     */
    CredentialsManager.prototype.deleteCredential = function (providerId, key) {
        return __awaiter(this, void 0, void 0, function () {
            var storageKey, error_3, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        storageKey = this.getStorageKey(providerId, key);
                        return [4 /*yield*/, this.secretStorage.delete(storageKey)];
                    case 1:
                        _a.sent();
                        logger_1.logger.info("Deleted credential for ".concat(providerId, ".").concat(key));
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error("Failed to delete credential for ".concat(providerId, ".").concat(key, ":"), error_3);
                        errorMessage = error_3 instanceof Error ? error_3.message : String(error_3);
                        throw new Error("Failed to delete credential: ".concat(errorMessage));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if a credential exists
     * @param providerId The ID of the provider
     * @param key The key name
     */
    CredentialsManager.prototype.hasCredential = function (providerId, key) {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCredential(providerId, key)];
                    case 1:
                        value = _a.sent();
                        return [2 /*return*/, value !== undefined];
                }
            });
        });
    };
    /**
     * Generate the storage key for a credential
     */
    CredentialsManager.prototype.getStorageKey = function (providerId, key) {
        return "".concat(this.keyPrefix).concat(providerId, ".").concat(key);
    };
    return CredentialsManager;
}());
exports.CredentialsManager = CredentialsManager;
// Export singleton instance
exports.credentialsManager = {
    getInstance: CredentialsManager.getInstance
};
