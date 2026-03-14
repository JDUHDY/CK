const checkin_version = 4.1 + "release"; // beta/release
const appnames = {
    drive: "drive", chat: "chat",
};
const databasebackendtypes = {
    default: 0, cf_d1: 1,
};
const filestorebackendtypes = {
    default: 0, cf_kv: 1, fdindex: 2, google_drive: 3, cf_r2: 4,
};

let top_level_path = "/"; // 首页路径
const title = "Checkin"; // 网站标题
const administrator_password = "uf0Am?U,BDki:vdB~07Gp"; // 服务管理员密码
const SYSTEM_ENCRYPTION_KEY = "CheckinSystemEncryptionKey2025"; // 短语通知密码

const drive_settings = {
    recent_files: 5 * 24, // 小时，多久内的文件算是最近新增
    keep_trashes: 7 * 24 // 小时，垃圾桶里的文件保留多久
}
const chat_settings = { // 聊天设置
    keep_messages: 15 * 24, // 小时，消息保留多久
    enable_image_compression: true, // 是否启用图片压缩功能
};
const notification_settings = { // 系统通知设置
    enable: true, // 是否启用系统通知功能
};
const enable_ai_consult = true; // 控制是否显示'AI 咨询'菜单
const HEADER_LINKS = [ // 顶栏友链菜单配置
    {name: "ChatGPT网站", url: "https://chatgpt.com"},
    {name: "用户生成工具", url: "https://jduhdy.github.io/tools/"},
];
const databasebackendargs = { // 数据库后端
    type: databasebackendtypes.default, // 类型
    local_path: "./cidata", //
};
const filestorebackendargs = { // 文件存储后端
    type: filestorebackendtypes.default, // 类型
    local_path: "./cidata/drivefiles", //
    prefix: "ci01", //
    url: "", //
    user: "", //
    pass: "", //
    folder_id: "", //
    client_id: "",  //
    client_secret: "", //
    refresh_token: "", //
};
const disallowed_upload = ["txt", "exe", "odt", "doc", "docx", "rtf", "xlsx", "xlsm", "xlsb", "xls", "lnk", "wps",];

const binding_kv = "KV";
const binding_db = "DB";
let sql = null;
const debugging = false;
const leq = "==============";
const seconds_of_one_hour = 60 * 60;
const milliseconds_of_one_hour = seconds_of_one_hour * 1000;
const seconds_of_hours = (hour) => seconds_of_one_hour * hour;
const seconds_of_minutes = (minute) => 60 * minute;
const seconds_of_days = (day) => seconds_of_hours(day * 24);
const checkin_version_number = parseInt(/^\d+/.exec(checkin_version)[0]);
const checkin_version_is_beta = checkin_version.includes("beta");
const norm_id_role = `\\w\\u4e00-\\u9fa5\\-`;
const norm_id_role_excluding_regexp = new RegExp(`[^${norm_id_role}]+`, "g");
const logo = "data:;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABABAMAAABYR2ztAAAAG1BMVEVHcEwlm9oanOIaneIaneIbneL9/v+QyOfQ6PUr+6XxAAAABXRSTlMA901+u0yXCEAAAAFjSURBVEjH1VW9UsMwDM6lvIACvmRMrrCH3rED1z6AaPUALIY1S2HtUnhsnCaxFNuJ6cEAmnKnL9KnTz9Okn9oy9WMM10lKVGZLMsJwC09VkTZNV1OAMha2L9gQB1wb/CBAVdqN/N7OMiFC7g/F1C5gGzMYK1cAK4liw0FbBeUSNo5ABXy4ywHHHFY+DWAIqwnZSbMGyXkrnz/B0ix7jy/bk4f2x5w4wDy40tH6incKDhqGDcsHSd4130AKgUAAfrfcj0EsIDqROzzDdofYW8DDFV0GYzjtUWYAI1NVwqdTG0GQWhwyhnMXkgstAkOWj+7gJTL000hMwwsKxFilCFzdGhDaH1QbgAWqmgBfgaW2jCUGazUtlmmRlZJNIvbbXIcRFu23sAA90FWwSOHe0mBN5yHtpvFHl0Hxh4hvHrRxfn5bkbXP3pAoifoN65c9JBGT3H8mH/jOYg/KNEnKfqo/Vn7AjXDT32Z5MYmAAAAAElFTkSuQmCC";

if (!top_level_path.startsWith("/")) top_level_path = "/" + top_level_path;
if (/^\/+$/.test(top_level_path)) top_level_path = "";
disallowed_upload.forEach((value, index, array) => {
    if (!value.startsWith(".")) array[index] = "." + value;
})
filestorebackendargs.prefix = filestorebackendargs.prefix.replace(/\W+/g, "");
if (filestorebackendargs.prefix.length === 0) filestorebackendargs.prefix = "ci01";
if (drive_settings.recent_files < 1) drive_settings.recent_files = 1;
if (drive_settings.keep_trashes < 1) drive_settings.keep_trashes = 1;
if (chat_settings.keep_messages < 1) chat_settings.keep_messages = 1;

/*
* 系统加密解密工具（用于settings表）
* */
const systemCrypto = {
    // 密钥派生函数：从字符串密码生成加密密钥
    async deriveKey(password) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
        return await crypto.subtle.importKey(
            'raw',
            hashBuffer.slice(0, 32), // 使用前32字节作为AES-256密钥
            'AES-GCM',
            false,
            ['encrypt', 'decrypt']
        );
    },

    // 加密：返回Base64字符串
    async encrypt(plainText, password = SYSTEM_ENCRYPTION_KEY) {
        try {
            const key = await this.deriveKey(password);
            const iv = crypto.getRandomValues(new Uint8Array(12)); // 12字节IV
            const encoder = new TextEncoder();
            const data = encoder.encode(plainText);

            const encryptedBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );

            // 合并IV和密文
            const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedBuffer), iv.length);

            // 转换为Base64
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('加密失败:', error);
            throw error;
        }
    },

    // 解密：输入Base64字符串，返回明文
    async decrypt(encryptedBase64, password = SYSTEM_ENCRYPTION_KEY) {
        try {
            const key = await this.deriveKey(password);
            const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

            // 分离IV和密文
            const iv = combined.slice(0, 12);
            const encryptedData = combined.slice(12);

            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                encryptedData
            );

            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error('解密失败:', error);
            throw error;
        }
    }
};


/*
* 藏主键库
* */
const sqids = (() => {
    // https://github.com/sqids/sqids-javascript
    const sqids_lib = {};
    const sqids_objects = {};
    /*
MIT License

Copyright (c) 2023-present Sqids maintainers.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
    * */
    !function (e, a) {
        "object" == typeof exports && "object" == typeof module ?  //
            module.exports = a() : //
            "function" == typeof define && define.amd ? //
                define("Sqids", [], a) : //
                "object" == typeof exports ? exports.Sqids = a() : e.Sqids = a()
    }( //
        sqids_lib, //
        () => ( //
            () => {
                "use strict";
                var c = {
                    d: (e, a) => {
                        for (var t in a) c.o(a, t) && !c.o(e, t) && Object.defineProperty(e, t, {
                            enumerable: !0, get: a[t]
                        })
                    }, o: (e, a) => Object.prototype.hasOwnProperty.call(e, a)
                }, e = {};
                c.d(e, {default: () => a});
                const i = {
                    alphabet: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                    minLength: 0,
                    blocklist: new Set(["0rgasm", "1d10t", "1d1ot", "1di0t", "1diot", "1eccacu10", "1eccacu1o", "1eccacul0", "1eccaculo", "1mbec11e", "1mbec1le", "1mbeci1e", "1mbecile", "a11upat0", "a11upato", "a1lupat0", "a1lupato", "aand", "ah01e", "ah0le", "aho1e", "ahole", "al1upat0", "al1upato", "allupat0", "allupato", "ana1", "ana1e", "anal", "anale", "anus", "arrapat0", "arrapato", "arsch", "arse", "ass", "b00b", "b00be", "b01ata", "b0ceta", "b0iata", "b0ob", "b0obe", "b0sta", "b1tch", "b1te", "b1tte", "ba1atkar", "balatkar", "bastard0", "bastardo", "batt0na", "battona", "bitch", "bite", "bitte", "bo0b", "bo0be", "bo1ata", "boceta", "boiata", "boob", "boobe", "bosta", "bran1age", "bran1er", "bran1ette", "bran1eur", "bran1euse", "branlage", "branler", "branlette", "branleur", "branleuse", "c0ck", "c0g110ne", "c0g11one", "c0g1i0ne", "c0g1ione", "c0gl10ne", "c0gl1one", "c0gli0ne", "c0glione", "c0na", "c0nnard", "c0nnasse", "c0nne", "c0u111es", "c0u11les", "c0u1l1es", "c0u1lles", "c0ui11es", "c0ui1les", "c0uil1es", "c0uilles", "c11t", "c11t0", "c11to", "c1it", "c1it0", "c1ito", "cabr0n", "cabra0", "cabrao", "cabron", "caca", "cacca", "cacete", "cagante", "cagar", "cagare", "cagna", "cara1h0", "cara1ho", "caracu10", "caracu1o", "caracul0", "caraculo", "caralh0", "caralho", "cazz0", "cazz1mma", "cazzata", "cazzimma", "cazzo", "ch00t1a", "ch00t1ya", "ch00tia", "ch00tiya", "ch0d", "ch0ot1a", "ch0ot1ya", "ch0otia", "ch0otiya", "ch1asse", "ch1avata", "ch1er", "ch1ng0", "ch1ngadaz0s", "ch1ngadazos", "ch1ngader1ta", "ch1ngaderita", "ch1ngar", "ch1ngo", "ch1ngues", "ch1nk", "chatte", "chiasse", "chiavata", "chier", "ching0", "chingadaz0s", "chingadazos", "chingader1ta", "chingaderita", "chingar", "chingo", "chingues", "chink", "cho0t1a", "cho0t1ya", "cho0tia", "cho0tiya", "chod", "choot1a", "choot1ya", "chootia", "chootiya", "cl1t", "cl1t0", "cl1to", "clit", "clit0", "clito", "cock", "cog110ne", "cog11one", "cog1i0ne", "cog1ione", "cogl10ne", "cogl1one", "cogli0ne", "coglione", "cona", "connard", "connasse", "conne", "cou111es", "cou11les", "cou1l1es", "cou1lles", "coui11es", "coui1les", "couil1es", "couilles", "cracker", "crap", "cu10", "cu1att0ne", "cu1attone", "cu1er0", "cu1ero", "cu1o", "cul0", "culatt0ne", "culattone", "culer0", "culero", "culo", "cum", "cunt", "d11d0", "d11do", "d1ck", "d1ld0", "d1ldo", "damn", "de1ch", "deich", "depp", "di1d0", "di1do", "dick", "dild0", "dildo", "dyke", "encu1e", "encule", "enema", "enf01re", "enf0ire", "enfo1re", "enfoire", "estup1d0", "estup1do", "estupid0", "estupido", "etr0n", "etron", "f0da", "f0der", "f0ttere", "f0tters1", "f0ttersi", "f0tze", "f0utre", "f1ca", "f1cker", "f1ga", "fag", "fica", "ficker", "figa", "foda", "foder", "fottere", "fotters1", "fottersi", "fotze", "foutre", "fr0c10", "fr0c1o", "fr0ci0", "fr0cio", "fr0sc10", "fr0sc1o", "fr0sci0", "fr0scio", "froc10", "froc1o", "froci0", "frocio", "frosc10", "frosc1o", "frosci0", "froscio", "fuck", "g00", "g0o", "g0u1ne", "g0uine", "gandu", "go0", "goo", "gou1ne", "gouine", "gr0gnasse", "grognasse", "haram1", "harami", "haramzade", "hund1n", "hundin", "id10t", "id1ot", "idi0t", "idiot", "imbec11e", "imbec1le", "imbeci1e", "imbecile", "j1zz", "jerk", "jizz", "k1ke", "kam1ne", "kamine", "kike", "leccacu10", "leccacu1o", "leccacul0", "leccaculo", "m1erda", "m1gn0tta", "m1gnotta", "m1nch1a", "m1nchia", "m1st", "mam0n", "mamahuev0", "mamahuevo", "mamon", "masturbat10n", "masturbat1on", "masturbate", "masturbati0n", "masturbation", "merd0s0", "merd0so", "merda", "merde", "merdos0", "merdoso", "mierda", "mign0tta", "mignotta", "minch1a", "minchia", "mist", "musch1", "muschi", "n1gger", "neger", "negr0", "negre", "negro", "nerch1a", "nerchia", "nigger", "orgasm", "p00p", "p011a", "p01la", "p0l1a", "p0lla", "p0mp1n0", "p0mp1no", "p0mpin0", "p0mpino", "p0op", "p0rca", "p0rn", "p0rra", "p0uff1asse", "p0uffiasse", "p1p1", "p1pi", "p1r1a", "p1rla", "p1sc10", "p1sc1o", "p1sci0", "p1scio", "p1sser", "pa11e", "pa1le", "pal1e", "palle", "pane1e1r0", "pane1e1ro", "pane1eir0", "pane1eiro", "panele1r0", "panele1ro", "paneleir0", "paneleiro", "patakha", "pec0r1na", "pec0rina", "pecor1na", "pecorina", "pen1s", "pendej0", "pendejo", "penis", "pip1", "pipi", "pir1a", "pirla", "pisc10", "pisc1o", "pisci0", "piscio", "pisser", "po0p", "po11a", "po1la", "pol1a", "polla", "pomp1n0", "pomp1no", "pompin0", "pompino", "poop", "porca", "porn", "porra", "pouff1asse", "pouffiasse", "pr1ck", "prick", "pussy", "put1za", "puta", "puta1n", "putain", "pute", "putiza", "puttana", "queca", "r0mp1ba11e", "r0mp1ba1le", "r0mp1bal1e", "r0mp1balle", "r0mpiba11e", "r0mpiba1le", "r0mpibal1e", "r0mpiballe", "rand1", "randi", "rape", "recch10ne", "recch1one", "recchi0ne", "recchione", "retard", "romp1ba11e", "romp1ba1le", "romp1bal1e", "romp1balle", "rompiba11e", "rompiba1le", "rompibal1e", "rompiballe", "ruff1an0", "ruff1ano", "ruffian0", "ruffiano", "s1ut", "sa10pe", "sa1aud", "sa1ope", "sacanagem", "sal0pe", "salaud", "salope", "saugnapf", "sb0rr0ne", "sb0rra", "sb0rrone", "sbattere", "sbatters1", "sbattersi", "sborr0ne", "sborra", "sborrone", "sc0pare", "sc0pata", "sch1ampe", "sche1se", "sche1sse", "scheise", "scheisse", "schlampe", "schwachs1nn1g", "schwachs1nnig", "schwachsinn1g", "schwachsinnig", "schwanz", "scopare", "scopata", "sexy", "sh1t", "shit", "slut", "sp0mp1nare", "sp0mpinare", "spomp1nare", "spompinare", "str0nz0", "str0nza", "str0nzo", "stronz0", "stronza", "stronzo", "stup1d", "stupid", "succh1am1", "succh1ami", "succhiam1", "succhiami", "sucker", "t0pa", "tapette", "test1c1e", "test1cle", "testic1e", "testicle", "tette", "topa", "tr01a", "tr0ia", "tr0mbare", "tr1ng1er", "tr1ngler", "tring1er", "tringler", "tro1a", "troia", "trombare", "turd", "twat", "vaffancu10", "vaffancu1o", "vaffancul0", "vaffanculo", "vag1na", "vagina", "verdammt", "verga", "w1chsen", "wank", "wichsen", "x0ch0ta", "x0chota", "xana", "xoch0ta", "xochota", "z0cc01a", "z0cc0la", "z0cco1a", "z0ccola", "z1z1", "z1zi", "ziz1", "zizi", "zocc01a", "zocc0la", "zocco1a", "zoccola"])
                };

                class a {
                    constructor(e) {
                        var a;
                        const t = null != (a = null == e ? void 0 : e.alphabet) ? a : i.alphabet,
                            c = null != (a = null == e ? void 0 : e.minLength) ? a : i.minLength,
                            n = null != (a = null == e ? void 0 : e.blocklist) ? a : i.blocklist;

                        // if (new Blob([t]).size !== t.length) throw new Error("Alphabet cannot contain multibyte characters");
                        if ([...t].length !== t.length) throw new Error("Alphabet cannot contain multibyte characters");

                        if (t.length < 3) throw new Error("Alphabet length must be at least 3");
                        if (new Set(t).size !== t.length) throw new Error("Alphabet must contain unique characters");
                        if ("number" != typeof c || c < 0 || 255 < c) throw new Error("Minimum length has to be between 0 and 255");
                        const o = new Set, r = t.toLowerCase().split("");
                        for (const e of n) if (3 <= e.length) {
                            const a = e.toLowerCase(), i = a.split("");
                            i.filter(e => r.includes(e)).length === i.length && o.add(a)
                        }
                        this.alphabet = this.shuffle(t), this.minLength = c, this.blocklist = o
                    }

                    encode(e) {
                        if (0 === e.length) return "";
                        if (e.filter(e => 0 <= e && e <= this.maxValue()).length !== e.length) throw new Error("Encoding supports numbers between 0 and " + this.maxValue());
                        return this.encodeNumbers(e)
                    }

                    decode(e) {
                        const a = [];
                        if ("" === e) return a;
                        const t = this.alphabet.split("");
                        for (const c of e.split("")) if (!t.includes(c)) return a;
                        const c = e.charAt(0), n = this.alphabet.indexOf(c);
                        let o = this.alphabet.slice(n) + this.alphabet.slice(0, n),
                            r = (o = o.split("").reverse().join(""), e.slice(1));
                        for (; 0 < r.length;) {
                            const e = o.slice(0, 1), t = r.split(e);
                            if (0 < t.length) {
                                if ("" === t[0]) return a;
                                a.push(this.toNumber(t[0], o.slice(1))), 1 < t.length && (o = this.shuffle(o))
                            }
                            r = t.slice(1).join(e)
                        }
                        return a
                    }

                    encodeNumbers(a, e = 0) {
                        if (e > this.alphabet.length) throw new Error("Reached max attempts to re-generate the ID");
                        let t = a.reduce((e, a, t) => this.alphabet[a % this.alphabet.length].codePointAt(0) + t + e, a.length) % this.alphabet.length,
                            c = (t = (t + e) % this.alphabet.length, this.alphabet.slice(t) + this.alphabet.slice(0, t));
                        var n = c.charAt(0);
                        c = c.split("").reverse().join("");
                        const o = [n];
                        for (let e = 0; e !== a.length; e++) {
                            const t = a[e];
                            o.push(this.toId(t, c.slice(1))), e < a.length - 1 && (o.push(c.slice(0, 1)), c = this.shuffle(c))
                        }
                        let r = o.join("");
                        if (this.minLength > r.length) for (r += c.slice(0, 1); 0 < this.minLength - r.length;) c = this.shuffle(c), r += c.slice(0, Math.min(this.minLength - r.length, c.length));
                        return r = this.isBlockedId(r) ? this.encodeNumbers(a, e + 1) : r
                    }

                    shuffle(e) {
                        const t = e.split("");
                        for (let e = 0, a = t.length - 1; 0 < a; e++, a--) {
                            var c = (e * a + t[e].codePointAt(0) + t[a].codePointAt(0)) % t.length;
                            [t[e], t[c]] = [t[c], t[e]]
                        }
                        return t.join("")
                    }

                    toId(e, a) {
                        const t = [], c = a.split("");
                        let n = e;
                        for (; t.unshift(c[n % c.length]), 0 < (n = Math.floor(n / c.length));) ;
                        return t.join("")
                    }

                    toNumber(e, a) {
                        const t = a.split("");
                        return e.split("").reduce((e, a) => e * t.length + t.indexOf(a), 0)
                    }

                    isBlockedId(e) {
                        const a = e.toLowerCase();
                        for (const e of this.blocklist) if (e.length <= a.length) if (a.length <= 3 || e.length <= 3) {
                            if (a === e) return !0
                        } else if (/\d/.test(e)) {
                            if (a.startsWith(e) || a.endsWith(e)) return !0
                        } else if (a.includes(e)) return !0;
                        return !1
                    }

                    maxValue() {
                        return Number.MAX_SAFE_INTEGER
                    }
                }

                return e.default
            } //
        )() //
    );

    const alphabet = "789defghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456abc";

    function encode(number, length) {
        if (!length) throw new Error();
        if (!sqids_objects[length]) sqids_objects[length] = new sqids_lib.Sqids({minLength: length, alphabet})
        const sqids_object = sqids_objects[length];
        return sqids_object.encode([number,]);
    }

    function decode(string, length) {
        if (!length) throw new Error();
        if (!sqids_objects[length]) sqids_objects[length] = new sqids_lib.Sqids({minLength: length, alphabet})
        const sqids_object = sqids_objects[length];
        const numbers = sqids_object.decode(string)
        return numbers[0];
    }

    return {encode, decode};
})()


/*
* 数据库后端
* */
const databasebackends = (() => {

    const tablename = {
        session: "session", //

        user: "user",//
        user_group_set: "user_group_set",//
        user_contact_group_set: "user_contact_group_set",//
        user_contact_user_set: "user_contact_user_set",//

        group: "group_",//

        drive: "drive",//
        drive_share_user_set: "drive_share_user_set",//
        drive_share_group_set: "drive_share_group_set",//

        chat_message: "chat_message",//
        chat_message_data_spec: "chat_message_data_spec",//
        chat_message_read_list: "chat_message_read_list",//
        chat_message_reply_set: "chat_message_reply_set",//
        chat_edition: "chat_edition",//
        chat_activity: "chat_activity",//
        chat_read_progress: "chat_read_progress",//
        chat_vote: "chat_vote",//
        chat_vote_option: "chat_vote_option",//
        chat_vote_record: "chat_vote_record",//
        chat_pin: "chat_pin",//

        settings: "settings",//

    }

    const myindex = "myindex"; // 手动加的索引前缀

    class _ {
        constructor(server) {
            this.server = server;
            this.db = null;
        }

        async init() {
            throw new Error("虚函数");
        }

        async _exec_sql(sql) {
            if (debugging) console.log("执行SQL", sql);
        }

        async exec_sql(sql) {
            return null;
        }

        async _exec_sql_ok(result) {
            if (debugging) console.log("执行结果", result);
        }

        async last_insert_rowid() {
            return undefined; // id
        }

        /*
        * 建表
        * */
        async init_tables() {
            throw new Error("虚函数");
        }

        async drop_tables() {
            // 网盘需先删除所有文件
            await this.clear_drive();

            // 禁用外键约束，避免删除时因外键约束失败
            sql = `PRAGMA foreign_keys = OFF;`;
            await this.exec_sql(sql);

            // 先清空所有表的数据（按照依赖顺序：先删除子表，再删除父表）
            const clear_order = [ //
                // 投票相关：先删除 record 和 option，再删除 vote
                tablename.chat_vote_record, //
                tablename.chat_vote_option, //
                tablename.chat_vote, //

                // 聊天消息相关
                tablename.chat_message_reply_set, //
                tablename.chat_activity, //
                tablename.chat_edition, //
                tablename.chat_message_read_list, //
                tablename.chat_read_progress, //
                tablename.chat_message_data_spec, //
                tablename.chat_message, //
                tablename.chat_pin, //

                // 网盘相关
                tablename.drive_share_group_set, //
                tablename.drive_share_user_set, //
                tablename.drive, //

                // 用户相关
                tablename.user_contact_user_set, //
                tablename.user_contact_group_set, //
                tablename.user_group_set, //
                tablename.user, //

                // 群组
                tablename.group, //

                // 会话
                tablename.session, //

                // 系统配置
                tablename.settings, //
            ];

            // 清空表数据
            for (const tn of clear_order) {
                sql = `DELETE FROM ${tn};`;
                try {
                    await this.exec_sql(sql);
                } catch (e) {
                    // 忽略清空失败（表可能不存在或为空）
                }
            }

            // 删除表结构（按照依赖顺序：先删除子表，再删除父表）
            const tns = clear_order;

            const errors = [];
            for (const tn of tns) {
                sql = `DROP TABLE IF EXISTS ${tn};`;
                try {
                    const result = await this.exec_sql(sql);
                } catch (e) {
                    // 如果错误信息中包含"no such table"，说明表已经被删除了，忽略这个错误
                    if (e.message && e.message.includes('no such table')) {
                        continue;
                    }
                    errors.push({ table: tn, error: e.message });
                }
            }

            // 重新启用外键约束
            sql = `PRAGMA foreign_keys = ON;`;
            await this.exec_sql(sql);

            // 如果所有表都删除失败，则抛出错误
            if (errors.length === tns.length) {
                sql = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`;
                const remaining_tables = await this.exec_sql(sql);
                throw new Error(`删除所有表失败：${JSON.stringify(errors)}，剩余表：${JSON.stringify(remaining_tables)}`);
            }

            // 如果有部分表删除失败，记录警告但不抛出错误
            if (errors.length > 0) {
                console.warn(`部分表删除失败：${JSON.stringify(errors)}`);
            }
        }

        async clear_drive() {
            await this.drive__clear(undefined, 0);
            await this.drive__clear_attachments(undefined);
            const drive_items = await this.drive__list_by_root();
            for (const driveItem of drive_items) {
                await subviews.Drive.item._delete.call(this, driveItem);
            }
        }

        /*
        * 业务接口，以主表名__开头
        * */
        static session__sid_length = 32;
        static session__type = {
            admin: 0, user: 1, guest_drive: 2,
        };
        static session__stored = 90 * 24; // 小时，记录几个月的上线情况
        static session__keep_alive = 16; // 小时，会话多久不活跃后失效
        static session__keep_stored = seconds_of_hours(10); // 通知浏览器cookie保留多久
        static session__auto_renew_after = 1; // 小时

        async session__new(type, user) {
            await this.session__clear();

            // 登录时清理下垃圾
            await this.chat_activity__clear(20);
            await this.drive__clear();
            await this.drive__clear_trashcan(undefined, drive_settings.keep_trashes);
            await this.chat_message__clear();
            await this.chat_message__auto_delete();

            return undefined; // sid
        }

        async session__new_by_guest_drive(drive_item_id) {
            await _.prototype.session__new.call(this);
            return undefined; // sid
        }

        async session__get_attr(session_id) {
            return undefined; // dict
        }

        async session__get_last_attr_by_user_id(user_id) {
            return undefined; // dict
        }

        async session__get_attrs_by_user_id(user_ids, timestamp) {
            return undefined; // list
        }

        async session__get_attrs_by_user_id__recent(user_ids, seconds) {
            return undefined; // list
        }

        async session__renew(session_id) {
        }

        async session__renew_by_id(id) {
        }

        async session__auto_renew(session_attr) {
            return undefined; // bool
        }

        async session__check_alive(session_id) {
            return false;
        }

        async session__close(session_id) {
        }

        async session__close_by_id(id) {
        }

        async session__clear() {
        }

        static group__gid_length = 16;

        async group__new(gid) {
            return undefined; // gid
        }

        async group__restore(li) {
            return undefined; // list
        }

        async group__list() {
            return undefined; // list
        }

        async group__list_who_can_contact_me(user_id, user_attrs) {
            return undefined; // list
        }

        async group__get_attr(gid) {
            return undefined; // dict
        }

        async group__get_attrs(gids) {
            return undefined; // [dict]
        }

        async group__get_attrs_by_id(ids) {
            return undefined; // [dict]
        }

        async group__edit(gid, new_attr) {
            return undefined; // gid
        }

        async group__delete(gid) {
            return undefined; // gid
        }

        static user__uid_length = 16;
        static user__password_hash_length = 64;
        static user__unnecessary_columns = ["id", "password_hash", "create_time", "contact_any", "manage_drive", "free_space"];
        static user__unnecessary_columns_2 = ["id", "password_hash", "create_time",];

        async user__new(attr) {
            return undefined; // dict
        }

        async user__add_relations(attr, user_attr) {
            return undefined;
        }

        async user__restore(li) {
            return undefined; // list
        }

        async user__list(fields = "id,uid,disabled,free_space") {
            return undefined; // list
        }

        async user__list_who_can_contact_me(user_id) {
            return undefined; // list
        }

        async user__list_who_chat_together(group_ids) {
            return undefined; // list
        }

        async user__get_attr(uid) {
            return undefined; // dict
        }

        async user__get_attrs(uids) {
            return undefined; // [dict]
        }

        async user__get_attr_by_id(id) {
            return undefined; // dict
        }

        async user__get_attrs_by_id(ids) {
            return undefined; // [dict]
        }

        async user__edit(uid, new_attr) {
            return undefined; // uid
        }

        async user__delete(uid) {
            return undefined; // uid
        }

        async user_group_set__list() {
            return undefined; // list
        }

        async user_group_set__get_attrs_by_group(group_ids) {
            return undefined; // [dict]
        }

        async user_group_set__get_attrs_by_user(user_ids) {
            return undefined; // [dict]
        }

        async user_contact_group_set__list() {
            return undefined; // list
        }

        async user_contact_group_set__get_attrs_by_group(group_ids) {
            return undefined; // [dict]
        }

        async user_contact_group_set__get_attrs_by_user(user_ids) {
            return undefined; // [dict]
        }

        async user_contact_user_set__list() {
            return undefined; // list
        }

        async user_contact_user_set__get_attrs_by_user(user_ids) {
            return undefined; // [dict]
        }

        async user_contact_user_set__get_attrs_by_other_user(other_user_ids) {
            return undefined; // [dict]
        }

        static drive__did_min_length = 8;
        static drive__did_max_length = 32;
        static drive__hash_length = 40;
        static drive__item_type = {
            file: 1, folder: 2,
        };
        static drive__share_type = {
            noset: 0, // 未设,遵循父级设定,如果父级为空则默认noshare
            noshare: 1,

            readonly: 2, // 对于单独指定的用户和组,只包含这2种
            readwrite: 3,
        };
        static drive__unnecessary_columns = ["parent", "uploaded", "trashed", "attachment_came", "share_any_type", "share_public_type", "public_expiration", "public_came", "public_pass", "uploaded",];
        static drive__unnecessary_columns_2 = ["download_count", "size", "hash",]; // 对于文件夹
        static drive__unnecessary_columns_3 = ["uploader", "uploaded_time", "shared", "hash", "download_count",]; // 对于解析树

        static drive__ids2dids(args) {
            if (args instanceof Array) {
                for (const arg of args) _.drive__ids2dids(arg);
                return;
            }
            args.did = sqids.encode(args.id, _.drive__did_min_length);
            delete args.id;
        }

        static drive__id2did(id) {
            return sqids.encode(id, _.drive__did_min_length);
        }

        static drive__did2id(did) {
            return sqids.decode(did, _.drive__did_min_length);
        }

        async drive__myspace_new(user_attr) {
            return undefined;
        }

        async drive__myspace_rename(uid, new_attr) {
            return undefined;
        }

        async drive__myspace_delete(user_id) {
            return undefined;
        }

        async drive__attachments_ensure() {
            return undefined;
        }

        async drive__list(did,) {
            return undefined; // list
        }

        async drive__list_by_id(item_id,) {
            return undefined; // list
        }

        async drive__list_all_by_id(item_id,) {
            return undefined; // list
        }

        async drive__list_by_root() {
            return undefined; // list
        }

        async drive__list_by_trashcan(user_id) {
            return undefined; // list
        }

        async drive__list_by_newfiles(user_id) {
            return undefined; // list
        }

        async drive__list_by_sharewithme(user_id) {
            return undefined; // list
        }

        async drive__get_attr(did) {
            return undefined; // dict
        }

        async drive__get_attr_by_id(item_id) {
            return undefined; // dict
        }

        async drive__get_attrs_by_id(item_ids) {
            return undefined; // [dict]
        }

        async drive__get_attr_by_myspace(user_id) {
            return undefined; // dict
        }

        async drive__get_attr_by_attachments() {
            return undefined; // dict
        }

        async drive__get_share_status_single_by_ids(item_ids) {
            return undefined; // list
        }

        async drive__get_share_status_upward_by_ids(item_ids, user_id, group_ids, recent_hours, item_attrs) {
            return undefined; // list
        }

        async drive__new(attr, user_id) {
            return undefined; // id
        }

        async drive__new_attachment(attr, user_id) {
            return undefined; // id
        }

        async drive__clear_attachments(uploaders) {
            return undefined;
        }

        async drive__change_attr_uploaded_by_id(item_id) {
            return undefined;
        }

        async drive__change_share_by_id(item_id, args, user_id) {
            return undefined;
        }

        async drive__rename_by_id(item_id, args) {
            return undefined;
        }

        async drive__move_by_id(item_id, parent_item_id) {
            return undefined;
        }

        async drive__trash_by_id(item_id,) {
            return undefined;
        }

        async drive__restore_by_id(item_id,) {
            return undefined;
        }

        async drive__delete_by_id(item_id,) {
            return undefined;
        }

        async drive__delete_by_ids(item_ids,) {
            return undefined;
        }

        async drive__unset_uploader(user_id) {
            return undefined;
        }

        async drive__clear(uploaders, hours) {
        }

        async drive__clear_trashcan(uploaders, hours) {
        }

        async drive__get_usages_by_user_id(user_ids) {
            return undefined; // list
        }

        async drive_share_user_set__list_by_item_id(item_id) {
            return undefined; // list
        }

        async drive_share_user_set__list_by_user_id(user_id) {
            return undefined; // list
        }

        async drive_share_group_set__list_by_item_id(item_id) {
            return undefined; // list
        }

        async drive_share_group_set__list_by_group_ids(group_ids) {
            return undefined; // list
        }

        static chat_message__receiver_type = {
            user: 1, group: 2,
        };
        static chat_message__type = {
            text: 1, image: 2, file: 3, sys: 4, vote: 5,
        };
        static chat_message__status = { // 用于异或
            revoked: 1, deleted: 2, encrypted: 4, edited: 8, //
            i_read: 16, // 临时的，不会记录到数据库，只用于客户端判断
            auto_deleted: 32,
        };
        static chat_data_spec__action_type = {
            revoke_message: 1, delete_message: 2, auto_delete_message: 3, clear_message: 4,
        };
        static chat_activity__type = {
            none: 0, typing: 1,
        };

        static chat_message__type_checker = {
            is_drive_item: (type) => {
                return type === databasebackends._.chat_message__type.image || type === databasebackends._.chat_message__type.file;
            }, is_image: (type) => {
                return type === databasebackends._.chat_message__type.image;
            }, is_file: (type) => {
                return type === databasebackends._.chat_message__type.file;
            }, is_text: (type) => {
                return type === databasebackends._.chat_message__type.text;
            }, is_sys: (type) => {
                return type === databasebackends._.chat_message__type.sys;
            }, is_vote: (type) => {
                return type === databasebackends._.chat_message__type.vote;
            },
        }

        static chat_message__status_checker = {
            is_editable: (status) => { // 被撤回/删除的消息，总是sys类型的
                return !(status & databasebackends._.chat_message__status.revoked) && !(status & databasebackends._.chat_message__status.deleted);
            },
        }

        async chat_message__get_msgs_to_me(user_attr, user_ids, group_ids, only_relations) {
            return undefined; // list
        }

        async chat_message__new(user_attr, contact_type, receiver_attr, args) {
            return undefined; // id
        }

        async chat_message__forward(user_attr, message_attr, user_receiver_attr, group_receiver_attr) {
            return undefined; // [id]
        }

        async chat_message__get_attr(message_id) {
            return undefined; // dict
        }

        async chat_message__get_attr_by_sender_rand(sender_rand) {
            return undefined; // dict
        }

        async chat_message__get_attrs(message_ids) {
            return undefined; // [dict]
        }

        async chat_message__edit_data_text(message_id, args) {
            return undefined;
        }

        async chat_message__revoke(message_id, is_timeout) {
            return undefined;
        }

        async chat_message__delete(user_attr, contact_type, receiver_attr, args) {
            return undefined;
        }

        async chat_message__auto_delete_(r,) {
            return undefined;
        }

        async chat_message__auto_delete(hours,) {
            return undefined;
        }

        async chat_message__clear() {
            return undefined;
        }

        async chat_message__pin(message_id) {
            return undefined; // bool
        }

        async chat_message__unpin(message_id) {
            return undefined; // bool
        }

        async chat_message__get_pinned_messages(user_id, group_id) {
            return undefined; // list
        }

        async chat_message_reply_set__add(message_id, user_id) {
            return undefined; // bool
        }

        async chat_message_reply_set__remove(message_id, user_id) {
            return undefined; // bool
        }

        async chat_message_reply_set__remove_by_message(message_id) {
            return undefined; // bool
        }

        async chat_message_reply_set__list_by_message(message_id) {
            return undefined; // list
        }

        async chat_message_reply_set__list_by_messages(message_ids) {
            return undefined; // list
        }

        async chat_message_reply_set__list_by_user(user_id) {
            return undefined; // list
        }

        async chat_message_reply_set__check_exists(message_id, user_id) {
            return undefined; // bool
        }

        async chat_message_data_spec__get_attr_by_message_id(message_id) {
            return undefined; // dict
        }

        async chat_message_data_spec__get_attrs_by_message_id(message_ids) {
            return undefined; // [dict]
        }

        async chat_message_data_spec__relate_by_image(message_id, drive_item_id, image_attr) {
            return undefined;
        }

        async chat_message_data_spec__relate_by_file(message_id, drive_item_id,) {
            return undefined;
        }

        async chat_message_data_spec__relate_by_sys__revoke(message_id, is_timeout, user_id) {
            return undefined;
        }

        async chat_message_data_spec__relate_by_sys__auto_delete(message_ids) {
            return undefined;
        }

        async chat_message_data_spec__remove_by_message_id(message_id) {
            return undefined;
        }

        async chat_message_data_spec__remove_by_message_ids(message_ids) {
            return undefined;
        }

        async chat_read_progress__get_records_mine(user_attr, user_ids, group_ids) {
            return undefined; // list
        }

        async chat_read_progress__update(sender, message_id, receiver_type, receiver_attr) {
            return undefined;
        }

        async chat_message_read_list__get_attrs(message_ids) {
            return undefined; // list
        }

        async chat_message_read_list__record(message_id, user_id) {
            return undefined;
        }

        async chat_message_read_list__record_some(message_ids, user_id) {
            return undefined;
        }

        async chat_edition__get_records_to_me(user_attr, user_ids, group_ids) {
            return undefined; // list
        }

        async chat_edition__record(sender, message_id, receiver_type, receiver_attr) {
            return undefined; // id
        }

        async chat_edition__record_some(sender, message_ids, receiver_type, receiver_attr) {
            return undefined; // [id]
        }

        async chat_edition__record_some_different(li) {
            return undefined; // [id]
        }

        async chat_activity__get_records_to_me__recent(user_attr, user_ids, group_ids, seconds) {
            return undefined; // list
        }

        async chat_activity__clear(seconds) {
            return undefined;
        }

        async chat_activity__record(sender, activity_type, receiver_type, receiver_attr) {
            return undefined;
        }
    }

    class DenoSqlite3 extends _ {
        constructor(server) {
            super(server);
            this.lib_path = `${databasebackendargs.local_path}/deno-sqlite/mod.ts`;
            this.db_path = `${databasebackendargs.local_path}/database.db`;
        }

        async init() {

            if (false) {
                // 不支持中文
                // https://github.com/denodrivers/sqlite3
                // 文档，https://jsr.io/@db/sqlite/doc/~/Database
                const sqlite = await import("jsr:@db/sqlite@0.11")
                this.db = new sqlite.Database("./test/test.db");

                // const version = await this.exec_sql("select sqlite_version()");
                // console.log(version);
                // this.db.close();
            }

            if (true) {
                // https://deno.land/x/sqlite
                // https://github.com/dyedgreen/deno-sqlite/releases
                // const DB = await import ("https://deno.land/x/sqlite/mod.ts");
                const sqlite = await import (this.lib_path);
                this.db = new sqlite.DB(this.db_path);
            }

            // sql  = `PRAGMA index_list('${tablename.session}');`; // sqlite3会自动为唯一字段添加索引
            // const index_list = await this.exec_sql(sql);
            // console.log(index_list);
        }

        async exec_sql(sql) {
            await _.prototype._exec_sql.call(this, sql);

            if (false) {
                let result = this.db.prepare(sql).all();
            }

            const result = [];
            const query = this.db.prepareQuery(sql);
            try {
                const rows = query.all();
                const columns = query.columns();
                for (const row of rows) {
                    let d = {}
                    let i = 0;
                    for (const column of columns) {
                        d[column.name] = row[i];
                        i++;
                    }
                    result.push(d);
                }
                query.finalize();
            } catch (err) {
                query.finalize();
                throw err;
            }

            await _.prototype._exec_sql_ok.call(this, result);
            return result;
        }

        async last_insert_rowid() {
            sql = `SELECT last_insert_rowid() AS id;`;
            let r = await this.exec_sql(sql);
            return r[0].id;
        }

        async init_tables() {
            // 群组
            {
                sql = `CREATE TABLE IF NOT EXISTS "${tablename.group}" (`;
                sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                sql += `"gid" VARCHAR(${_.group__gid_length}) NOT NULL UNIQUE,`;
                sql += `"create_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                sql += `"announcement" TEXT,`;
                sql += `"announcement_editor_id" INTEGER,`;
                sql += `"announcement_updated_time" DATETIME`;
                sql += `);`;
                const result = await this.exec_sql(sql);
            }

            // 用户
            {
                sql = `CREATE TABLE IF NOT EXISTS "${tablename.user}" (`;
                sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                sql += `"uid" VARCHAR(${_.user__uid_length}) NOT NULL UNIQUE,`;
                sql += `"create_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                sql += `"password_hash" VARCHAR(${_.user__password_hash_length}) NOT NULL,`;
                sql += `"disabled" BOOLEAN NOT NULL DEFAULT 0,`;
                sql += `"contact_any" BOOLEAN NOT NULL DEFAULT 0,`;
                sql += `"manage_drive" BOOLEAN NOT NULL DEFAULT 0,`;
                sql += `"free_space" INTEGER NOT NULL DEFAULT 5120`;
                sql += `);`;
                const result = await this.exec_sql(sql);

                // 所属组
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.user_group_set}" (`;
                    sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `"user_id" INTEGER NOT NULL,`;
                    sql += `"group_id" INTEGER NOT NULL,`;
                    sql += `FOREIGN KEY("user_id") REFERENCES "${tablename.user}" ("id") ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY("group_id") REFERENCES "${tablename.group}" ("id") ON DELETE CASCADE,`;
                    sql += `UNIQUE("user_id", "group_id")`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                // 联系组
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.user_contact_group_set}" (`;
                    sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `"user_id" INTEGER NOT NULL,`;
                    sql += `"group_id" INTEGER NOT NULL,`;
                    sql += `FOREIGN KEY("user_id") REFERENCES "${tablename.user}" ("id") ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY("group_id") REFERENCES "${tablename.group}" ("id") ON DELETE CASCADE,`;
                    sql += `UNIQUE("user_id", "group_id")`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                // 联系人
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.user_contact_user_set}" (`;
                    sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `"user_id" INTEGER NOT NULL,`;
                    sql += `"other_user_id" INTEGER NOT NULL,`;
                    sql += `FOREIGN KEY("user_id") REFERENCES "${tablename.user}" ("id") ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY("other_user_id") REFERENCES "${tablename.user}" ("id") ON DELETE CASCADE,`;
                    sql += `UNIQUE("user_id", "other_user_id")`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }
            }

            // 网盘
            {
                sql = `CREATE TABLE IF NOT EXISTS "${tablename.drive}" (`;
                sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                // sql += `"did" varchar(${_.drive__did_max_length}) NOT NULL UNIQUE,`;
                sql += `"parent" INTEGER,`;

                sql += `"uploader" INTEGER,`;
                sql += `"uploaded" BOOLEAN NOT NULL DEFAULT 1,`;
                sql += `"uploaded_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                sql += `"download_count" INTEGER NOT NULL DEFAULT 0,`;
                sql += `"trashed" BOOLEAN NOT NULL DEFAULT 0,`;
                sql += `"trashed_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;

                sql += `"attachment_came" BOOLEAN NOT NULL DEFAULT 0,`;

                sql += `"share_any_type" INTEGER NOT NULL DEFAULT ${_.drive__share_type.noset} CHECK (share_any_type IN (${_.drive__share_type.noset}, ${_.drive__share_type.noshare}, ${_.drive__share_type.readonly}, ${_.drive__share_type.readwrite})),`;
                sql += `"share_public_type" INTEGER NOT NULL DEFAULT ${_.drive__share_type.noset} CHECK (share_public_type IN (${_.drive__share_type.noset}, ${_.drive__share_type.noshare}, ${_.drive__share_type.readonly}, ${_.drive__share_type.readwrite})),`;
                sql += `"public_expiration" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                sql += `"public_came" BOOLEAN NOT NULL DEFAULT 0,`;
                sql += `"public_pass" TEXT NOT NULL DEFAULT '',`;

                sql += `"type" INTEGER NOT NULL DEFAULT ${_.drive__item_type.file} CHECK (type IN (${_.drive__item_type.file}, ${_.drive__item_type.folder})),`;
                sql += `"size" INTEGER NOT NULL DEFAULT 0,`;
                sql += `"name" TEXT NOT NULL,`;
                sql += `"name_encrypted" BOOLEAN NOT NULL DEFAULT 1,`;
                sql += `"hash" varchar(${_.drive__hash_length}) NOT NULL DEFAULT '',`;
                sql += `"modified_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;

                sql += `FOREIGN KEY(parent) REFERENCES "${tablename.drive}" (id) ON DELETE RESTRICT,`;
                sql += `CONSTRAINT no_self_reference CHECK (parent IS NULL OR id != parent),`;
                sql += `FOREIGN KEY(uploader) REFERENCES "${tablename.user}" (id) ON DELETE RESTRICT`;

                sql += `);`;
                const result = await this.exec_sql(sql);

                // 索引
                {
                    sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.drive}__uploaded_time ON ${tablename.drive}(uploaded_time);`;
                    const result = await this.exec_sql(sql);
                }
                {
                    sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.drive}__trashed ON ${tablename.drive}(trashed);`;
                    const result = await this.exec_sql(sql);
                }

                // 共享到用户
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.drive_share_user_set}" (`;
                    sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `"user_id" INTEGER NOT NULL,`;
                    sql += `"item_id" INTEGER NOT NULL,`;
                    sql += `"share_type" INTEGER NOT NULL DEFAULT ${_.drive__share_type.readonly} CHECK (share_type IN (${_.drive__share_type.readonly}, ${_.drive__share_type.readwrite})),`;
                    sql += `FOREIGN KEY("user_id") REFERENCES "${tablename.user}" ("id") ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY("item_id") REFERENCES "${tablename.drive}" ("id") ON DELETE CASCADE,`;
                    sql += `UNIQUE("user_id", "item_id")`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                // 共享到组
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.drive_share_group_set}" (`;
                    sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `"group_id" INTEGER NOT NULL,`;
                    sql += `"item_id" INTEGER NOT NULL,`;
                    sql += `"share_type" INTEGER NOT NULL DEFAULT ${_.drive__share_type.readonly} CHECK (share_type IN (${_.drive__share_type.readonly}, ${_.drive__share_type.readwrite})),`;
                    sql += `FOREIGN KEY("group_id") REFERENCES "${tablename.group}" ("id") ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY("item_id") REFERENCES "${tablename.drive}" ("id") ON DELETE CASCADE,`;
                    sql += `UNIQUE("group_id", "item_id")`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                // 附件文件夹
                await this.drive__attachments_ensure();

                // 数据库迁移:为现有数据填充 modified_time 字段
                try {
                    // 检查 modified_time 字段是否存在
                    sql = `PRAGMA table_info(${tablename.drive});`;
                    const columns = await this.exec_sql(sql);
                    const hasModifiedTime = columns.some(col => col.name === 'modified_time');
                    
                    if (!hasModifiedTime) {
                        // 如果字段不存在,添加字段
                        sql = `ALTER TABLE ${tablename.drive} ADD COLUMN "modified_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;`;
                        await this.exec_sql(sql);
                        console.log('已添加 modified_time 字段到 drive 表');
                    }
                    
                    // 为现有数据填充 modified_time 字段(使用 uploaded_time 作为初始值)
                    sql = `UPDATE ${tablename.drive} SET modified_time = uploaded_time WHERE modified_time IS NULL OR modified_time = '';`;
                    await this.exec_sql(sql);
                    
                } catch (error) {
                    console.log('迁移 modified_time 字段时出错:', error.message);
                }
            }

            // 会话、短期登录记录
            {
                sql = `CREATE TABLE IF NOT EXISTS "${tablename.session}" (`;
                sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                sql += `"sid" varchar(${_.session__sid_length}) NOT NULL UNIQUE,`;
                sql += `"type" smallint NOT NULL DEFAULT ${_.session__type.admin} CHECK (type IN (${_.session__type.admin}, ${_.session__type.user}, ${_.session__type.guest_drive})),`;
                sql += `"last_access_time" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                sql += `"user_id" INTEGER NULL,`;
                sql += `"closed" BOOLEAN NOT NULL DEFAULT 0,`;
                sql += `drive_item_id INTEGER NULL,`;
                sql += `FOREIGN KEY("user_id") REFERENCES "${tablename.user}" ("id") ON DELETE CASCADE,`;
                sql += `FOREIGN KEY(drive_item_id) REFERENCES ${tablename.drive}(id) ON DELETE CASCADE`;
                sql += `);`;
                const result = await this.exec_sql(sql);

                // 索引
                {
                    sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.session}__last_access_time ON ${tablename.session}(last_access_time);`;
                    const result = await this.exec_sql(sql);
                }
            }

            // 聊天
            {
                sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_message}" (`;
                sql += `id INTEGER PRIMARY KEY AUTOINCREMENT,`;
                sql += `type INTEGER NOT NULL CHECK (type IN (${_.chat_message__type.text}, ${_.chat_message__type.image}, ${_.chat_message__type.file}, ${_.chat_message__type.sys}, ${_.chat_message__type.vote})),`;
                sql += `status INTEGER NOT NULL DEFAULT 0,`;
                sql += `sent_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                sql += `sender INTEGER NULL,`;
                sql += `sender_rand TEXT NOT NULL DEFAULT '' CHECK(length(sender_rand) <= 10),`;
                sql += `revoked_time DATETIME NULL,`;
                sql += `data_text TEXT NOT NULL DEFAULT '',`;
                sql += `pinned BOOLEAN NOT NULL DEFAULT 0,`;
                sql += `pinned_time DATETIME NULL,`;
                sql += `receiver_type INTEGER NOT NULL CHECK (receiver_type IN (${_.chat_message__receiver_type.user}, ${_.chat_message__receiver_type.group})),`;
                sql += `receiver_group_id INTEGER NULL,`;
                sql += `receiver_user_id INTEGER NULL,`;
                sql += `FOREIGN KEY(sender) REFERENCES ${tablename.user}(id) ON DELETE SET NULL,`;
                sql += `FOREIGN KEY(receiver_group_id) REFERENCES "${tablename.group}"(id) ON DELETE SET NULL,`;
                sql += `FOREIGN KEY(receiver_user_id) REFERENCES ${tablename.user}(id) ON DELETE SET NULL`;
                sql += `);`;
                const result = await this.exec_sql(sql);

                // 检查并更新CHECK约束,添加vote类型支持
                try {
                    // 尝试插入一个vote类型的测试记录
                    sql = `INSERT INTO ${tablename.chat_message} (type, status, sender, sender_rand, receiver_type, data_text) `;
                    sql += `SELECT ${_.chat_message__type.vote}, 0, NULL, 'test_check', 1, '' `;
                    sql += `WHERE NOT EXISTS (SELECT 1 FROM ${tablename.chat_message} WHERE type = ${_.chat_message__type.vote} LIMIT 1)`;
                    await this.exec_sql(sql);
                } catch (error) {
                    // 如果失败,说明CHECK约束没有包含vote类型,需要重建表
                    if (error.message.includes('CHECK constraint failed')) {
                        console.log('更新chat_message表的CHECK约束以支持vote类型...');
                        
                        // 备份数据
                        sql = `CREATE TABLE ${tablename.chat_message}_backup AS SELECT * FROM ${tablename.chat_message}`;
                        await this.exec_sql(sql);
                        
                        // 删除旧表
                        sql = `DROP TABLE ${tablename.chat_message}`;
                        await this.exec_sql(sql);
                        
                        // 重新创建表(新的CHECK约束会生效)
                        sql = `CREATE TABLE "${tablename.chat_message}" (`;
                        sql += `id INTEGER PRIMARY KEY AUTOINCREMENT,`;
                        sql += `type INTEGER NOT NULL CHECK (type IN (${_.chat_message__type.text}, ${_.chat_message__type.image}, ${_.chat_message__type.file}, ${_.chat_message__type.sys}, ${_.chat_message__type.vote})),`;
                        sql += `status INTEGER NOT NULL DEFAULT 0,`;
                        sql += `sent_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                        sql += `sender INTEGER NULL,`;
                        sql += `sender_rand TEXT NOT NULL DEFAULT '' CHECK(length(sender_rand) <= 10),`;
                        sql += `revoked_time DATETIME NULL,`;
                        sql += `data_text TEXT NOT NULL DEFAULT '',`;
                        sql += `pinned BOOLEAN NOT NULL DEFAULT 0,`;
                        sql += `pinned_time DATETIME NULL,`;
                        sql += `receiver_type INTEGER NOT NULL CHECK (receiver_type IN (${_.chat_message__receiver_type.user}, ${_.chat_message__receiver_type.group})),`;
                        sql += `receiver_group_id INTEGER NULL,`;
                        sql += `receiver_user_id INTEGER NULL,`;
                        sql += `FOREIGN KEY(sender) REFERENCES ${tablename.user}(id) ON DELETE SET NULL,`;
                        sql += `FOREIGN KEY(receiver_group_id) REFERENCES "${tablename.group}"(id) ON DELETE SET NULL,`;
                        sql += `FOREIGN KEY(receiver_user_id) REFERENCES ${tablename.user}(id) ON DELETE SET NULL`;
                        sql += `);`;
                        await this.exec_sql(sql);
                        
                        // 恢复数据
                        sql = `INSERT INTO ${tablename.chat_message} SELECT * FROM ${tablename.chat_message}_backup`;
                        await this.exec_sql(sql);
                        
                        // 删除备份表
                        sql = `DROP TABLE ${tablename.chat_message}_backup`;
                        await this.exec_sql(sql);
                        
                        console.log('chat_message表CHECK约束更新完成');
                    }
                }

                // 索引
                {
                    sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.chat_message}__sent_time ON ${tablename.chat_message}(sent_time);`;
                    const result = await this.exec_sql(sql);
                }
                {
                    sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.chat_message}__revoked_time ON ${tablename.chat_message}(revoked_time);`;
                    const result = await this.exec_sql(sql);
                }

                // 特殊消息类型
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_message_data_spec}" (`;
                    sql += `message_id INTEGER NOT NULL UNIQUE,`;
                    sql += `drive_item_id INTEGER NULL,`;
                    sql += `action_type INTEGER NOT NULL DEFAULT ${_.chat_data_spec__action_type.revoke_message},`;
                    sql += `a1_user_id INTEGER NULL,`; // 撤回/删除者/清理消息者(a1_uid)
                    sql += `a2_user_id INTEGER NULL,`;
                    sql += `a3_number INTEGER NOT NULL DEFAULT 0,`; // 宽度 清理消息小时数
                    sql += `a4_number INTEGER NOT NULL DEFAULT 0,`; // 高度
                    sql += `FOREIGN KEY(message_id) REFERENCES ${tablename.chat_message}(id) ON DELETE RESTRICT,`;
                    sql += `FOREIGN KEY(drive_item_id) REFERENCES ${tablename.drive}(id) ON DELETE SET NULL,`;
                    sql += `FOREIGN KEY(a1_user_id) REFERENCES ${tablename.user}(id) ON DELETE SET NULL,`;
                    sql += `FOREIGN KEY(a2_user_id) REFERENCES ${tablename.user}(id) ON DELETE SET NULL`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                // 已读进度
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_read_progress}" (`;
                    sql += `crpid INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `message_id INTEGER NOT NULL,`;
                    sql += `sender INTEGER NOT NULL,`; // sender是我，就是我的已读记录
                    sql += `receiver_type INTEGER NOT NULL CHECK (receiver_type IN (${_.chat_message__receiver_type.user}, ${_.chat_message__receiver_type.group})),`;
                    sql += `receiver_group_id INTEGER NULL,`;
                    sql += `receiver_user_id INTEGER NULL,`;
                    sql += `FOREIGN KEY(message_id) REFERENCES ${tablename.chat_message}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(sender) REFERENCES ${tablename.user}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(receiver_group_id) REFERENCES "${tablename.group}"(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(receiver_user_id) REFERENCES ${tablename.user}(id) ON DELETE CASCADE`;
                    // sql += `UNIQUE("message_id", "user_id")`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                // 标记已读
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_read_progress}" (`;
                    sql += `crpid INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `message_id INTEGER NOT NULL,`;
                    sql += `sender INTEGER NOT NULL,`; // sender是我，就是我的已读记录
                    sql += `receiver_type INTEGER NOT NULL CHECK (receiver_type IN (${_.chat_message__receiver_type.user}, ${_.chat_message__receiver_type.group})),`;
                    sql += `receiver_group_id INTEGER NULL,`;
                    sql += `receiver_user_id INTEGER NULL,`;
                    sql += `FOREIGN KEY(message_id) REFERENCES ${tablename.chat_message}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(sender) REFERENCES ${tablename.user}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(receiver_group_id) REFERENCES "${tablename.group}"(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(receiver_user_id) REFERENCES ${tablename.user}(id) ON DELETE CASCADE`;
                    // sql += `UNIQUE("message_id", "user_id")`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                

                // 标记已读
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_message_read_list}" (`;
                    sql += `id INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `message_id INTEGER NOT NULL,`;
                    sql += `user_id INTEGER NOT NULL,`;
                    // sql += `PRIMARY KEY(message_id, user_id),`;
                    sql += `UNIQUE(message_id, user_id),`;
                    sql += `FOREIGN KEY(message_id) REFERENCES ${tablename.chat_message}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(user_id) REFERENCES ${tablename.user}(id) ON DELETE CASCADE`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                // 消息回应
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_message_reply_set}" (`;
                    sql += `id INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `message_id INTEGER NOT NULL,`;
                    sql += `user_id INTEGER NOT NULL,`;
                    sql += `reply_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                    sql += `UNIQUE(message_id, user_id),`;
                    sql += `FOREIGN KEY(message_id) REFERENCES ${tablename.chat_message}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(user_id) REFERENCES ${tablename.user}(id) ON DELETE CASCADE`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                // 二次编辑
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_edition}" (`;
                    sql += `ceid INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `message_id INTEGER NOT NULL,`;
                    // sql += `edited_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                    sql += `sender INTEGER NULL,`;
                    sql += `receiver_type INTEGER NOT NULL CHECK (receiver_type IN (${_.chat_message__receiver_type.user}, ${_.chat_message__receiver_type.group})),`;
                    sql += `receiver_group_id INTEGER NULL,`;
                    sql += `receiver_user_id INTEGER NULL,`;
                    sql += `FOREIGN KEY(message_id) REFERENCES ${tablename.chat_message}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(sender) REFERENCES ${tablename.user}(id) ON DELETE SET NULL,`;
                    sql += `FOREIGN KEY(receiver_group_id) REFERENCES "${tablename.group}"(id) ON DELETE SET NULL,`;
                    sql += `FOREIGN KEY(receiver_user_id) REFERENCES ${tablename.user}(id) ON DELETE SET NULL`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);
                }

                // 成员动作
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_activity}" (`;
                    sql += `caid INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `type INTEGER NOT NULL DEFAULT ${_.chat_activity__type.none},`;
                    sql += `acted_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                    sql += `sender INTEGER NOT NULL,`;
                    sql += `receiver_type INTEGER NOT NULL CHECK (receiver_type IN (${_.chat_message__receiver_type.user}, ${_.chat_message__receiver_type.group})),`;
                    sql += `receiver_group_id INTEGER NULL,`;
                    sql += `receiver_user_id INTEGER NULL,`;
                    sql += `FOREIGN KEY(sender) REFERENCES ${tablename.user}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(receiver_group_id) REFERENCES "${tablename.group}"(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(receiver_user_id) REFERENCES ${tablename.user}(id) ON DELETE CASCADE`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);

                    // 索引
                    {
                        sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.chat_activity}__acted_time ON ${tablename.chat_activity}(acted_time);`;
                        const result = await this.exec_sql(sql);
                    }
                }

                // 投票表
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_vote}" (`;
                    sql += `id INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `message_id INTEGER NOT NULL UNIQUE,`;
                    sql += `title TEXT NOT NULL,`;
                    sql += `description TEXT,`;
                    sql += `multiple_choice INTEGER NOT NULL DEFAULT 0,`;
                    sql += `anonymous INTEGER NOT NULL DEFAULT 0,`;
                    sql += `deadline DATETIME,`;
                    sql += `create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                    sql += `FOREIGN KEY(message_id) REFERENCES ${tablename.chat_message}(id) ON DELETE CASCADE`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);

                    // 索引
                    {
                        sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.chat_vote}__message_id ON ${tablename.chat_vote}(message_id);`;
                        const result = await this.exec_sql(sql);
                    }
                }

                // 会话置顶表
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_pin}" (`;
                    sql += `id INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `user_id INTEGER NOT NULL,`;
                    sql += `receiver_type INTEGER NOT NULL CHECK (receiver_type IN (${_.chat_message__receiver_type.user}, ${_.chat_message__receiver_type.group})),`;
                    sql += `receiver_group_id INTEGER NULL,`;
                    sql += `receiver_user_id INTEGER NULL,`;
                    sql += `create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                    sql += `UNIQUE(user_id, receiver_type, receiver_group_id, receiver_user_id),`;
                    sql += `FOREIGN KEY(user_id) REFERENCES ${tablename.user}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(receiver_group_id) REFERENCES "${tablename.group}"(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(receiver_user_id) REFERENCES ${tablename.user}(id) ON DELETE CASCADE`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);

                    // 索引
                    {
                        sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.chat_pin}__user_id ON ${tablename.chat_pin}(user_id);`;
                        const result = await this.exec_sql(sql);
                    }
                }

                // 投票选项表
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_vote_option}" (`;
                    sql += `id INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `vote_id INTEGER NOT NULL,`;
                    sql += `option_text TEXT NOT NULL,`;
                    sql += `option_order INTEGER NOT NULL,`;
                    sql += `FOREIGN KEY(vote_id) REFERENCES ${tablename.chat_vote}(id) ON DELETE CASCADE`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);

                    // 索引
                    {
                        sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.chat_vote_option}__vote_id ON ${tablename.chat_vote_option}(vote_id);`;
                        const result = await this.exec_sql(sql);
                    }
                }

                // 投票记录表
                {
                    sql = `CREATE TABLE IF NOT EXISTS "${tablename.chat_vote_record}" (`;
                    sql += `id INTEGER PRIMARY KEY AUTOINCREMENT,`;
                    sql += `vote_id INTEGER NOT NULL,`;
                    sql += `option_id INTEGER NOT NULL,`;
                    sql += `user_id INTEGER NOT NULL,`;
                    sql += `vote_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,`;
                    sql += `FOREIGN KEY(vote_id) REFERENCES ${tablename.chat_vote}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(option_id) REFERENCES ${tablename.chat_vote_option}(id) ON DELETE CASCADE,`;
                    sql += `FOREIGN KEY(user_id) REFERENCES ${tablename.user}(id) ON DELETE CASCADE,`;
                    sql += `UNIQUE(vote_id, user_id, option_id)`;
                    sql += `);`;
                    const result = await this.exec_sql(sql);

                    // 索引
                    {
                        sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.chat_vote_record}__vote_id ON ${tablename.chat_vote_record}(vote_id);`;
                        const result = await this.exec_sql(sql);
                    }
                    {
                        sql = `CREATE INDEX IF NOT EXISTS ${myindex}__${tablename.chat_vote_record}__user_id ON ${tablename.chat_vote_record}(user_id);`;
                        const result = await this.exec_sql(sql);
                    }
                }
            }

            // 系统配置表
            {
                sql = `CREATE TABLE IF NOT EXISTS "${tablename.settings}" (`;
                sql += `"id" INTEGER PRIMARY KEY AUTOINCREMENT,`;
                sql += `"key" TEXT NOT NULL UNIQUE,`;
                sql += `"encrypted_value" TEXT NOT NULL,`;
                sql += `"updated_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`;
                sql += `);`;
                const result = await this.exec_sql(sql);
            }

        }

        async session__new(type, user) {
            await super.session__new(type, user);

            let sid;
            const total = (type === _.session__type.user ? 2 : 1);
            for (let i = 0; i < total; i++) {
                sid = generateRandomString(_.session__sid_length);
                sql = `INSERT INTO ${tablename.session} ("sid", "type", "user_id", "closed") VALUES (`;
                if (type === _.session__type.admin) {
                    sql += `'${sid}', ${type}, NULL, `;
                } else {
                    sql += `'${sid}', ${type}, ${user.id}, `; // 主键
                }
                sql += `${total === 2 && i === 0 ? 1 : 0}`; // 因需要获取当日首次上线时间
                sql += `);`;
                let r = await this.exec_sql(sql);
            }

            return sid;
        }

        async session__new_by_guest_drive(drive_item_id) {
            await super.session__new_by_guest_drive(drive_item_id);

            let sid;
            sid = generateRandomString(_.session__sid_length);
            sql = `INSERT INTO ${tablename.session} ("sid", "type", "drive_item_id", "closed") VALUES (`;
            sql += `'${sid}', ${_.session__type.guest_drive}, ${drive_item_id}, `; // 主键
            sql += `0`;
            sql += `);`;
            let r = await this.exec_sql(sql);

            return sid;
        }

        async session__get_attr(session_id) {
            sql = `SELECT * FROM ${tablename.session} WHERE sid = '${session_id}';`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async session__get_last_attr_by_user_id(user_id) {
            sql = `SELECT * FROM ${tablename.session} WHERE type = ${_.session__type.user} AND user_id = ${user_id} ORDER BY last_access_time DESC LIMIT 1;`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async session__get_attrs_by_user_id(user_ids, timestamp) {
            if (user_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.session} WHERE type = ${_.session__type.user} AND user_id IN (${user_ids.map(i => `${i}`).join(',')}) `;
            if (timestamp) {
                sql += `AND last_access_time >= datetime(${timestamp}, 'unixepoch') AND last_access_time < datetime(${timestamp} + 86400, 'unixepoch')`;
            }
            sql += ` ORDER BY last_access_time;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async session__get_attrs_by_user_id__recent(user_ids, seconds) {
            if (user_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.session} WHERE type = ${_.session__type.user} AND user_id IN (${user_ids.map(i => `${i}`).join(',')}) `;
            sql += `AND last_access_time > DATETIME('now', '-${seconds} seconds')`;
            sql += ` ORDER BY last_access_time;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async session__renew(session_id) {
            sql = `UPDATE ${tablename.session} SET last_access_time=CURRENT_TIMESTAMP WHERE sid = '${session_id}';`;
            let r = await this.exec_sql(sql);
        }

        async session__renew_by_id(id) {
            sql = `UPDATE ${tablename.session} SET last_access_time=CURRENT_TIMESTAMP WHERE id = ${id};`;
            let r = await this.exec_sql(sql);
        }

        async session__auto_renew(session_attr) {
            let date = parseToUTC(session_attr.last_access_time);
            if (date < Date.now() - (_.session__auto_renew_after * milliseconds_of_one_hour)) {
                await this.session__renew_by_id(session_attr.id);
                return true;
            }
            return false;
        }

        async session__check_alive(session_id) {
            session_id = normalizeId(session_id);
            if (!session_id) return false;
            let r = await this.session__get_attr(session_id);
            if (!r) return false;
            if (r.closed) return false;
            let date = parseToUTC(r.last_access_time);
            if (date > Date.now() - (_.session__keep_alive * milliseconds_of_one_hour)) {
                return r;
            }
            return false;
        }

        async session__close(session_id) {
            sql = `UPDATE ${tablename.session} SET closed=1 WHERE sid = '${session_id}';`;
            let r = await this.exec_sql(sql);
        }

        async session__close_by_id(id) {
            sql = `UPDATE ${tablename.session} SET closed=1 WHERE id = ${id};`;
            let r = await this.exec_sql(sql);
        }

        async session__clear() {
            sql = `DELETE FROM ${tablename.session} WHERE last_access_time <= DATETIME('now', '-${_.session__stored} hours');`;
            let r = await this.exec_sql(sql);
        }

        async group__new(gid) {
            sql = `INSERT INTO ${tablename.group} ("gid") VALUES (`;
            sql += `'${gid}'`;
            sql += `);`;
            let r = await this.exec_sql(sql);

            return gid;
        }

        async group__restore(li) {
            sql = `INSERT INTO ${tablename.group} ("gid") VALUES `;

            const items = [];
            li.forEach((attr) => {
                items.push(`('${attr.gid}')`);
            })
            sql += `${items.join(", ")}`;

            sql += ` RETURNING id,gid;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async group__list() {
            sql = `SELECT * FROM ${tablename.group};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async group__list_who_can_contact_me(user_id, user_attrs) {
            if (!user_attrs) user_attrs = await this.user__list_who_can_contact_me(user_id);
            const user_ids = user_attrs.map(item => item.id);
            if (user_ids.length === 0) return [];

            // sql = `SELECT * FROM ${tablename.group} `; // 双层exists速度慢点？
            // sql += `WHERE `;
            // sql += `EXISTS (`;
            // sql += `SELECT * FROM ${tablename.user_contact_group_set} WHERE (${tablename.group}.id = ${tablename.user_contact_group_set}.group_id AND ${tablename.user_contact_group_set}.user_id IN (${user_ids.map(i => `${i}`).join(',')}) `;
            // sql += `AND EXISTS (SELECT * FROM ${tablename.user_group_set} WHERE ${tablename.user_group_set}.group_id = ${tablename.user_contact_group_set}.group_id AND ${tablename.user_group_set}.user_id = ${user_id}))`;
            // sql += `)`;
            // sql += `;`;

            sql = `SELECT * FROM ${tablename.group} `;
            sql += `WHERE `;
            sql += `EXISTS (SELECT * FROM ${tablename.user_group_set} WHERE ${tablename.user_group_set}.group_id = ${tablename.group}.id AND ${tablename.user_group_set}.user_id = ${user_id})`;
            sql += ` AND `;
            sql += `EXISTS (`;
            sql += `SELECT * FROM ${tablename.user_contact_group_set} WHERE (${tablename.user_contact_group_set}.user_id IN (${user_ids.map(i => `${i}`).join(',')}) AND ${tablename.user_contact_group_set}.group_id = ${tablename.group}.id) `;
            sql += `)`;
            sql += `;`;

            let r = await this.exec_sql(sql);
            return r;
        }

        async group__get_attr(gid) {
            sql = `SELECT * FROM ${tablename.group} WHERE gid = '${gid}';`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async group__get_attrs(gids) {
            if (gids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.group} WHERE gid IN (${gids.map(i => `'${i}'`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async group__get_attrs_by_id(ids) {
            if (ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.group} WHERE id IN (${ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async group__edit(gid, new_attr) {
            const group_attr = await this.group__get_attr(gid);
            if (!group_attr) throw new Error(requsterror.format_group_not_found(gid));
            const new_gid = normalizeId(new_attr.gid);
            if (!new_gid) throw new Error(requsterror.format_name_invalid(new_attr));

            sql = `UPDATE ${tablename.group} SET `;
            sql += `gid='${new_gid}'`;
            sql += ` WHERE id = ${group_attr.id};`;
            let r = await this.exec_sql(sql);

            return new_gid;
        }

        async group__delete(gid) {
            sql = `DELETE FROM ${tablename.group} WHERE gid = '${gid}';`;
            let r = await this.exec_sql(sql);
        }

        async group__get_announcement(gid) {
            sql = `SELECT `;
            sql += `g.id, g.gid, g.announcement, g.announcement_editor_id, g.announcement_updated_time,`;
            sql += `u.uid as editor_uid`;
            sql += ` FROM ${tablename.group} g`;
            sql += ` LEFT JOIN ${tablename.user} u ON g.announcement_editor_id = u.id`;
            sql += ` WHERE g.gid = '${gid}'`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async group__set_announcement(gid, announcement, user_id) {
            const group_attr = await this.group__get_attr(gid);
            if (!group_attr) throw new Error(requsterror.format_group_not_found(gid));

            sql = `UPDATE ${tablename.group} SET `;
            sql += `announcement = ?,`;
            sql += `announcement_editor_id = ?,`;
            sql += `announcement_updated_time = CURRENT_TIMESTAMP`;
            sql += ` WHERE id = ${group_attr.id};`;
            let r = await this.exec_sql(sql, [announcement, user_id]);
        }

        // 获取系统配置（解密）
        async settings__get(key) {
            sql = `SELECT * FROM ${tablename.settings} WHERE key = ?;`;
            let r = await this.exec_sql(sql, [key]);
            if (r.length === 0) return null;

            const setting = r[0];
            try {
                setting.decrypted_value = await systemCrypto.decrypt(setting.encrypted_value);
            } catch (error) {
                console.error(`解密配置项失败 [${key}]:`, error);
                setting.decrypted_value = null;
            }
            return setting;
        }

        // 设置系统配置（加密存储）
        async settings__set(key, value) {
            const encryptedValue = await systemCrypto.encrypt(value);

            // 检查是否存在
            const existing = await this.settings__get(key);

            if (existing) {
                // 更新
                sql = `UPDATE ${tablename.settings} SET `;
                sql += `encrypted_value = ?,`;
                sql += `updated_time = CURRENT_TIMESTAMP`;
                sql += ` WHERE key = ?;`;
                let r = await this.exec_sql(sql, [encryptedValue, key]);
            } else {
                // 插入
                sql = `INSERT INTO ${tablename.settings} (key, encrypted_value) VALUES (?, ?);`;
                let r = await this.exec_sql(sql, [key, encryptedValue]);
            }
        }

        // 直接存储加密数据（前端已加密）
        async settings__set_raw(key, encryptedValue) {
            // 检查是否存在
            const existing = await this.settings__get(key);

            if (existing) {
                // 更新
                sql = `UPDATE ${tablename.settings} SET `;
                sql += `encrypted_value = ?,`;
                sql += `updated_time = CURRENT_TIMESTAMP`;
                sql += ` WHERE key = ?;`;
                let r = await this.exec_sql(sql, [encryptedValue, key]);
            } else {
                // 插入
                sql = `INSERT INTO ${tablename.settings} (key, encrypted_value) VALUES (?, ?);`;
                let r = await this.exec_sql(sql, [key, encryptedValue]);
            }
        }

        async user__new(attr) {

            const gids = (await this.group__list()).map((i) => i.gid);
            for (const groups of [attr.groups, attr.contact_groups]) {
                for (const gid of groups) {
                    if (!gids.includes(gid)) {
                        throw new Error(`不存在此组：${gid}`);
                    }
                }
            }

            const uids = (await this.user__list()).map((i) => i.uid);
            for (const uid of attr.contact_users) {
                if (!uids.includes(uid)) {
                    throw new Error(`不存在此用户：${uid}`);
                }
            }

            sql = `INSERT INTO ${tablename.user} ("uid", "password_hash", "disabled", "contact_any", "manage_drive", "free_space") VALUES (`;
            sql += `'${attr.uid}', '${attr.password_hash}', ${attr.disabled}, ${attr.contact_any}, ${attr.manage_drive}, ${attr.free_space}`;
            sql += `);`;
            let r = await this.exec_sql(sql);

            const user_attr = await this.user__get_attr(attr.uid);

            await this.drive__myspace_new(user_attr);

            // {
            //     const group_attrs = await this.group__get_attrs(attr.groups);
            //     if (group_attrs.length > 0) {
            //         const tuples = [];
            //         for (const group_attr of group_attrs) {
            //             sql = `(${user_attr.id}, ${group_attr.id})`;
            //             tuples.push(sql);
            //         }
            //         sql = `INSERT INTO ${tablename.user_group_set} ("user_id", "group_id") VALUES `;
            //         sql += `${tuples.join(",")}`;
            //         sql += `;`;
            //         let r = await this.exec_sql(sql);
            //     }
            // }
            //
            // {
            //     const group_attrs = await this.group__get_attrs(attr.contact_groups);
            //     if (group_attrs.length > 0) {
            //         const tuples = [];
            //         for (const group_attr of group_attrs) {
            //             sql = `(${user_attr.id}, ${group_attr.id})`;
            //             tuples.push(sql);
            //         }
            //         sql = `INSERT INTO ${tablename.user_contact_group_set} ("user_id", "group_id") VALUES `;
            //         sql += `${tuples.join(",")}`;
            //         sql += `;`;
            //         let r = await this.exec_sql(sql);
            //     }
            // }
            //
            // {
            //     const user_attrs = await this.user__get_attrs(attr.contact_users);
            //     if (user_attrs.length > 0) {
            //         const tuples = [];
            //         for (const other_user_attr of user_attrs) {
            //             sql = `(${user_attr.id}, ${other_user_attr.id})`;
            //             tuples.push(sql);
            //         }
            //         sql = `INSERT INTO ${tablename.user_contact_user_set} ("user_id", "other_user_id") VALUES `;
            //         sql += `${tuples.join(",")}`;
            //         sql += `;`;
            //         let r = await this.exec_sql(sql);
            //     }
            // }
            await this.user__add_relations(attr, user_attr);

            return user_attr;
        }

        async user__add_relations(attr, user_attr) {
            {
                const group_attrs = await this.group__get_attrs(attr.groups);
                if (group_attrs.length > 0) {
                    const tuples = [];
                    for (const group_attr of group_attrs) {
                        sql = `(${user_attr.id}, ${group_attr.id})`;
                        tuples.push(sql);
                    }
                    sql = `INSERT INTO ${tablename.user_group_set} ("user_id", "group_id") VALUES `;
                    sql += `${tuples.join(",")}`;
                    sql += `;`;
                    let r = await this.exec_sql(sql);
                }
            }

            {
                const group_attrs = await this.group__get_attrs(attr.contact_groups);
                if (group_attrs.length > 0) {
                    const tuples = [];
                    for (const group_attr of group_attrs) {
                        sql = `(${user_attr.id}, ${group_attr.id})`;
                        tuples.push(sql);
                    }
                    sql = `INSERT INTO ${tablename.user_contact_group_set} ("user_id", "group_id") VALUES `;
                    sql += `${tuples.join(",")}`;
                    sql += `;`;
                    let r = await this.exec_sql(sql);
                }
            }

            {
                attr.contact_users = attr.contact_users.filter((i) => i !== user_attr.uid);
                const user_attrs = await this.user__get_attrs(attr.contact_users);
                if (user_attrs.length > 0) {
                    const tuples = [];
                    for (const other_user_attr of user_attrs) {
                        sql = `(${user_attr.id}, ${other_user_attr.id})`;
                        tuples.push(sql);
                    }
                    sql = `INSERT INTO ${tablename.user_contact_user_set} ("user_id", "other_user_id") VALUES `;
                    sql += `${tuples.join(",")}`;
                    sql += `;`;
                    let r = await this.exec_sql(sql);
                }
            }
        }

        async user__restore(li) {
            sql = `INSERT INTO ${tablename.user} ("uid", "password_hash", "disabled", "contact_any", "manage_drive", "free_space") VALUES `;

            const items = [];
            li.forEach((attr) => {
                items.push(`('${attr.uid}', '${attr.password_hash}', ${attr.disabled}, ${attr.contact_any}, ${attr.manage_drive}, ${attr.free_space})`);
            })
            sql += `${items.join(", ")}`;

            sql += ` RETURNING id,uid;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user__restore_relations(args, user_attrs, group_attrs) {
            {
                const tuples = [];

                const uids = Object.keys(args.belong_groups);
                uids.forEach(uid => {
                    const gids = args.belong_groups[uid];
                    const user_attr = user_attrs.find((attr) => attr.uid === uid);
                    gids.forEach((gid) => {
                        const group_attr = group_attrs.find((attr) => attr.gid === gid);
                        sql = `(${user_attr.id}, ${group_attr.id})`;
                        tuples.push(sql);
                    })
                });
                if (tuples.length > 0) {
                    sql = `INSERT INTO ${tablename.user_group_set} ("user_id", "group_id") VALUES `;
                    sql += `${tuples.join(",")}`;
                    sql += `;`;
                    let r = await this.exec_sql(sql);
                }
            }

            {
                const tuples = [];

                const uids = Object.keys(args.contact_groups);
                uids.forEach(uid => {
                    const gids = args.contact_groups[uid];
                    const user_attr = user_attrs.find((attr) => attr.uid === uid);
                    gids.forEach((gid) => {
                        const group_attr = group_attrs.find((attr) => attr.gid === gid);
                        sql = `(${user_attr.id}, ${group_attr.id})`;
                        tuples.push(sql);
                    })
                });
                if (tuples.length > 0) {
                    sql = `INSERT INTO ${tablename.user_contact_group_set} ("user_id", "group_id") VALUES `;
                    sql += `${tuples.join(",")}`;
                    sql += `;`;
                    let r = await this.exec_sql(sql);
                }
            }

            {
                const tuples = [];

                const uids = Object.keys(args.contact_users);
                uids.forEach(uid => {
                    const other_uids = args.contact_users[uid];
                    const user_attr = user_attrs.find((attr) => attr.uid === uid);
                    other_uids.forEach((other_uid) => {
                        const other_user_attr = user_attrs.find((attr) => attr.uid === other_uid);
                        sql = `(${user_attr.id}, ${other_user_attr.id})`;
                        tuples.push(sql);
                    })
                });
                if (tuples.length > 0) {
                    sql = `INSERT INTO ${tablename.user_contact_user_set} ("user_id", "other_user_id") VALUES `;
                    sql += `${tuples.join(",")}`;
                    sql += `;`;
                    let r = await this.exec_sql(sql);
                }
            }

        }

        async user__list(fields = "id,uid,disabled,free_space") {
            sql = `SELECT ${fields} FROM ${tablename.user};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user__list_who_can_contact_me(user_id) {
            // sql = `SELECT * FROM ${tablename.user} `; // 用内连接
            // sql += `WHERE (contact_any = 1 AND id != ${user_id}) `;
            // sql += `UNION `;
            // sql += `SELECT ${tablename.user}.* FROM ${tablename.user} inner join ${tablename.user_contact_user_set} `;
            // sql += `ON (${tablename.user}.id = ${tablename.user_contact_user_set}.user_id AND ${tablename.user_contact_user_set}.other_user_id = ${user_id})`;
            // sql += `;`;

            sql = `SELECT * FROM ${tablename.user} `; // 用子查询
            sql += `WHERE id != ${user_id} AND (contact_any = 1 `;

            sql += `OR EXISTS (SELECT * FROM ${tablename.user_contact_user_set} `;
            sql += `WHERE (${tablename.user_contact_user_set}.user_id = ${tablename.user}.id AND ${tablename.user_contact_user_set}.other_user_id = ${user_id})`;
            sql += `) `;

            sql += `OR EXISTS (SELECT * FROM ${tablename.user_contact_group_set} `;
            // sql += `WHERE (${tablename.user_contact_group_set}.user_id = ${tablename.user}.id AND ${tablename.user_contact_group_set}.group_id IN `;
            // sql += `(SELECT group_id FROM ${tablename.user_group_set} WHERE (${tablename.user_group_set}.user_id = ${user_id}))`;
            sql += `WHERE (${tablename.user_contact_group_set}.user_id = ${tablename.user}.id AND EXISTS `; // 用exists速度更快？
            sql += `(SELECT * FROM ${tablename.user_group_set} WHERE (${tablename.user_contact_group_set}.group_id = ${tablename.user_group_set}.group_id AND ${tablename.user_group_set}.user_id = ${user_id}))`;
            sql += `)`;

            sql += `)`;
            sql += `);`;

            // 用外连接也可以

            let r = await this.exec_sql(sql);
            return r;
        }

        async user__list_who_chat_together(group_ids) {
            if (group_ids.length === 0) return [];
            const items1 = await this.user_group_set__get_attrs_by_group(group_ids); // 这些组里的成员
            const items2 = await this.user_contact_group_set__get_attrs_by_group(group_ids); // 可以联系这些组的用户
            return [...items1, ...items2];
        }

        async user__get_attr(uid) {
            sql = `SELECT * FROM ${tablename.user} WHERE uid = '${uid}';`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async user__get_attrs(uids) {
            if (uids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.user} WHERE uid IN (${uids.map(i => `'${i}'`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user__get_attr_by_id(id) {
            sql = `SELECT * FROM ${tablename.user} WHERE id = ${id};`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async user__get_attrs_by_id(ids) {
            if (ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.user} WHERE id IN (${ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user__edit(uid, new_attr) {
            const user_attr = await this.user__get_attr(uid);
            if (!user_attr) throw new Error(requsterror.format_user_not_found(uid));
            const new_uid = normalizeId(new_attr.uid);
            if (!new_uid) throw new Error(requsterror.format_name_invalid(new_attr));

            sql = `UPDATE ${tablename.user} SET `;
            sql += `uid='${new_uid}',`;
            if (new_attr.password_hash) sql += `password_hash='${new_attr.password_hash}',`;
            sql += `disabled=${new_attr.disabled},`;
            sql += `contact_any=${new_attr.contact_any},`;
            sql += `manage_drive=${new_attr.manage_drive},`;
            sql += `free_space=${new_attr.free_space}`;
            sql += ` WHERE id = ${user_attr.id};`;
            let r = await this.exec_sql(sql);

            new_attr.id = user_attr.id;
            await this.drive__myspace_rename(uid, new_attr);

            {
                sql = `DELETE FROM ${tablename.user_group_set} WHERE user_id = ${user_attr.id};`;
                let r = await this.exec_sql(sql);
            }
            {
                sql = `DELETE FROM ${tablename.user_contact_group_set} WHERE user_id = ${user_attr.id};`;
                let r = await this.exec_sql(sql);
            }
            {
                sql = `DELETE FROM ${tablename.user_contact_user_set} WHERE user_id = ${user_attr.id};`;
                let r = await this.exec_sql(sql);
            }

            await this.user__add_relations(new_attr, user_attr);

            return new_uid;
        }

        async user__delete(uid) {
            sql = `DELETE FROM ${tablename.user} WHERE uid = '${uid}';`;
            let r = await this.exec_sql(sql);
        }

        async user_group_set__list() {
            sql = `SELECT * FROM ${tablename.user_group_set};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user_group_set__get_attrs_by_group(group_ids) {
            if (group_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.user_group_set} WHERE group_id IN (${group_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user_group_set__get_attrs_by_user(user_ids) {
            if (user_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.user_group_set} WHERE user_id IN (${user_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user_contact_group_set__list() {
            sql = `SELECT * FROM ${tablename.user_contact_group_set};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user_contact_group_set__get_attrs_by_group(group_ids) {
            if (group_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.user_contact_group_set} WHERE group_id IN (${group_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user_contact_group_set__get_attrs_by_user(user_ids) {
            if (user_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.user_contact_group_set} WHERE user_id IN (${user_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user_contact_user_set__list() {
            sql = `SELECT * FROM ${tablename.user_contact_user_set};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user_contact_user_set__get_attrs_by_user(user_ids) {
            if (user_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.user_contact_user_set} WHERE user_id IN (${user_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async user_contact_user_set__get_attrs_by_other_user(other_user_ids) {
            if (other_user_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.user_contact_user_set} WHERE other_user_id IN (${other_user_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive__myspace_new(user_attr) {
            sql = `INSERT INTO ${tablename.drive} ("type", "uploader", "name", "name_encrypted") VALUES (`;
            sql += `${_.drive__item_type.folder}, ${user_attr.id}, '${user_attr.uid}', ${false}`;
            sql += `) RETURNING *;`;
            let r = await this.exec_sql(sql);
            return r[0];
        }

        async drive__myspace_rename(uid, new_attr) {
            sql = `UPDATE ${tablename.drive} SET `;
            sql += `name='${new_attr.uid}'`;
            sql += ` WHERE uploader = ${new_attr.id} AND name = '${uid}' AND parent IS NULL;`;
            let r = await this.exec_sql(sql);
        }

        async drive__myspace_delete(user_id) {
            sql = `DELETE FROM ${tablename.drive} WHERE parent IS NULL AND uploader = ${user_id};`;
            let r = await this.exec_sql(sql);
        }

        async drive__attachments_ensure() {
            const attr = await this.drive__get_attr_by_attachments();
            if (attr) return attr;
            sql = `INSERT INTO ${tablename.drive} ("type", "uploader", "name", "name_encrypted", "attachment_came") VALUES (`;
            sql += `${_.drive__item_type.folder}, NULL, 'attachments', ${false}, ${true}`;
            sql += `) RETURNING *;`;
            let r = await this.exec_sql(sql);
            return r[0];
        }

        async drive__list(did,) {
            const item_id = _.drive__did2id(did);
            return await this.drive__list_by_id(item_id,);
        }

        async drive__list_by_id(item_id,) {
            sql = `SELECT * FROM ${tablename.drive} WHERE parent = ${item_id} AND uploaded = 1 ORDER BY "type" DESC, "uploaded_time" ASC;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive__list_all_by_id(item_id,) {
            sql = `SELECT * FROM ${tablename.drive} WHERE parent = ${item_id} ORDER BY "type" DESC, "uploaded_time" ASC;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive__list_by_root() {
            sql = `SELECT * FROM ${tablename.drive} WHERE parent IS NULL AND uploaded = 1 ORDER BY "type" DESC, "uploaded_time" ASC;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive__list_by_trashcan(user_id) {
            sql = `SELECT * FROM ${tablename.drive} WHERE trashed = 1 AND parent IS NOT NULL AND uploaded = 1 AND uploader = ${user_id} ORDER BY "type" DESC, "uploaded_time" ASC;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive__list_by_newfiles(user_id) {
            const recent_hours = drive_settings.recent_files;

            let r1 = await this.drive_share_user_set__list_by_user_id(user_id)
            let ug_attrs = await this.user_group_set__get_attrs_by_user([user_id]);
            const group_ids = ug_attrs.map(i => i.group_id);
            let r2 = await this.drive_share_group_set__list_by_group_ids(group_ids);
            const item_ids = [];
            r1.forEach(i => item_ids.push(i.item_id));
            r2.forEach(i => item_ids.push(i.item_id));

            // 查询用户上传的所有文件夹（根目录除外）
            const my_folders = await this.exec_sql(`SELECT id FROM ${tablename.drive} WHERE parent IS NOT NULL AND uploader = ${user_id} AND type = 1;`);
            my_folders.forEach(i => item_ids.push(i.id));

            // 查询用户的根文件夹
            const my_root = await this.exec_sql(`SELECT id FROM ${tablename.drive} WHERE parent IS NULL AND uploader = ${user_id};`);
            if (my_root.length > 0) {
                item_ids.push(my_root[0].id);
            }

            // 查询用户上传的所有文件
            const my_files = await this.exec_sql(`SELECT id, parent FROM ${tablename.drive} WHERE parent IS NOT NULL AND uploader = ${user_id} AND type = 2;`);

            // 查询用户上传的文件的parent文件夹
            const parent_ids = [...new Set(my_files.map(f => f.parent).filter(p => p !== null))];
            for (const parent_id of parent_ids) {
                if (!item_ids.includes(parent_id)) {
                    item_ids.push(parent_id);
                }
            }

            // 查询用户上传的所有文件和文件夹（用于显示用户的上传）
            const my_items = await this.exec_sql(`SELECT id FROM ${tablename.drive} WHERE parent IS NOT NULL AND uploader = ${user_id};`);
            my_items.forEach(i => {
                if (!item_ids.includes(i.id)) {
                    item_ids.push(i.id);
                }
            });

            // 查询条件：用户上传的文件，或者在共享文件夹内的文件，或者在用户自己的文件夹内的文件
            let condition = `uploader = ${user_id}`;
            if (item_ids.length > 0) {
                condition += ` OR parent IN (${item_ids.map(i => `${i}`).join(',')}) OR id IN (${item_ids.map(i => `${i}`).join(',')})`;
            } else {
                // 如果没有item_ids，查询用户上传的所有文件
                condition = `uploader = ${user_id}`;
            }
            sql = `SELECT * FROM ${tablename.drive} WHERE parent IS NOT NULL AND uploaded = 1 AND uploaded_time >= DATETIME('now', '-${recent_hours} hours') AND (${condition})`;
            sql += ` ORDER BY "type" DESC, "uploaded_time" ASC;`;
            let r = await this.exec_sql(sql);

            const share_status = await this.drive__get_share_status_upward_by_ids(r.map(i => i.id), user_id, group_ids, recent_hours, r);
            r = r.filter(i => {
                const ss = share_status.find(j => j.id === i.id);
                // 如果文件是用户自己上传的，总是显示
                if (i.uploader === user_id) return true;
                // 如果文件在用户上传的文件夹内，也显示
                if (my_folders.some(f => f.id === i.parent)) {
                    return true;
                }
                // 如果文件在共享文件夹内，需要检查权限
                return ss && ss.further !== null;
            });

            return r;
        }

        async drive__list_by_sharewithme(user_id) {
            let r1 = await this.drive_share_user_set__list_by_user_id(user_id)
            let ug_attrs = await this.user_group_set__get_attrs_by_user([user_id]);
            const group_ids = ug_attrs.map(i => i.group_id);
            let r2 = await this.drive_share_group_set__list_by_group_ids(group_ids);
            const item_ids = [];
            r1.forEach(i => item_ids.push(i.item_id));
            r2.forEach(i => item_ids.push(i.item_id));

            sql = `SELECT * FROM ${tablename.drive} WHERE parent IS NOT NULL AND uploaded = 1 AND (uploader != ${user_id} AND (share_any_type IN (${_.drive__share_type.readonly},${_.drive__share_type.readwrite}) OR id IN (${item_ids.map(i => `${i}`).join(',')})))`;
            sql += ` ORDER BY "type" DESC, "uploaded_time" ASC;`;
            let r = await this.exec_sql(sql);

            const share_status = await this.drive__get_share_status_upward_by_ids(r.map(i => i.id), user_id, group_ids);
            // console.log(share_status)
            r = r.filter(i => {
                const ss = share_status.find(j => j.id === i.id);
                return ss.further.id === i.id;
            });

            return r;
        }

        async drive__get_attr(did) {
            const item_id = _.drive__did2id(did);
            return await this.drive__get_attr_by_id(item_id);
        }

        async drive__get_attr_by_id(item_id) {
            sql = `SELECT * FROM ${tablename.drive} WHERE id = ${item_id};`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async drive__get_attrs_by_id(item_ids) {
            if (item_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.drive} WHERE id IN (${item_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive__get_attr_by_myspace(user_id) {
            sql = `SELECT * FROM ${tablename.drive} WHERE parent IS NULL AND uploader = ${user_id};`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async drive__get_attr_by_attachments() {
            sql = `SELECT * FROM ${tablename.drive} WHERE parent IS NULL AND uploader IS NULL AND name = 'attachments' AND attachment_came = 1;`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async drive__get_share_status_single_by_ids(item_ids) {
            if (item_ids.length === 0) return [];

            sql = `SELECT * FROM ${tablename.drive_share_user_set} WHERE item_id IN (${item_ids.map(i => `${i}`).join(',')});`;
            let r1 = await this.exec_sql(sql);

            sql = `SELECT * FROM ${tablename.drive_share_group_set} WHERE item_id IN (${item_ids.map(i => `${i}`).join(',')});`;
            let r2 = await this.exec_sql(sql);

            const result = [];

            item_ids.forEach(i => {
                const d = {
                    id: i, users: r1.filter(j => j.item_id === i), groups: r2.filter(j => j.item_id === i),
                };
                result.push(d);
            });

            return result;
        }

        async drive__get_share_status_upward_by_ids(item_ids, user_id, group_ids, recent_hours, item_attrs) {
            sql = `
WITH RECURSIVE chain AS (
  SELECT 0 AS depth, id, parent, share_any_type, share_public_type
  FROM ${tablename.drive}
  WHERE id IN (${item_ids.map(i => `${i}`).join(',')})`;
            if (recent_hours) {
                sql += ` AND uploaded_time >= DATETIME('now', '-${recent_hours} hours')`;
            }
            sql += `
  UNION ALL
  SELECT c.depth + 1, d.id, d.parent, d.share_any_type, d.share_public_type
  FROM ${tablename.drive} d
  JOIN chain c ON d.id = c.parent`;
            if (recent_hours) {
                sql += ` AND d.uploaded_time >= DATETIME('now', '-${recent_hours} hours')`;
            }
            sql += `
)
SELECT DISTINCT depth, id, parent, share_any_type, share_public_type
FROM chain
ORDER BY depth;
`;
            let r = await this.exec_sql(sql.replace("\n", ""));
            const chains = {};
            const item_ids_upward = [];
            for (const itemId of item_ids) {
                const chain = [];
                let currentId = itemId;
                while (currentId !== null) {
                    if (!item_ids_upward.includes(currentId)) item_ids_upward.push(currentId);
                    const self = r.find(i => i.id === currentId);
                    if (!self) {
                        currentId = null; // 因recent_hours
                    } else {
                        chain.push({
                            id: self.id, parent: self.parent, any: self.share_any_type, public: self.share_public_type, // uploaded_time: self.uploaded_time,
                        });
                        currentId = self.parent;
                    }
                }
                if (chain.length > 0) chains[itemId] = chain;
                // if (itemId === 10) console.log(111111111111, itemId, chain);
            }

            const sss = await this.drive__get_share_status_single_by_ids(item_ids_upward);
            for (const itemId of item_ids) {
                if (!chains.hasOwnProperty(itemId)) continue;
                for (const chainElement of chains[itemId]) {
                    chainElement.single = sss.find(i => i.id === chainElement.id);
                }
            }

            const result = [];

            item_ids.forEach(i => {
                if (!chains.hasOwnProperty(i)) return;

                const d = {id: i, users: [], groups: [], further: null,};

                {
                    const ap = [_.drive__share_type.readonly, _.drive__share_type.readwrite,];
                    const former = [];
                    for (const chainElement of chains[i]) {
                        former.push(chainElement);
                        if (ap.includes(chainElement.any)) continue;
                        if (chainElement.single) {
                            if (chainElement.single.users.map(i => i.user_id).includes(user_id)) {
                                continue;
                            }
                            if (chainElement.single.groups.map(i => i.group_id).some(j => group_ids.includes(j))) {
                                continue;
                            }
                        }
                        if (former.length >= 2) d.further = former.at(-2);
                        break;
                    }
                    if (d.further === null && former.length > 0) d.further = former.at(-1);
                }

                if (recent_hours) {
                    const item_attr = item_attrs.find(j => j.id === i);
                    // console.log(111111111111, user_id, item_attr, chains[i])
                    // 对于"最近新增"功能，我们需要找到最近的共享点或用户拥有的文件夹
                    if (item_attr.uploader === user_id) {
                        // 如果文件是当前用户上传的，找到第一个有父级目录的元素
                        for (const chainElement of [...chains[i]].reverse()) {
                            if (chainElement.parent) {
                                d.further = chainElement;
                                break;
                            }
                        }
                    } else {
                        // 如果文件是其他用户上传的，检查用户是否对文件夹有权限
                        // 这里需要检查链中是否有文件夹被共享给当前用户，或者用户拥有该文件夹
                        for (const chainElement of [...chains[i]].reverse()) {
                            // 检查是否是用户上传的文件夹
                            if (chainElement.parent) {
                                // 需要通过其他方式检查用户是否拥有或可以访问这个文件夹
                                // 这里我们先设置 further，然后在过滤时进一步检查
                                d.further = chainElement;
                                break;
                            }
                        }
                    }
                }

                {
                    let any = _.drive__share_type.noshare;
                    for (const chainElement of chains[i]) {
                        if (chainElement.any === _.drive__share_type.noset) {
                        } else {
                            any = chainElement.any;
                            break;
                        }
                    }
                    d.any = any;
                }
                {
                    let _public = _.drive__share_type.noshare;
                    for (const chainElement of chains[i]) {
                        if (chainElement.public === _.drive__share_type.noset) {
                        } else {
                            _public = chainElement.public;
                            break;
                        }
                    }
                    d.public = _public;
                }
                {
                    for (const chainElement of chains[i]) {
                        if (chainElement.single) {
                            d.users.push(...chainElement.single.users);
                            d.groups.push(...chainElement.single.groups);
                        }
                    }
                }
                result.push(d);
            });

            return result;
        }

        async drive__new(attr, user_id) {
            let parent_attr = null;
            if (attr.parent_did) {
                parent_attr = await this.drive__get_attr(attr.parent_did);
            } else {
                parent_attr = await this.drive__get_attr_by_myspace(user_id);
            }
            if (!parent_attr) throw new Error(requsterror.format_param("parent_did"));

            // const lis = await this.drive__list_by_id(parent_attr.id,);
            // for (const li of lis) {
            //     if (li.name === attr.name) throw new Error(requsterror.format_name_repeated(attr.name));
            // }

            sql = `INSERT INTO ${tablename.drive} ("type", "uploader", "name", "name_encrypted", "parent"`;

            if (attr.type === databasebackends._.drive__item_type.file) {
                sql += `, "uploaded"`;
                sql += `, "size"`;
            }

            sql += `) VALUES (`;
            sql += `${attr.type}, ${user_id}, '${attr.name}', ${attr.name_encrypted}, ${parent_attr.id}`;

            if (attr.type === databasebackends._.drive__item_type.file) {
                sql += `, 0`;
                sql += `, ${attr.size}`;
            }

            sql += `) RETURNING id;`;
            let r = await this.exec_sql(sql);

            // return await this.last_insert_rowid(); // 并发下不安全
            return r[0].id;
        }

        async drive__new_attachment(attr, user_id) {
            attr.type = databasebackends._.drive__item_type.file;

            let parent_attr = await this.drive__attachments_ensure();
            if (!parent_attr) {
                throw new Error(requsterror.format_param("parent_did"));
            }

            sql = `INSERT INTO ${tablename.drive} ("type", "uploader", "name", "name_encrypted", "parent", "attachment_came"`;

            sql += `, "uploaded"`;
            sql += `, "size"`;

            sql += `) VALUES (`;
            sql += `${attr.type}, ${user_id}, '${attr.name}', ${attr.name_encrypted}, ${parent_attr.id}, ${true}`;

            sql += `, 0`;
            sql += `, ${attr.size}`;

            sql += `) RETURNING id;`;
            let r = await this.exec_sql(sql);

            // return await this.last_insert_rowid(); // 并发下不安全
            return r[0].id;
        }

        async drive__clear_attachments(uploaders) {
            let parent_attr = await this.drive__get_attr_by_attachments();
            if (!parent_attr) {
                // throw new Error(requsterror.format_param("parent_did"));
                return;
            }

            sql = `SELECT id FROM ${tablename.drive} WHERE parent = ${parent_attr.id} AND uploaded = 1`;
            if (uploaders) sql += ` AND uploader IN (${uploaders.map(i => `${i}`).join(',')})`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            const ids = r.map(i => i.id);
            
            // 优化: 使用 Promise.all 并行删除所有文件,避免 N+1 问题
            if (ids.length > 0) {
                await Promise.all(ids.map(id => 
                    this.server.filestorebackend.remove(databasebackends._.drive__id2did(id))
                ));
                sql = `DELETE FROM ${tablename.drive} WHERE id IN (${ids.map(i => `${i}`).join(',')});`;
                let r2 = await this.exec_sql(sql);
            }
        }

        async drive__change_attr_uploaded_by_id(item_id) {
            sql = `UPDATE ${tablename.drive} SET `;
            sql += `uploaded=${1}, uploaded_time=CURRENT_TIMESTAMP`;
            sql += ` WHERE id = ${item_id};`;
            let r = await this.exec_sql(sql);
            
            // 递归更新父文件夹的 modified_time
            await this.drive__update_parent_modified_time(item_id);
        }

        async drive__update_parent_modified_time(item_id) {
            // 获取当前项目的父文件夹ID
            sql = `SELECT parent FROM ${tablename.drive} WHERE id = ${item_id};`;
            let r = await this.exec_sql(sql);
            if (r.length === 0 || r[0].parent === null) return;
            
            let parent_id = r[0].parent;
            let current_parent_id = parent_id;
            
            // 递归更新所有父文件夹的 modified_time
            while (current_parent_id !== null) {
                sql = `UPDATE ${tablename.drive} SET modified_time = CURRENT_TIMESTAMP WHERE id = ${current_parent_id} AND type = ${_.drive__item_type.folder};`;
                await this.exec_sql(sql);
                
                // 获取当前父文件夹的父文件夹ID
                sql = `SELECT parent FROM ${tablename.drive} WHERE id = ${current_parent_id};`;
                let r2 = await this.exec_sql(sql);
                if (r2.length === 0 || r2[0].parent === null) break;
                current_parent_id = r2[0].parent;
            }
        }

        async drive__change_share_by_id(item_id, args, user_id) {
            sql = `UPDATE ${tablename.drive} SET `;
            sql += `share_any_type=${args.any}, share_public_type=${args.public}, public_expiration=datetime(${args.public_expiration}, 'unixepoch'), public_pass='${normalizePassword(args.public_pass)}'`;
            sql += ` WHERE id = ${item_id};`;
            let r = await this.exec_sql(sql);

            {
                sql = `DELETE FROM ${tablename.drive_share_user_set} WHERE item_id = ${item_id};`;
                let r = await this.exec_sql(sql);
            }
            if (args.users) {
                const user_attrs = await this.user__get_attrs(args.users.map(i => i.uid));
                if (user_attrs.length > 0) {
                    const tuples = [];
                    for (const user_attr of user_attrs) {
                        if (user_attr.id === user_id) continue;
                        sql = `(${user_attr.id}, ${item_id}, ${args.users.find(i => i.uid === user_attr.uid).share_type})`;
                        tuples.push(sql);
                    }
                    sql = `INSERT INTO ${tablename.drive_share_user_set} ("user_id", "item_id", "share_type") VALUES `;
                    sql += `${tuples.join(",")}`;
                    sql += `;`;
                    let r = await this.exec_sql(sql);
                }
            }

            {
                sql = `DELETE FROM ${tablename.drive_share_group_set} WHERE item_id = ${item_id};`;
                let r = await this.exec_sql(sql);
            }
            if (args.groups) {
                const group_attrs = await this.group__get_attrs(args.groups.map(i => i.gid));
                if (group_attrs.length > 0) {
                    const tuples = [];
                    for (const group_attr of group_attrs) {
                        sql = `(${group_attr.id}, ${item_id}, ${args.groups.find(i => i.gid === group_attr.gid).share_type})`;
                        tuples.push(sql);
                    }
                    sql = `INSERT INTO ${tablename.drive_share_group_set} ("group_id", "item_id", "share_type") VALUES `;
                    sql += `${tuples.join(",")}`;
                    sql += `;`;
                    let r = await this.exec_sql(sql);
                }
            }

        }

        async drive__rename_by_id(item_id, args) {
            sql = `UPDATE ${tablename.drive} SET `;
            sql += `name='${args.name}', name_encrypted=${args.name_encrypted}`;
            sql += ` WHERE id = ${item_id};`;
            let r = await this.exec_sql(sql);
        }

        async drive__move_by_id(item_id, parent_item_id) {
            sql = `UPDATE ${tablename.drive} SET `;
            sql += `parent=${parent_item_id}`;
            sql += ` WHERE id = ${item_id};`;
            let r = await this.exec_sql(sql);
        }

        async drive__trash_by_id(item_id,) {
            sql = `UPDATE ${tablename.drive} SET `;
            sql += `trashed=${true}, trashed_time=CURRENT_TIMESTAMP`;
            sql += ` WHERE id = ${item_id};`;
            let r = await this.exec_sql(sql);
        }

        async drive__restore_by_id(item_id,) {
            sql = `UPDATE ${tablename.drive} SET `;
            sql += `trashed=${false}`;
            sql += ` WHERE id = ${item_id};`;
            let r = await this.exec_sql(sql);
        }

        async drive__delete_by_id(item_id,) {
            sql = `DELETE FROM ${tablename.drive} WHERE id = ${item_id};`;
            let r = await this.exec_sql(sql);
        }

        async drive__delete_by_ids(item_ids,) {
            if (item_ids.length === 0) return;
            sql = `DELETE FROM ${tablename.drive} WHERE id IN (${item_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
        }

        async drive__unset_uploader(user_id) {
            sql = `UPDATE ${tablename.drive} SET uploader=NULL WHERE uploader = ${user_id};`;
            let r = await this.exec_sql(sql);
        }

        async drive__clear(uploaders, hours = 24 * 3) {
            sql = `SELECT id FROM ${tablename.drive} WHERE parent IS NOT NULL AND uploaded = 0`;
            if (uploaders) sql += ` AND uploader IN (${uploaders.map(i => `${i}`).join(',')})`;
            if (hours > 0) sql += ` AND uploaded_time < DATETIME('now', '-${hours} hours')`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            const ids = r.map(i => i.id);
            
            // 优化: 使用 Promise.all 并行删除所有文件,避免 N+1 问题
            if (ids.length > 0) {
                await Promise.all(ids.map(id => 
                    this.server.filestorebackend.remove(databasebackends._.drive__id2did(id))
                ));
                sql = `DELETE FROM ${tablename.drive} WHERE id IN (${ids.map(i => `${i}`).join(',')});`;
                let r2 = await this.exec_sql(sql);
            }
        }

        async drive__clear_trashcan(uploaders, hours = 24 * 3) {
            sql = `SELECT id,type FROM ${tablename.drive} WHERE trashed = 1 AND parent IS NOT NULL AND uploaded = 1 `;
            if (uploaders) sql += ` AND uploader IN (${uploaders.map(i => `${i}`).join(',')})`;
            if (hours > 0) sql += ` AND trashed_time < DATETIME('now', '-${hours} hours')`;
            sql += ` ORDER BY "type" DESC, "uploaded_time" ASC;`;
            let r = await this.exec_sql(sql);

            // 优化: 收集所有需要删除的文件 ID,然后批量删除
            const allItemIds = new Set();
            const allFileIds = new Set();
            
            // 递归收集所有需要删除的项目 ID
            const collectItemIds = async (itemId) => {
                allItemIds.add(itemId);
                
                // 查询子项目
                sql = `SELECT id FROM ${tablename.drive} WHERE parent = ${itemId};`;
                const subItems = await this.exec_sql(sql);
                
                for (const subItem of subItems) {
                    await collectItemIds(subItem.id);
                }
            };
            
            // 收集所有需要删除的项目
            for (const driveItem of r) {
                await collectItemIds(driveItem.id);
            }
            
            // 批量删除文件存储
            if (allItemIds.size > 0) {
                await Promise.all(Array.from(allItemIds).map(id => 
                    this.server.filestorebackend.remove(databasebackends._.drive__id2did(id))
                ));
                
                // 批量删除数据库记录
                sql = `DELETE FROM ${tablename.drive} WHERE id IN (${Array.from(allItemIds).map(i => `${i}`).join(',')});`;
                await this.exec_sql(sql);
            }
        }

        async drive__get_usages_by_user_id(user_ids) {
            if (user_ids.length === 0) return [];
            sql = `SELECT uploader, SUM(size) AS total_size FROM ${tablename.drive} WHERE type = ${_.drive__item_type.file} AND uploaded = 1 AND uploader IN (${user_ids.map(i => `${i}`).join(',')}) GROUP BY uploader;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive_share_user_set__list_by_item_id(item_id) {
            sql = `SELECT * FROM ${tablename.drive_share_user_set} WHERE item_id = ${item_id};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive_share_user_set__list_by_user_id(user_id) {
            sql = `SELECT * FROM ${tablename.drive_share_user_set} WHERE user_id = ${user_id};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive_share_group_set__list_by_item_id(item_id) {
            sql = `SELECT * FROM ${tablename.drive_share_group_set} WHERE item_id = ${item_id};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async drive_share_group_set__list_by_group_ids(group_ids) {
            if (group_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.drive_share_group_set} WHERE group_id IN (${group_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        // 检查用户是否对文件/文件夹具有写权限
        // 返回: true 表示有写权限，false 表示无写权限
        async drive__check_write_permission(item_id, user_id, group_ids) {
            // 获取文件/文件夹属性
            const item_attr = await this.drive__get_attr_by_id(item_id);
            if (!item_attr) return false;

            // 1. 如果用户是文件拥有者，有写权限
            if (item_attr.uploader === user_id) return true;

            // 2. 检查用户是否被直接授予了readwrite权限
            sql = `SELECT * FROM ${tablename.drive_share_user_set} WHERE item_id = ${item_id} AND user_id = ${user_id};`;
            const user_share = await this.exec_sql(sql);
            if (user_share.length > 0 && user_share[0].share_type === _.drive__share_type.readwrite) {
                return true;
            }

            // 3. 检查用户所属群组是否被授予了readwrite权限
            if (group_ids && group_ids.length > 0) {
                sql = `SELECT * FROM ${tablename.drive_share_group_set} WHERE item_id = ${item_id} AND group_id IN (${group_ids.map(i => `${i}`).join(',')}) AND share_type = ${_.drive__share_type.readwrite};`;
                const group_share = await this.exec_sql(sql);
                if (group_share.length > 0) {
                    return true;
                }
            }

            // 4. 检查父级文件夹的共享权限（继承权限）
            if (item_attr.parent) {
                const parent_has_permission = await this.drive__check_write_permission(item_attr.parent, user_id, group_ids);
                if (parent_has_permission) return true;
            }

            return false;
        }

        // async chat_message__get_unread_msg_count(user_attr, user_ids, group_ids, read_message_id) {
        //     const user_ids_string = user_ids.map(i => `${i}`).join(',');
        //     const group_ids_string = group_ids.map(i => `${i}`).join(',');
        //     sql = `SELECT `;
        //     sql += `id, sender, receiver_type, receiver_group_id, receiver_user_id`;
        //     sql += ` FROM ${tablename.chat_message} WHERE id > ${read_message_id} AND (`;
        //
        //     sql += `(receiver_type = ${_.chat_message__receiver_type.user} AND ((sender = ${user_attr.id} AND receiver_user_id IN (${user_ids_string})) OR (sender IN (${user_ids_string}) AND receiver_user_id = ${user_attr.id})))`;
        //     sql += ` OR `; // TODO 鉴权 确保自己是此组成员
        //     sql += `(receiver_type = ${_.chat_message__receiver_type.group} AND receiver_group_id IN (${group_ids_string}))`;
        //
        //     sql += `) ORDER BY id ASC`;
        //     sql += `;`;
        //     let r = await this.exec_sql(sql);
        //     return r;
        // }

        async chat_message__get_msgs_to_me(user_attr, user_ids, group_ids, only_relations, limit = 50, offset = 0) {
            const user_ids_string = user_ids.map(i => `${i}`).join(',');
            const group_ids_string = group_ids.map(i => `${i}`).join(',');
            sql = `SELECT `;
            if (only_relations) {
                sql += `id, sent_time, sender, receiver_type, receiver_group_id, receiver_user_id, pinned, pinned_time, type, status`;
            } else {
                sql += `*`;
            }
            sql += ` FROM ${tablename.chat_message} WHERE `;

            sql += `(receiver_type = ${_.chat_message__receiver_type.user} AND ((sender = ${user_attr.id} AND receiver_user_id IN (${user_ids_string})) OR (sender IN (${user_ids_string}) AND receiver_user_id = ${user_attr.id})))`;
            sql += ` OR `; // TODO 鉴权 确保自己是此组成员
            sql += `(receiver_type = ${_.chat_message__receiver_type.group} AND receiver_group_id IN (${group_ids_string}))`;

            sql += ` ORDER BY id DESC`; // 按降序获取最新消息
            sql += ` LIMIT ${limit}`;
            sql += ` OFFSET ${offset}`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            return r.reverse(); // 反转数组，返回升序结果
        }

        async chat_message__new(user_attr, contact_type, receiver_attr, args) {
            sql = `INSERT INTO ${tablename.chat_message} ("type", "status", "sender", "sender_rand", "receiver_type", `;
            if (contact_type === databasebackends._.chat_message__receiver_type.group) {
                sql += `"receiver_group_id"`;
            } else {
                sql += `"receiver_user_id"`;
            }
            if (databasebackends._.chat_message__type_checker.is_text(args.type) || databasebackends._.chat_message__type_checker.is_vote(args.type)) {
                sql += `, "data_text"`;
            } else {
            }
            sql += ` ) VALUES ( `;
            sql += `${args.type}, ${databasebackends._.chat_message__status.encrypted}, ${user_attr.id}, '${args.sender_rand}', ${contact_type}, `;
            if (contact_type === databasebackends._.chat_message__receiver_type.group) {
                sql += `${receiver_attr.id}`;
            } else {
                sql += `${receiver_attr.id}`;
            }
            if (databasebackends._.chat_message__type_checker.is_text(args.type) || databasebackends._.chat_message__type_checker.is_vote(args.type)) {
                sql += `, '${args.data_text}'`;
            } else {
            }
            sql += ` ) RETURNING id;`;

            let r = await this.exec_sql(sql);
            return r[0].id;
        }

        async chat_message__forward(user_attr, message_attr, user_receiver_attr, group_receiver_attr) {
            sql = `INSERT INTO ${tablename.chat_message} ("type", "status", "sender", "sender_rand", "receiver_type", `;
            sql += `"receiver_group_id"`;
            sql += `, "receiver_user_id"`;
            if (databasebackends._.chat_message__type_checker.is_text(message_attr.type)) {
                sql += `, "data_text"`;
            } else {
            }
            sql += ` ) VALUES `;

            const values = [];
            const func1 = (attr, contact_type) => {
                let sql = "";
                sql += `${message_attr.type}, ${message_attr.status}, ${user_attr.id}, '${message_attr.sender_rand}', ${contact_type}, `;
                if (contact_type === databasebackends._.chat_message__receiver_type.group) {
                    sql += `${attr.id}`;
                    sql += `, NULL`;
                } else {
                    sql += `NULL, `;
                    sql += `${attr.id}`;
                }
                if (databasebackends._.chat_message__type_checker.is_text(message_attr.type)) {
                    sql += `, '${message_attr.data_text}'`;
                } else {
                }
                values.push(`(${sql})`);
            }
            user_receiver_attr.forEach(attr => {
                func1(attr, databasebackends._.chat_message__receiver_type.user);
            });
            group_receiver_attr.forEach(attr => {
                func1(attr, databasebackends._.chat_message__receiver_type.group);
            });
            sql += `${values.join(", ")}`;

            sql += ` RETURNING id;`;
            let r = await this.exec_sql(sql);
            return r.map(i => i.id);
        }

        async chat_message__get_attr(message_id) {
            sql = `SELECT `;
            sql += `*`;
            sql += ` FROM ${tablename.chat_message} WHERE `;
            sql += `id = ${message_id}`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async chat_message__get_attr_by_sender_rand(sender_rand) {
            sql = `SELECT `;
            sql += `*`;
            sql += ` FROM ${tablename.chat_message} WHERE `;
            sql += `sender_rand = '${sender_rand}'`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async chat_message__get_attrs(message_ids) {
            if (message_ids.length === 0) return [];
            sql = `SELECT `;
            sql += `*`;
            sql += ` FROM ${tablename.chat_message} WHERE `;
            sql += `id IN (${message_ids.map(i => `${i}`).join(',')})`;
            sql += ` ORDER BY id ASC;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_message__edit_data_text(message_id, args) {
            sql = `UPDATE ${tablename.chat_message} SET data_text = ?, status = status | ${databasebackends._.chat_message__status.edited} `;
            sql += ` WHERE id = ${message_id};`;
            let r = await this.exec_sql(sql, [args.data_text]);
        }

        async chat_message__revoke(message_id, is_timeout) {
            sql = `UPDATE ${tablename.chat_message} SET data_text = '', revoked_time = CURRENT_TIMESTAMP, type = ${databasebackends._.chat_message__type.sys}, status = status | ${is_timeout ? databasebackends._.chat_message__status.deleted : databasebackends._.chat_message__status.revoked} `;
            sql += ` WHERE id = ${message_id};`;
            let r = await this.exec_sql(sql);
        }

        async chat_message__delete(user_attr, contact_type, receiver_attr, args) {
            sql = `SELECT `;
            sql += `id, type, sender, receiver_type, receiver_group_id, receiver_user_id`;
            sql += ` FROM ${tablename.chat_message} WHERE `;

            if (contact_type === databasebackends._.chat_message__receiver_type.group) {
                sql += `(receiver_type = ${_.chat_message__receiver_type.group} AND receiver_group_id = ${receiver_attr.id})`;
            } else { // TODO 鉴权 确保自己是此组成员
                sql += `(receiver_type = ${_.chat_message__receiver_type.user} AND ((sender = ${user_attr.id} AND receiver_user_id = ${receiver_attr.id}) OR (sender = ${receiver_attr.id} AND receiver_user_id = ${user_attr.id})))`;
            }
            sql += ` AND `;

            sql += `sent_time < DATETIME('now', '-${args.hours} hours') AND (status & ${databasebackends._.chat_message__status.auto_deleted})=0`;
            sql += ` ORDER BY id ASC;`;
            let r = await this.exec_sql(sql);

            await this.chat_message__auto_delete_(r);

            {
                sql = `INSERT INTO ${tablename.chat_message} ("type", "status", "sender", "sender_rand", "receiver_type", `;
                if (contact_type === databasebackends._.chat_message__receiver_type.group) {
                    sql += `"receiver_group_id"`;
                } else {
                    sql += `"receiver_user_id"`;
                }

                sql += ` ) VALUES ( `;
                sql += `${databasebackends._.chat_message__type.sys}, ${databasebackends._.chat_message__status.encrypted}, ${user_attr.id}, '${args.sender_rand}', ${contact_type}, `;
                if (contact_type === databasebackends._.chat_message__receiver_type.group) {
                    sql += `${receiver_attr.id}`;
                } else {
                    sql += `${receiver_attr.id}`;
                }

                sql += ` ) RETURNING id;`;

                let r = await this.exec_sql(sql);
                await this.server.databasebackend.chat_message_data_spec__relate_by_sys__clear(r[0].id, user_attr.id, args.hours);
            }

        }

        async chat_message__auto_delete_(r,) {
            const msg_ids = r.map(i => i.id);
            if (msg_ids.length === 0) return;

            const msg_ids__drive_item = r.filter(i => databasebackends._.chat_message__type_checker.is_drive_item(i.type)).map(i => i.id);
            const data_spec__drive_item = await this.chat_message_data_spec__get_attrs_by_message_id(msg_ids__drive_item);
            const data_spec__drive_item_ids = data_spec__drive_item.filter(i => i.drive_item_id !== null).map(i => i.drive_item_id);
            
            // 优化: 使用 Promise.all 并行删除所有文件附件,避免 N+1 问题
            if (data_spec__drive_item_ids.length > 0) {
                await Promise.all(data_spec__drive_item_ids.map(driveItemId => 
                    this.server.filestorebackend.remove(databasebackends._.drive__id2did(driveItemId))
                ));
                await this.server.databasebackend.drive__delete_by_ids(data_spec__drive_item_ids);
            }

            sql = `UPDATE ${tablename.chat_message} SET data_text = '', revoked_time = CURRENT_TIMESTAMP, type = ${databasebackends._.chat_message__type.sys}, status = status | ${databasebackends._.chat_message__status.auto_deleted}, pinned = 0, pinned_time = NULL `;
            sql += ` WHERE id IN (${msg_ids.map(i => `${i}`).join(',')});`;
            await this.exec_sql(sql);

            // 删除相关的回应记录
            sql = `DELETE FROM ${tablename.chat_message_reply_set} WHERE message_id IN (${msg_ids.map(i => `${i}`).join(',')});`;
            await this.exec_sql(sql);

            await this.server.databasebackend.chat_message_data_spec__relate_by_sys__auto_delete(msg_ids);
            await this.server.databasebackend.chat_edition__record_some_different(r);
        }

        async chat_message__auto_delete(hours,) {
            sql = `SELECT `;
            sql += `id, type, sender, receiver_type, receiver_group_id, receiver_user_id`;
            sql += ` FROM ${tablename.chat_message} WHERE `;
            sql += `sent_time < DATETIME('now', '-${hours === undefined ? chat_settings.keep_messages : hours} hours') AND (status & ${databasebackends._.chat_message__status.auto_deleted})=0`;
            sql += ` ORDER BY id ASC;`;
            let r = await this.exec_sql(sql);

            await this.chat_message__auto_delete_(r);
        }

        async chat_message__clear() {
            const hours = 1 * 24;

            sql = `SELECT id `;
            sql += ` FROM ${tablename.chat_message} WHERE `;
            sql += ` revoked_time IS NOT NULL AND revoked_time < DATETIME('now', '-${hours} hours') AND status & ${databasebackends._.chat_message__status.auto_deleted}`;
            sql += ` ;`;
            let r = await this.exec_sql(sql);

            const msg_ids = r.map(i => i.id);

            await this.chat_message_data_spec__remove_by_message_ids(msg_ids)

            if (msg_ids.length === 0) return;
            sql = `DELETE `;
            sql += ` FROM ${tablename.chat_message} WHERE `;
            sql += ` id IN (${msg_ids.map(i => `${i}`).join(',')})`;
            sql += ` ;`;
            await this.exec_sql(sql);
        }

        async chat_message__pin(message_id) {
            sql = `UPDATE ${tablename.chat_message} SET pinned = 1, pinned_time = CURRENT_TIMESTAMP WHERE id = ${message_id};`;
            let r = await this.exec_sql(sql);
            return true;
        }

        async chat_message__unpin(message_id) {
            sql = `UPDATE ${tablename.chat_message} SET pinned = 0, pinned_time = NULL WHERE id = ${message_id};`;
            let r = await this.exec_sql(sql);
            return true;
        }

        async chat_message__get_pinned_messages(user_id, group_id) {
            sql = `SELECT * FROM ${tablename.chat_message} WHERE pinned = 1 AND (`;
            if (group_id) {
                sql += `(receiver_type = ${_.chat_message__receiver_type.group} AND receiver_group_id = ${group_id})`;
            } else {
                sql += `(receiver_type = ${_.chat_message__receiver_type.user} AND ((sender = ${user_id} AND receiver_user_id = ${user_id}) OR (sender = ${user_id} AND receiver_user_id = ${user_id})))`;
            }
            sql += `) ORDER BY pinned_time DESC;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        // 消息回应相关方法
        async chat_message_reply_set__add(message_id, user_id) {
            // 幂等性检查：先查询是否已存在该 (message_id, user_id) 组合
            const existing = await this.chat_message_reply_set__check_exists(message_id, user_id);
            if (existing && existing.length > 0) {
                // 已存在则直接返回成功，避免重复插入
                return existing[0];
            }
            // 不存在则执行插入
            sql = `INSERT INTO ${tablename.chat_message_reply_set} ("message_id", "user_id") VALUES (`;
            sql += `${message_id}, ${user_id}`;
            sql += `);`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_message_reply_set__remove(message_id, user_id) {
            sql = `DELETE FROM ${tablename.chat_message_reply_set} WHERE message_id = ${message_id} AND user_id = ${user_id};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_message_reply_set__remove_by_message(message_id) {
            sql = `DELETE FROM ${tablename.chat_message_reply_set} WHERE message_id = ${message_id};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_message_reply_set__list_by_message(message_id) {
            sql = `SELECT * FROM ${tablename.chat_message_reply_set} WHERE message_id = ${message_id} ORDER BY reply_time DESC;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_message_reply_set__list_by_messages(message_ids) {
            if (message_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.chat_message_reply_set} WHERE message_id IN (${message_ids.map(i => `${i}`).join(',')}) ORDER BY message_id, reply_time DESC;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_message_reply_set__list_by_user(user_id) {
            sql = `SELECT * FROM ${tablename.chat_message_reply_set} WHERE user_id = ${user_id};`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_message_reply_set__check_exists(message_id, user_id) {
            sql = `SELECT * FROM ${tablename.chat_message_reply_set} WHERE message_id = ${message_id} AND user_id = ${user_id};`;
            let r = await this.exec_sql(sql);
            return r.length > 0;
        }

        async chat_message_data_spec__get_attr_by_message_id(message_id) {
            sql = `SELECT * FROM ${tablename.chat_message_data_spec} WHERE message_id = ${message_id};`;
            let r = await this.exec_sql(sql);
            if (r.length > 0) return r[0];
            return null;
        }

        async chat_message_data_spec__get_attrs_by_message_id(message_ids) {
            if (message_ids.length === 0) return [];
            sql = `SELECT * FROM ${tablename.chat_message_data_spec} WHERE message_id IN (${message_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_message_data_spec__relate_by_image(message_id, drive_item_id, image_attr) {
            await this.chat_message_data_spec__remove_by_message_id(message_id);
            sql = `INSERT INTO ${tablename.chat_message_data_spec} ("message_id", "drive_item_id", "a3_number", "a4_number") VALUES (`;
            sql += `${message_id}, ${drive_item_id}, ${image_attr.width}, ${image_attr.height}`;
            sql += `);`;
            let r = await this.exec_sql(sql);
        }

        async chat_message_data_spec__relate_by_file(message_id, drive_item_id,) {
            await this.chat_message_data_spec__remove_by_message_id(message_id);
            sql = `INSERT INTO ${tablename.chat_message_data_spec} ("message_id", "drive_item_id") VALUES (`;
            sql += `${message_id}, ${drive_item_id}`;
            sql += `);`;
            let r = await this.exec_sql(sql);
        }

        async chat_message_data_spec__relate_by_sys__revoke(message_id, is_timeout, user_id) {
            await this.chat_message_data_spec__remove_by_message_id(message_id);
            sql = `INSERT INTO ${tablename.chat_message_data_spec} ("message_id", "action_type", "a1_user_id") VALUES (`;
            sql += `${message_id}, ${is_timeout ? databasebackends._.chat_data_spec__action_type.delete_message : databasebackends._.chat_data_spec__action_type.revoke_message}, ${user_id}`;
            sql += `);`;
            let r = await this.exec_sql(sql);
        }

        async chat_message_data_spec__relate_by_sys__auto_delete(message_ids) {
            if (message_ids.length === 0) return;
            await this.chat_message_data_spec__remove_by_message_ids(message_ids);
            sql = `INSERT INTO ${tablename.chat_message_data_spec} ("message_id", "action_type") VALUES `;
            const li = [];
            for (const message_id of message_ids) {
                li.push(`(${message_id}, ${databasebackends._.chat_data_spec__action_type.auto_delete_message})`);
            }
            sql += li.join(",");
            sql += `;`;
            let r = await this.exec_sql(sql);
        }

        async chat_message_data_spec__relate_by_sys__clear(message_id, user_id, hours) {
            await this.chat_message_data_spec__remove_by_message_id(message_id);
            sql = `INSERT INTO ${tablename.chat_message_data_spec} ("message_id", "action_type", "a1_user_id", "a3_number") VALUES (`;
            sql += `${message_id}, ${databasebackends._.chat_data_spec__action_type.clear_message}, ${user_id}, ${hours}`;
            sql += `);`;
            let r = await this.exec_sql(sql);
        }

        async chat_message_data_spec__remove_by_message_id(message_id) {
            sql = `DELETE FROM ${tablename.chat_message_data_spec} WHERE message_id = ${message_id};`;
            let r = await this.exec_sql(sql);
        }

        async chat_message_data_spec__remove_by_message_ids(message_ids) {
            if (message_ids.length === 0) return;
            sql = `DELETE FROM ${tablename.chat_message_data_spec} WHERE message_id IN (${message_ids.map(i => `${i}`).join(',')});`;
            let r = await this.exec_sql(sql);
        }

        // async chat_edition__get_last_to_me(user_attr, user_ids, group_ids) {
        //     const user_ids_string = user_ids.map(i => `${i}`).join(',');
        //     const group_ids_string = group_ids.map(i => `${i}`).join(',');
        //     sql = `SELECT `;
        //     // if (only_relations) {
        //     sql += `ceid, sent_time, sender, receiver_type, receiver_group_id, receiver_user_id`;
        //     // } else {
        //     //     sql += `*`;
        //     // }
        //     sql += ` FROM ${tablename.chat_message} WHERE `;
        //     sql += `(receiver_type = ${_.chat_message__receiver_type.user} AND ((sender = ${user_attr.id} AND receiver_user_id IN (${user_ids_string})) OR (sender IN (${user_ids_string}) AND receiver_user_id = ${user_attr.id})))`;
        //     sql += ` OR `; // TODO 鉴权 确保自己是此组成员
        //     sql += `(receiver_type = ${_.chat_message__receiver_type.group} AND receiver_group_id IN (${group_ids_string}))`;
        //     sql += ` ORDER BY id ASC`;
        //     sql += `;`;
        //     let r = await this.exec_sql(sql);
        //     return r;
        // }

        async chat_read_progress__get_records_mine(user_attr, user_ids, group_ids, limit = 50, offset = 0) {
            const user_ids_string = user_ids.map(i => `${i}`).join(',');
            const group_ids_string = group_ids.map(i => `${i}`).join(',');
            sql = `SELECT `;
            sql += `crpid, message_id, sender, receiver_type, receiver_group_id, receiver_user_id`;
            sql += ` FROM ${tablename.chat_read_progress} WHERE sender = ${user_attr.id} AND (`;

            sql += `(receiver_type = ${_.chat_message__receiver_type.user} AND ((sender = ${user_attr.id} AND receiver_user_id IN (${user_ids_string})) OR (sender IN (${user_ids_string}) AND receiver_user_id = ${user_attr.id})))`;
            sql += ` OR `; // TODO 鉴权 确保自己是此组成员
            sql += `(receiver_type = ${_.chat_message__receiver_type.group} AND receiver_group_id IN (${group_ids_string}))`;

            sql += `) ORDER BY crpid ASC`;
            sql += ` LIMIT ${limit}`;
            sql += ` OFFSET ${offset}`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_read_progress__update(sender, message_id, receiver_type, receiver_attr) {
            {
                sql = `DELETE FROM ${tablename.chat_read_progress} WHERE sender = ${sender} AND (`;

                if (receiver_type === _.chat_message__receiver_type.group) {
                    sql += `receiver_type = ${_.chat_message__receiver_type.group} AND receiver_group_id = ${receiver_attr.id}`;
                    // sql += ` OR `; // TODO 鉴权 确保自己是此组成员
                } else {
                    sql += `receiver_type = ${_.chat_message__receiver_type.user} AND receiver_user_id = ${receiver_attr.id}`;
                }

                sql += `) `;
                sql += `;`;
                let r = await this.exec_sql(sql);
            }

            sql = `INSERT INTO ${tablename.chat_read_progress} ("sender", "message_id", "receiver_type", "receiver_group_id", "receiver_user_id") VALUES (`;
            if (receiver_type === _.chat_message__receiver_type.group) {
                sql += `${sender}, ${message_id}, ${receiver_type}, ${receiver_attr.id}, NULL`;
            } else {
                sql += `${sender}, ${message_id}, ${receiver_type}, NULL, ${receiver_attr.id}`;
            }
            sql += `);`;
            let r = await this.exec_sql(sql);
        }

        

        async chat_message_read_list__get_attrs(message_ids) {
            if (message_ids.length === 0) return [];
            sql = `SELECT `;
            sql += `*`;
            sql += ` FROM ${tablename.chat_message_read_list} WHERE message_id IN (${message_ids.map(i => `${i}`).join(',')}) `;
            sql += ` ORDER BY id ASC`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_message_read_list__record(message_id, user_id) {
            sql = `INSERT INTO ${tablename.chat_message_read_list} ("message_id", "user_id") VALUES (`; // INSERT OR IGNORE table_name...
            sql += `${message_id}, ${user_id}`;
            sql += `) ON CONFLICT(message_id, user_id) DO NOTHING;`; // DO UPDATE SET other_field = excluded.other_field_value;
            let r = await this.exec_sql(sql);
        }

        async chat_message_read_list__record_some(message_ids, user_id) {
            sql = `INSERT INTO ${tablename.chat_message_read_list} ("message_id", "user_id") VALUES `;
            for (let i = 0; i < message_ids.length; i++) {
                sql += `(${message_ids[i]}, ${user_id})`;
                if (i !== message_ids.length - 1) sql += ", ";
            }
            sql += ` ON CONFLICT(message_id, user_id) DO NOTHING;`;
            let r = await this.exec_sql(sql);
        }

        async chat_edition__get_records_to_me(user_attr, user_ids, group_ids) {
            const user_ids_string = user_ids.map(i => `${i}`).join(',');
            const group_ids_string = group_ids.map(i => `${i}`).join(',');
            sql = `SELECT `;
            sql += `ceid, message_id, sender, receiver_type, receiver_group_id, receiver_user_id`;
            sql += ` FROM ${tablename.chat_edition} WHERE `;
            // if (ceid !== null) sql += `ceid > ${ceid} AND `;
            sql += `(`;
            sql += `(receiver_type = ${_.chat_message__receiver_type.user} AND ((sender = ${user_attr.id} AND receiver_user_id IN (${user_ids_string})) OR (sender IN (${user_ids_string}) AND receiver_user_id = ${user_attr.id})))`;
            sql += ` OR `; // TODO 鉴权 确保自己是此组成员
            sql += `(receiver_type = ${_.chat_message__receiver_type.group} AND receiver_group_id IN (${group_ids_string}))`;

            sql += `) ORDER BY ceid ASC`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_edition__record(sender, message_id, receiver_type, receiver_attr) {
            sql = `INSERT INTO ${tablename.chat_edition} ("sender", "message_id", "receiver_type", "receiver_group_id", "receiver_user_id") VALUES (`;
            if (receiver_type === _.chat_message__receiver_type.group) {
                sql += `${sender}, ${message_id}, ${receiver_type}, ${receiver_attr.id}, NULL`;
            } else {
                sql += `${sender}, ${message_id}, ${receiver_type}, NULL, ${receiver_attr.id}`;
            }
            sql += `) RETURNING ceid;`;
            let r = await this.exec_sql(sql);
            return r[0].ceid;
        }

        async chat_edition__record_some(sender, message_ids, receiver_type, receiver_attr) {
            sql = `INSERT INTO ${tablename.chat_edition} ("sender", "message_id", "receiver_type", "receiver_group_id", "receiver_user_id") VALUES `;

            for (let i = 0; i < message_ids.length; i++) {
                if (receiver_type === _.chat_message__receiver_type.group) {
                    sql += `(${sender}, ${message_ids[i]}, ${receiver_type}, ${receiver_attr.id}, NULL)`;
                } else {
                    sql += `(${sender}, ${message_ids[i]}, ${receiver_type}, NULL, ${receiver_attr.id})`;
                }
                if (i !== message_ids.length - 1) sql += ", ";
            }

            sql += ` RETURNING ceid;`;
            let r = await this.exec_sql(sql);
            return r.map(i => i.ceid);
        }

        async chat_edition__record_some_different(li) {
            if (li.length === 0) return;
            sql = `INSERT INTO ${tablename.chat_edition} ("sender", "message_id", "receiver_type", "receiver_group_id", "receiver_user_id") VALUES `;

            for (let i = 0; i < li.length; i++) {
                const message_attr = li[i];
                if (message_attr.receiver_type === _.chat_message__receiver_type.group) {
                    sql += `(${message_attr.sender}, ${message_attr.id}, ${message_attr.receiver_type}, ${message_attr.receiver_group_id}, NULL)`;
                } else {
                    sql += `(${message_attr.sender}, ${message_attr.id}, ${message_attr.receiver_type}, NULL, ${message_attr.receiver_user_id})`;
                }
                if (i !== li.length - 1) sql += ", ";
            }

            sql += ` RETURNING ceid;`;
            let r = await this.exec_sql(sql);
            return r.map(i => i.ceid);
        }

        async chat_activity__get_records_to_me__recent(user_attr, user_ids, group_ids, seconds) {
            const user_ids_string = user_ids.map(i => `${i}`).join(',');
            const group_ids_string = group_ids.map(i => `${i}`).join(',');
            sql = `SELECT `;
            sql += `caid, type, sender, receiver_type, receiver_group_id, receiver_user_id`;
            sql += ` FROM ${tablename.chat_activity} WHERE `;
            sql += `acted_time > DATETIME('now', '-${seconds} seconds') AND `;
            sql += `(`;
            sql += `(receiver_type = ${_.chat_message__receiver_type.user} AND ((sender = ${user_attr.id} AND receiver_user_id IN (${user_ids_string})) OR (sender IN (${user_ids_string}) AND receiver_user_id = ${user_attr.id})))`;
            sql += ` OR `; // TODO 鉴权 确保自己是此组成员
            sql += `(receiver_type = ${_.chat_message__receiver_type.group} AND receiver_group_id IN (${group_ids_string}))`;

            sql += `) ORDER BY caid DESC`;
            sql += `;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_activity__clear(seconds) {
            sql = `DELETE `;
            sql += ` FROM ${tablename.chat_activity} WHERE `;
            sql += `acted_time < DATETIME('now', '-${seconds} seconds') `;
            sql += `;`;
            let r = await this.exec_sql(sql);
            return r;
        }

        async chat_activity__record(sender, activity_type, receiver_type, receiver_attr) {
            sql = `INSERT INTO ${tablename.chat_activity} ("type", "sender", "receiver_type", "receiver_group_id", "receiver_user_id") VALUES (`;
            if (receiver_type === _.chat_message__receiver_type.group) {
                sql += `${activity_type}, ${sender}, ${receiver_type}, ${receiver_attr.id}, NULL`;
            } else {
                sql += `${activity_type}, ${sender}, ${receiver_type}, NULL, ${receiver_attr.id}`;
            }
            sql += `);`;
            let r = await this.exec_sql(sql);
        }
    }

    class CloudflareD1 extends DenoSqlite3 {
        constructor(server) {
            super(server);
        }

        async init() {
            this.db = this.server.env[binding_db];
        }

        async exec_sql(sql, params) {
            await _.prototype._exec_sql.call(this, sql);

            let result;
            if (params && params.length > 0) {
                result = await this.db.prepare(sql).bind(...params).all();
            } else {
                result = await this.db.prepare(sql).all();
            }

            await _.prototype._exec_sql_ok.call(this, result);

            if (result.results instanceof Array) {
                result = result.results;
            }
            return result;
        }


    }


    return {_, DenoSqlite3, CloudflareD1};
})()


function parseToUTC(time) {
    if (!time) return 0;
    if (time instanceof Date) return time.getTime();
    if (typeof time === "number") return time; // 已经是时间戳
    // 判断是否包含时区信息
    // 带 Z 或 +HH:MM 或 -HH:MM 表示已经带时区
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(time)) {
        return new Date(time).getTime();
    }
    // 否则，假设是 MySQL DATETIME "YYYY-MM-DD HH:mm:ss" 格式，手动解析为 UTC
    const [datePart, timePart] = time.split(" ");
    if (!datePart || !timePart) throw new Error("Invalid datetime format");

    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);

    // Date.UTC 返回 UTC 毫秒时间戳
    return Date.UTC(year, month - 1, day, hour, minute, second);
}

/*
* 文件存储后端
* */
const filestorebackends = (() => {
    class _ {
        constructor(server) {
            this.server = server;
            this.prefix = filestorebackendargs.prefix;
        }

        async init() {
            throw new Error("虚函数");
        }

        async put(key, value) {
            throw new Error("虚函数"); // boolean
        }

        async get(key) {
            throw new Error("虚函数"); // Uint8Array
        }

        async remove(key) {
            throw new Error("虚函数"); // boolean
        }
    }

    class DenoFile extends _ {
        constructor(server) {
            super(server);
            this.saveto = filestorebackendargs.local_path;
        }

        async init() {
            // https://docs.deno.com/api/deno/~/Deno.mkdir
            await Deno.mkdir(`${this.saveto}`, {recursive: true, mode: 0o777});
        }

        async put(key, value) {
            key = `${this.prefix}-${key}`;
            await Deno.writeFile(`${this.saveto}/${key}`, new Uint8Array(value), {mode: 0o777});
            return true;
        }

        async get(key) {
            key = `${this.prefix}-${key}`;
            return await Deno.readFile(`${this.saveto}/${key}`); // Uint8Array
        }

        async remove(key) {
            key = `${this.prefix}-${key}`;
            try {
                await Deno.remove(`${this.saveto}/${key}`, {recursive: false});
            } catch (e) {
            }
            return true;
        }
    }

    class CloudflareKV extends _ {
        constructor(server) {
            super(server);
        }

        async init() {
            this.kv = this.server.env[binding_kv];
        }

        async put(key, value) {
            key = `${this.prefix}-${key}`;
            await this.kv.put(key, new Uint8Array(value).buffer);
            return true;
        }

        async get(key) {
            key = `${this.prefix}-${key}`;
            return new Uint8Array(await this.kv.get(key, {type: 'arrayBuffer'}));
        }

        async remove(key) {
            key = `${this.prefix}-${key}`;
            try {
                await this.kv.delete(key);
            } catch (e) {
            }
            return true;
        }
    }

    class CloudflareR2 extends _ {
        constructor(server) {
            super(server);
        }

        async init() {
            this.r2 = this.server.env.R2;
        }

        async put(key, value) {
            key = `${this.prefix}-${key}`;
            await this.r2.put(key, new Uint8Array(value));
            return true;
        }

        async get(key) {
            key = `${this.prefix}-${key}`;
            const obj = await this.r2.get(key);
            return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
        }

        async remove(key) {
            key = `${this.prefix}-${key}`;
            await this.r2.delete(key);
            return true;
        }
    }

    class FDIndex extends _ {
        constructor(server) {
            super(server);
            this.baseurl = new URL(filestorebackendargs.url);
            this.baseurl.pathname = "/" + this.baseurl.pathname.split("/").filter(i => i.length > 0).join("/");
            if (!this.baseurl.pathname.endsWith("/")) this.baseurl.pathname += "/";
            this.user = filestorebackendargs.user;
            this.pass = filestorebackendargs.pass;
        }

        #header_authorization() {
            return {'Authorization': `Basic ${btoa(`${this.user}:${this.pass}`)}`};
        }

        async init() {
        }

        async put(key, value) {
            key = `${this.prefix}-${key}`;
            const url = join_path(this.baseurl, key);
            const r = await fetch(url, {
                ...attachBackend(this.baseurl),
                method: "PUT",
                headers: {...this.#header_authorization(), 'Content-Type': "application/octet-stream",},
                body: value,
            })
            if (r.status !== 200) throw new Error(await format_error_response(r));
            return true;
        }

        async get(key) {
            key = `${this.prefix}-${key}`;
            const url = join_path(this.baseurl, key);
            const r = await fetch(url, {
                ...attachBackend(this.baseurl), method: "GET", headers: {...this.#header_authorization(),},
            })
            if (r.status !== 200 && r.status !== 206) throw new Error(await format_error_response(r));
            return new Uint8Array(await r.arrayBuffer());
        }

        async remove(key) {
            key = `${this.prefix}-${key}`;
            const url = join_path(this.baseurl, key);
            const r = await fetch(url, {
                ...attachBackend(this.baseurl),
                method: "POST",
                headers: {...this.#header_authorization(), "Content-Type": "application/json",},
                body: JSON.stringify({action: "delete", source: url.pathname,}),
            })
            if (r.status !== 200) throw new Error(await format_error_response(r));
            return true;
        }
    }

    class GoogleDrive extends _ {
        constructor(server) {
            super(server);
            this.attr = filestorebackendargs;
            this.baseurl = new URL("https://www.googleapis.com/drive/v3/files");
        }

        #authorization = null;
        #access_token = null;
        #access_token_expires = 0;

        #header_authorization() {
            return {'Authorization': this.#authorization};
        }

        async init() {
            if (this.#authorization) {
                if (Date.now() < this.#access_token_expires) return;
            }
            const body = {
                client_id: this.attr.client_id,
                client_secret: this.attr.client_secret,
                refresh_token: this.attr.refresh_token,
                grant_type: "refresh_token",
            };
            const url = new URL('https://www.googleapis.com/oauth2/v4/token');
            const response = await fetch(url, {
                ...attachBackend(url),
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            if (response.status !== 200) throw new Error(await format_error_response(response));
            const data = await response.json();

            this.#access_token = data["access_token"];
            this.#access_token_expires = Date.now() + 3400 * 1000;
            this.#authorization = `Bearer ${data["access_token"]}`;
        }

        async put(key, value) {
            await this.init();
            key = `${this.prefix}-${key}`;
            const id = await this.#resolve(key);
            if (!id) {
                const url = new URL("https://www.googleapis.com/upload/drive/v3/files");
                const qs = {
                    supportsAllDrives: true, uploadType: 'resumable',
                };
                for (const qsKey in qs) url.searchParams.set(qsKey, qs[qsKey]);
                const r = await fetch(url, {
                    ...attachBackend(url), method: 'POST', headers: {
                        ...this.#header_authorization(), 'Content-Type': 'application/json',
                    }, body: JSON.stringify({
                        "name": key, "parents": [this.attr.folder_id,],
                    }),
                })
                if (r.status !== 200) throw new Error(await format_error_response(r));

                const url2 = r.headers.get('Location');
                const r2 = await fetch(url2, {
                    ...attachBackend(url2), method: 'PUT', headers: {...this.#header_authorization(),}, body: value,
                });
                if (r2.status !== 200) throw new Error(await format_error_response(r2));

                return true;
            }
            return false;
        }

        async get(key) {
            await this.init();
            key = `${this.prefix}-${key}`;
            const id = await this.#resolve(key);
            if (id) {
                const url = join_path(this.baseurl, id);
                const qs = {
                    includeItemsFromAllDrives: true, supportsAllDrives: true, alt: 'media'
                };
                for (const qsKey in qs) url.searchParams.set(qsKey, qs[qsKey]);
                const r = await fetch(url, {
                    ...attachBackend(url), method: "GET", headers: {...this.#header_authorization(),},
                })
                if (r.status !== 200 && r.status !== 206) throw new Error(await format_error_response(r));
                return new Uint8Array(await r.arrayBuffer());
            }
            throw new Error(`不存在文件：${key}`);
        }

        async remove(key) {
            await this.init();
            key = `${this.prefix}-${key}`;
            const id = await this.#resolve(key);
            if (id) {
                const url = join_path(this.baseurl, id);
                const qs = {
                    supportsAllDrives: true,
                };
                for (const qsKey in qs) url.searchParams.set(qsKey, qs[qsKey]);
                const r = await fetch(url, {
                    ...attachBackend(url), method: 'DELETE', headers: {
                        ...this.#header_authorization(), 'Content-Type': 'application/json',
                    },
                });
                if (r.status !== 200 && r.status !== 204) throw new Error(await format_error_response(r));
                return true;
            }
            return false;
        }

        #MimeTypes = {
            "application/vnd.google-apps.folder": null, "application/vnd.google-apps.shortcut": null,
        }

        async #resolve(key) {
            await this.init();
            const qs = {
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
                q: `'${this.attr.folder_id}' in parents and trashed = false and name = '${key}'`,
                orderBy: 'folder,name,modifiedTime desc',
                fields: 'files(id,name,mimeType,size,modifiedTime,shared,permissionIds,shortcutDetails),nextPageToken',
                pageSize: 1000
            };
            const url = join_path(this.baseurl,);
            for (const qsKey in qs) url.searchParams.set(qsKey, qs[qsKey]);
            const r = await fetch(url, {
                ...attachBackend(url), method: 'GET', headers: {
                    ...this.#header_authorization(), 'Content-Type': 'application/json',
                },
            });
            if (r.status !== 200) throw new Error(await format_error_response(r));
            const data = await r.json();
            for (const file of data.files) {
                if (file.name === key && !(file.type in this.#MimeTypes)) {
                    return file.id;
                }
            }
            return null;
        }
    }

    return {DenoFile, CloudflareKV, CloudflareR2, FDIndex, GoogleDrive};
})()


/*
* 视图访问权限类型
* */
const viewaccesspermissions = {
    any: 1, user: 2, admin: 4, logged: 2 | 4,
}

function format_cookie(key, value, age = seconds_of_hours(6)) {
    return `${key}=${value}; Max-Age=${age}; Path=/; SameSite=Strict; Secure;`; // HttpOnly导致浏览器里js不能主动删除
}

function get_cookies(request) {
    const cookieHeader = request.headers.get("cookie");
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(";").forEach(cookie => {
            const [name, value] = cookie.trim().split("=");
            cookies[name] = value;
        });
    }
    return cookies;
}


/*
* 子视图，this=urlpattern
* */
const subviews = (() => {
    class _ {
        constructor(server) {
            this.server = server;
        }
    }

    const check_permission = async (server, urlpattern) => {

        const d = {permitted: true, limit: urlpattern.marks.permission, session_attr: null, limit_hit: null, error_reason: null};

        if (urlpattern.marks.permission === undefined) return d; // 未登录用户也可以访问
        if (urlpattern.marks.permission & viewaccesspermissions.any) return d;

        const cookies = get_cookies(server.req);

        if (urlpattern.marks.permission & viewaccesspermissions.user) { // 登录用户
            if (!cookies.session_id) {
                d.permitted = false;
                d.error_reason = "未找到会话 Cookie，请确保浏览器已启用 Cookie 功能。";
                return d;
            }
            const r = await server.databasebackend.session__check_alive(cookies.session_id);
            if (r === false) {
                d.permitted = false;
                d.error_reason = "会话已过期或无效，请重新登录。";
            } else {
                d.session_attr = r;
                d.limit_hit = viewaccesspermissions.user;
            }
            return d;
        }

        if (urlpattern.marks.permission & viewaccesspermissions.admin) { // 管理员
            if (!cookies.admin_session_id) {
                d.permitted = false;
                d.error_reason = "未找到管理员会话 Cookie，请确保浏览器已启用 Cookie 功能。";
                return d;
            }
            const r = await server.databasebackend.session__check_alive(cookies.admin_session_id);
            if (r === false) {
                d.permitted = false;
                d.error_reason = "管理员会话已过期或无效，请重新登录。";
            } else {
                d.session_attr = r;
                d.limit_hit = viewaccesspermissions.admin;
            }
            return d;
        }

        d.permitted = false;
        d.error_reason = "权限不足。";
        return d;
    }

    class Web extends _ {
        constructor(server) {
            super(server);
        }

        static async startpage(args) {
            let r;
            let template_name = `checkin-v${checkin_version}.html`
            const temp_url = "https://raw.githubusercontent.com/JDUHDY/CCK/refs/heads/main/checkin-v4.1release.html"
            
            // Deno 本地环境：从本地文件系统读取
            if (isPlatform(Platforms.deno) && isLocal(this.server.req)) {
                template_name = template_name.replace(/v[^.]+/, `v${checkin_version_number}`);
                const decoder = new TextDecoder("utf-8");
                const data = await Deno.readFile(`./${template_name}`);
                r = decoder.decode(data);
            }
            
            // Cloudflare Workers 本地开发环境：从本地开发服务器获取
            if (!r && isPlatform(Platforms.cloudflare) && isLocal(this.server.req)) {
                let c = 0;
                while (true) {
                    try {
                        c++;
                        const url = new URL(`http://127.0.0.1:8080/${template_name}`);
                        r = await (await fetch(url, {...attachBackend(url),})).text();
                        break;
                    } catch (e) {
                        if (c > 3) {
                            throw e;
                        }
                    }
                }
            }
            
            // 其他环境：从远程下载模板
            if (!r) {
                let c = 0;
                while (true) {
                    try {
                        c++;
                        const url = new URL(`${temp_url}`);
                        r = await (await fetch(url, {...attachBackend(url),})).text();
                        break;
                    } catch (e) {
                        if (c > 3) {
                            throw e;
                        }
                    }
                }
            }

            // 修改
            r = r.replace(`<title>checkin</title>`, `<title>${title}</title>`);
            r = r.replace(`<span id="login-tip-user" class="hidden"></span>`, `<span id="login-tip-user" class="hidden">${title}</span>`);
            r = r.replace(`href="data:;base64,="`, `href="${logo}"`);
            r = r.replace(`const checkin_version = null;`, `const checkin_version = "${checkin_version}";`);
            r = r.replace(`const checkin_version_number = null;`, `const checkin_version_number = ${checkin_version_number};`);
            r = r.replace(`const checkin_version_is_beta = null;`, `const checkin_version_is_beta = ${checkin_version_is_beta};`);
            r = r.replace(`const enable_ai_consult = null;`, `const enable_ai_consult = ${enable_ai_consult};`);
            r = r.replace(`const baseTitle = null;`, `const baseTitle = "${title}";`);
            r = r.replace(`const top_level_path = null;`, `const top_level_path = "${top_level_path}";`);
            r = r.replace(`const disallowed_upload = null;`, `const disallowed_upload = ${JSON.stringify(disallowed_upload)};`);
            r = r.replace(`const chat_settings = null;`, `const chat_settings = ${JSON.stringify(chat_settings)};`);

            const jumpto = {
                appname: null, backend_panel: false,
            };
            if (this.marks.name === "admin") {
                jumpto.backend_panel = true;
            } else if (Object.keys(appnames).includes(this.marks.appname)) {
                jumpto.appname = this.marks.appname;
            }
            r = r.replace(`const appnames = null;`, `const appnames = ${JSON.stringify(appnames)};`);
            r = r.replace(`const jumpto = null;`, `const jumpto = ${JSON.stringify(jumpto)};`);
            r = r.replace(`const HEADER_LINKS = null;`, `const HEADER_LINKS = ${JSON.stringify(HEADER_LINKS)};`);
            r = r.replace(`static item_type = "drive";`, `static item_type = ${JSON.stringify(databasebackends._.drive__item_type)};`);
            r = r.replace(`static share_type = "drive";`, `static share_type = ${JSON.stringify(databasebackends._.drive__share_type)};`);
            r = r.replace(`static receiver_type = "chat";`, `static receiver_type = ${JSON.stringify(databasebackends._.chat_message__receiver_type)};`);
            r = r.replace(`static online_status = "chat";`, `static online_status = ${JSON.stringify(subviews.Chat.online_status)};`);
            r = r.replace(`static activity_type = "chat";`, `static activity_type = ${JSON.stringify(databasebackends._.chat_activity__type)};`);
            r = r.replace(`static message_type = "chat";`, `static message_type = ${JSON.stringify(databasebackends._.chat_message__type)};`);
            r = r.replace(`static message_status = "chat";`, `static message_status = ${JSON.stringify(databasebackends._.chat_message__status)};`);
            r = r.replace(`static data_spec_action_type = "chat";`, `static data_spec_action_type = ${JSON.stringify(databasebackends._.chat_data_spec__action_type)};`);
            r = r.replace(`static ws_action_type = "chat";`, `static ws_action_type = ${JSON.stringify(subviews.Chat.ws_action_type)};`);


            const cookies = get_cookies(this.server.req);
            const session_attr = await this.server.databasebackend.session__check_alive(cookies.session_id);
            if (session_attr && session_attr.user_id) {
                let user_attr = await this.server.databasebackend.user__get_attr_by_id(session_attr.user_id);
                r = r.replace(`let logged_user = null;`, `let logged_user = {
uid: "${user_attr.uid}",
manage_drive: ${user_attr.manage_drive},
contact_any: ${user_attr.contact_any},
};`);
            }
            if (this.marks.name === "admin" && await this.server.databasebackend.session__check_alive(cookies.admin_session_id)) r = r.replace(`let logged_admin = false;`, `let logged_admin = true;`);

            return responsetypes.code_200(this.server, r, {'Content-Type': 'text/html; charset=utf-8'});
        }

        static async jumpto_startpage(args) {
            if (top_level_path.length === 0) return Web.startpage.call(this, args); // 因这里的this是URL匹配模式对象
            return responsetypes.code_301(this.server, "", this.server.requrl.pathname.replace(/\/+$/, ""));
        }
    }

    class Api extends _ {
        constructor(server) {
            super(server);
        }

        static async auth(args) {
            let d = await this.server.req.json();
            const uid = normalizeId(d.account);
            let user_attr = uid ? await this.server.databasebackend.user__get_attr(uid) : null;
            if (!user_attr || d.password_hash !== user_attr.password_hash) {
                return responsetypes.code_401(this.server, requsterror.incorrect_username_or_password, {}, false);
            }
            if (user_attr.disabled) return responsetypes.code_403(this.server, requsterror.disabled_account, {},);

            let id = await this.server.databasebackend.session__new(databasebackends._.session__type.user, user_attr);
            let h = {
                "Set-Cookie": format_cookie("session_id", id, databasebackends._.session__keep_stored),
            }

            const result = {
                uid: uid, manage_drive: user_attr.manage_drive,
                notification_enable: notification_settings.enable,
            };

            return responsetypes.code_200(this.server, JSON.stringify(result), h);

        }

        static async version(args) {
            return responsetypes.code_200(this.server, JSON.stringify({
                version: checkin_version, version_number: checkin_version_number, is_beta: checkin_version_is_beta,
            }));
        }

        static async get_all_people_notice(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                const notice_setting = await this.server.databasebackend.settings__get("all_people_notice");
                const notice_text = notice_setting ? notice_setting.encrypted_value : "";
                return responsetypes.code_200(this.server, JSON.stringify({
                    success: true,
                    data: notice_text
                }));
            }
        }

        // 获取加密密钥（任何登录用户都可以获取）
        static async get_encryption_key(args) {
            return responsetypes.code_200(this.server, JSON.stringify({
                success: true,
                key: SYSTEM_ENCRYPTION_KEY
            }));
        }

    }

    class Admin extends _ {
        constructor(server) {
            super(server);
        }

        static async auth(args) {
            let d = await this.server.req.json();
            if (d.password === administrator_password) {
                let id = await this.server.databasebackend.session__new(databasebackends._.session__type.admin);
                let h = {
                    "Set-Cookie": format_cookie("admin_session_id", id, databasebackends._.session__keep_stored),
                }
                return responsetypes.code_200(this.server, "", h);
            }
            return responsetypes.code_401(this.server, requsterror.incorrect_password, {}, false);
        }

        // 获取加密密钥（仅限管理员）
        static async get_encryption_key(args) {
            return responsetypes.code_200(this.server, JSON.stringify({
                success: true,
                key: SYSTEM_ENCRYPTION_KEY
            }));
        }


        static service = {
            async disk(args) {

                if (this.server.req.method === requestmethodtypes.GET) {
                    const result = {
                        users: [],
                    }
                    result.users = await this.server.databasebackend.user__list();
                    result.users.forEach((i) => {
                        i.used_space = 0;
                    });
                    const l = await this.server.databasebackend.drive__get_usages_by_user_id(result.users.map(i => i.id));
                    l.forEach(i => {
                        const user_attr = result.users.find(j => j.id === i.uploader);
                        user_attr.used_space += i.total_size;
                    });
                    result.users.sort((a, b) => b.used_space - a.used_space);

                    result.users.forEach((i) => {
                        delete i.id;
                        delete i.disabled;
                    });

                    return responsetypes.code_200(this.server, JSON.stringify(result));

                }
            },

            async status(args) {
                return responsetypes.code_200(this.server, JSON.stringify(args));
            },

            async logs(args) {
                return responsetypes.code_200(this.server, JSON.stringify(args));
            },

            async init_tables(args) {
                if (this.server.req.method === requestmethodtypes.GET) {
                    await this.server.databasebackend.init_tables();
                    return responsetypes.code_200(this.server, "建表完成。");
                }
            },

            async drop_tables(args) {
                if (this.server.req.method === requestmethodtypes.GET) {
                    await this.server.databasebackend.drop_tables();
                    await this.server.databasebackend.init_tables();
                    return responsetypes.code_200(this.server, "重新建表完成。");
                }
            },

            async clear_drive(args) {
                if (this.server.req.method === requestmethodtypes.GET) {
                    await this.server.databasebackend.clear_drive();
                    return responsetypes.code_200(this.server, "清空网盘数据完成。");
                }
            },

            async backup(args) {
                if (this.server.req.method === requestmethodtypes.GET) {
                    const result = {
                        groups: [], // [{gid:"",},]
                        users: [], // [{uid:"",},]
                        belong_groups: {}, // uid:[gid,]
                        contact_groups: {}, // uid:[gid,],
                        contact_users: {}, // uid:[uid,],
                        common_phrases: null, // 候选短语
                        all_people_notice: null, // 全体通知
                        chat_pins: [], // 聊天消息置顶
                    };

                    const group_attrs = await this.server.databasebackend.group__list();
                    group_attrs.forEach(i => {
                        const d = {gid: i.gid,};
                        result.groups.push(d);
                    });

                    const user_attrs = await this.server.databasebackend.user__list("*");
                    user_attrs.forEach(i => {
                        const d = {
                            uid: i.uid,
                            password_hash: i.password_hash,
                            disabled: i.disabled,
                            contact_any: i.contact_any,
                            manage_drive: i.manage_drive,
                            free_space: i.free_space,
                        };
                        result.users.push(d);
                    });

                    const ug_attrs = await this.server.databasebackend.user_group_set__list();
                    for (const user_attr of user_attrs) {
                        const attrs = ug_attrs.filter(i => i.user_id === user_attr.id);
                        result.belong_groups[user_attr.uid] = attrs.map(i => group_attrs.find(j => j.id === i.group_id).gid);
                    }

                    const ucg_attrs = await this.server.databasebackend.user_contact_group_set__list();
                    for (const user_attr of user_attrs) {
                        const attrs = ucg_attrs.filter(i => i.user_id === user_attr.id);
                        result.contact_groups[user_attr.uid] = attrs.map(i => group_attrs.find(j => j.id === i.group_id).gid);
                    }

                    const ucu_attrs = await this.server.databasebackend.user_contact_user_set__list();
                    for (const user_attr of user_attrs) {
                        const attrs = ucu_attrs.filter(i => i.user_id === user_attr.id);
                        result.contact_users[user_attr.uid] = attrs.map(i => user_attrs.find(j => j.id === i.other_user_id).uid);
                    }

                    // 备份候选短语
                    const common_phrases_setting = await this.server.databasebackend.settings__get("common_phrases");
                    if (common_phrases_setting) {
                        result.common_phrases = common_phrases_setting.encrypted_value;
                    }

                    // 备份全体通知
                    const all_people_notice_setting = await this.server.databasebackend.settings__get("all_people_notice");
                    if (all_people_notice_setting) {
                        result.all_people_notice = all_people_notice_setting.encrypted_value;
                    }

                    // 备份聊天消息置顶
                    let sql = `SELECT * FROM "chat_pin";`;
                    const chat_pins = await this.server.databasebackend.exec_sql(sql);
                    for (const pin of chat_pins) {
                        const user_attr = user_attrs.find(u => u.id === pin.user_id);
                        if (!user_attr) continue;

                        const pin_data = {
                            uid: user_attr.uid,
                            receiver_type: pin.receiver_type,
                        };

                        if (pin.receiver_type === 0) {
                            // 用户聊天
                            const other_user_attr = user_attrs.find(u => u.id === pin.receiver_user_id);
                            if (other_user_attr) {
                                pin_data.receiver_uid = other_user_attr.uid;
                            }
                        } else {
                            // 群组聊天
                            const group_attr = group_attrs.find(g => g.id === pin.receiver_group_id);
                            if (group_attr) {
                                pin_data.receiver_gid = group_attr.gid;
                            }
                        }

                        result.chat_pins.push(pin_data);
                    }

                    return responsetypes.code_200(this.server, JSON.stringify(result));
                }
            },

            async restore(args) {
                if (this.server.req.method === requestmethodtypes.POST) {
                    let r = await this.server.req.json();

                    const user_attrs = await this.server.databasebackend.user__restore(r.users);
                    const group_attrs = await this.server.databasebackend.group__restore(r.groups);
                    await this.server.databasebackend.user__restore_relations(r, user_attrs, group_attrs);

                    // 恢复候选短语
                    if (r.common_phrases) {
                        await this.server.databasebackend.settings__set_raw("common_phrases", r.common_phrases);
                    }

                    // 恢复全体通知
                    if (r.all_people_notice) {
                        await this.server.databasebackend.settings__set_raw("all_people_notice", r.all_people_notice);
                    }

                    // 恢复聊天消息置顶
                    if (r.chat_pins && r.chat_pins.length > 0) {
                        for (const pin of r.chat_pins) {
                            const user_attr = user_attrs.find(u => u.uid === pin.uid);
                            if (!user_attr) continue;

                            let receiver_user_id = null;
                            let receiver_group_id = null;

                            if (pin.receiver_type === 0) {
                                // 用户聊天
                                const other_user_attr = user_attrs.find(u => u.uid === pin.receiver_uid);
                                if (other_user_attr) {
                                    receiver_user_id = other_user_attr.id;
                                }
                            } else {
                                // 群组聊天
                                const group_attr = group_attrs.find(g => g.gid === pin.receiver_gid);
                                if (group_attr) {
                                    receiver_group_id = group_attr.id;
                                }
                            }

                            if (receiver_user_id !== null || receiver_group_id !== null) {
                                let sql = `INSERT INTO "chat_pin" (user_id, receiver_type, receiver_user_id, receiver_group_id) VALUES (?, ?, ?, ?);`;
                                await this.server.databasebackend.exec_sql(sql, [user_attr.id, pin.receiver_type, receiver_user_id, receiver_group_id]);
                            }
                        }
                    }

                    return responsetypes.code_200(this.server, "恢复完成。");
                }
            },
        }

        static activity = {
            async _(args) {
                if (this.server.req.method === requestmethodtypes.GET) {
                    const params = await this.server.requrl.searchParams;
                    const date = params.get("date");
                    if (!form_field_checker.ffc_string_datetime_utc(date)) return responsetypes.code_400(this.server, requsterror.format_param(params));
                    const timestamp = Math.floor(new Date(date).getTime() / 1000);

                    const result = [];

                    const user_attrs = await this.server.databasebackend.user__list();
                    const r = await this.server.databasebackend.session__get_attrs_by_user_id(user_attrs.map(i => i.id), timestamp);
                    user_attrs.forEach((user_attr) => {
                        const session_attrs = r.filter(i => i.user_id === user_attr.id);
                        const d = {
                            uid: user_attr.uid, first_login_time: null, last_login_time: null,
                        };
                        if (session_attrs.length > 0) {
                            d.first_login_time = parseInt(parseToUTC(session_attrs.at(0).last_access_time) / 1000);
                            d.last_login_time = parseInt(parseToUTC(session_attrs.at(-1).last_access_time) / 1000);
                        }
                        result.push(d);
                    })
                    result.sort((a, b) => {
                        return a.last_login_time - b.last_login_time;
                    })

                    return responsetypes.code_200(this.server, JSON.stringify(result));
                }
            },

            async month(args) {
                return responsetypes.code_200(this.server, JSON.stringify(args));
            },

            async day(args) {
                return responsetypes.code_200(this.server, JSON.stringify(args));
            },
        }

        static group = {
            async _get_attached_attrs(d) {
                d.forEach((i) => {
                    i.users = []
                });
                const group_attrs = await this.server.databasebackend.group__get_attrs(d.map((i) => i.gid));

                // 成员
                const ug_attrs = await this.server.databasebackend.user_group_set__get_attrs_by_group(group_attrs.map((i) => i.id));
                for (const dElement of d) {
                    let group_attr = null;
                    for (const groupAttr of group_attrs) {
                        if (groupAttr.gid === dElement.gid) {
                            group_attr = groupAttr;
                            break;
                        }
                    }
                    if (group_attr === null) continue;
                    const user_ids = [];
                    for (const ugAttr of ug_attrs) {
                        if (ugAttr.group_id === group_attr.id) {
                            user_ids.push(ugAttr.user_id)
                        }
                    }
                    const user_attrs = await this.server.databasebackend.user__get_attrs_by_id(user_ids);
                    for (const userAttr of user_attrs) {
                        dElement.users.push(userAttr.uid);
                    }

                }
            },

            async _(args) {
                if (this.server.req.method === requestmethodtypes.POST) {
                    let d = [];
                    let r = await this.server.req.json();
                    for (const attr of r) {
                        const gid = normalizeId(attr.gid);
                        if (!gid) continue;
                        await this.server.databasebackend.group__new(gid);
                        d.push({gid});
                    }
                    d.forEach((i) => {
                        i.users = []
                    });
                    return responsetypes.code_200(this.server, JSON.stringify(d));
                }

            },

            async list(args) {
                if (this.server.req.method === requestmethodtypes.GET) {
                    let l = await this.server.databasebackend.group__list();
                    l.forEach((i) => {
                        delete i.id;
                        delete i.create_time;
                    });
                    await Admin.group._get_attached_attrs.call(this, l);
                    return responsetypes.code_200(this.server, JSON.stringify(l));
                }
            },

            async item_(args) {
                const gid = normalizeId(args.gid);
                if (this.server.req.method === requestmethodtypes.DELETE) {
                    if (!gid) return responsetypes.code_400(this.server, requsterror.format_param(args));
                    let l = await this.server.databasebackend.group__delete(gid);
                    return responsetypes.code_200(this.server);
                } else if (this.server.req.method === requestmethodtypes.GET) {
                    let group_attr = await this.server.databasebackend.group__get_attr(gid);
                    delete group_attr.id;
                    delete group_attr.create_time;
                    await Admin.group._get_attached_attrs.call(this, [group_attr,]);
                    return responsetypes.code_200(this.server, JSON.stringify(group_attr));
                } else if (this.server.req.method === requestmethodtypes.PUT) {
                    let r = await this.server.req.json();
                    let new_gid = await this.server.databasebackend.group__edit(gid, r);
                    let group_attr = await this.server.databasebackend.group__get_attr(new_gid);
                    delete group_attr.id;
                    delete group_attr.create_time;
                    await Admin.group._get_attached_attrs.call(this, [group_attr,]);
                    return responsetypes.code_200(this.server, JSON.stringify(group_attr));
                }
            },

            activity: {
                async _(args) {
                    if (this.server.req.method === requestmethodtypes.GET) {
                        const params = await this.server.requrl.searchParams;
                        const date = params.get("date");
                        if (!form_field_checker.ffc_string_datetime_utc(date)) return responsetypes.code_400(this.server, requsterror.format_param(params));
                        const timestamp = Math.floor(new Date(date).getTime() / 1000);

                        const result = [];

                        const gid = normalizeId(args.gid);
                        if (!gid) return responsetypes.code_400(this.server, requsterror.format_param(args));
                        const group_attr = await this.server.databasebackend.group__get_attr(gid);
                        if (!group_attr) return responsetypes.code_400(this.server, requsterror.format_param(args));
                        const ug_attrs = await this.server.databasebackend.user_group_set__get_attrs_by_group([group_attr.id]);

                        const user_attrs = await this.server.databasebackend.user__get_attrs_by_id(ug_attrs.map(i => i.user_id));
                        const r = await this.server.databasebackend.session__get_attrs_by_user_id(user_attrs.map(i => i.id), timestamp);
                        user_attrs.forEach((user_attr) => {
                            const session_attrs = r.filter(i => i.user_id === user_attr.id);
                            const d = {
                                uid: user_attr.uid, first_login_time: null, last_login_time: null,
                            };
                            if (session_attrs.length > 0) {
                                d.first_login_time = parseInt(parseToUTC(session_attrs.at(0).last_access_time) / 1000);
                                d.last_login_time = parseInt(parseToUTC(session_attrs.at(-1).last_access_time) / 1000);
                            }
                            result.push(d);
                        })
                        result.sort((a, b) => {
                            return a.last_login_time - b.last_login_time;
                        })

                        return responsetypes.code_200(this.server, JSON.stringify(result));
                    }
                },

                async month(args) {
                    return responsetypes.code_200(this.server, JSON.stringify(args));
                },

                async day(args) {
                    return responsetypes.code_200(this.server, JSON.stringify(args));
                },
            }
        }

        static settings = {
            async get(args) {
                if (this.server.req.method === requestmethodtypes.GET) {
                    const params = await this.server.requrl.searchParams;
                    const key = params.get("key");
                    if (!key) return responsetypes.code_400(this.server, requsterror.format_param("key"));

                    const setting = await this.server.databasebackend.settings__get(key);
                    if (!setting) {
                        // 配置项不存在时返回空值
                        return responsetypes.code_200(this.server, JSON.stringify({
                            key: key,
                            value: null,
                            updated_time: null
                        }));
                    }

                    return responsetypes.code_200(this.server, JSON.stringify({
                        key: key,
                        value: setting.encrypted_value,
                        updated_time: setting.updated_time
                    }));
                }
            },

            async update(args) {
                if (this.server.req.method === requestmethodtypes.POST) {
                    const r = await this.server.req.json();
                    const {key, value} = r;
                    if (!key || value === undefined) {
                        return responsetypes.code_400(this.server, requsterror.format_param("key, value"));
                    }

                    // 直接存储前端传来的加密数据
                    await this.server.databasebackend.settings__set_raw(key, value);

                    return responsetypes.code_200(this.server, JSON.stringify({
                        success: true,
                        message: "配置更新成功"
                    }));
                }
            },


        };

        static user = {
            async _get_attached_attrs(d, needed = []) {
                d.forEach((i) => {
                    if (needed.includes("groups")) i.groups = []
                    if (needed.includes("contact_groups")) i.contact_groups = []
                    if (needed.includes("contact_users")) i.contact_users = []
                    if (needed.includes("last_login_time")) i.last_login_time = null
                });

                const user_attrs = await this.server.databasebackend.user__get_attrs(d.map((i) => i.uid));

                // 创建用户 ID 到用户属性的映射
                const user_attr_map = new Map();
                user_attrs.forEach(attr => user_attr_map.set(attr.id, attr));

                // 所属组 - 优化: 批量查询所有群组
                if (needed.includes("groups")) {
                    const ug_attrs = await this.server.databasebackend.user_group_set__get_attrs_by_user(user_attrs.map((i) => i.id));
                    
                    // 收集所有需要查询的 group_ids
                    const all_group_ids = [...new Set(ug_attrs.map(ug => ug.group_id))];
                    
                    // 批量查询所有群组属性
                    const all_group_attrs = await this.server.databasebackend.group__get_attrs_by_id(all_group_ids);
                    
                    // 创建群组 ID 到群组属性的映射
                    const group_attr_map = new Map();
                    all_group_attrs.forEach(attr => group_attr_map.set(attr.id, attr));
                    
                    // 在内存中关联数据
                    for (const dElement of d) {
                        let user_attr = null;
                        for (const userAttr of user_attrs) {
                            if (userAttr.uid === dElement.uid) {
                                user_attr = userAttr;
                                break;
                            }
                        }
                        if (user_attr === null) continue;
                        
                        // 从映射中获取该用户的群组
                        for (const ugAttr of ug_attrs) {
                            if (ugAttr.user_id === user_attr.id) {
                                const group_attr = group_attr_map.get(ugAttr.group_id);
                                if (group_attr) {
                                    dElement.groups.push(group_attr.gid);
                                }
                            }
                        }
                    }
                }

                // 联系组 - 优化: 批量查询所有群组
                if (needed.includes("contact_groups")) {
                    const ug_attrs = await this.server.databasebackend.user_contact_group_set__get_attrs_by_user(user_attrs.map((i) => i.id));
                    
                    // 收集所有需要查询的 group_ids
                    const all_group_ids = [...new Set(ug_attrs.map(ug => ug.group_id))];
                    
                    // 批量查询所有群组属性
                    const all_group_attrs = await this.server.databasebackend.group__get_attrs_by_id(all_group_ids);
                    
                    // 创建群组 ID 到群组属性的映射
                    const group_attr_map = new Map();
                    all_group_attrs.forEach(attr => group_attr_map.set(attr.id, attr));
                    
                    // 在内存中关联数据
                    for (const dElement of d) {
                        let user_attr = null;
                        for (const userAttr of user_attrs) {
                            if (userAttr.uid === dElement.uid) {
                                user_attr = userAttr;
                                break;
                            }
                        }
                        if (user_attr === null) continue;
                        
                        // 从映射中获取该用户的联系组
                        for (const ugAttr of ug_attrs) {
                            if (ugAttr.user_id === user_attr.id) {
                                const group_attr = group_attr_map.get(ugAttr.group_id);
                                if (group_attr) {
                                    dElement.contact_groups.push(group_attr.gid);
                                }
                            }
                        }
                    }
                }

                // 联系人 - 优化: 批量查询所有联系人
                if (needed.includes("contact_users")) {
                    const ug_attrs = await this.server.databasebackend.user_contact_user_set__get_attrs_by_user(user_attrs.map((i) => i.id));
                    
                    // 收集所有需要查询的 user_ids
                    const all_other_user_ids = [...new Set(ug_attrs.map(ug => ug.other_user_id))];
                    
                    // 批量查询所有联系人属性
                    const all_other_user_attrs = await this.server.databasebackend.user__get_attrs_by_id(all_other_user_ids);
                    
                    // 创建用户 ID 到用户属性的映射
                    const other_user_attr_map = new Map();
                    all_other_user_attrs.forEach(attr => other_user_attr_map.set(attr.id, attr));
                    
                    // 在内存中关联数据
                    for (const dElement of d) {
                        let user_attr = null;
                        for (const userAttr of user_attrs) {
                            if (userAttr.uid === dElement.uid) {
                                user_attr = userAttr;
                                break;
                            }
                        }
                        if (user_attr === null) continue;
                        
                        // 从映射中获取该用户的联系人
                        for (const ugAttr of ug_attrs) {
                            if (ugAttr.user_id === user_attr.id) {
                                const other_user_attr = other_user_attr_map.get(ugAttr.other_user_id);
                                if (other_user_attr) {
                                    dElement.contact_users.push(other_user_attr.uid);
                                }
                            }
                        }
                    }
                }

                // 上次在线 - 优化: 批量查询所有会话
                if (needed.includes("last_login_time")) {
                    // 收集所有需要查询的 user_ids
                    const all_user_ids = user_attrs.map(attr => attr.id);
                    
                    // 批量查询所有会话属性
                    const all_session_attrs = await this.server.databasebackend.session__get_attrs_by_user_id(all_user_ids);
                    
                    // 创建用户 ID 到会话属性的映射,只保留最后一条会话记录
                    const session_attr_map = new Map();
                    all_session_attrs.forEach(attr => {
                        const existing = session_attr_map.get(attr.user_id);
                        if (!existing || attr.last_access_time > existing.last_access_time) {
                            session_attr_map.set(attr.user_id, attr);
                        }
                    });
                    
                    // 在内存中关联数据
                    for (const dElement of d) {
                        let user_attr = null;
                        for (const userAttr of user_attrs) {
                            if (userAttr.uid === dElement.uid) {
                                user_attr = userAttr;
                                break;
                            }
                        }
                        if (user_attr === null) continue;
                        
                        // 从映射中获取该用户的最后会话
                        const session_attr = session_attr_map.get(user_attr.id);
                        if (session_attr) {
                            let date = parseToUTC(session_attr.last_access_time);
                            dElement.last_login_time = parseInt(date / 1000);
                        }
                    }
                }

            },

            async _get_user_attr(uid) {
                let user_attr = await this.server.databasebackend.user__get_attr(uid);
                if (!user_attr) throw new Error(requsterror.format_user_not_found(uid));
                for (const key of databasebackends._.user__unnecessary_columns_2) delete user_attr[key];
                await Admin.user._get_attached_attrs.call(this, [user_attr], ["groups", "contact_groups", "contact_users",]);
                return user_attr;
            },

            async _(args) {
                if (this.server.req.method === requestmethodtypes.POST) {
                    let d = [];
                    let r = await this.server.req.json();
                    for (const attr of r) {
                        const uid = normalizeId(attr.uid);
                        if (!uid) continue;
                        attr.uid = uid;
                        const user_attr = await this.server.databasebackend.user__new(attr);
                        for (const key of databasebackends._.user__unnecessary_columns) delete user_attr[key];
                        d.push(user_attr);
                    }
                    await Admin.user._get_attached_attrs.call(this, d, ["groups", "last_login_time",]);
                    return responsetypes.code_200(this.server, JSON.stringify(d));
                }
            },

            async list(args) {
                if (this.server.req.method === requestmethodtypes.GET) {
                    let l = await this.server.databasebackend.user__list();
                    l.forEach((i) => {
                        delete i.id;
                        delete i.free_space;
                    });
                    await Admin.user._get_attached_attrs.call(this, l, ["groups", "last_login_time",]);
                    return responsetypes.code_200(this.server, JSON.stringify(l));
                }
            },

            async attrs(args) {
                if (this.server.req.method === requestmethodtypes.POST) {
                    let r = await this.server.req.json();
                    const uids = r.uids || [];
                    if (!Array.isArray(uids)) {
                        return responsetypes.code_400(this.server, JSON.stringify({error: "uids must be an array"}));
                    }
                    
                    const user_attrs = [];
                    for (const uid of uids) {
                        const normalizedUid = normalizeId(uid);
                        if (!normalizedUid) continue;
                        
                        const user_attr = await this.server.databasebackend.user__get_attr(normalizedUid);
                        if (user_attr) {
                            for (const key of databasebackends._.user__unnecessary_columns_2) delete user_attr[key];
                            user_attrs.push(user_attr);
                        }
                    }
                    
                    await Admin.user._get_attached_attrs.call(this, user_attrs, ["groups", "contact_groups", "contact_users",]);
                    return responsetypes.code_200(this.server, JSON.stringify(user_attrs));
                }
            },

            async item_(args) {
                const uid = normalizeId(args.uid);
                if (!uid) return responsetypes.code_400(this.server, requsterror.format_param(args));

                if (this.server.req.method === requestmethodtypes.DELETE) {
                    const user_attr = await this.server.databasebackend.user__get_attr(uid);
                    if (user_attr) {
                        await this.server.databasebackend.drive__clear([user_attr.id,], 0);
                        // 要删网盘文件吗？还是把上传者改为null就好？// 要删
                        await this.server.databasebackend.drive__clear_attachments([user_attr.id,]);
                        const drive_item_attr = await this.server.databasebackend.drive__get_attr_by_myspace(user_attr.id);
                        if (drive_item_attr) {
                            const drive_items = await this.server.databasebackend.drive__list_by_id(drive_item_attr.id,);
                            for (const driveItem of drive_items) {
                                await Drive.item._delete.call(this, driveItem);
                            }
                            await this.server.databasebackend.drive__myspace_delete(user_attr.id);
                        }
                        // await this.server.databasebackend.drive__unset_uploader(user_attr.id);
                    }
                    let l = await this.server.databasebackend.user__delete(uid);

                    return responsetypes.code_200(this.server);
                } else if (this.server.req.method === requestmethodtypes.GET) {
                    let user_attr = await Admin.user._get_user_attr.call(this, uid);
                    return responsetypes.code_200(this.server, JSON.stringify(user_attr));
                } else if (this.server.req.method === requestmethodtypes.PUT) {
                    let r = await this.server.req.json();
                    let new_uid = await this.server.databasebackend.user__edit(uid, r);
                    let user_attr = await Admin.user._get_user_attr.call(this, new_uid);
                    return responsetypes.code_200(this.server, JSON.stringify(user_attr));
                }
            },

            async clone(args) {
            },

        }


    }

    class Me extends _ {
        constructor(server) {
            super(server);
        }

        static async logout(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                await this.server.databasebackend.session__close_by_id(this.server.session_attr.id);
                const result = {};
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static _valid_contacts_types = ["any", "users", "groups",];
        static _valid_contacted_types = ["users", "groups",];

        static async contacts(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                const params = await this.server.requrl.searchParams;
                const type = params.get("type");
                if (!type || !Me._valid_contacts_types.includes(type)) return responsetypes.code_400(this.server, requsterror.format_param(params));

                const user_attr = await this.server.databasebackend.user__get_attr_by_id(this.server.session_attr.user_id);

                if (type === Me._valid_contacts_types[0]) {
                    const result = {
                        "contact_any": user_attr.contact_any,
                    };
                    return responsetypes.code_200(this.server, JSON.stringify(result));
                } else if (type === Me._valid_contacts_types[1]) {
                    const {
                        result, user_contact_group_attrs
                    } = await Me._contacts_users.call(this, user_attr,);
                    return responsetypes.code_200(this.server, JSON.stringify(result));
                } else if (type === Me._valid_contacts_types[2]) {
                    const {
                        result, user_contact_group_attrs
                    } = await Me._contacts_groups.call(this, user_attr,);
                    return responsetypes.code_200(this.server, JSON.stringify(result));
                }
            }
        }

        static async _contacts_users(user_attr, user_contact_group_attrs) {
            const result = [];

            let user_ids_by_group; // 我可以联系的组里的成员
            {
                const ug_attrs = user_contact_group_attrs ? user_contact_group_attrs : await this.server.databasebackend.user_contact_group_set__get_attrs_by_user([user_attr.id]);
                const ug_group_ids = ug_attrs.map(i => i.group_id);
                const items = await this.server.databasebackend.user_group_set__get_attrs_by_group(ug_group_ids);
                user_ids_by_group = items.map(i => i.user_id);
            }

            const uu_attrs = await this.server.databasebackend.user_contact_user_set__get_attrs_by_user([user_attr.id]); // 我可以联系的用户
            const uu_user_ids = uu_attrs.map(i => i.other_user_id);

            const items = await this.server.databasebackend.user__get_attrs_by_id([...uu_user_ids, ...user_ids_by_group]);
            for (const item of items) {
                if (item.id === user_attr.id) continue;
                const d = {uid: item.uid,};
                for (const uuAttr of uu_attrs) {
                    if (uuAttr.other_user_id === item.id) {
                        // do nothing
                        break;
                    }
                }
                result.push(d);
            }

            if (user_attr.contact_any) {
                const user_list = await this.server.databasebackend.user__list();
                for (const userListElement of user_list) {
                    if (userListElement.id === user_attr.id) continue;
                    if (!uu_user_ids.includes(userListElement.id) && !user_ids_by_group.includes(userListElement.id)) {
                        const d = {
                            uid: userListElement.uid,
                        };
                        result.push(d);
                    }
                }
            }

            return {result, user_contact_group_attrs,};
        }

        static async _contacts_groups(user_attr, user_contact_group_attrs) {
            const result = [];

            const ug_attrs = user_contact_group_attrs ? user_contact_group_attrs : await this.server.databasebackend.user_contact_group_set__get_attrs_by_user([user_attr.id]);
            const ug_group_ids = ug_attrs.map(i => i.group_id);
            const items = await this.server.databasebackend.group__get_attrs_by_id(ug_group_ids); // 我可以联系的组
            for (const item of items) {
                const d = {gid: item.gid,};
                for (const ugAttr of ug_attrs) {
                    if (ugAttr.group_id === item.id) {
                        // do nothing
                        break;
                    }
                }
                result.push(d);
            }

            // if (user_attr.contact_any) { // 允许与所有用户通信，不包含组合理些？
            //     const group_list = await this.server.databasebackend.group__list();
            //     for (const groupListElement of group_list) {
            //         if (!ug_group_ids.includes(groupListElement.id)) {
            //             const d = {
            //                 gid: groupListElement.gid,
            //             };
            //             result.push(d);
            //         }
            //     }
            // }

            return {result, user_contact_group_attrs,};
        }

        static async contacted(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                const params = await this.server.requrl.searchParams;
                const type = params.get("type");
                if (!type || !Me._valid_contacted_types.includes(type)) return responsetypes.code_400(this.server, requsterror.format_param(params));

                const user_attr = await this.server.databasebackend.user__get_attr_by_id(this.server.session_attr.user_id);

                if (type === Me._valid_contacted_types[0]) {
                    const {result, user_attrs} = await Me._contacted_users.call(this, user_attr,);
                    return responsetypes.code_200(this.server, JSON.stringify(result));
                } else if (type === Me._valid_contacted_types[1]) {
                    const result = await Me._contacted_groups.call(this, user_attr,);
                    return responsetypes.code_200(this.server, JSON.stringify(result));
                }
            }
        }

        static async _contacted_users(user_attr) {
            const result = [];

            const user_attrs = await this.server.databasebackend.user__list_who_can_contact_me(user_attr.id);
            for (const item of user_attrs) {
                const d = {uid: item.uid,};
                result.push(d);
            }

            return {result, user_attrs,};
        }

        static async _contacted_groups(user_attr, user_attrs) {
            const result = [];

            // 这种情况： A(1),B(2)，设2可以联系A，因1在A里，2透过A联系1，所以1应该在视图里展示A，使能看到A里的消息。
            const items = await this.server.databasebackend.group__list_who_can_contact_me(user_attr.id, user_attrs);
            for (const item of items) {
                const d = {gid: item.gid,};
                result.push(d);
            }

            return result;
        }

        static activity = {
            async month(args) {
                return responsetypes.code_200(this.server, JSON.stringify(args));
            },

            async day(args) {
                return responsetypes.code_200(this.server, JSON.stringify(args));
            },
        }
    }

    class Mail extends _ {
        constructor(server) {
            super(server);
        }

        static async send(args) {
        }

        static async unread(args) {
        }

        static async received(args) {
        }

        static async sent(args) {
        }

        static async sent_unread(args) {
        }

        static item = {
            async _(args) {
            },

            mark: {
                async read(args) {
                }
            },

            async receivers(args) {
            }

        }

    }

    class Drive extends _ {
        constructor(server) {
            super(server);
        }

        static _valid_sites = ["myspace", "trashcan", "newfiles", "sharewithme", "root",];

        static async _get_attached_attrs(d, needed = []) {
            d.forEach((i) => {
                delete i.trashed_time;
            });

            const user_attrs = await this.server.databasebackend.user__get_attrs_by_id(d.map(i => i.uploader));

            if (needed.includes("uploader")) {
                d.forEach((i) => {
                    if (i.uploader === null) return;
                    let user_attr = null;
                    for (const userAttr of user_attrs) {
                        if (i.uploader === userAttr.id) {
                            user_attr = userAttr;
                            break;
                        }
                    }
                    i.uploader = user_attr.uid;
                });
            }

            if (needed.includes("shared")) {
                // const share_status = await this.server.databasebackend.drive__get_share_status_single_by_ids(d.map(i => i.id));
                // share_status.forEach((i) => {
                //     i.any = d.find(j => j.id === i.id).share_any_type; // 需要向上查找才能确定
                //     i.public = d.find(j => j.id === i.id).share_public_type;
                // });
                const share_status = await this.server.databasebackend.drive__get_share_status_upward_by_ids(d.map(i => i.id), this.server.session_attr.user_id, []);

                d.forEach((i) => {
                    const ss = share_status.find(j => j.id === i.id);
                    // console.log(ss)
                    if (ss.any === databasebackends._.drive__share_type.readonly || ss.any === databasebackends._.drive__share_type.readwrite || //
                        ss.public === databasebackends._.drive__share_type.readonly || ss.public === databasebackends._.drive__share_type.readwrite //
                        || ss.users.length > 0 || ss.groups.length > 0) {
                        i.shared = true;
                    } else {
                        i.shared = false;
                    }
                });
            }

            if (needed.includes("uploaded_time")) {
                d.forEach((i) => {
                    let date = parseToUTC(i.uploaded_time);
                    i.uploaded_time = parseInt(date / 1000);
                });
            }

        }

        static async upload(args) {
            const params = await this.server.requrl.searchParams;
            let did = normalizeId(params.get("did"));
            if (!did) return responsetypes.code_400(this.server, requsterror.format_param(params));

            if (this.server.req.method === requestmethodtypes.PUT) {
                const item_attr = await this.server.databasebackend.drive__get_attr(did);
                if (!item_attr) return responsetypes.code_404(this.server, requsterror.format_param(params));
                // console.log(item_attr)

                if (item_attr.attachment_came) {
                }
                if (item_attr.public_came) {
                }

                if (item_attr.type !== databasebackends._.drive__item_type.file) return responsetypes.code_400(this.server, "目标不是文件。");

                if (item_attr.uploader !== this.server.session_attr.user_id) return responsetypes.code_403(this.server, "你不是文件的拥有者。");

                if (item_attr.trashed) return responsetypes.code_400(this.server, "文件已移至垃圾桶。");

                if (item_attr.uploaded) return responsetypes.code_200(this.server, "文件已上传。");

                const data = new Uint8Array(await this.server.req.arrayBuffer());
                // await sleep(10);
                // console.log(data);
                await this.server.filestorebackend.put(did, data);

                await this.server.databasebackend.drive__change_attr_uploaded_by_id(item_attr.id);

                return responsetypes.code_200(this.server,);
            }
        }

        static async list(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                const params = await this.server.requrl.searchParams;
                const site = params.get("site");
                let did = normalizeId(params.get("did"));
                if (!site || !Drive._valid_sites.includes(site)) return responsetypes.code_400(this.server, requsterror.format_param(params));

                let items = null;
                if (did) {
                    items = await this.server.databasebackend.drive__list(did,);
                    if (site !== Drive._valid_sites[1]) {
                        items = items.filter(i => !i.trashed);
                    }
                } else {
                    if (site === Drive._valid_sites[0]) {
                        let item_attr = await this.server.databasebackend.drive__get_attr_by_myspace(this.server.session_attr.user_id);
                        if (!item_attr) {
                            const user_attr = await this.server.databasebackend.user__get_attr_by_id(this.server.session_attr.user_id);
                            item_attr = await this.server.databasebackend.drive__myspace_new(user_attr);
                        }
                        items = await this.server.databasebackend.drive__list_by_id(item_attr.id,);
                        items = items.filter(i => !i.trashed);
                    } else if (site === Drive._valid_sites[1]) {
                        items = await this.server.databasebackend.drive__list_by_trashcan(this.server.session_attr.user_id);
                    } else if (site === Drive._valid_sites[2]) {
                        items = await this.server.databasebackend.drive__list_by_newfiles(this.server.session_attr.user_id);
                        items = items.filter(i => !i.trashed);
                    } else if (site === Drive._valid_sites[3]) {
                        items = await this.server.databasebackend.drive__list_by_sharewithme(this.server.session_attr.user_id);
                        items = items.filter(i => !i.trashed);
                    } else if (site === Drive._valid_sites[4]) {
                        items = await this.server.databasebackend.drive__list_by_root();
                        items = items.filter(i => !i.trashed);
                    }
                }

                await Drive._get_attached_attrs.call(this, items, ["uploader", "shared", "uploaded_time",]);
                databasebackends._.drive__ids2dids(items);
                for (const item of items) {
                    for (const key of databasebackends._.drive__unnecessary_columns) delete item[key];
                    if (item.type === databasebackends._.drive__item_type.folder) for (const key of databasebackends._.drive__unnecessary_columns_2) delete item[key];
                }

                return responsetypes.code_200(this.server, JSON.stringify(items));

            }
        }

        static async new(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                let r = await this.server.req.json();
                // if (r.type === databasebackends._.drive__item_type.file) {
                // } else if (r.type === databasebackends._.drive__item_type.folder) {
                if (r.type === databasebackends._.drive__item_type.file || r.type === databasebackends._.drive__item_type.folder) {

                    const user_attr = await this.server.databasebackend.user__get_attr_by_id(this.server.session_attr.user_id);
                    if (r.type === databasebackends._.drive__item_type.file) {
                        const total_size = (await this.server.databasebackend.drive__get_usages_by_user_id([user_attr.id,])).reduce((arr, cur) => {
                            return arr + cur.total_size;
                        }, 0);
                        if ((total_size + r.size) / 1024 / 1024 > user_attr.free_space) {
                            return responsetypes.code_409(this.server, `你的可用空间不足，无法上传，总空间：${user_attr.free_space} MB，已用空间：${format_bytes(total_size)}。`);
                        }
                    }

                    const item_id = await this.server.databasebackend.drive__new(r, this.server.session_attr.user_id);
                    {
                        const item_attr = await this.server.databasebackend.drive__get_attr_by_id(item_id);

                        await Drive._get_attached_attrs.call(this, [item_attr], ["uploader", "shared", "uploaded_time",]);
                        databasebackends._.drive__ids2dids(item_attr);
                        for (const key of databasebackends._.drive__unnecessary_columns) delete item_attr[key];
                        if (item_attr.type === databasebackends._.drive__item_type.folder) for (const key of databasebackends._.drive__unnecessary_columns_2) delete item_attr[key];

                        return responsetypes.code_200(this.server, JSON.stringify(item_attr));
                    }
                }
                return responsetypes.code_400(this.server, requsterror.format_type_invalid(r.type));
            }
        }

        static item = {
            async _(args) {
                let did = normalizeId(args.did);
                if (!did) return responsetypes.code_400(this.server, requsterror.format_param(args));

                const item_attr = await this.server.databasebackend.drive__get_attr(did);
                if (!item_attr) return responsetypes.code_404(this.server, requsterror.format_param(args));

                if (this.server.req.method === requestmethodtypes.PUT) {
                    let r = await this.server.req.json();

                    if (r.action === "rename") {
                        // 获取用户的群组ID列表
                        const user_groups = await this.server.databasebackend.user_group_set__get_attrs_by_user([this.server.session_attr.user_id]);
                        const group_ids = user_groups.map(g => g.group_id);

                        // 检查用户是否有写权限
                        const has_write_permission = await this.server.databasebackend.drive__check_write_permission(item_attr.id, this.server.session_attr.user_id, group_ids);
                        if (!has_write_permission) return responsetypes.code_403(this.server, "你没有修改此文件的权限。");

                        await this.server.databasebackend.drive__rename_by_id(item_attr.id, r);
                        {
                            const item_attr = await this.server.databasebackend.drive__get_attr(did);

                            await Drive._get_attached_attrs.call(this, [item_attr], ["uploader", "shared", "uploaded_time",]);
                            databasebackends._.drive__ids2dids(item_attr);
                            for (const key of databasebackends._.drive__unnecessary_columns) delete item_attr[key];
                            if (item_attr.type === databasebackends._.drive__item_type.folder) for (const key of databasebackends._.drive__unnecessary_columns_2) delete item_attr[key];

                            return responsetypes.code_200(this.server, JSON.stringify(item_attr));
                        }
                    } else if (r.action === "move") {
                        // 获取用户的群组ID列表
                        const user_groups = await this.server.databasebackend.user_group_set__get_attrs_by_user([this.server.session_attr.user_id]);
                        const group_ids = user_groups.map(g => g.group_id);

                        // 检查用户是否有写权限
                        const has_write_permission = await this.server.databasebackend.drive__check_write_permission(item_attr.id, this.server.session_attr.user_id, group_ids);
                        if (!has_write_permission) return responsetypes.code_403(this.server, "你没有修改此文件的权限。");

                        let parent_did = normalizeId(r.parent_did);
                        let site = r.site;
                        if (!parent_did && (!site || !Drive._valid_sites.includes(site))) return responsetypes.code_400(this.server, requsterror.format_param(r));

                        let parent_item_attr = null;
                        if (parent_did) {
                            parent_item_attr = await this.server.databasebackend.drive__get_attr(parent_did);
                        } else {
                            if (site === Drive._valid_sites[0]) {
                                parent_item_attr = await this.server.databasebackend.drive__get_attr_by_myspace(this.server.session_attr.user_id);
                            } else if (site === Drive._valid_sites[4]) {
                                // parent_item_attr = "root"; // 根目录由服务管理
                            }
                        }
                        if (!parent_item_attr) return responsetypes.code_404(this.server, requsterror.format_param(r));

                        if (parent_item_attr.type !== databasebackends._.drive__item_type.folder) return responsetypes.code_400(this.server, "目标不是文件夹。");

                        await this.server.databasebackend.drive__move_by_id(item_attr.id, parent_item_attr.id);
                        return responsetypes.code_200(this.server, JSON.stringify({}));
                    } else if (r.action === "trash") {
                        // 获取用户的群组ID列表
                        const user_groups = await this.server.databasebackend.user_group_set__get_attrs_by_user([this.server.session_attr.user_id]);
                        const group_ids = user_groups.map(g => g.group_id);

                        // 检查用户是否有写权限
                        const has_write_permission = await this.server.databasebackend.drive__check_write_permission(item_attr.id, this.server.session_attr.user_id, group_ids);
                        if (!has_write_permission) return responsetypes.code_403(this.server, "你没有修改此文件的权限。");

                        await this.server.databasebackend.drive__trash_by_id(item_attr.id,);
                        {
                            const item_attr = await this.server.databasebackend.drive__get_attr(did);

                            await Drive._get_attached_attrs.call(this, [item_attr], ["uploader", "shared", "uploaded_time",]);
                            databasebackends._.drive__ids2dids(item_attr);
                            for (const key of databasebackends._.drive__unnecessary_columns) delete item_attr[key];
                            if (item_attr.type === databasebackends._.drive__item_type.folder) for (const key of databasebackends._.drive__unnecessary_columns_2) delete item_attr[key];

                            return responsetypes.code_200(this.server, JSON.stringify(item_attr));
                        }
                    } else if (r.action === "restore") {
                        // 获取用户的群组ID列表
                        const user_groups = await this.server.databasebackend.user_group_set__get_attrs_by_user([this.server.session_attr.user_id]);
                        const group_ids = user_groups.map(g => g.group_id);

                        // 检查用户是否有写权限
                        const has_write_permission = await this.server.databasebackend.drive__check_write_permission(item_attr.id, this.server.session_attr.user_id, group_ids);
                        if (!has_write_permission) return responsetypes.code_403(this.server, "你没有修改此文件的权限。");

                        await this.server.databasebackend.drive__restore_by_id(item_attr.id,);
                        {
                            const item_attr = await this.server.databasebackend.drive__get_attr(did);

                            await Drive._get_attached_attrs.call(this, [item_attr], ["uploader", "shared", "uploaded_time",]);
                            databasebackends._.drive__ids2dids(item_attr);
                            for (const key of databasebackends._.drive__unnecessary_columns) delete item_attr[key];
                            if (item_attr.type === databasebackends._.drive__item_type.folder) for (const key of databasebackends._.drive__unnecessary_columns_2) delete item_attr[key];

                            return responsetypes.code_200(this.server, JSON.stringify(item_attr));
                        }
                    } else {
                        return responsetypes.code_400(this.server, requsterror.format_type_invalid(r.action));
                    }
                } else if (this.server.req.method === requestmethodtypes.DELETE) {
                    // 获取用户的群组ID列表
                    const user_groups = await this.server.databasebackend.user_group_set__get_attrs_by_user([this.server.session_attr.user_id]);
                    const group_ids = user_groups.map(g => g.group_id);

                    // 检查用户是否有写权限
                    const has_write_permission = await this.server.databasebackend.drive__check_write_permission(item_attr.id, this.server.session_attr.user_id, group_ids);
                    if (!has_write_permission) return responsetypes.code_403(this.server, "你没有修改此文件的权限。");

                    await Drive.item._delete.call(this, item_attr);

                    return responsetypes.code_200(this.server, JSON.stringify({}));
                }
            },

            async _delete(item_attr) {
                if (item_attr.type === databasebackends._.drive__item_type.folder) {
                    const items = await this.server.databasebackend.drive__list_all_by_id(item_attr.id,);
                    for (const item1 of items) {
                        await Drive.item._delete.call(this, item1);
                    }
                }
                await this.server.filestorebackend.remove(databasebackends._.drive__id2did(item_attr.id));
                await this.server.databasebackend.drive__delete_by_id(item_attr.id,);
            },

            async info(args) {
                return responsetypes.code_200(this.server, JSON.stringify(args));
            },

            async down(args) {
                let did = normalizeId(args.did);
                if (!did) return responsetypes.code_400(this.server, requsterror.format_param(args));

                if (this.server.req.method === requestmethodtypes.GET) {
                    return subviews.Drive.item._down.call(this, did);
                }
            },

            async _down(did) {
                const item_attr = await this.server.databasebackend.drive__get_attr(did);
                if (!item_attr) return responsetypes.code_404(this.server, requsterror.format_param(args));

                const etag = this.server.req.headers.get("If-None-Match") || "";
                if (etag === did) return responsetypes.code_304(this.server);

                const data = await this.server.filestorebackend.get(did);

                let rangeHeader = this.server.req.headers.get('Range') || "";
                let {matched, start, end} = parseDownloadRange(rangeHeader, data.length);
                const slicedBinaryData = data.slice(start, end + 1);

                return (matched ? responsetypes.code_206 : responsetypes.code_200)(this.server, slicedBinaryData, {
                    'Content-Type': "application/octet-stream",
                    'Content-Length': slicedBinaryData.length.toString(),
                    'Content-Range': `bytes ${start}-${end}/${data.length}`,

                    // public=允许cdn缓存，private=只浏览器缓存
                    'Cache-Control': `public, max-age=${seconds_of_hours(12)}`, // 设为0可以禁用强缓存，让浏览器每次都验证etag
                    'ETag': did,
                });

            },

            async share(args) {
                let did = normalizeId(args.did);
                if (!did) return responsetypes.code_400(this.server, requsterror.format_param(args));

                const item_attr = await this.server.databasebackend.drive__get_attr(did);
                if (!item_attr) return responsetypes.code_404(this.server, requsterror.format_param(args));

                if (this.server.req.method === requestmethodtypes.GET) {
                    const result = {
                        "any": item_attr.share_any_type,
                        "users": [],
                        "groups": [],
                        "public": item_attr.share_public_type,
                        "public_pass": item_attr.public_pass,
                        "public_expiration": item_attr.public_expiration,
                    };

                    let date = parseToUTC(result.public_expiration);
                    result["public_expiration"] = parseInt(date / 1000);

                    const share_users = await this.server.databasebackend.drive_share_user_set__list_by_item_id(item_attr.id);
                    const user_attrs = await this.server.databasebackend.user__get_attrs_by_id(share_users.map(i => i.user_id));

                    const share_groups = await this.server.databasebackend.drive_share_group_set__list_by_item_id(item_attr.id);
                    const group_attrs = await this.server.databasebackend.group__get_attrs_by_id(share_groups.map(i => i.group_id));

                    for (const shareUser of share_users) {
                        const d = {
                            uid: user_attrs.find((i) => i.id === shareUser.user_id).uid,
                            share_type: shareUser.share_type,
                        };
                        result["users"].push(d);
                    }

                    for (const shareGroup of share_groups) {
                        const d = {
                            gid: group_attrs.find((i) => i.id === shareGroup.group_id).gid,
                            share_type: shareGroup.share_type,
                        };
                        result["groups"].push(d);
                    }

                    return responsetypes.code_200(this.server, JSON.stringify(result));
                } else if (this.server.req.method === requestmethodtypes.PUT) {
                    let r = await this.server.req.json();

                    if (item_attr.uploader !== this.server.session_attr.user_id) return responsetypes.code_403(this.server, "你不是文件的拥有者。");

                    await this.server.databasebackend.drive__change_share_by_id(item_attr.id, r, this.server.session_attr.user_id);

                    {
                        const item_attr = await this.server.databasebackend.drive__get_attr(did);

                        await Drive._get_attached_attrs.call(this, [item_attr], ["uploader", "shared", "uploaded_time",]);
                        databasebackends._.drive__ids2dids(item_attr);
                        for (const key of databasebackends._.drive__unnecessary_columns) delete item_attr[key];
                        if (item_attr.type === databasebackends._.drive__item_type.folder) for (const key of databasebackends._.drive__unnecessary_columns_2) delete item_attr[key];

                        return responsetypes.code_200(this.server, JSON.stringify(item_attr));
                    }
                }

            },

            async resolve(args) {
                if (this.server.req.method === requestmethodtypes.GET) {
                    let did = normalizeId(args.did);
                    if (!did) return responsetypes.code_400(this.server, requsterror.format_param(args));

                    const result = {tree: undefined,}

                    const attr = await this.server.databasebackend.drive__get_attr(did);
                    if (!attr) return responsetypes.code_400(this.server, requsterror.format_param(args));

                    const tree = {};
                    Object.assign(tree, attr,);
                    if (tree.type === databasebackends._.drive__item_type.folder) tree.children = await Drive.item._resolve.call(this, tree);

                    const items = [tree,];
                    const func = item => {
                        items.push(item);
                        if (item.type === databasebackends._.drive__item_type.folder) item.children.map(func);
                    };
                    if (tree.type === databasebackends._.drive__item_type.folder) tree.children.map(func);

                    await Drive._get_attached_attrs.call(this, items, ["uploader", "shared", "uploaded_time",]);
                    databasebackends._.drive__ids2dids(items);
                    for (const item of items) {
                        for (const key of databasebackends._.drive__unnecessary_columns) delete item[key];
                        if (item.type === databasebackends._.drive__item_type.folder) for (const key of databasebackends._.drive__unnecessary_columns_2) delete item[key];
                        for (const key of databasebackends._.drive__unnecessary_columns_3) delete item[key];
                    }

                    result.tree = tree;
                    return responsetypes.code_200(this.server, JSON.stringify(result));

                }
            },

            async _resolve(tree) {
                let items = await this.server.databasebackend.drive__list_by_id(tree.id,);
                items = items.filter(i => !i.trashed);
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type === databasebackends._.drive__item_type.folder) item.children = await Drive.item._resolve.call(this, item);
                }
                return items;
            },

        }

        static shared = {
            folder: {
                async info(args) {
                    return responsetypes.code_200(this.server, JSON.stringify(args));
                },

                async new(args) {
                    return responsetypes.code_200(this.server, JSON.stringify(args));
                },
            },

            file: {
                async info(args) {
                    return responsetypes.code_200(this.server, JSON.stringify(args));
                },

                async down(args) {
                    return responsetypes.code_200(this.server, JSON.stringify(args));
                },
            },


        }
    }

    // 候选词数据常量（结构化格式）
    const COMMON_PHRASES = [
        {
            category: "日常聊天",
            items: ["好的","在吗","在","不在","有事吗？","有事找你","是的","不是","拜拜","我下线了","🔥特急！","有时间吗？", "没时间","你好","有急事找你", "有事请留言", "会","不会"]
        },
        {
            category: "表情：办公/学习",
            items: ["💼","📁","📂","🗂️","📅","📝","📊","📈","📉","📌","📎","🖇️","✂️","📏","📐","🖊️","🖋️","✒️","🖌️","🖍️"]
        }
    ];

    class Chat extends _ {
        constructor(server) {
            super(server);
        }

        static online_status = {
            offline: 0, online: 1,
        }

        static async contacts(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                const params = await this.server.requrl.searchParams;

                const user_attr = await this.server.databasebackend.user__get_attr_by_id(this.server.session_attr.user_id);

                const {
                    result: result__contacts_users, user_contact_group_attrs
                } = await Me._contacts_users.call(this, user_attr,);
                const {
                    result: result_contacts_groups, user_contact_group_attrs: _
                } = await Me._contacts_groups.call(this, user_attr, user_contact_group_attrs);

                const {
                    result: result_contacted_users, user_attrs
                } = await Me._contacted_users.call(this, user_attr,);
                const result_contacted_groups = await Me._contacted_groups.call(this, user_attr, user_attrs);

                const result = [];
                const uids = [];
                const gids = [];

                result__contacts_users.forEach(i => {
                    if (uids.includes(i.uid)) return;
                    uids.push(i.uid);
                    i.type = databasebackends._.chat_message__receiver_type.user;
                    result.push(i);
                });
                result_contacts_groups.forEach(i => {
                    if (gids.includes(i.gid)) return;
                    gids.push(i.gid);
                    i.type = databasebackends._.chat_message__receiver_type.group;
                    result.push(i);
                });
                result_contacted_users.forEach(i => {
                    if (uids.includes(i.uid)) return;
                    uids.push(i.uid);
                    i.type = databasebackends._.chat_message__receiver_type.user;
                    result.push(i);
                });
                result_contacted_groups.forEach(i => {
                    if (gids.includes(i.gid)) return;
                    gids.push(i.gid);
                    i.type = databasebackends._.chat_message__receiver_type.group;
                    result.push(i);
                });

                // 上面是我能联系的组/哪些组能联系我，这可能不包含自己的某些所属组，所以这里额外加下。
                // 这种情况：A(1,2)，1和2都可以在A里群聊，但他们之间不能私聊，如要私聊的话，就为他们设置允许主动联系A组或特定用户。
                const ug_attrs = await this.server.databasebackend.user_group_set__get_attrs_by_user([this.server.session_attr.user_id,]);
                const ug_group_attrs = await this.server.databasebackend.group__get_attrs_by_id(ug_attrs.map(i => i.group_id));
                ug_group_attrs.forEach(i => {
                    if (gids.includes(i.gid)) return;
                    gids.push(i.gid);
                    i.type = databasebackends._.chat_message__receiver_type.group;
                    result.push(i);
                });

                result.sort((a, b) => {
                    const aKey = a.uid || a.gid;
                    const bKey = b.uid || b.gid;
                    if (aKey.localeCompare) return aKey.localeCompare(bKey, 'en', {sensitivity: 'base'});
                    return aKey > bKey ? 1 : aKey < bKey ? -1 : 0;
                });

                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }


        static template__status = {
            online_count: 0, // int
            online_status: Chat.online_status.offline, // enum
            last_message_time: 0, // int
            read_message_id: null,// null | int
            unread_count: 0, // int
            editions: null, // list
            edition_id: null, // int
            activities: null, // list
        }

        static fill_status(d, i, user_attr, user_attrs, ug_user_attrs) {
            if (i.msgs.length > 0) d.last_message_time = parseInt(parseToUTC(i.msgs.at(-1).sent_time) / 1000);

            let unread_msgs = [];
            const read_progress = i.read_progresses.length > 0 ? i.read_progresses.at(-1) : null;
            if (read_progress === null) {
                unread_msgs.push(...i.msgs);
            } else {
                unread_msgs.push(...(i.msgs.filter(j => j.id > read_progress.message_id)));
                d.read_message_id = read_progress.message_id;
            }
            unread_msgs = unread_msgs.filter(j => j.sender !== user_attr.id);
            d.unread_count = unread_msgs.length;

            if (i.editions.length > 0) {
                d.edition_id = i.editions.at(-1).ceid;
                i.editions.forEach(j => d.editions.push(j.message_id));
            }

            const reset_activity_users = [];
            d.activities = i.activities.reduce((arr, cur) => {
                const ac = {
                    type: cur.type, sender: cur.sender,
                };

                if (reset_activity_users.includes(ac.sender)) return arr;
                if (ac.type === databasebackends._.chat_activity__type.none) reset_activity_users.push(ac.sender);

                const found = arr.some(item => {
                    return item.type === ac.type && item.sender === ac.sender;
                });
                if (!found) arr.push(ac);
                return arr;
            }, []);
            d.activities.forEach(j => {
                let ua;
                if (j.sender === user_attr.id) ua = user_attr;
                if (!ua) ua = user_attrs.find(k => k.id === j.sender);
                if (!ua) ua = ug_user_attrs.find(k => k.id === j.sender);
                j.sender = ua.uid;
            });
            d.activities = d.activities.filter(j => j.type !== databasebackends._.chat_activity__type.none);

        }


        static async _get_status(r, user_attr) {
            // 如果 user_attr 为空,才查询(避免重复查询)
            if (!user_attr) {
                user_attr = await this.server.databasebackend.user__get_attr_by_id(this.server.session_attr.user_id);
            }
            
            const user_attrs = await this.server.databasebackend.user__get_attrs(Object.keys(r.uids));
            const user_ids = user_attrs.map(i => i.id);
            const group_attrs = await this.server.databasebackend.group__get_attrs(Object.keys(r.gids));
            const group_ids = group_attrs.map(i => i.id);
            user_attrs.forEach(i => {
                i.msgs = [];
                i.read_progresses = [];
                i.editions = [];
                i.activities = [];
            });
            group_attrs.forEach(i => {
                i.msgs = [];
                i.read_progresses = [];
                i.editions = [];
                i.activities = [];
            });

            // 只在有群组时才查询群组成员
            let ug_items_by_groups = [];
            let ug_user_ids = [];
            let ug_user_attrs = [];
            if (group_ids.length > 0) {
                ug_items_by_groups = await this.server.databasebackend.user__list_who_chat_together(group_ids);
                ug_user_ids = ug_items_by_groups.reduce((arr, cur) => {
                    if (!arr.includes(cur.user_id)) arr.push(cur.user_id);
                    return arr;
                }, []);
                if (ug_user_ids.length > 0) {
                    ug_user_attrs = await this.server.databasebackend.user__get_attrs_by_id(ug_user_ids);
                }
            }

            await this.server.databasebackend.session__renew_by_id(this.server.session_attr.id);
            const session_attrs = await this.server.databasebackend.session__get_attrs_by_user_id__recent([...user_ids, ...ug_user_ids,], 30);

            // ============================================================================
            // FIX: Implement STRICTLY SERIAL batch loading to prevent concurrent API calls
            // 
            // Problem: "Too many API requests" errors caused by concurrent API calls
            // - The previous implementation allowed multiple batches to load in parallel
            // - History loading and auto-sync were running concurrently
            // 
            // Solution: Strictly serial execution with proper delays
            // - maxConcurrent = 1 (strictly serial, only 1 request at a time)
            // - Batch delay between requests (150ms) to let D1 API recover
            // - Mutex between loading and sync operations
            // - Optimized config parameters
            // ============================================================================
            
            // Configuration - OPTIMIZED to prevent API limit errors
            const MESSAGE_LOAD_CONFIG = {
                INITIAL_LIMIT: 30,          // Reduced from 50 to 30 for safety
                MAX_LIMIT: 50,             // Reduced from 100 to 50
                MIN_LIMIT: 10,             // Minimum limit when dynamically adjusting
                MAX_TOTAL_MESSAGES: 2000,  // Cap at 2000 messages
                MAX_RETRIES: 3,           // Reduced from 5 to 3
                RETRY_DELAY: 500,          // Delay between retries
                BATCH_DELAY: 150,          // Delay between batches (CRITICAL!)
                MAX_BATCHES: 100,         // Safety limit
                REDUCTION_FACTOR: 0.7,     // Reduce by 30% on error
                CONSECUTIVE_EMPTY_LIMIT: 2 // Stop after 2 consecutive empty results
            };

            // Global flags for mutex between loading and sync operations
            // Note: These are module-level, shared across requests in same worker
            if (typeof globalThis.__chatLoadingMutex === 'undefined') {
                globalThis.__chatLoadingMutex = {
                    isLoadingHistory: false,
                    isSyncing: false
                };
            }
            const mutex = globalThis.__chatLoadingMutex;
            
            // Wait helper function
            const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // Set loading flag (with error handling - always release in finally)
            const setLoadingFlag = () => {
                if (mutex.isLoadingHistory) {
                    console.warn('[消息加载] 检测到已有加载任务在进行中，跳过锁获取');
                }
                mutex.isLoadingHistory = true;
            };

            // Clear loading flag
            const clearLoadingFlag = () => {
                mutex.isLoadingHistory = false;
            };

            // Wait if sync is in progress (mutex between loading and sync)
            const waitForSyncComplete = async () => {
                let attempts = 0;
                while (mutex.isSyncing && attempts < 10) {
                    console.log('[消息加载] 等待同步完成...');
                    await wait(300);
                    attempts++;
                }
            };

            // State variables for STRICTLY SERIAL pagination
            let all_messages = [];
            let current_offset = 0;
            let current_limit = MESSAGE_LOAD_CONFIG.INITIAL_LIMIT;
            let total_batches_loaded = 0;
            let retry_count = 0;
            let consecutive_empty_results = 0;
            let has_more_messages = true;

            // ============================================================================
            // Error Classification & Detection
            // ============================================================================
            
            /**
             * Classifies error type based on error message pattern
             */
            const classifyError = (error) => {
                if (!error || !error.message) {
                    return { type: 'UNKNOWN', retryable: false };
                }
                const msg = error.message.toLowerCase();
                
                if (msg.includes('too many api requests')) {
                    return { type: 'API_REQUEST_LIMIT_EXCEEDED', retryable: true };
                }
                if (msg.includes('timeout') || msg.includes('duration') || msg.includes('exceeded')) {
                    return { type: 'DATABASE_TIMEOUT', retryable: true };
                }
                if (msg.includes('network') || msg.includes('connection') || msg.includes('fetch')) {
                    return { type: 'NETWORK_ERROR', retryable: true };
                }
                if (msg.includes('authentication') || msg.includes('permission') || msg.includes('not found')) {
                    return { type: 'UNRECOVERABLE_ERROR', retryable: false };
                }
                return { type: 'UNKNOWN', retryable: false };
            };
            
            /**
             * Dynamically adjusts limit to avoid repeated API limit errors
             * Reduces limit by 30%, with minimum floor of 10
             */
            const adjustLimitOnError = (currentLimit) => {
                const reduced = Math.floor(currentLimit * MESSAGE_LOAD_CONFIG.REDUCTION_FACTOR);
                return Math.max(reduced, MESSAGE_LOAD_CONFIG.MIN_LIMIT);
            };

            // ============================================================================
            // Main STRICTLY SERIAL Batch Loading Loop
            // Key: Only ONE request at a time, with delays between batches
            // ============================================================================
            
            // Acquire loading lock first
            setLoadingFlag();
            
            // Ensure we wait for any in-progress sync to complete
            await waitForSyncComplete();
            
            console.log('[消息加载] 开始加载，初始limit=' + current_limit + ', max=' + MESSAGE_LOAD_CONFIG.MAX_TOTAL_MESSAGES);

            try {
                while (has_more_messages && 
                       current_offset < MESSAGE_LOAD_CONFIG.MAX_TOTAL_MESSAGES && 
                       total_batches_loaded < MESSAGE_LOAD_CONFIG.MAX_BATCHES) {
                    
                    // Check consecutive empty results limit
                    if (consecutive_empty_results >= MESSAGE_LOAD_CONFIG.CONSECUTIVE_EMPTY_LIMIT) {
                        console.log('[消息加载] 连续' + consecutive_empty_results + '次空结果，停止加载');
                        break;
                    }

                    let batch_load_successful = false;
                    let batch_retry_count = 0;

                    // STRICTLY SERIAL: Each batch waits for previous to complete
                    while (!batch_load_successful && batch_retry_count < MESSAGE_LOAD_CONFIG.MAX_RETRIES) {
                        try {
                            console.log('[消息加载] 请求批次 ' + (total_batches_loaded + 1) + 
                                        ', offset=' + current_offset + 
                                        ', limit=' + current_limit);
                            
                            // CRITICAL: Only ONE request at a time - NO Promise.all!
                            const batch_messages = await this.server.databasebackend.chat_message__get_msgs_to_me(
                                user_attr, user_ids, group_ids, true, current_limit, current_offset
                            );
                            
                            // Process successful batch
                            if (batch_messages && batch_messages.length > 0) {
                                all_messages = all_messages.concat(batch_messages);
                                current_offset += batch_messages.length;
                                total_batches_loaded++;
                                batch_load_successful = true;
                                consecutive_empty_results = 0; // Reset counter
                                
                                console.log('[消息加载] 批次成功，获取 ' + batch_messages.length + 
                                            ' 条消息，累计 ' + all_messages.length + ' 条');
                                
                                // Check termination: if we got fewer than requested, we're done
                                if (batch_messages.length < current_limit) {
                                    has_more_messages = false;
                                    console.log('[消息加载] 已到达消息末尾');
                                }
                            } else {
                                // Empty result
                                consecutive_empty_results++;
                                console.log('[消息加载] 空结果 #' + consecutive_empty_results);
                                has_more_messages = false;
                                batch_load_successful = true;
                            }
                            
                        } catch (error) {
                            // Error handling with classification
                            const errorInfo = classifyError(error);
                            
                            if (errorInfo.retryable) {
                                batch_retry_count++;
                                retry_count++;
                                
                                console.warn('[消息加载] 错误: ' + errorInfo.type + 
                                            ', 重试 ' + batch_retry_count + '/' + MESSAGE_LOAD_CONFIG.MAX_RETRIES);
                                
                                if (batch_retry_count < MESSAGE_LOAD_CONFIG.MAX_RETRIES) {
                                    // Dynamic limit adjustment on API limit errors
                                    if (errorInfo.type === 'API_REQUEST_LIMIT_EXCEEDED') {
                                        const oldLimit = current_limit;
                                        current_limit = adjustLimitOnError(current_limit);
                                        console.warn('[消息加载] API限制: limit从' + oldLimit + '降至' + current_limit);
                                    }
                                    
                                    // Wait before retry - exponential backoff
                                    const delay = Math.min(
                                        MESSAGE_LOAD_CONFIG.RETRY_DELAY * batch_retry_count,
                                        2000
                                    );
                                    console.log('[消息加载] 等待 ' + delay + 'ms 后重试...');
                                    await wait(delay);
                                } else {
                                    console.error('[消息加载] 批次加载失败，已达最大重试次数');
                                    has_more_messages = false;
                                    batch_load_successful = true; // Graceful exit
                                }
                            } else {
                                // Non-retryable error - 只打印不抛出，避免前端弹窗
                                console.error('[消息加载] 不可恢复错误: ' + error.message);
                                // 不抛出错误，继续执行
                            }
                        }
                    }

                    // CRITICAL: Delay between batches to let D1 API recover
                    // This is essential to prevent "Too many API requests" errors
                    if (has_more_messages) {
                        console.log('[消息加载] 批次间隔等待 ' + MESSAGE_LOAD_CONFIG.BATCH_DELAY + 'ms...');
                        await wait(MESSAGE_LOAD_CONFIG.BATCH_DELAY);
                    }
                }
            } finally {
                clearLoadingFlag();
            }
            
            // ============================================================================
            // Result Assignment
            // ============================================================================
            
            const msgs = all_messages;
            console.log('[消息加载] 完成! 共 ' + msgs.length + ' 条消息, ' + 
                        total_batches_loaded + ' 批次, ' + retry_count + ' 次重试');
            msgs.forEach(msg => {
                if (msg.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                    if (msg.sender === user_attr.id) {
                        user_attrs.find(i => i.id === msg.receiver_user_id).msgs.push(msg);
                    } else {
                        user_attrs.find(i => i.id === msg.sender).msgs.push(msg);
                    }
                } else if (msg.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                    group_attrs.find(i => i.id === msg.receiver_group_id).msgs.push(msg);
                }
            });

            const read_progresses = await this.server.databasebackend.chat_read_progress__get_records_mine(user_attr, user_ids, group_ids);
            read_progresses.forEach(rp => {
                if (rp.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                    user_attrs.find(i => i.id === rp.receiver_user_id).read_progresses.push(rp);
                } else if (rp.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                    group_attrs.find(i => i.id === rp.receiver_group_id).read_progresses.push(rp);
                }
            });

            const editions = await this.server.databasebackend.chat_edition__get_records_to_me(user_attr, user_ids, group_ids);
            editions.forEach(ce => {
                if (ce.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                    let ua;
                    if (ce.sender === user_attr.id) {
                        ua = user_attrs.find(i => i.id === ce.receiver_user_id);
                    } else {
                        ua = user_attrs.find(i => i.id === ce.sender);
                    }
                    const _ceid = r.uids[ua.uid].ceid;
                    if (_ceid === null || ce.ceid > _ceid) ua.editions.push(ce);
                } else if (ce.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                    const ga = group_attrs.find(i => i.id === ce.receiver_group_id);
                    const _ceid = r.gids[ga.gid].ceid;
                    if (_ceid === null || ce.ceid > _ceid) ga.editions.push(ce);
                }
            });

            const activities = await this.server.databasebackend.chat_activity__get_records_to_me__recent(user_attr, user_ids, group_ids, 10);
            activities.forEach(ca => {
                if (ca.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                    let ua;
                    if (ca.sender === user_attr.id) {
                        ua = user_attrs.find(i => i.id === ca.receiver_user_id);
                    } else {
                        ua = user_attrs.find(i => i.id === ca.sender);
                    }
                    ua.activities.push(ca);
                } else if (ca.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                    const ga = group_attrs.find(i => i.id === ca.receiver_group_id);
                    ga.activities.push(ca);
                }
            });

            // 查询置顶状态(使用参数化查询,避免 SQL 注入)
            const pin_records = await this.server.databasebackend.exec_sql(
                `SELECT * FROM chat_pin WHERE user_id = ?`,
                [user_attr.id]
            );
            pin_records.forEach(pin => {
                if (pin.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                    const ua = user_attrs.find(i => i.id === pin.receiver_user_id);
                    if (ua && !ua.editions.includes(-999999)) {
                        ua.editions.push(-999999);
                    }
                } else if (pin.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                    const ga = group_attrs.find(i => i.id === pin.receiver_group_id);
                    if (ga && !ga.editions.includes(-999999)) {
                        ga.editions.push(-999999);
                    }
                }
            });

            const result = [];

            user_attrs.forEach(i => {
                const d = {...Chat.template__status};
                delete d.online_count;
                d.editions = [...i.editions]; // 复制 editions 数组（包含置顶状态）
                d.activities = [];

                d.type = databasebackends._.chat_message__receiver_type.user;
                d.uid = i.uid;

                const session_attr = session_attrs.find(j => !j.closed && j.user_id === i.id);
                if (session_attr) d.online_status = Chat.online_status.online;

                Chat.fill_status.call(this, d, i, user_attr, user_attrs, ug_user_attrs);

                result.push(d);
            });

            group_attrs.forEach(i => {
                const d = {...Chat.template__status};
                delete d.online_status;
                d.editions = [...i.editions]; // 复制 editions 数组（包含置顶状态）
                d.activities = [];

                d.type = databasebackends._.chat_message__receiver_type.group;
                d.gid = i.gid;

                const g_user_ids = ug_items_by_groups.filter(j => j.group_id === i.id).map(j => j.user_id);
                const ug_session_attrs = session_attrs.filter(j => !j.closed && g_user_ids.includes(j.user_id));
                const ug_session_attrs__user_ids = [];
                for (const ugSessionAttr of ug_session_attrs) {
                    const ug_user_attr = ug_user_attrs.find(i => i.id === ugSessionAttr.user_id);
                    if (!ug_session_attrs__user_ids.includes(ug_user_attr.id)) {
                        ug_session_attrs__user_ids.push(ug_user_attr.id);
                    }
                }
                d.online_count = ug_session_attrs__user_ids.length;

                Chat.fill_status.call(this, d, i, user_attr, user_attrs, ug_user_attrs);

                result.push(d);
            });

            return {sync_results: result, msgs_to_me: msgs, read_progresses,};
        }


        static async _action__sync(r) {
            // 同步操作互斥锁 - 防止与历史消息加载并发
            const mutex = globalThis.__chatLoadingMutex || { isLoadingHistory: false, isSyncing: false };
            
            // 等待历史消息加载完成
            let waitAttempts = 0;
            while (mutex.isLoadingHistory && waitAttempts < 10) {
                console.log('[同步] 等待历史消息加载完成...');
                await new Promise(resolve => setTimeout(resolve, 300));
                waitAttempts++;
            }
            
            // 设置同步中标志
            if (!mutex.isSyncing) {
                mutex.isSyncing = true;
            }
            
            try {
                const {sync_results,} = await Chat._get_status.call(this, r);
                return sync_results;
            } finally {
                mutex.isSyncing = false;
                console.log('[同步] 同步完成');
            }
        }

        static async sync(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                // HTTP 轮询同步也需要互斥锁，防止与 WebSocket sync 并发
                const mutex = globalThis.__chatLoadingMutex || { isLoadingHistory: false, isSyncing: false };
                
                // 等待历史消息加载完成
                let waitAttempts = 0;
                while (mutex.isLoadingHistory && waitAttempts < 10) {
                    console.log('[HTTP同步] 等待历史消息加载完成...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    waitAttempts++;
                }
                
                // 如果已有同步在进行，等待
                while (mutex.isSyncing && waitAttempts < 10) {
                    console.log('[HTTP同步] 等待其他同步完成...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    waitAttempts++;
                }
                
                mutex.isSyncing = true;
                
                try {
                    const r = await this.server.req.json();
                    const result = await Chat._action__sync.call(this, r);
                    return responsetypes.code_200(this.server, JSON.stringify(result));
                } finally {
                    mutex.isSyncing = false;
                    console.log('[HTTP同步] 完成');
                }
            }
        }

        static async _get_status_for_one(r, user_attr, receiver_attr) {
            if (!receiver_attr) {
                return {sync_result: null, sync_results: [], msgs_to_me: [], read_progresses: []};
            }
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                r.uids = {}
                r.gids = {
                    [receiver_attr.gid]: {
                        ceid: r.ceid,
                    },
                }
                const {
                    sync_results, msgs_to_me, read_progresses,
                } = await Chat._get_status.call(this, r, user_attr);
                return {sync_result: sync_results[0], sync_results, msgs_to_me, read_progresses,};
            } else {
                r.uids = {
                    [receiver_attr.uid]: {
                        ceid: r.ceid,
                    },
                }
                r.gids = {}
                const {
                    sync_results, msgs_to_me, read_progresses,
                } = await Chat._get_status.call(this, r, user_attr);
                return {sync_result: sync_results[0], sync_results, msgs_to_me, read_progresses,};
            }
        }

        static async _get_receiver_and_user_attr(r) {
            let receiver_attr;
            
            // 先查询当前用户属性(避免后续重复查询)
            const user_attr = await this.server.databasebackend.user__get_attr_by_id(this.server.session_attr.user_id);
            if (!user_attr) return responsetypes.code_401(this.server, "当前用户会话无效，请重新登录", {}, false);

            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                // 支持数字 ID 和字符串 gid
                const gid = normalizeId(r.gid);
                if (!gid) return responsetypes.code_400(this.server, "群组 ID (gid) 不能为空");
                
                // 优化: 先尝试作为 gid 查询,如果失败且是数字,再尝试作为 ID 查询
                receiver_attr = await this.server.databasebackend.group__get_attr(gid);
                if (!receiver_attr && !isNaN(gid)) {
                    const group_attrs = await this.server.databasebackend.group__get_attrs_by_id([parseInt(gid)]);
                    if (group_attrs.length > 0) receiver_attr = group_attrs[0];
                }
                if (!receiver_attr) return responsetypes.code_400(this.server, `群组不存在：${gid}`);
            } else {
                const uid = normalizeId(r.uid);
                if (!uid) return responsetypes.code_400(this.server, "用户 ID (uid) 不能为空");
                receiver_attr = await this.server.databasebackend.user__get_attr(uid);
                if (!receiver_attr) return responsetypes.code_400(this.server, `用户不存在：${uid}`);
            }

            return {receiver_attr, user_attr,};
        }

        // 辅助函数：获取 receiver 和 user attr，并检查是否返回了错误响应
        static async _get_receiver_and_user_attr_checked(server, r) {
            const result = await subviews.Chat._get_receiver_and_user_attr.call(server, r);
            if (result instanceof Response) {
                return result;
            }
            return result;
        }

        static async _action__sync_one(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const {sync_result,} = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            return sync_result;
        }

        static async sync_one(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                // HTTP 轮询同步也需要互斥锁
                const mutex = globalThis.__chatLoadingMutex || { isLoadingHistory: false, isSyncing: false };
                
                let waitAttempts = 0;
                while (mutex.isLoadingHistory && waitAttempts < 10) {
                    console.log('[HTTP同步_one] 等待历史消息加载完成...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    waitAttempts++;
                }
                while (mutex.isSyncing && waitAttempts < 10) {
                    console.log('[HTTP同步_one] 等待其他同步完成...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    waitAttempts++;
                }
                
                mutex.isSyncing = true;
                
                try {
                    const r = await this.server.req.json();
                    const result = await Chat._action__sync_one.call(this, r);
                    return responsetypes.code_200(this.server, JSON.stringify(result));
                } finally {
                    mutex.isSyncing = false;
                    console.log('[HTTP同步_one] 完成');
                }
            }
        }

        static async _action__act(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            await this.server.databasebackend.chat_activity__record(user_attr.id, r.activity_type, r.contact_type, receiver_attr);

            const {sync_result,} = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            return sync_result;
        }

        static async act(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__act.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async members(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                const params = await this.server.requrl.searchParams;

                const contact_type = parseInt(params.get("contact_type"));
                if (!form_field_checker.ffc_int(contact_type)) return responsetypes.code_400(this.server, requsterror.format_param(params));

                const result = {
                    online_count: 0, users: [],
                };

                let receiver_attr;
                if (contact_type === databasebackends._.chat_message__receiver_type.group) {
                    const gid = normalizeId(params.get("gid"));
                    if (!gid) return responsetypes.code_400(this.server, requsterror.format_param(params));
                    receiver_attr = await this.server.databasebackend.group__get_attr(gid);
                    if (!receiver_attr) return responsetypes.code_400(this.server, requsterror.format_param(params));

                    const ug_items_by_groups = await this.server.databasebackend.user__list_who_chat_together([receiver_attr.id,]);
                    const ug_user_ids = ug_items_by_groups.reduce((arr, cur) => {
                        if (!arr.includes(cur.user_id)) arr.push(cur.user_id);
                        return arr;
                    }, []);
                    const ug_user_attrs = await this.server.databasebackend.user__get_attrs_by_id(ug_user_ids);

                    const session_attrs = await this.server.databasebackend.session__get_attrs_by_user_id__recent([...ug_user_ids,], 30);

                    const g_user_ids = ug_items_by_groups.filter(j => j.group_id === receiver_attr.id).map(j => j.user_id);
                    const ug_session_attrs = session_attrs.filter(j => !j.closed && g_user_ids.includes(j.user_id));
                    const ug_session_attrs__user_ids = [];
                    for (const ugSessionAttr of ug_session_attrs) {
                        const ug_user_attr = ug_user_attrs.find(i => i.id === ugSessionAttr.user_id);
                        if (!ug_session_attrs__user_ids.includes(ug_user_attr.id)) {
                            ug_session_attrs__user_ids.push(ug_user_attr.id);
                            const d = {
                                "uid": ug_user_attr.uid, status: Chat.online_status.online,
                            };
                            result.users.push(d);
                        }
                    }
                    result.online_count = ug_session_attrs__user_ids.length;

                    g_user_ids.forEach(g_user_id => {
                        if (!ug_session_attrs__user_ids.includes(g_user_id)) {
                            ug_session_attrs__user_ids.push(g_user_id);
                            const d = {
                                "uid": ug_user_attrs.find(i => i.id === g_user_id).uid, // status: Chat.online_status.offline,
                            };
                            result.users.push(d);
                        }
                    });
                } else {
                    // 私聊模式
                    const uid = normalizeId(params.get("uid"));
                    if (!uid) return responsetypes.code_400(this.server, requsterror.format_param(params));
                    receiver_attr = await this.server.databasebackend.user__get_attr(uid);
                    if (!receiver_attr) return responsetypes.code_400(this.server, requsterror.format_param(params));

                    // 私聊只显示对方的在线状态
                    const session_attrs = await this.server.databasebackend.session__get_attrs_by_user_id__recent([receiver_attr.id,], 30);
                    const online_session = session_attrs.find(j => !j.closed && j.user_id === receiver_attr.id);
                    
                    if (online_session) {
                        result.online_count = 1;
                        result.users.push({
                            "uid": receiver_attr.uid, status: Chat.online_status.online,
                        });
                    } else {
                        result.online_count = 0;
                        result.users.push({
                            "uid": receiver_attr.uid, // status: Chat.online_status.offline,
                        });
                    }
                }

                return responsetypes.code_200(this.server, JSON.stringify(result));

            }
        }

        static async _send(args, r, file,) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            if (databasebackends._.chat_message__type_checker.is_drive_item(r.type)) {
                const total_size = (await this.server.databasebackend.drive__get_usages_by_user_id([user_attr.id,])).reduce((arr, cur) => {
                    return arr + cur.total_size;
                }, 0);
                if ((total_size + r.file_attr.size) / 1024 / 1024 > user_attr.free_space) {
                    return {error: `你的可用空间不足，无法上传，总空间：${user_attr.free_space} MB，已用空间：${format_bytes(total_size)}。`};
                }
            }

            const result = {
                message_attr: null,  // dict
                previous_message_id: null, // id | null
                sync: null, // dict
            };

            let message_id;
            let drive_item_id;
            const check_message = await this.server.databasebackend.chat_message__get_attr_by_sender_rand(r.sender_rand);
            if (check_message) {
                message_id = check_message.id;

                // 确保下已关联
                if (databasebackends._.chat_message__type_checker.is_drive_item(r.type)) {
                    const relate_attr = await this.server.databasebackend.chat_message_data_spec__get_attr_by_message_id(message_id);
                    if (relate_attr === null) {
                        const fileData = await file.arrayBuffer();
                        drive_item_id = await this.server.databasebackend.drive__new_attachment(r.file_attr, this.server.session_attr.user_id);
                        await this.server.filestorebackend.put(databasebackends._.drive__id2did(drive_item_id), new Uint8Array(fileData));
                        await this.server.databasebackend.drive__change_attr_uploaded_by_id(drive_item_id);

                        if (databasebackends._.chat_message__type_checker.is_image(r.type)) {
                            await this.server.databasebackend.chat_message_data_spec__relate_by_image(message_id, drive_item_id, r.image_attr);
                        } else if (databasebackends._.chat_message__type_checker.is_file(r.type)) {
                            await this.server.databasebackend.chat_message_data_spec__relate_by_file(message_id, drive_item_id);
                        }
                    }
                }

                result.message_attr = check_message;
            } else {

                // 存文件
                if (databasebackends._.chat_message__type_checker.is_drive_item(r.type)) {
                    const fileData = await file.arrayBuffer();
                    drive_item_id = await this.server.databasebackend.drive__new_attachment(r.file_attr, this.server.session_attr.user_id);
                    await this.server.filestorebackend.put(databasebackends._.drive__id2did(drive_item_id), new Uint8Array(fileData));
                    await this.server.databasebackend.drive__change_attr_uploaded_by_id(drive_item_id);
                }

                message_id = await this.server.databasebackend.chat_message__new(user_attr, r.contact_type, receiver_attr, r);

                // 关联文件
                if (databasebackends._.chat_message__type_checker.is_image(r.type)) {
                    await this.server.databasebackend.chat_message_data_spec__relate_by_image(message_id, drive_item_id, r.image_attr);
                } else if (databasebackends._.chat_message__type_checker.is_file(r.type)) {
                    await this.server.databasebackend.chat_message_data_spec__relate_by_file(message_id, drive_item_id);
                }

                result.message_attr = await this.server.databasebackend.chat_message__get_attr(message_id);
            }

            await Chat._get_attached_attrs.call(this, [result.message_attr,],);

            const {
                sync_result, msgs_to_me,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            const msgs_of_this_flow = [];
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                // const msgs = await this.server.databasebackend.chat_message__get_msgs_to_me(user_attr, [], [receiver_attr.id,], true);
                msgs_to_me.forEach(msg => {
                    if (msg.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                        msgs_of_this_flow.push(msg);
                    }
                });
            } else {
                // const msgs = await this.server.databasebackend.chat_message__get_msgs_to_me(user_attr, [receiver_attr.id,], [], true);
                msgs_to_me.forEach(msg => {
                    if (msg.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                        msgs_of_this_flow.push(msg);
                    }
                });
            }
            let found_this_msg = false;
            for (let i = msgs_of_this_flow.length - 1; i > -1; i--) {
                const msg = msgs_of_this_flow[i];
                if (msg.id === message_id) {
                    found_this_msg = true;
                    continue;
                }
                if (found_this_msg) {
                    result.previous_message_id = msg.id;
                    break;
                }
            }

            // result.sync = (await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr)).sync_result;

            return result;
        }

        static async _action__send(r, args) {
            return await subviews.Chat._send.call(this, args, r, null);
        }

        static async send(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__send.call(this, r, args);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async send_file(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const formData = await this.server.req.formData();
                const file = formData.get("file");
                const metadataRaw = formData.get("metadata");
                const r = JSON.parse(metadataRaw);

                const result = await subviews.Chat._send.call(this, args, r, file);
                if (result.error !== undefined) return responsetypes.code_409(this.server, result.error);

                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async download(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                // const params = await this.server.requrl.searchParams;
                // let message_id = params.get("id");
                let message_id = args.message_id;
                if (!form_field_checker.ffc_string_int(message_id)) return responsetypes.code_400(this.server, requsterror.format_param(args));
                message_id = parseInt(message_id);
                if (!form_field_checker.ffc_int(message_id)) return responsetypes.code_400(this.server, requsterror.format_param(args));
                const message_attr = await this.server.databasebackend.chat_message__get_attr(message_id);
                if (!message_attr) return responsetypes.code_404(this.server, requsterror.format_param(args));
                const data_spec_attr = await this.server.databasebackend.chat_message_data_spec__get_attr_by_message_id(message_id);
                if (!data_spec_attr || !data_spec_attr.drive_item_id || !databasebackends._.chat_message__type_checker.is_drive_item(message_attr.type)) {
                    return responsetypes.code_400(this.server, "目标消息不包含文件。");
                }

                const did = databasebackends._.drive__id2did(data_spec_attr.drive_item_id);

                return subviews.Drive.item._down.call(this, did);
            }
        }

        static async _get_attached_attrs(d, needed = []) {
            d.forEach((i) => {
                delete i.revoked_time;

                delete i.receiver_type;
                delete i.receiver_group_id;
                delete i.receiver_user_id;

                if (!databasebackends._.chat_message__type_checker.is_text(i.type) && !databasebackends._.chat_message__type_checker.is_vote(i.type)) delete i.data_text;

                if (i.sender !== this.server.session_attr.user_id) delete i.sender_rand;

                let date = parseToUTC(i.sent_time);
                i.sent_time = parseInt(date / 1000);

            });

            // 收集所有需要查询的用户 ID(去重)
            const sender_ids = d.map(i => i.sender).filter(id => id !== null);
            const unique_sender_ids = [...new Set(sender_ids)];
            
            const message_ids = d.map(i => i.id);
            const read_lists = await this.server.databasebackend.chat_message_read_list__get_attrs(message_ids);

            // 收集已读列表中的用户 ID
            const read_user_ids = read_lists.map(j => j.user_id);
            const unique_read_user_ids = [...new Set(read_user_ids)];

            // 合并所有需要查询的用户 ID
            const all_user_ids = [...new Set([...unique_sender_ids, ...unique_read_user_ids])];
            const user_attrs = all_user_ids.length > 0 ? await this.server.databasebackend.user__get_attrs_by_id(all_user_ids) : [];

            d.forEach((i) => {
                if (i.sender === null) return;
                let user_attr = null;
                for (const userAttr of user_attrs) {
                    if (i.sender === userAttr.id) {
                        user_attr = userAttr;
                        break;
                    }
                }
                i.sender = user_attr ? user_attr.uid : null;
            });

            d.forEach((i) => {
                const read_list = [];
                for (const j of read_lists) {
                    if (i.id === j.message_id) {
                        read_list.push(j);
                    }
                }
                if (read_list.find(j => j.user_id === this.server.session_attr.user_id)) {
                    i.status |= databasebackends._.chat_message__status.i_read; // 用于判断是否已标记已读，避免自己重复标记
                }
                const read_user_ids = read_list.reduce((arr, cur) => {
                    if (!arr.includes(cur.user_id)) arr.push(cur.user_id);
                    return arr;
                }, []);
                i.read_count = read_user_ids.length; // 艾特单人/私聊时，也用它判断对方是否已读吧
            });

            const spec_message_ids = d.filter(i => !databasebackends._.chat_message__type_checker.is_text(i.type)).map(i => i.id);
            const spec_message_ids__drive = d.filter(i => databasebackends._.chat_message__type_checker.is_drive_item(i.type)).map(i => i.id);
            const spec_attrs = await this.server.databasebackend.chat_message_data_spec__get_attrs_by_message_id(spec_message_ids);
            const spec_attrs__drive = await this.server.databasebackend.drive__get_attrs_by_id(spec_attrs.filter(i => spec_message_ids__drive.includes(i.message_id)).map(i => i.drive_item_id));

            const spec_message_ids__sys = d.filter(i => databasebackends._.chat_message__type_checker.is_sys(i.type)).map(i => i.id);
            const spec_attrs__sys__user_ids = spec_attrs.filter(i => spec_message_ids__sys.includes(i.message_id)).reduce((arr, cur) => {
                if (cur.a1_user_id !== null && !arr.includes(cur.a1_user_id)) arr.push(cur.a1_user_id);
                if (cur.a2_user_id !== null && !arr.includes(cur.a2_user_id)) arr.push(cur.a2_user_id);
                return arr;
            }, []);
            
            // 合并系统消息的用户 ID 到之前查询的用户属性中
            const sys_user_ids_to_query = spec_attrs__sys__user_ids.filter(id => !all_user_ids.includes(id));
            let spec_attrs__sys__user_attrs = user_attrs;
            if (sys_user_ids_to_query.length > 0) {
                const sys_user_attrs = await this.server.databasebackend.user__get_attrs_by_id(sys_user_ids_to_query);
                spec_attrs__sys__user_attrs = [...user_attrs, ...sys_user_attrs];
            }

            d.forEach((i) => {
                let spec_attr;
                if (!databasebackends._.chat_message__type_checker.is_text(i.type)) {
                    for (const j of spec_attrs) {
                        if (i.id === j.message_id) {
                            spec_attr = j;
                            break;
                        }
                    }
                    if (spec_attr === undefined) { // 数据不一致
                        i.file_attr = {};
                        i.image_attr = {};
                        i.sys_attr = {};
                        return;
                    }
                }

                if (databasebackends._.chat_message__type_checker.is_drive_item(i.type)) {
                    let spec_attr__drive;
                    for (const j of spec_attrs__drive) {
                        if (spec_attr.drive_item_id === j.id) {
                            spec_attr__drive = j;
                            break;
                        }
                    }
                    if (spec_attr__drive) {
                        i.file_attr = {
                            name: spec_attr__drive.name, // name_encrypted: spec_attr__drive.name_encrypted, // 总是加密的，免了加字段吧
                            size: spec_attr__drive.size,
                        }
                    } else {
                        i.file_attr = {}
                    }

                }

                if (databasebackends._.chat_message__type_checker.is_image(i.type)) {
                    i.image_attr = {
                        width: spec_attr.a3_number, height: spec_attr.a4_number,
                    }
                }

                if (databasebackends._.chat_message__type_checker.is_sys(i.type)) {
                    i.sys_attr = {
                        type: spec_attr.action_type,
                    }
                    if (spec_attr.action_type === databasebackends._.chat_data_spec__action_type.revoke_message || spec_attr.action_type === databasebackends._.chat_data_spec__action_type.delete_message) {
                        if (spec_attr.a1_user_id !== null) {
                            i.sys_attr.a1_uid = spec_attrs__sys__user_attrs.find(j => j.id === spec_attr.a1_user_id).uid;
                        }
                    } //
                    else if (spec_attr.action_type === databasebackends._.chat_data_spec__action_type.clear_message) {
                        if (spec_attr.a1_user_id !== null) {
                            i.sys_attr.a1_uid = spec_attrs__sys__user_attrs.find(j => j.id === spec_attr.a1_user_id).uid;
                        }
                        i.sys_attr.a3_number = spec_attr.a3_number;
                    }
                }

            });
        }

        static max_message_count = 100;

        static async _action__load(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                messages: [], // msgattr
                previous_message_id: null, // id | null
                is_found_last_message: false, //
                is_found_read_message: false, //
                is_no_more_unread: false, //
                sync: null, // dict
            };

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;


            const msgs_of_this_flow = [];
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                msgs_to_me.forEach(msg => {
                    if (msg.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                        msgs_of_this_flow.push(msg);
                    }
                });
            } else {
                msgs_to_me.forEach(msg => {
                    if (msg.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                        msgs_of_this_flow.push(msg);
                    }
                });
            }

            if (form_field_checker.ffc_int(r.last_message_id)) { // 客户端缓存的有历史
                let cached_last_message = null;
                const new_messages = [];
                for (let i = 0; i < msgs_of_this_flow.length; i++) {
                    const msg = msgs_of_this_flow[i];
                    if (cached_last_message) {
                        new_messages.push(msg);
                    } else {
                        if (msg.id === r.last_message_id) cached_last_message = msg;
                    }
                }
                if (cached_last_message) {
                    result.previous_message_id = cached_last_message.id;
                    result.messages.push(...new_messages.slice(0, subviews.Chat.max_message_count));
                    result.is_found_last_message = true;
                }
            }

            if (!result.is_found_last_message) { // 客户端没有缓存，或缓存无效，先检查已读进度
                const read_progresses_of_this_flow = [];
                if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                    read_progresses.forEach(rp => {
                        if (rp.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                            read_progresses_of_this_flow.push(rp);
                        }
                    });
                } else {
                    read_progresses.forEach(rp => {
                        if (rp.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                            read_progresses_of_this_flow.push(rp);
                        }
                    });
                }
                if (read_progresses_of_this_flow.length > 0) {
                    const read_progress_of_this_flow = read_progresses_of_this_flow.at(-1);
                    let read_last_message = null;
                    const new_messages = [];
                    for (let i = 0; i < msgs_of_this_flow.length; i++) {
                        const msg = msgs_of_this_flow[i];
                        if (read_last_message) {
                            new_messages.push(msg);
                        } else {
                            if (msg.id === read_progress_of_this_flow.message_id) read_last_message = msg;
                        }
                    }
                    if (read_last_message) {
                        result.previous_message_id = read_last_message.id;
                        result.messages.push(...new_messages.slice(0, subviews.Chat.max_message_count));
                        result.is_found_read_message = true;
                    }
                }
            }

            if (!result.is_found_last_message && !result.is_found_read_message) { // 也没有已读进度
                result.messages.push(...msgs_of_this_flow.slice(0, subviews.Chat.max_message_count)); // 从首条开始
            }

            if (!form_field_checker.ffc_int(r.last_message_id)) { // 首次加载消息
                if (result.is_found_read_message) {
                    if (result.messages.length === 0) { // 没有更多未读时
                        result.is_no_more_unread = true;
                        const msgs = msgs_of_this_flow.slice(-(subviews.Chat.max_message_count + 1)); // 末尾已读的消息
                        if (msgs.length > subviews.Chat.max_message_count) {
                            result.previous_message_id = msgs.at(0).id;
                            result.messages.push(...msgs.slice(1));
                        } else {
                            result.messages.push(...msgs);
                        }
                    } else if (result.messages.length < subviews.Chat.max_message_count) { // 未读消息数量不够，填点已读的
                        let x = subviews.Chat.max_message_count - result.messages.length;
                        const first_unread_msg = result.messages.at(0);
                        let fount_first_unread_msg = false;
                        for (let i = msgs_of_this_flow.length - 1; i > -1; i--) {
                            const msg = msgs_of_this_flow[i];
                            if (fount_first_unread_msg) {
                                result.messages.unshift(msg);
                                x--;
                                if (x === 0) break;
                            } else {
                                if (msg.id === first_unread_msg.id) {
                                    fount_first_unread_msg = true;
                                }
                            }
                        }
                    }
                } else { // 从首条开始，在上面已经处理过了
                }
            }

            result.messages = await this.server.databasebackend.chat_message__get_attrs(result.messages.map(i => i.id));
            await Chat._get_attached_attrs.call(this, result.messages,);

            return result;
        }

        static async load(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__load.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__load_history(r) {
            // 互斥锁 - 防止与同步操作并发
            const mutex = globalThis.__chatLoadingMutex || { isLoadingHistory: false, isSyncing: false };
            
            // 等待任何同步完成
            let waitAttempts = 0;
            while (mutex.isSyncing && waitAttempts < 10) {
                console.log('[加载历史] 等待同步完成...');
                await new Promise(resolve => setTimeout(resolve, 300));
                waitAttempts++;
            }
            
            // 设置加载标志
            if (!mutex.isLoadingHistory) {
                mutex.isLoadingHistory = true;
            }
            
            try {
                const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                messages: [], // msgattr
                next_message_id: null, // id | null
                is_found_first_message: false, //
                sync: null, // dict
            };

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;


            const msgs_of_this_flow = [];
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                msgs_to_me.forEach(msg => {
                    if (msg.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                        msgs_of_this_flow.push(msg);
                    }
                });
            } else {
                msgs_to_me.forEach(msg => {
                    if (msg.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                        msgs_of_this_flow.push(msg);
                    }
                });
            }


            if (form_field_checker.ffc_int(r.first_message_id)) { // 客户端缓存的有历史
                let cached_last_message = null;
                const new_messages = [];
                for (let i = msgs_of_this_flow.length - 1; i > -1; i--) {
                    const msg = msgs_of_this_flow[i];
                    if (cached_last_message) {
                        new_messages.push(msg);
                    } else {
                        if (msg.id === r.first_message_id) cached_last_message = msg;
                    }
                }
                if (cached_last_message) {
                    new_messages.reverse();
                    result.next_message_id = cached_last_message.id;
                    result.messages.push(...new_messages.slice(-subviews.Chat.max_message_count));
                    result.is_found_first_message = true;
                }
            }

            result.messages = await this.server.databasebackend.chat_message__get_attrs(result.messages.map(i => i.id));
            await Chat._get_attached_attrs.call(this, result.messages,);

            return result;
            } finally {
                mutex.isLoadingHistory = false;
                console.log('[加载历史] 完成');
            }
        }

        static async load_history(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                // HTTP 加载历史也需要互斥锁
                const mutex = globalThis.__chatLoadingMutex || { isLoadingHistory: false, isSyncing: false };
                
                // 等待其他加载完成
                let waitAttempts = 0;
                while (mutex.isLoadingHistory && waitAttempts < 10) {
                    console.log('[HTTP加载历史] 等待其他加载完成...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    waitAttempts++;
                }
                
                while (mutex.isSyncing && waitAttempts < 10) {
                    console.log('[HTTP加载历史] 等待同步完成...');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    waitAttempts++;
                }
                
                mutex.isLoadingHistory = true;
                
                try {
                    const r = await this.server.req.json();
                    const result = await Chat._action__load_history.call(this, r);
                    return responsetypes.code_200(this.server, JSON.stringify(result));
                } finally {
                    mutex.isLoadingHistory = false;
                    console.log('[HTTP加载历史] 完成');
                }
            }
        }

        static async _action__read(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                sync: null, // dict
            };

            const read_progresses_of_this_flow = [];
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                const read_progresses = await this.server.databasebackend.chat_read_progress__get_records_mine(user_attr, [], [receiver_attr.id,], true);
                read_progresses.forEach(rp => {
                    if (rp.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                        read_progresses_of_this_flow.push(rp);
                    }
                });
            } else {
                const read_progresses = await this.server.databasebackend.chat_read_progress__get_records_mine(user_attr, [receiver_attr.id,], [], true);
                read_progresses.forEach(rp => {
                    if (rp.receiver_type === databasebackends._.chat_message__receiver_type.user) {
                        read_progresses_of_this_flow.push(rp);
                    }
                });
            }
            let read_progress_of_this_flow = null;
            if (read_progresses_of_this_flow.length > 0) read_progress_of_this_flow = read_progresses_of_this_flow.at(-1);
            if (read_progress_of_this_flow === null || read_progress_of_this_flow.message_id < r.visible_message_id) {
                if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                    await this.server.databasebackend.chat_read_progress__update(user_attr.id, r.visible_message_id, r.contact_type, receiver_attr,);
                } else {
                    await this.server.databasebackend.chat_read_progress__update(user_attr.id, r.visible_message_id, r.contact_type, receiver_attr,);
                }
            }

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async read(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__read.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__edit(r) {
            const receiver_and_user = await subviews.Chat._get_receiver_and_user_attr.call(this, r);
            // 检查是否返回了错误响应
            if (receiver_and_user instanceof Response) {
                return receiver_and_user;
            }
            const {receiver_attr, user_attr,} = receiver_and_user;

            const result = {
                sync: null, // dict
            };


            let message_id = r.message_id;
            if (!form_field_checker.ffc_int(message_id)) return responsetypes.code_400(this.server, requsterror.format_param(r));
            const message_attr = await this.server.databasebackend.chat_message__get_attr(message_id);
            if (!message_attr) return responsetypes.code_404(this.server, requsterror.format_param(r));

            // 权限检查：对于投票消息，允许群组成员投票（编辑投票数据）；对于其他消息，只有发送者或有特殊权限的用户才能编辑消息
            let can_edit = false;
            if (message_attr.type === databasebackends._.chat_message__type.vote) {
                // 投票消息：群组成员可以投票（通过编辑投票数据）
                can_edit = true;
            } else {
                // 其他消息：只有发送者或有特殊权限的用户可以编辑
                can_edit = message_attr.sender === user_attr.id || user_attr.contact_any;
            }

            if (!can_edit) {
                return responsetypes.code_403(this.server, "只能编辑自己的消息");
            }

            // 允许文本消息和投票消息被编辑
            if (databasebackends._.chat_message__status_checker.is_editable(message_attr.status) &&
                (databasebackends._.chat_message__type_checker.is_text(message_attr.type) ||
                 message_attr.type === databasebackends._.chat_message__type.vote)) {
                await this.server.databasebackend.chat_message__edit_data_text(message_attr.id, r);
            }
            const ceid = await this.server.databasebackend.chat_edition__record(user_attr.id, message_attr.id, r.contact_type, receiver_attr);

            result.message_attr = await this.server.databasebackend.chat_message__get_attr(message_attr.id);
            await Chat._get_attached_attrs.call(this, [result.message_attr,],);

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async edit(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__edit.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__revoke(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                sync: null, // dict
            };


            let message_id = r.message_id;
            if (!form_field_checker.ffc_int(message_id)) return responsetypes.code_400(this.server, requsterror.format_param(r));
            const message_attr = await this.server.databasebackend.chat_message__get_attr(message_id);
            if (!message_attr) return responsetypes.code_404(this.server, requsterror.format_param(r));

            // 权限检查：只有消息发送者或有"允许主动与所有用户通信"权限的用户才能删除消息
            const can_delete = message_attr.sender === user_attr.id || user_attr.contact_any;
            if (!can_delete) {
                return responsetypes.code_403(this.server, "只能删除自己的消息");
            }

            if (databasebackends._.chat_message__status_checker.is_editable(message_attr.status)) {
                if (databasebackends._.chat_message__type_checker.is_drive_item(message_attr.type)) { // 删除关联的文件
                    const data_spec_attr = await this.server.databasebackend.chat_message_data_spec__get_attr_by_message_id(message_id);
                    if (data_spec_attr && data_spec_attr.drive_item_id) {
                        await this.server.filestorebackend.remove(databasebackends._.drive__id2did(data_spec_attr.drive_item_id));
                        await this.server.databasebackend.drive__delete_by_id(data_spec_attr.drive_item_id);
                    }
                }
                const is_timeout = Date.now() / 1000 - parseInt(parseToUTC(message_attr.sent_time) / 1000) > seconds_of_minutes(10);
                await this.server.databasebackend.chat_message__revoke(message_attr.id, is_timeout);
                await this.server.databasebackend.chat_message_data_spec__relate_by_sys__revoke(message_attr.id, is_timeout, user_attr.id);
                // 删除该消息的所有回应
                await this.server.databasebackend.chat_message_reply_set__remove_by_message(message_attr.id);
            }

            // 使用消息所属的会话来记录编辑和获取状态
            let msg_receiver_attr;
            if (message_attr.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                msg_receiver_attr = await this.server.databasebackend.group__get_attr(message_attr.receiver_group_id);
            } else {
                msg_receiver_attr = await this.server.databasebackend.user__get_attr_by_id(message_attr.receiver_user_id);
            }

            // 记录编辑通知：通知消息接收者
            if (msg_receiver_attr) {
                // 只需要记录一次，使用消息发送者作为 sender，会话接收者作为 receiver
                // 这样所有参与该会话的用户都能看到这条编辑记录
                await this.server.databasebackend.chat_edition__record(message_attr.sender, message_attr.id, message_attr.receiver_type, msg_receiver_attr);
            }

                result.message_attr = await this.server.databasebackend.chat_message__get_attr(message_attr.id);
                await Chat._get_attached_attrs.call(this, [result.message_attr,],);            // 使用消息所属的会话来获取状态
                const msg_r = {...r, contact_type: message_attr.receiver_type};
                if (msg_receiver_attr) {
                    if (message_attr.receiver_type === databasebackends._.chat_message__receiver_type.group) {
                        msg_r.gid = msg_receiver_attr.gid;
                        msg_r.uid = undefined;
                    } else {
                        msg_r.uid = msg_receiver_attr.uid;
                        msg_r.gid = undefined;
                    }

                    const {
                        sync_result, sync_results, msgs_to_me, read_progresses,
                    } = await Chat._get_status_for_one.call(this, msg_r, user_attr, msg_receiver_attr);
                    result.sync = sync_result;
                } else {
                    // 如果无法获取接收者属性，返回基本的状态信息
                    result.sync = {
                        online_count: 0,
                        last_message_time: 0,
                        read_message_id: 0,
                        unread_count: 0,
                        editions: [],
                        edition_id: 0,
                        activities: [],
                        type: message_attr.receiver_type,
                        gid: message_attr.receiver_type === databasebackends._.chat_message__receiver_type.group ? message_attr.receiver_group_id : undefined,
                        uid: message_attr.receiver_type === databasebackends._.chat_message__receiver_type.user ? message_attr.receiver_user_id : undefined
                    };
                }

                return result;
            }

        static async revoke(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__revoke.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__pin_message(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                sync: null, // dict
            };

            let message_id = r.message_id;
            if (!form_field_checker.ffc_int(message_id)) return responsetypes.code_400(this.server, requsterror.format_param(r));
            const message_attr = await this.server.databasebackend.chat_message__get_attr(message_id);
            if (!message_attr) return responsetypes.code_404(this.server, requsterror.format_param(r));

            // 验证消息是否属于当前会话
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.group || message_attr.receiver_group_id !== receiver_attr.id) {
                    return responsetypes.code_403(this.server, "消息不属于当前群组");
                }
            } else {
                if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.user) {
                    return responsetypes.code_403(this.server, "消息不属于当前会话");
                }
                // 验证发送者或接收者是否是当前用户
                if (message_attr.sender !== user_attr.id && message_attr.receiver_user_id !== user_attr.id) {
                    return responsetypes.code_403(this.server, "无权置顶此消息");
                }
            }

            // 置顶消息
            await this.server.databasebackend.chat_message__pin(message_attr.id);

            result.message_attr = await this.server.databasebackend.chat_message__get_attr(message_attr.id);
            await Chat._get_attached_attrs.call(this, [result.message_attr,],);

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async pin_message(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__pin_message.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__unpin_message(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                sync: null, // dict
            };

            let message_id = r.message_id;
            if (!form_field_checker.ffc_int(message_id)) return responsetypes.code_400(this.server, requsterror.format_param(r));
            const message_attr = await this.server.databasebackend.chat_message__get_attr(message_id);
            if (!message_attr) return responsetypes.code_404(this.server, requsterror.format_param(r));

            // 验证消息是否属于当前会话
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.group || message_attr.receiver_group_id !== receiver_attr.id) {
                    return responsetypes.code_403(this.server, "消息不属于当前群组");
                }
            } else {
                if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.user) {
                    return responsetypes.code_403(this.server, "消息不属于当前会话");
                }
                // 验证发送者或接收者是否是当前用户
                if (message_attr.sender !== user_attr.id && message_attr.receiver_user_id !== user_attr.id) {
                    return responsetypes.code_403(this.server, "无权取消置顶此消息");
                }
            }

            // 取消置顶
            await this.server.databasebackend.chat_message__unpin(message_attr.id);

            result.message_attr = await this.server.databasebackend.chat_message__get_attr(message_attr.id);
            await Chat._get_attached_attrs.call(this, [result.message_attr,],);

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async unpin_message(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__unpin_message.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async pin_chat(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__pin_chat.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__pin_chat(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            // 插入会话置顶记录
            let sql = `INSERT INTO chat_pin ("user_id", "receiver_type", "receiver_group_id", "receiver_user_id") VALUES (`;
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                sql += `${user_attr.id}, ${r.contact_type}, ${receiver_attr.id}, NULL`;
            } else {
                sql += `${user_attr.id}, ${r.contact_type}, NULL, ${receiver_attr.id}`;
            }
            sql += `);`;
            await this.server.databasebackend.exec_sql(sql);

            // 获取当前会话状态
            const sync_result = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);

            // 更新状态，添加置顶标记
            if (sync_result.sync_result) {
                sync_result.sync_result.editions = sync_result.sync_result.editions || [];
                sync_result.sync_result.editions.push(-999999);
            }

            return {
                sync: sync_result.sync_result,
                success: true,
                pinned: true
            };
        }

        static async unpin_chat(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__unpin_chat.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__unpin_chat(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            // 删除会话置顶记录
            const sql = `
                DELETE FROM chat_pin
                WHERE user_id = ${user_attr.id}
                AND receiver_type = ${r.contact_type}
                AND (
                    (receiver_type = 1 AND receiver_user_id = ${receiver_attr.id}) OR
                    (receiver_type = 2 AND receiver_group_id = ${receiver_attr.id})
                )
            `;
            await this.server.databasebackend.exec_sql(sql);

            // 获取当前会话状态
            const sync_result = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);

            // 移除置顶标记
            if (sync_result.sync_result && sync_result.sync_result.editions) {
                sync_result.sync_result.editions = sync_result.sync_result.editions.filter(e => e !== -999999);
            }

            return {
                sync: sync_result.sync_result,
                success: true,
                pinned: false
            };
        }

        static async _action__reply_message(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                sync: null, // dict
            };

            let message_id = r.message_id;
            if (!form_field_checker.ffc_int(message_id)) return responsetypes.code_400(this.server, requsterror.format_param(r));
            const message_attr = await this.server.databasebackend.chat_message__get_attr(message_id);
            if (!message_attr) return responsetypes.code_404(this.server, requsterror.format_param(r));

            // 验证消息是否属于当前会话
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.group || message_attr.receiver_group_id !== receiver_attr.id) {
                    return responsetypes.code_403(this.server, "消息不属于当前群组");
                }
            } else {
                if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.user) {
                    return responsetypes.code_403(this.server, "消息不属于当前会话");
                }
                // 验证发送者或接收者是否是当前用户
                if (message_attr.sender !== user_attr.id && message_attr.receiver_user_id !== user_attr.id) {
                    return responsetypes.code_403(this.server, "无权回应此消息");
                }
            }

            // 添加回应（先检查是否已回应）
            const existing_reply = await this.server.databasebackend.chat_message_reply_set__check_exists(message_attr.id, user_attr.id);
            if (existing_reply.length > 0) {
                // 已经回应过了，直接返回成功
                result.message_attr = message_attr;
                await Chat._get_attached_attrs.call(this, [result.message_attr,],);
                const {
                    sync_result, sync_results, msgs_to_me, read_progresses,
                } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
                result.sync = sync_result;
                return result;
            }
            await this.server.databasebackend.chat_message_reply_set__add(message_attr.id, user_attr.id);

            result.message_attr = await this.server.databasebackend.chat_message__get_attr(message_attr.id);
            await Chat._get_attached_attrs.call(this, [result.message_attr,],);

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async reply_message(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__reply_message.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__unreply_message(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                sync: null, // dict
            };

            let message_id = r.message_id;
            if (!form_field_checker.ffc_int(message_id)) return responsetypes.code_400(this.server, requsterror.format_param(r));
            const message_attr = await this.server.databasebackend.chat_message__get_attr(message_id);
            if (!message_attr) return responsetypes.code_404(this.server, requsterror.format_param(r));

            // 验证消息是否属于当前会话
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.group || message_attr.receiver_group_id !== receiver_attr.id) {
                    return responsetypes.code_403(this.server, "消息不属于当前群组");
                }
            } else {
                if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.user) {
                    return responsetypes.code_403(this.server, "消息不属于当前会话");
                }
                // 验证发送者或接收者是否是当前用户
                if (message_attr.sender !== user_attr.id && message_attr.receiver_user_id !== user_attr.id) {
                    return responsetypes.code_403(this.server, "无权取消回应此消息");
                }
            }

            // 取消回应（先检查是否已回应）
            const existing_reply = await this.server.databasebackend.chat_message_reply_set__check_exists(message_attr.id, user_attr.id);
            if (existing_reply.length === 0) {
                // 没有回应过，直接返回成功
                result.message_attr = message_attr;
                await Chat._get_attached_attrs.call(this, [result.message_attr,],);
                const {
                    sync_result, sync_results, msgs_to_me, read_progresses,
                } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
                result.sync = sync_result;
                return result;
            }
            await this.server.databasebackend.chat_message_reply_set__remove(message_attr.id, user_attr.id);

            result.message_attr = await this.server.databasebackend.chat_message__get_attr(message_attr.id);
            await Chat._get_attached_attrs.call(this, [result.message_attr,],);

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async unreply_message(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__unreply_message.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async get_message_replies(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

                // 支持批量获取：单个message_id或message_ids数组
                let message_ids = [];
                if (Array.isArray(r.message_ids) && r.message_ids.length > 0) {
                    // 批量模式
                    for (const message_id of r.message_ids) {
                        if (!form_field_checker.ffc_int(message_id)) return responsetypes.code_400(this.server, requsterror.format_param(r));
                    }
                    message_ids = r.message_ids;
                } else if (form_field_checker.ffc_int(r.message_id)) {
                    // 单个消息模式（兼容旧版）
                    message_ids = [r.message_id];
                } else {
                    return responsetypes.code_400(this.server, requsterror.format_param(r));
                }

                // 验证消息是否属于当前会话
                for (const message_id of message_ids) {
                    const message_attr = await this.server.databasebackend.chat_message__get_attr(message_id);
                    if (!message_attr) return responsetypes.code_404(this.server, requsterror.format_param(r));

                    if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                        if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.group || message_attr.receiver_group_id !== receiver_attr.id) {
                            return responsetypes.code_403(this.server, "消息不属于当前群组");
                        }
                    } else {
                        if (message_attr.receiver_type !== databasebackends._.chat_message__receiver_type.user) {
                            return responsetypes.code_403(this.server, "消息不属于当前会话");
                        }
                    }
                }

                // 批量获取回应列表
                let replies;
                if (message_ids.length === 1) {
                    // 单个消息：使用原有方法
                    replies = await this.server.databasebackend.chat_message_reply_set__list_by_message(message_ids[0]);
                } else {
                    // 批量消息：使用批量方法
                    replies = await this.server.databasebackend.chat_message_reply_set__list_by_messages(message_ids);
                }

                // 获取回应用户信息
                const user_ids = [...new Set(replies.map(r => r.user_id))];
                const user_attrs = await this.server.databasebackend.user__get_attrs_by_id(user_ids);
                const user_map = {};
                user_attrs.forEach(u => {
                    user_map[u.id] = u;
                });

                // 按message_id分组回应
                const replies_by_message = {};
                for (const message_id of message_ids) {
                    replies_by_message[message_id] = [];
                }
                for (const reply of replies) {
                    if (!replies_by_message[reply.message_id]) {
                        replies_by_message[reply.message_id] = [];
                    }
                    const user = user_map[reply.user_id];
                    replies_by_message[reply.message_id].push({
                        user_id: user.uid,  // 使用 uid 而不是数据库 id，便于前端匹配
                        user_name: user?.name || user.uid || "",
                        reply_time: reply.reply_time
                    });
                }

                // 统一返回批量格式，简化前端处理
                return responsetypes.code_200(this.server, JSON.stringify({
                    replies_by_message: replies_by_message
                }));
            }
        }

        static async _action__sync_message(r) {
            let receiver_attr;
            if (r.contact_type === databasebackends._.chat_message__receiver_type.group) {
                const gid = normalizeId(r.gid);
                if (!gid) return responsetypes.code_400(this.server, requsterror.format_param(r));
                receiver_attr = await this.server.databasebackend.group__get_attr(gid);
                if (!receiver_attr) return responsetypes.code_400(this.server, requsterror.format_param(r));
            } else {
                const uid = normalizeId(r.uid);
                if (!uid) return responsetypes.code_400(this.server, requsterror.format_param(r));
                receiver_attr = await this.server.databasebackend.user__get_attr(uid);
                if (!receiver_attr) return responsetypes.code_400(this.server, requsterror.format_param(r));
            }

            const user_attr = await this.server.databasebackend.user__get_attr_by_id(this.server.session_attr.user_id);

            const result = {
                sync: null, // dict
            };


            let message_ids = r.message_ids;
            for (const messageId of message_ids) {
                if (!form_field_checker.ffc_int(messageId)) return responsetypes.code_400(this.server, requsterror.format_param(r));
            }
            const message_attrs = await this.server.databasebackend.chat_message__get_attrs(message_ids);
            await Chat._get_attached_attrs.call(this, message_attrs,);

            result.message_attrs = message_attrs;


            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async sync_message(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__sync_message.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__mark_read(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                sync: null, // dict
            };


            let message_ids = r.message_ids;
            for (const messageId of message_ids) {
                if (!form_field_checker.ffc_int(messageId)) return responsetypes.code_400(this.server, requsterror.format_param(r));
            }
            const message_attrs = await this.server.databasebackend.chat_message__get_attrs(message_ids);

            await this.server.databasebackend.chat_message_read_list__record_some(message_attrs.map(i => i.id), user_attr.id);

            const ceids = await this.server.databasebackend.chat_edition__record_some(user_attr.id, message_attrs.map(i => i.id), r.contact_type, receiver_attr);

            result.message_attrs = message_attrs;
            await Chat._get_attached_attrs.call(this, result.message_attrs,);

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async mark_read(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__mark_read.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__clear(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                sync: null, // dict
            };

            if (form_field_checker.ffc_int(r.hours)) {
                await this.server.databasebackend.chat_message__delete(user_attr, r.contact_type, receiver_attr, r);
            }

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async clear(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__clear.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static async _action__forward(r) {
            const {receiver_attr, user_attr,} = await subviews.Chat._get_receiver_and_user_attr.call(this, r);

            const result = {
                sync: null, // dict
            };

            const uids = [];
            const gids = [];
            r.to.forEach(i => {
                if (i.type === databasebackends._.chat_message__receiver_type.user) uids.push(i.uid); else if (i.type === databasebackends._.chat_message__receiver_type.group) gids.push(i.gid);
            });
            const to_user_attrs = await this.server.databasebackend.user__get_attrs(uids);
            const to_group_attrs = await this.server.databasebackend.group__get_attrs(gids);
            const forward_message_attr = await this.server.databasebackend.chat_message__get_attr(r.message_id);
            if ((to_user_attrs.length === 0 && to_group_attrs.length === 0) || !forward_message_attr) return responsetypes.code_400(this.server, requsterror.format_param(r));

            const message_ids = await this.server.databasebackend.chat_message__forward(user_attr, forward_message_attr, to_user_attrs, to_group_attrs);
            if (databasebackends._.chat_message__type_checker.is_text(forward_message_attr.type)) {
            } else if (databasebackends._.chat_message__type_checker.is_drive_item(forward_message_attr.type)) {
                const data_spec_attr = await this.server.databasebackend.chat_message_data_spec__get_attr_by_message_id(forward_message_attr.id);
                if (data_spec_attr && data_spec_attr.drive_item_id) {
                    const uint8Data = await this.server.filestorebackend.get(databasebackends._.drive__id2did(data_spec_attr.drive_item_id));

                    const drive_item_attr = await this.server.databasebackend.drive__get_attr_by_id(data_spec_attr.drive_item_id);
                    const file_attr = {
                        name: drive_item_attr.name,
                        size: drive_item_attr.size,
                        name_encrypted: drive_item_attr.name_encrypted,
                    };
                    const image_attr = {
                        width: data_spec_attr.a3_number, height: data_spec_attr.a4_number,
                    };

                    const func1 = async (attr, message_id) => {
                        const fileData = uint8Data.buffer;
                        const drive_item_id = await this.server.databasebackend.drive__new_attachment(file_attr, this.server.session_attr.user_id);
                        await this.server.filestorebackend.put(databasebackends._.drive__id2did(drive_item_id), new Uint8Array(fileData));
                        await this.server.databasebackend.drive__change_attr_uploaded_by_id(drive_item_id);

                        if (databasebackends._.chat_message__type_checker.is_image(forward_message_attr.type)) {
                            await this.server.databasebackend.chat_message_data_spec__relate_by_image(message_id, drive_item_id, image_attr);
                        } else if (databasebackends._.chat_message__type_checker.is_file(forward_message_attr.type)) {
                            await this.server.databasebackend.chat_message_data_spec__relate_by_file(message_id, drive_item_id);
                        }
                    }

                    let msgid_index = 0;
                    for (let i = 0; i < to_user_attrs.length; i++) {
                        const attr = to_user_attrs[i];
                        const message_id = message_ids.at(msgid_index);
                        await func1(attr, message_id);
                        msgid_index++;
                    }
                    for (let i = 0; i < to_group_attrs.length; i++) {
                        const attr = to_group_attrs[i];
                        const message_id = message_ids.at(msgid_index);
                        await func1(attr, message_id);
                        msgid_index++;
                    }
                }
            }

            const {
                sync_result, sync_results, msgs_to_me, read_progresses,
            } = await Chat._get_status_for_one.call(this, r, user_attr, receiver_attr);
            result.sync = sync_result;

            return result;
        }

        static async forward(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const result = await Chat._action__forward.call(this, r);
                return responsetypes.code_200(this.server, JSON.stringify(result));
            }
        }

        static ws_action_type = { // api/*
            sync: 1,
            sync_one: 2,
            act: 3,
            send: 4, //
            load: 5,
            load_history: 6,
            read: 7,
            edit: 8,
            revoke: 9,
            sync_message: 10,
            mark_read: 11,
            clear: 12,
            forward: 13,
        }

        static async _ws_open__deno(args) {
            const {socket, response} = Deno.upgradeWebSocket(this.server.req);
            socket.onopen = (event) => {
                // console.log("websocket 已连接", event);
            };
            socket.onmessage = async (event) => {
                const json = await subviews.Chat._ws_receive.call(this, args, event.data);
                socket.send(JSON.stringify(json));
            };
            socket.onclose = (event) => {
                // console.log("websocket 已关闭", event);
            };
            socket.onerror = (event) => {
                // console.log("websocket 发送错误", event);
            };
            return response;
        }

        static async _ws_open__cloudflare(args) {
            const [client, server] = Object.values(new WebSocketPair());
            server.accept();
            server.addEventListener("message", async (event) => {
                const json = await subviews.Chat._ws_receive.call(this, args, event.data);
                server.send(JSON.stringify(json));
            });
            server.addEventListener("close", (event) => {
                // console.log("websocket 已关闭", event);
            });
            return responsetypes.code_101(this.server, null, {}, {webSocket: client,});
        }

        static async _ws_receive(args, data) {
            // console.log("websocket 收到消息", data);
            const resp = {}
            let json;
            try {
                json = JSON.parse(data);
            } catch (err) {
                resp.error = {name: err.name, message: err.message, stack: err.stack, payload: err.payload,}
                return resp;
            }
            resp.action = json.action;
            resp.counter = json.counter;
            // 处理动作
            try {
                if (json.action === subviews.Chat.ws_action_type.sync) {
                    resp.result = await Chat._action__sync.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.sync_one) {
                    resp.result = await Chat._action__sync_one.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.act) {
                    resp.result = await Chat._action__act.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.send) {
                    resp.result = await Chat._action__send.call(this, json, undefined);
                } //
                else if (json.action === subviews.Chat.ws_action_type.load) {
                    resp.result = await Chat._action__load.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.load_history) {
                    resp.result = await Chat._action__load_history.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.read) {
                    resp.result = await Chat._action__read.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.edit) {
                    resp.result = await Chat._action__edit.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.revoke) {
                    resp.result = await Chat._action__revoke.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.sync_message) {
                    resp.result = await Chat._action__sync_message.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.mark_read) {
                    resp.result = await Chat._action__mark_read.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.clear) {
                    resp.result = await Chat._action__clear.call(this, json);
                } //
                else if (json.action === subviews.Chat.ws_action_type.forward) {
                    resp.result = await Chat._action__forward.call(this, json);
                } //
            } catch (err) {
                resp.error = {name: err.name, message: err.message, stack: err.stack, payload: err.payload,}
                return resp;
            }
            return resp;
        }

        static async ws(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                if (this.server.req.headers.get("upgrade")?.toLowerCase() !== "websocket") return responsetypes.code_400(this.server, "不是Websocket。");
                if (isPlatform(Platforms.deno)) {
                    return await subviews.Chat._ws_open__deno.call(this, args);
                } else if (isPlatform(Platforms.cloudflare)) {
                    return await subviews.Chat._ws_open__cloudflare.call(this, args);
                } else {
                    return responsetypes.code_500(this.server, "平台不支持Websocket。");
                }
            }
        }

        // 候选词 API 接口
        static async candidates(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                // 获取筛选参数
                const filter = this.server.requrl.searchParams.get("filter") || "";

                // 从数据库读取候选词 JSON（已加密）
                const phrases_setting = await this.server.databasebackend.settings__get("common_phrases");

                // 如果没有数据，返回空数组
                if (!phrases_setting || !phrases_setting.encrypted_value) {
                    return responsetypes.code_200(this.server, JSON.stringify({
                        success: true,
                        data: []
                    }));
                }

                // 返回加密数据给前端，由前端负责解密
                return responsetypes.code_200(this.server, JSON.stringify({
                    success: true,
                    encrypted: true,
                    data: phrases_setting.encrypted_value
                }));
            }
        }

        // 群公告 API 接口
        static async get_announcement(args) {
            if (this.server.req.method === requestmethodtypes.GET) {
                const gid = this.server.requrl.searchParams.get("gid");
                if (!gid) return responsetypes.code_400(this.server, requsterror.format_param("gid"));

                const announcement = await this.server.databasebackend.group__get_announcement(gid);
                if (!announcement) return responsetypes.code_404(this.server, requsterror.format_group_not_found(gid));

                return responsetypes.code_200(this.server, JSON.stringify({
                    announcement: announcement.announcement,
                    editor_uid: announcement.editor_uid,
                    updated_time: announcement.announcement_updated_time
                }));
            }
        }

        static async set_announcement(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const {gid, announcement} = r;
                if (!gid) return responsetypes.code_400(this.server, requsterror.format_param("gid"));

                // 验证用户是否为群组成员
                const group_attr = await this.server.databasebackend.group__get_attr(gid);
                if (!group_attr) return responsetypes.code_404(this.server, requsterror.format_group_not_found(gid));

                const user_attr = await this.server.databasebackend.user__get_attr_by_id(this.server.session_attr.user_id);
                const ug_attrs = await this.server.databasebackend.user_group_set__get_attrs_by_user([user_attr.id,]);
                const is_member = ug_attrs.some(i => i.group_id === group_attr.id);
                if (!is_member) return responsetypes.code_403(this.server, "您不是该群组成员");

                // 设置公告
                await this.server.databasebackend.group__set_announcement(gid, announcement, user_attr.id);

                return responsetypes.code_200(this.server, JSON.stringify({
                    success: true
                }));
            }
        }

        static async get_users_info(args) {
            if (this.server.req.method === requestmethodtypes.POST) {
                const r = await this.server.req.json();
                const {user_ids} = r;

                if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
                    return responsetypes.code_400(this.server, requsterror.format_param("user_ids"));
                }

                // 批量获取用户信息
                const users = {};
                for (const user_id of user_ids) {
                    const user_attr = await this.server.databasebackend.user__get_attr_by_id(user_id);
                    if (user_attr) {
                        users[user_id] = {
                            id: user_attr.id,
                            name: user_attr.name,
                            email: user_attr.email
                        };
                    }
                }

                return responsetypes.code_200(this.server, JSON.stringify({
                    users: users
                }));
            }
        }


    }

    return {check_permission, Web, Api, Admin, Me, Mail, Drive, Chat};
})()

/*
* APP
* */
class Checkin {
    constructor(req, env) {
        this.req = req;
        this.env = env;
        this.requrl = new URL(this.req.url);
        this.requrl_path = decodeURIComponent(this.requrl.pathname);
    }

    async init() {
        if (Object.keys(Checkin.object_caches).length > 0 && Checkin.object_caches.checkin_version === checkin_version) {
            // throw new Error("成功缓存。");
            this.hit_object_caches = true;
            Object.assign(this, Checkin.object_caches);
        } else {
            this.#register_urlpatterns();
            this.#create_databasebackend();
            this.#create_filestorebackend();
            await this.databasebackend.init();
            await this.databasebackend.init_tables();
            await this.filestorebackend.init();

            Checkin.object_caches.checkin_version = checkin_version;
            Checkin.object_caches.urlpatterns = this.urlpatterns;
            Checkin.object_caches.databasebackend = this.databasebackend;
            Checkin.object_caches.filestorebackend = this.filestorebackend;
        }

    }

    static object_caches = {};

    // 路由
    urlpatterns = [];

    #register_urlpatterns() {

        const df_permission_user = {permission: viewaccesspermissions.user,};
        const df_permission_admin = {permission: viewaccesspermissions.admin,};
        const df_permission_logged = {permission: viewaccesspermissions.logged,};

        const l = [/*
            * 基础页面
            * */
            new urlpatterntypes.Path(``, subviews.Web.startpage), //
            new urlpatterntypes.Path(`/`, subviews.Web.jumpto_startpage), //
            new urlpatterntypes.Path(`/admin`, subviews.Web.startpage, {name: "admin",},), //
            new urlpatterntypes.Path(`/drive`, subviews.Web.startpage, {appname: appnames.drive,},), //
            new urlpatterntypes.Path(`/chat`, subviews.Web.startpage, {appname: appnames.chat,},), //

            /*
            * 基础api
            * */
            new urlpatterntypes.Path(`/api/auth`, subviews.Api.auth), //
            new urlpatterntypes.Path(`/api/version`, subviews.Api.version, {...df_permission_logged},), //
            new urlpatterntypes.Path(`/api/get_all_people_notice`, subviews.Api.get_all_people_notice), //
            new urlpatterntypes.Path(`/api/get_encryption_key`, subviews.Api.get_encryption_key, {...df_permission_user},), //
            /*
            * 个人相关api
            * */
            new urlpatterntypes.Path(`/me/api/logout`, subviews.Me.logout, {...df_permission_user},), //
            new urlpatterntypes.Path(`/me/api/contacts`, subviews.Me.contacts, {...df_permission_user},), //
            new urlpatterntypes.Path(`/me/api/contacted`, subviews.Me.contacted, {...df_permission_user},), //
            new urlpatterntypes.Path(`/me/api/activity/(?<month>\\d+)`, subviews.Me.activity.month, {...df_permission_user},), //
            new urlpatterntypes.Path(`/me/api/activity/(?<month>\\d+)/(?<day>\\d+)`, subviews.Me.activity.day, {...df_permission_user},), //

            /*
            * 管理员相关api
            * */
            new urlpatterntypes.Path(`/admin/api/auth`, subviews.Admin.auth), //
            new urlpatterntypes.Path(`/admin/api/get_encryption_key`, subviews.Admin.get_encryption_key, {...df_permission_admin},), //

            new urlpatterntypes.Path(`/admin/api/service/disk`, subviews.Admin.service.disk, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/service/status`, subviews.Admin.service.status, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/service/logs`, subviews.Admin.service.logs, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/service/init_tables`, subviews.Admin.service.init_tables, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/service/drop_tables`, subviews.Admin.service.drop_tables, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/service/clear_drive`, subviews.Admin.service.clear_drive, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/service/backup`, subviews.Admin.service.backup, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/service/restore`, subviews.Admin.service.restore, {...df_permission_admin},), //

            // new urlpatterntypes.Path(`/admin/api/activity/(?<month>\\d+)`, subviews.Admin.activity.month, {...df_permission_admin},), //
            // new urlpatterntypes.Path(`/admin/api/activity/(?<month>\\d+)/(?<day>\\d+)`, subviews.Admin.activity.day, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/activity`, subviews.Admin.activity._, {...df_permission_admin},), //

            new urlpatterntypes.Path(`/admin/api/group`, subviews.Admin.group._, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/group/list`, subviews.Admin.group.list, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/group/(?!(?:list)\\b)(?<gid>[${norm_id_role}]+)`, subviews.Admin.group.item_, {...df_permission_admin},),  //
            // new urlpatterntypes.Path(this, `/admin/api/group/(?<gid>[${norm_id_role}]+)/activity/(?<month>\\d+)`, subviews.Admin.group.activity.month, {...df_permission_admin},), //
            // new urlpatterntypes.Path(this, `/admin/api/group/(?<gid>[${norm_id_role}]+)/activity/(?<month>\\d+)/(?<day>\\d+)`, subviews.Admin.group.activity.day, {...df_permission_admin},), //
            new urlpatterntypes.Path(`/admin/api/group/(?<gid>[${norm_id_role}]+)/activity`, subviews.Admin.group.activity._, {...df_permission_admin},), //

            new urlpatterntypes.Path(`/admin/api/user`, subviews.Admin.user._, {...df_permission_admin},), //

                        new urlpatterntypes.Path(`/admin/api/user/list`, subviews.Admin.user.list, {...df_permission_admin},),  //

                        new urlpatterntypes.Path(`/admin/api/users`, subviews.Admin.user.attrs, {...df_permission_admin},),  //

                        new urlpatterntypes.Path(`/admin/api/user/(?!(?:list)\\b)(?<uid>[${norm_id_role}]+)`, subviews.Admin.user.item_, {...df_permission_admin},),  //

                        new urlpatterntypes.Path(`/admin/api/user/(?<uid>[${norm_id_role}]+)/clone`, subviews.Admin.user.clone, {...df_permission_admin},),  //

            

                        // 系统配置相关api

                        new urlpatterntypes.Path(`/admin/api/settings/get`, subviews.Admin.settings.get, {...df_permission_admin},),  //

                        new urlpatterntypes.Path(`/admin/api/settings/update`, subviews.Admin.settings.update, {...df_permission_admin},),  //

            

                        // /*
            // * 邮件相关api
            // * */
            // new urlpatterntypes.Path(`/mail/api/send`, subviews.Mail.send, {...df_permission_user},), //
            // new urlpatterntypes.Path(`/mail/api/unread`, subviews.Mail.unread, {...df_permission_user},), //
            // new urlpatterntypes.Path(`/mail/api/received`, subviews.Mail.received, {...df_permission_user},),  //
            // new urlpatterntypes.Path(`/mail/api/sent`, subviews.Mail.sent, {...df_permission_user},),  //
            // new urlpatterntypes.Path(`/mail/api/sent_unread`, subviews.Mail.sent_unread, {...df_permission_user},), //
            // new urlpatterntypes.Path(`/mail/api/item/(?<sid>\\w+)/mark/read`, subviews.Mail.item.mark.read, {...df_permission_user},), //
            // new urlpatterntypes.Path(`/mail/api/item/(?<sid>\\w+)`, subviews.Mail.item._, {...df_permission_user},), //
            // new urlpatterntypes.Path(`/mail/api/item/(?<sid>\\w+)/receivers`, subviews.Mail.item.receivers, {...df_permission_user},), //

            /*
            * 网盘相关api
            * */
            new urlpatterntypes.Path(`/drive/api/upload`, subviews.Drive.upload, {...df_permission_user},), //
            new urlpatterntypes.Path(`/drive/api/list`, subviews.Drive.list, {...df_permission_user},), //
            new urlpatterntypes.Path(`/drive/api/new`, subviews.Drive.new, {...df_permission_user},), //

            new urlpatterntypes.Path(`/drive/api/item/(?<did>\\w+)`, subviews.Drive.item._, {...df_permission_user},), //
            new urlpatterntypes.Path(`/drive/api/item/(?<did>\\w+)/info`, subviews.Drive.item.info, {...df_permission_user},), //
            new urlpatterntypes.Path(`/drive/api/item/(?<did>\\w+)/down(?:/(?<name>.+))?`, subviews.Drive.item.down, {...df_permission_user},), //
            new urlpatterntypes.Path(`/drive/api/item/(?<did>\\w+)/share`, subviews.Drive.item.share, {...df_permission_user},), //
            new urlpatterntypes.Path(`/drive/api/item/(?<did>\\w+)/resolve`, subviews.Drive.item.resolve, {...df_permission_user},), //

            /*
            * 网盘公共链接，界面，api
            * */
            new urlpatterntypes.Path(`/drive/shared/folder/(?<did>\\w+)`, subviews.Drive.shared.folder.info,), //
            new urlpatterntypes.Path(`/drive/shared/folder/(?<did>\\w+)/new`, subviews.Drive.shared.folder.new,), //
            new urlpatterntypes.Path(`/drive/shared/file/(?<did>\\w+)`, subviews.Drive.shared.file.info,), //
            new urlpatterntypes.Path(`/drive/shared/file/(?<did>\\w+)/down/(?<name>.+)`, subviews.Drive.shared.file.down,), //

            /*
             * 聊天相关api
             * */
            new urlpatterntypes.Path(`/chat/api/contacts`, subviews.Chat.contacts, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/sync`, subviews.Chat.sync, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/sync_one`, subviews.Chat.sync_one, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/act`, subviews.Chat.act, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/members`, subviews.Chat.members, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/send`, subviews.Chat.send, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/send_file`, subviews.Chat.send_file, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/download/(?<message_id>\\d+)`, subviews.Chat.download, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/load`, subviews.Chat.load, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/load_history`, subviews.Chat.load_history, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/read`, subviews.Chat.read, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/edit`, subviews.Chat.edit, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/revoke`, subviews.Chat.revoke, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/pin_message`, subviews.Chat.pin_message, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/unpin_message`, subviews.Chat.unpin_message, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/pin_chat`, subviews.Chat.pin_chat, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/unpin_chat`, subviews.Chat.unpin_chat, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/reply_message`, subviews.Chat.reply_message, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/unreply_message`, subviews.Chat.unreply_message, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/get_message_replies`, subviews.Chat.get_message_replies, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/sync_message`, subviews.Chat.sync_message, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/mark_read`, subviews.Chat.mark_read, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/clear`, subviews.Chat.clear, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/forward`, subviews.Chat.forward, {...df_permission_user},), //
                        new urlpatterntypes.Path(`/chat/api/ws`, subviews.Chat.ws, {...df_permission_user},), //
                        new urlpatterntypes.Path(`/chat/api/candidates`, subviews.Chat.candidates, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/get_announcement`, subviews.Chat.get_announcement, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/set_announcement`, subviews.Chat.set_announcement, {...df_permission_user},), //
            new urlpatterntypes.Path(`/chat/api/get_users_info`, subviews.Chat.get_users_info, {...df_permission_user},), //

        ];

        if (debugging) {
            // console.log(leq);
            // for (const i of l) {
            //     console.log("注册视图", i.view);
            // }
        }
        this.urlpatterns.push(...l);

    }

    // 数据库
    #create_databasebackend() {
        let ok = false;

        if (databasebackendargs.type === databasebackendtypes.default && isPlatform(Platforms.cloudflare)) databasebackendargs.type = databasebackendtypes.cf_d1;

        if (databasebackendargs.type === databasebackendtypes.default) {
            this.databasebackend = new databasebackends.DenoSqlite3(this)
            if (isLocal(this.req,)) {
                ok = true;
            }
        } else if (databasebackendargs.type === databasebackendtypes.cf_d1) {
            this.databasebackend = new databasebackends.CloudflareD1(this)
            if (this.env.hasOwnProperty(binding_db)) {
                ok = true;
            }
        }

        if (!ok) throw new Error("无效的数据库后端。");
    }

    // 文件存储
    #create_filestorebackend() {
        let ok = false;

        if (filestorebackendargs.type === filestorebackendtypes.default && isPlatform(Platforms.cloudflare)) filestorebackendargs.type = filestorebackendtypes.cf_kv;

        if (filestorebackendargs.type === filestorebackendtypes.default) {
            this.filestorebackend = new filestorebackends.DenoFile(this)
            if (isLocal(this.req,)) {
                ok = true;
            }
        } else if (filestorebackendargs.type === filestorebackendtypes.cf_kv) {
            this.filestorebackend = new filestorebackends.CloudflareKV(this)
            if (this.env.hasOwnProperty(binding_kv)) {
                ok = true;
            }
        } else if (filestorebackendargs.type === filestorebackendtypes.cf_r2) {
            this.filestorebackend = new filestorebackends.CloudflareR2(this)
            if (this.env.hasOwnProperty("R2")) {
                ok = true;
            }
        } else if (filestorebackendargs.type === filestorebackendtypes.fdindex) {
            this.filestorebackend = new filestorebackends.FDIndex(this)
            ok = true;
        } else if (filestorebackendargs.type === filestorebackendtypes.google_drive) {
            this.filestorebackend = new filestorebackends.GoogleDrive(this)
            ok = true;
        }

        if (!ok) throw new Error("无效的文件存储后端。");
    }

    // 视图入口
    async view() {
        if (debugging) {
            console.log(leq);
            console.log("收到请求", this.requrl_path);
        }
        let matched_urlpatterns = [];
        for (const urlpattern of this.urlpatterns) {
            if (urlpattern.test(this)) {
                matched_urlpatterns.push(urlpattern);
                if (debugging) {
                    console.log("命中", urlpattern.constructor.name, urlpattern.view);
                }
                break;
            }
        }
        if (matched_urlpatterns.length === 0) {
            // return responsetypes.code_404(this, `没有URL匹配模式命中此路径：${this.requrl_path}`);
            return responsetypes.code_401(this, "", {}, true);
        }
        if (matched_urlpatterns.length > 1) {
            return responsetypes.code_500(this, `多个URL匹配模式命中此路径：${this.requrl_path}`);
        }
        const urlpattern = matched_urlpatterns[0];

        const br = await subviews.check_permission(this, urlpattern);
        if (!br.permitted) {
            if (debugging) console.log("检查会话", br);
            const error_msg = br.error_reason || "会话过期，请重新登录。";
            return responsetypes.code_401(this, error_msg, {}, false);
        }
        if (br.session_attr) {
            if (await this.databasebackend.session__auto_renew(br.session_attr)) br.renewed = true;
        }
        this.session_attr = br.session_attr;
        if (debugging) console.log("检查会话", br);

        let resp = await urlpattern.render(this);
        if (!resp) resp = responsetypes.code_400(this, requsterror.format_method(this.req));

        try {
            if (br.renewed) resp.headers.set("Set-Cookie", format_cookie(br.limit_hit === viewaccesspermissions.admin ? "admin_session_id" : "session_id", br.session_attr.sid, databasebackends._.session__keep_stored));
            if (this.hit_object_caches) resp.headers.set("hit-object-caches", "1");
        } catch (e) { // 某些响应改不了响应头，例如Deno的ws101响应
        }

        return resp;
    }

}


/*
* 请求类型
* */
const requestmethodtypes = {
    OPTIONS: "OPTIONS", GET: "GET", POST: "POST", PUT: "PUT", DELETE: "DELETE", HEAD: "HEAD",
}
const requsterror = {
    incorrect_password: "密码错误。",
    incorrect_username_or_password: "账号或密码错误。",
    disabled_account: "此账号被停用。",
    method: "错误的请求方法：",
    param: "无效参数：",
    user_not_found: "不存在此用户：",
    group_not_found: "不存在此组：",
    name_invalid: "无效名称：",
    name_repeated: "名称重复：",
    type_invalid: "无效类型：",

    format_method(req) {
        return requsterror.method + req.method;
    },

    format_param(args) {
        if (typeof args === "string") return requsterror.param + args;
        if (args.constructor.name === "URLSearchParams") return requsterror.param + JSON.stringify(Object.fromEntries(args));
        return requsterror.param + JSON.stringify(args);
    },

    format_user_not_found(i) {
        return `${requsterror.user_not_found}${i}`;
    },

    format_group_not_found(i) {
        return `${requsterror.group_not_found}${i}`;
    },

    format_name_invalid(i) {
        return `${requsterror.name_invalid}${i}`;
    },

    format_name_repeated(i) {
        return `${requsterror.name_repeated}${i}`;
    },


    format_type_invalid(i) {
        return `${requsterror.type_invalid}${i}`;
    },
}

/*
* 响应模板
* */
const responsetypes = {
    code_101: (server, body = null, headers = {}, args = {}) => { // 协议提升
        return new Response(body, {
            status: 101, headers: {...headers}, ...args,
        });
    },

    code_200: (server, body = "", headers = {}) => { // 正常
        return new Response(body, {
            status: 200, headers: {...headers},
        });
    },

    code_206: (server, body = "", headers = {}) => { // 断点下载
        return new Response(body, {
            status: 206, headers: {...headers},
        });
    },

    code_301: (server, body, location, headers = {}) => { // 永久重定向
        return new Response(body, {
            status: 301, headers: {
                ...headers, location: location,
            },
        });
    },

    code_302: (server, body, location, headers = {}) => { // 临时重定向
        return new Response(body, {
            status: 302, headers: {
                ...headers, location: location,
            },
        });
    },

    code_304: (server, headers = {}) => { // 文件内容未变
        return new Response(null, {
            status: 304, headers: {...headers},
        });
    },

    code_400: (server, body, headers = {}) => { // 请求错误
        return new Response(body, {
            status: 400, headers: {...headers},
        });
    },

    code_401: (server, body, headers = {}, interact = true) => { // 未认证
        let h = {...headers,}
        if (interact) h["WWW-Authenticate"] = `Basic realm="Restricted Area"`;
        return new Response(body, {
            status: 401, headers: h
        });
    },

    code_403: (server, body, headers = {}) => { // 已认证但没有权限
        return new Response(body, {
            status: 403, headers: {...headers},
        });
    },

    code_404: (server, body, headers = {}) => { // 资源未找到
        return new Response(body, {
            status: 404, headers: {...headers},
        });
    },

    code_409: (server, body, headers = {}) => { // 有冲突，例如用户的可用空间不足
        return new Response(body, {
            status: 409, headers: {...headers},
        });
    },

    code_500: (server, body, headers = {}) => { // 服务内部错误
        return new Response(body, {
            status: 500, headers: {...headers},
        });
    },

}


/*
* URL匹配模式类型
* */
const urlpatterntypes = (() => {
    class _ {
        constructor(marks) {
            this.marks = marks;
            if (!this.marks) this.marks = {}
        }

        check_view() {
            throw new Error("虚函数");
        }

        test(server) {
            throw new Error("虚函数");
        }

        render(server) {
            throw new Error("虚函数");
        }
    }

    class Path extends _ {
        constructor(route, view, marks) {
            super(marks);
            this.route = "^" + top_level_path + route + "$";
            this.regexp = new RegExp(this.route);
            this.view = view;
            this.check_view();
        }

        check_view() {
            if (this.view === undefined) {
                throw new Error(`无效视图：${this.route}，${this.view}`);
            }
        }

        test(server) {
            if (debugging) {
                console.log("尝试匹配", this.route);
            }
            return this.regexp.test(server.requrl_path);
        }

        render(server) {
            const result = this.regexp.exec(server.requrl_path);
            let args = {};
            if (result.groups !== undefined) args = {...result.groups};
            if (debugging) {
                console.log(leq);
                console.log("位置变量", this.route, result.groups,);
            }
            const urlpattern = {
                ...this, server: server,
            }
            return this.view.call(urlpattern, args);
        }

    }

    return {Path,};
})()


/*
* 处理请求入口
* */
async function handleRequest(request, env) {
    // console.log("handleRequest", request);
    if (request.method === requestmethodtypes.OPTIONS) return new Response('', {
        status: 200, headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': Object.keys(requestmethodtypes).join(", "),
        }
    });

    const checkin = new Checkin(request, env);
    await checkin.init();
    return await checkin.view();
}


/*
* 类型检查，拷贝自html
* */
const form_field_checker = {
    ffc_string_int: (value) => {
        if (!(typeof value === "string")) return false;
        if (!/^\d+$/.test(value)) return false;
        return true;
    },

    ffc_int: (value, allow_great_than = -1) => {
        return ((typeof value === "number") && (value > allow_great_than))
    },

    ffc_string_datetime_utc: (value) => {
        if (!(typeof value === "string")) return false;
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
        return true;
    },
}


/*
* 检查平台
* */
const Platforms = Object.freeze({
    unknown: "unknown",
    deno: "deno",
    cloudflare: "cloudflare",
    netlify: "netlify",
    fastly: "fastly",
    fermyon: "fermyon",
    wasmer: "wasmer",
});

function checkPlatform() {
    if (typeof globalThis?.Netlify !== "undefined" || typeof globalThis?.netlifyBlobsContext !== "undefined") {
        return Platforms.netlify;
    } else if (typeof globalThis?.fastly !== "undefined" || typeof globalThis?.FastlyBody !== "undefined") {
        return Platforms.fastly;
    } else if (typeof process !== "undefined" && process?.env?.WASMER_APP_VERSION_ID) {
        return Platforms.wasmer;
    } else if (typeof Deno !== "undefined") {
        return Platforms.deno;
    } else if (typeof self !== "undefined" && self.constructor && self.constructor.name === "ServiceWorkerGlobalScope") {
        return Platforms.cloudflare;
    } else if (typeof MultipartFormData !== "undefined") {
        return Platforms.fermyon;
    }
    return Platforms.unknown;
}

let Platform = checkPlatform();
console.log(`hello! ${Platform}.`,);


function isLocal(request,) {
    // Deno 本地环境：localhost:8000
    // Cloudflare Workers 本地开发环境：localhost 或 127.0.0.1 的任何端口
    const isDenoLocal = isPlatform(Platforms.deno) && /localhost(:8000)?(\/|$)/.test(request.url);
    const isCloudflareLocal = isPlatform(Platforms.cloudflare) && 
        (/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(request.url));
    return isDenoLocal || isCloudflareLocal;
}

function isPlatform(p) {
    return Platform === p || Platform === Platforms.unknown
}

function attachBackend(url) {
    if (isPlatform(Platforms.fastly)) {
        // const _backends = {"www.googleapis.com": "wwwgoogleapiscom",}
        if (typeof url === "string") url = new URL(url);
        return {
            // backend: _backends[url.hostname],
            backend: url.hostname.replace(/\./g, ''),
        };
    }
    return {};
}

function testEnvironment(request, env) {
    // console.log("platform", Platform,);
    // console.log("request", request,);
    // console.log("env", env,);
    // console.log("self", self, self?.constructor?.name,);
    // console.log("globalThis", globalThis, globalThis?.constructor?.name,);
    // console.log("globalKeys", JSON.stringify(Object.getOwnPropertyNames(globalThis), null, 2));
    return new Response(JSON.stringify({
        platform: typeof Platform === "string" ? Platform : "[non-serializable]",
        request: {
            method: request.method, url: request.url, headers: Object.fromEntries(request.headers.entries()),
        },
        env: typeof env === "object" ? Object.keys(env) : env,
        self: typeof self === "undefined" ? "undefined" : "[self omitted]",
        process: typeof process === "undefined" ? "undefined" : process,
        globalKeys: Object.getOwnPropertyNames(globalThis),
    }), {
        status: 200, headers: {
            'Content-Type': 'application/json'
        }
    });
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
    }
    return result;
}

function join_path(url, ...subs) {
    url = new URL(url);
    if (subs.length === 0) return url;
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/${subs.map(i => i.toString()).join("/")}`;
    return url;
}

async function format_error_response(resp) {
    const headers = {};
    for (const [k, v] of resp.headers.entries()) headers[k] = v;
    return `${resp.status} ${resp.url} ${await resp.text()} ${JSON.stringify(headers)}`;
}

function normalizeId(id) {
    if (!id) return id;
    // /[^\p{L}\p{N}\p{Script=Han}]+/gu
    return id.replace(norm_id_role_excluding_regexp, ''); // 数字 字母 中文 下划线 减号
    // return id.replace(/\W+/g, '');
}

function normalizePassword(p) {
    if (!p) return p;
    p = p.replace(/\W+/g, '');
    return p;
}

function parseDownloadRange(rangeHeader, size,) {
    let matched = false;
    let start = 0;
    let end = size - 1;
    if (rangeHeader) {
        const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
        if (rangeMatch) {
            matched = true;
            start = parseInt(rangeMatch[1], 10);
            if (rangeMatch[2]) {
                end = parseInt(rangeMatch[2], 10);
            }
        }
    }
    return {matched, start, end};
}

function format_bytes(bytes, sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]) {
    if (!bytes) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    let formattedSize = (bytes / Math.pow(1024, i)).toFixed(1);
    if (formattedSize % 1 === 0) formattedSize = parseInt(formattedSize);
    return `${formattedSize} ${sizes[i]}`;
}

function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}


/*
* 入口，拷贝自FD，去掉了updatedRequest因为Deno的ws需要关联原始request
* */
export default {
    async fetch(request, env) {
        // return testEnvironment(request, env);

        let event = {request: request};
        const url = new URL(event.request.url);

        // if (request.method === "POST") {
        //     console.log("body", globalThis.FastlyBody,);
        //     console.log("body-text", await request.text(),);
        //     // console.log("body-bytes", await streamToUint8Array(request.body),);
        // }

        let body = event.request.body;
        if (body && (Platform === Platforms.fastly)) { // fastly下必须要先把数据读出来
            // console.log("pre-read body", Platform, body);
            // body = await event.request.arrayBuffer();
            const uint8Array = await streamToUint8Array(body);
            body = bufferToStream(uint8Array.buffer);
            // console.log("pre-read body finished", Platform, body, uint8Array,);
        }
        // if (event.request.body && (Platform === Platforms.fastly)) {
        //     const uint8Array = await streamToUint8Array(body);
        //     body = bufferToStream(uint8Array.buffer);
        //     console.log("read", uint8Array);
        // }

        try {
            return await handleRequest(request, env);
        } catch (err) {
            console.error(url, err, err.payload,);
            return new Response(JSON.stringify({
                name: err.name, message: err.message, stack: err.stack, payload: err.payload,
            }), {
                status: 500, headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        // return handleRequest(updatedRequest, env).catch(err => {
        //     console.error(url, err);
        //     return new Response(JSON.stringify({name: err.name, message: err.message, stack: err.stack,}), {
        //         status: 500, headers: {
        //             'Content-Type': 'application/json'
        //         }
        //     });
        // });
    },
};


