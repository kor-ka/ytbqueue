"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisUtil_1 = require("./redisUtil");
exports.gameSave = (key, val) => __awaiter(this, void 0, void 0, function* () {
    let current = JSON.parse(yield redisUtil_1.redisGet(key)) || {};
    console.warn('<<<<<<<<----current----', current);
    console.warn('|||||||||||||||||||||||||');
    console.warn('----val---->>>>>>>>>>', val);
    if (val.seq && (!current.seq || val.seq > current.seq)) {
        yield redisUtil_1.redisSet(key, JSON.stringify(val));
        return { success: true };
    }
    return { success: false };
});
