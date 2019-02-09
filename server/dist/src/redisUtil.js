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
const redis = require("redis");
var client = redis.createClient(process.env.REDIS_URL);
exports.redisSet = (key, value, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('redisSet', key, value);
            yield (tsx || client).set(key, value || 'undefined', () => resolve(true));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.redishset = (key, field, value, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('redishset', key, field, value);
            yield (tsx || client).hset(key, field, value, () => resolve(true));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.redishsetobj = (key, obj, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('redishsetobj', key);
            for (let k of Object.keys(obj)) {
                yield (tsx || client).hset(key, k, obj[k], () => true);
            }
            resolve(true);
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.redishgetall = (key, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('redishgetall', key);
            yield (tsx || client).hgetall(key, (e, res) => resolve(res));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.redisGet = (key, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('redisGet', key);
            // await client.get(key, (res, s) => resolve(s));
            yield (tsx || client).get(key, (e, s) => resolve(s !== 'undefined' ? s : undefined));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.rediszadd = (key, val, score, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('rediszadd', key, val, score);
            yield (tsx || client).zadd(key, score, val, (res, s) => resolve(true));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.rediszrem = (key, val, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('rediszrem', key);
            yield (tsx || client).zrem(key, val, (res, s) => resolve(true));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.rediszinct = (key, val, score, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('rediszinct', key);
            yield (tsx || client).zincrby(key, score, val, (res, s) => resolve(true));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.rediszrange = (key, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('rediszrange', key);
            yield (tsx || client).zrevrange(key, 0, -1, 'WITHSCORES', (res, s) => {
                resolve(s.reduce((prev, current, i, a) => {
                    if (i % 2 === 0) {
                        prev.push({ key: current, score: 0 });
                    }
                    else {
                        prev[prev.length - 1].score = Number.parseInt(current);
                    }
                    return prev;
                }, []));
            });
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.redisztop = (key, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            yield (tsx || client).zrangebyscore(key, -1, 100, (res, s) => {
                console.warn('top', s);
                resolve(s.length > 0 ? s[0] : undefined);
            });
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.transaction = (res) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            // let multi = client.multi();
            yield res(client);
            // await multi.exec();
            resolve();
        }
        catch (e) {
            error(e);
        }
    }));
};
