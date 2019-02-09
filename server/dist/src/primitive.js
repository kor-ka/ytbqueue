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
const fs = require("fs");
const child_process_1 = require("child_process");
const pathUtil = require("path");
const sharp = require("sharp");
exports.primitive = (req, res) => __awaiter(this, void 0, void 0, function* () {
    // let path = 'temp_1541800901968';
    let path = 'temp_' + new Date().getTime();
    yield sharp(req.body).resize(100).toFile(path + '.png');
    // await new Promise(r => fs.writeFile(path + '.png', req.body, () => r()))
    console.warn('saved');
    yield new Promise((r, rej) => child_process_1.exec(`${__dirname}/../../primitive -i ${path}.png -o ${path}.svg -n 50 -r 600 -s 600`, (e) => e ? rej(e) : r()));
    console.warn('converted');
    res.on('finish', () => {
        fs.unlinkSync(path + '.svg');
        fs.unlinkSync(path + '.png');
    });
    res.sendFile(pathUtil.resolve(__dirname + '/../../../' + path + '.svg'));
});
