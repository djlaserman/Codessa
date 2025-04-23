"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySource = exports.MemoryType = void 0;
/**
 * Memory type
 */
var MemoryType;
(function (MemoryType) {
    MemoryType["CONVERSATION"] = "conversation";
    MemoryType["SEMANTIC"] = "semantic";
    MemoryType["PROJECT"] = "project";
    MemoryType["USER_PREFERENCE"] = "user_preference";
    MemoryType["CODE"] = "code";
    MemoryType["FILE"] = "file";
})(MemoryType || (exports.MemoryType = MemoryType = {}));
/**
 * Memory source
 */
var MemorySource;
(function (MemorySource) {
    MemorySource["CONVERSATION"] = "conversation";
    MemorySource["FILE"] = "file";
    MemorySource["WORKSPACE"] = "workspace";
    MemorySource["USER"] = "user";
    MemorySource["SYSTEM"] = "system";
})(MemorySource || (exports.MemorySource = MemorySource = {}));
//# sourceMappingURL=types.js.map