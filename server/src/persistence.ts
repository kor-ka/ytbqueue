import { redisSet, redisGet } from "./redisUtil";

export let gameSave = async (key: string, val: any) => {
    let current = JSON.parse(await redisGet(key)) || {};
    console.warn('<<<<<<<<----current----', current);
    console.warn('|||||||||||||||||||||||||');
    console.warn('----val---->>>>>>>>>>', val);
    if (val.seq && (!current.seq || val.seq > current.seq)) {
        await redisSet(key, JSON.stringify(val));
        return { success: true };
    }
    return { success: false };
}