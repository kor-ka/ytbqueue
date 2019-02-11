import * as redis from 'redis'

var client = redis.createClient(process.env.REDIS_URL);

export let redisSet = (key: string, value: string | null, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            console.log('redisSet', key, value);
            await (tsx || client).set(key, value || 'undefined', () => resolve(true));
        } catch (e) {
            error(e);
        }

    })
}

export let redishset = (key: string, field: string, value: string, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            console.log('redishset', key, field, value);
            await (tsx || client).hset(key, field, value, () => resolve(true));
        } catch (e) {
            error(e);
        }
    })
}

export let redishdel = (key: string, field: string, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            console.log('redishdel', key, field);
            await (tsx || client).hdel(key, field, () => resolve(true));
        } catch (e) {
            error(e);
        }
    })
}

export let redishsetobj = (key: string, obj: any, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            console.log('redishsetobj', key);
            for (let k of Object.keys(obj)) {
                await (tsx || client).hset(key, k, obj[k], () => true);
            }
            resolve(true)
        } catch (e) {
            error(e);
        }
    })
}

export let redishget = (key: string, field: string, tsx?: redis.RedisClient) => {
    return new Promise<string | undefined>(async (resolve, error) => {
        try {
            console.log('redishget', key);
            await (tsx || client).hget(key, field, (e, s) => {
                console.warn('redishget', key, field, s);
                resolve((s !== 'undefined' && s !== 'null') ? s : undefined)
            });
        } catch (e) {
            error(e);
        }
    })
}

export let redishgetall = (key: string, tsx?: redis.RedisClient) => {
    return new Promise<{ [key: string]: string }>(async (resolve, error) => {
        try {
            console.log('redishgetall', key);
            await (tsx || client).hgetall(key, (e, res) => resolve(res || {}));
        } catch (e) {
            error(e);
        }
    })
}

export let redisGet = (key: string, tsx?: redis.RedisClient) => {
    return new Promise<string>(async (resolve, error) => {
        try {
            console.log('redisGet', key)
            // await client.get(key, (res, s) => resolve(s));
            await (tsx || client).get(key, (e, s) => resolve((s !== 'undefined' && s !== 'null') ? s : undefined));
        } catch (e) {
            error(e);
        }
    })
}

export let rediszadd = (key: string, val: string, score: number, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            console.log('rediszadd', key, val, score)
            await (tsx || client).zadd(key, score, val, (res, s) => resolve(true));
        } catch (e) {
            error(e);
        }
    })
}

export let rediszrem = (key: string, val: string, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            console.log('rediszrem', key)
            await (tsx || client).zrem(key, val, (res, s) => resolve(true));
        } catch (e) {
            error(e);
        }
    })
}

export let rediszincr = (key: string, val: string, score: number, tsx?: redis.RedisClient) => {
    return new Promise<number>(async (resolve, error) => {
        try {
            console.log('rediszinct', key)
            await (tsx || client).zincrby(key, score, val, (res, s) => resolve(Number.parseFloat(s)));
        } catch (e) {
            error(e);
        }
    })
}

export let redisincr = (key: string, tsx?: redis.RedisClient) => {
    return new Promise<number>(async (resolve, error) => {
        try {
            console.log('redisincr', key)
            await (tsx || client).incr(key, (res, s) => resolve(s));
        } catch (e) {
            error(e);
        }
    })
}


export let rediszscore = (key: string, val: string, tsx?: redis.RedisClient) => {
    return new Promise<number>(async (resolve, error) => {
        try {
            console.log('rediszscore', key)
            await (tsx || client).zscore(key, val, (res, s) => resolve(Number.parseFloat(s)));
        } catch (e) {
            error(e);
        }
    })
}

export let rediszrange = (key: string, tsx?: redis.RedisClient) => {
    return new Promise<{ key: string, score: number }[]>(async (resolve, error) => {
        try {
            console.log('rediszrange', key)
            await (tsx || client).zrevrange(key, 0, -1, 'WITHSCORES', (res, s) => {
                resolve(s.reduce((prev, current, i, a) => {
                    if (i % 2 === 0) {
                        prev.push({ key: current, score: 0 })
                    } else {
                        prev[prev.length - 1].score = Number.parseFloat(current);
                    }
                    return prev;
                }, [] as { key: string, score: number }[]))
            });
        } catch (e) {
            error(e);
        }
    })
}

export let redisztop = (key: string, tsx?: redis.RedisClient) => {
    return new Promise<string | undefined>(async (resolve, error) => {
        try {
            await (tsx || client).zrangebyscore(key, -1, Number.MAX_SAFE_INTEGER, (res, s) => {
                console.warn('top', s);
                resolve(s.length > 0 ? s[0] : undefined)
            });
        } catch (e) {
            error(e);
        }
    })
}

export let transaction = (res: (multi: redis.RedisClient) => void) => {
    return new Promise(async (resolve, error) => {
        try {
            // let multi = client.multi();
            await res(client as any);
            // await multi.exec();
            resolve();
        } catch (e) {
            error(e)
        }
    })
}