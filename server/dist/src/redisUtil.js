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
exports.redishdel = (key, field, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('redishdel', key, field);
            yield (tsx || client).hdel(key, field, () => resolve(true));
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
                let val = obj[k];
                if (typeof val === 'object') {
                    val = JSON.stringify(val);
                    yield (tsx || client).hset(key, k + '-is-object', 'true', () => true);
                }
                yield (tsx || client).hset(key, k, val, () => true);
            }
            resolve(true);
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.redishget = (key, field, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('redishget', key);
            yield (tsx || client).hget(key, field, (e, s) => {
                console.warn('redishget', key, field, s);
                resolve((s !== 'undefined' && s !== 'null') ? s : undefined);
            });
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
            yield (tsx || client).hgetall(key, (e, val) => {
                let res = {};
                if (!val) {
                    resolve(res || {});
                    return;
                }
                for (let k of Object.keys(val)) {
                    if (k.includes('-is-object')) {
                        // skip meta
                        continue;
                    }
                    if (val[k + '-is-object'] === 'true') {
                        res[k] = JSON.parse(val[k]);
                    }
                    else {
                        res[k] = val[k];
                    }
                }
                resolve(res || {});
            });
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
            yield (tsx || client).get(key, (e, s) => resolve((s !== 'undefined' && s !== 'null') ? s : undefined));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.rediszadd = (key, val, score, mode, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('rediszadd', key, val, score);
            if (mode) {
                yield (tsx || client).zadd(key, mode, score, val, (res, s) => resolve(true));
            }
            else {
                yield (tsx || client).zadd(key, score, val, (res, s) => resolve(true));
            }
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
exports.rediszincr = (key, val, score, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('rediszinct', key);
            yield (tsx || client).zincrby(key, score, val, (res, s) => resolve(Number.parseFloat(s)));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.redisincr = (key, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('redisincr', key);
            yield (tsx || client).incr(key, (res, s) => resolve(s));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.rediszscore = (key, val, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('rediszscore', key);
            yield (tsx || client).zscore(key, val, (res, s) => resolve(Number.parseFloat(s)));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.rediszcard = (key, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('rediszscore', key);
            yield (tsx || client).zcard(key, (res, s) => resolve(s));
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
                        prev[prev.length - 1].score = Number.parseFloat(current);
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
exports.rediszrangebyscore = (key, count, tsx) => {
    return new Promise((resolve, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            yield (tsx || client).zrevrangebyscore(key, Number.MAX_SAFE_INTEGER, 0, 'LIMIT', 0, count, (res, s) => {
                console.warn('rediszrangebyscore', s);
                resolve(s);
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
            yield (tsx || client).zrevrangebyscore(key, Number.MAX_SAFE_INTEGER, 0, 'LIMIT', 0, 1, (res, s) => {
                console.warn('top', s);
                resolve(s[0]);
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
