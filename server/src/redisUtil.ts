import * as redis from 'redis'

const client = redis.createClient(process.env.REDIS_URL);

const subscriptions = new Map<string, Set<(message: string) => void>>();

let subClient: redis.RedisClient;
const createSubCLient = () => {
    let res = redis.createClient(process.env.REDIS_URL);
    res.on("message", (channel, message) => {
        let subs = subscriptions.get(channel);
        if (subs) {
            for (let s of subs) {
                s(message);
            }
        }
    });
    res.on('error', () => {
        subClient = createSubCLient();
    })
    return res;
}
subClient = createSubCLient();

export let redisSet = (key: string, value: string | null, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            await (tsx || client).set(key, value || 'undefined', () => resolve(true));
        } catch (e) {
            error(e);
        }

    })
}

export let redishset = (key: string, field: string, value: string, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            await (tsx || client).hset(key, field, value, () => resolve(true));
        } catch (e) {
            error(e);
        }
    })
}

export let redispub = (key: string, value: string | null, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            await (tsx || client).publish(key, value || 'undefined', () => resolve(true));
        } catch (e) {
            error(e);
        }

    })
}

let unsubscribe = async (key: string, callback: (val: string) => void) => {
    let subs = subscriptions.get(key);
    if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
            await subClient.unsubscribe(key);
            subscriptions.delete(key);
        }
    }
}

export let redissub = (key: string, callback: (val: string) => void, tsx?: redis.RedisClient) => {
    return new Promise<() => void>(async (resolve, error) => {
        try {
            let subs = subscriptions.get(key);
            if (!subs) {
                subs = new Set();
                subscriptions.set(key, subs);

                subs.add(callback);
                await subClient.subscribe(key);
            } else {
                subs.add(callback);
            }
            resolve(async () => {
                await unsubscribe(key, callback)
            })

        } catch (e) {
            error(e);
        }
    })
}

export let redishdel = (key: string, field: string, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            await (tsx || client).hdel(key, field, () => resolve(true));
        } catch (e) {
            error(e);
        }
    })
}

export let redishsetobj = (key: string, obj: any, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            for (let k of Object.keys(obj)) {
                let val = obj[k];
                if (typeof val === 'object') {
                    val = JSON.stringify(val);
                    await (tsx || client).hset(key, k + '-is-object', 'true', () => true);
                }
                await (tsx || client).hset(key, k, val, () => true);
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
            await (tsx || client).hget(key, field, (e, s) => {
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
            await (tsx || client).hgetall(key, (e, val) => {
                let res: any = {}
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
                    } else {
                        res[k] = val[k]
                    }
                }
                resolve(res);
            });
        } catch (e) {
            error(e);
        }
    })
}

export let redisGet = (key: string, tsx?: redis.RedisClient) => {
    return new Promise<string>(async (resolve, error) => {
        try {
            // await client.get(key, (res, s) => resolve(s));
            await (tsx || client).get(key, (e, s) => resolve((s !== 'undefined' && s !== 'null') ? s : undefined));
        } catch (e) {
            error(e);
        }
    })
}

export let rediszadd = (key: string, val: string, score: number, mode?: 'NX' | 'XX', tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            if (mode) {
                await (tsx || client).zadd(key, mode, score, val, (res, s) => resolve(true));
            } else {
                await (tsx || client).zadd(key, score, val, (res, s) => resolve(true));
            }
        } catch (e) {
            error(e);
        }
    })
}

export let rediszrem = (key: string, val: string, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            await (tsx || client).zrem(key, val, (res, s) => resolve(true));
        } catch (e) {
            error(e);
        }
    })
}

export let rediszincr = (key: string, val: string, score: number, tsx?: redis.RedisClient) => {
    return new Promise<number>(async (resolve, error) => {
        try {
            await (tsx || client).zincrby(key, score, val, (res, s) => resolve(Number.parseFloat(s)));
        } catch (e) {
            error(e);
        }
    })
}

export let rediszexists = (key: string, val: string, tsx?: redis.RedisClient) => {
    return new Promise<boolean>(async (resolve, error) => {
        try {
            await (tsx || client).zscore(key, val, (res, s) => !!s);
        } catch (e) {
            error(e);
        }
    })
}

export let redisincr = (key: string, tsx?: redis.RedisClient) => {
    return new Promise<number>(async (resolve, error) => {
        try {
            await (tsx || client).incr(key, (res, s) => resolve(s));
        } catch (e) {
            error(e);
        }
    })
}


export let rediszscore = (key: string, val: string, tsx?: redis.RedisClient) => {
    return new Promise<number>(async (resolve, error) => {
        try {
            await (tsx || client).zscore(key, val, (res, s) => resolve(Number.parseFloat(s)));
        } catch (e) {
            error(e);
        }
    })
}

export let rediszcard = (key: string, tsx?: redis.RedisClient) => {
    return new Promise<number>(async (resolve, error) => {
        try {
            await (tsx || client).zcard(key, (res, s) => {
                resolve(s)
            });
        } catch (e) {
            error(e);
        }
    })
}

export let rediszrange = (key: string, start?: number, stop?: number, tsx?: redis.RedisClient) => {
    return new Promise<{ key: string, score: number }[]>(async (resolve, error) => {
        try {
            await (tsx || client).zrevrange(key, start !== undefined ? start : 0, stop !== undefined ? stop : -1, 'WITHSCORES', (res, s) => {
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

export let rediszrangebyscore = (key: string, count: number, tsx?: redis.RedisClient) => {
    return new Promise<string[]>(async (resolve, error) => {
        try {
            await (tsx || client).zrevrangebyscore(key, Number.MAX_SAFE_INTEGER, 0, 'LIMIT', 0, count, (res, s) => {
                resolve(s)
            });
        } catch (e) {
            error(e);
        }
    })
}

export let redisztop = (key: string, tsx?: redis.RedisClient) => {
    return new Promise<string | undefined>(async (resolve, error) => {
        try {
            await (tsx || client).zrevrangebyscore(key, Number.MAX_SAFE_INTEGER, 0, 'LIMIT', 0, 1, (res, s) => {
                resolve(s[0])
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