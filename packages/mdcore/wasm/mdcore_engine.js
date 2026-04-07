/* @ts-self-types="./mdcore_engine.d.ts" */

/**
 * Detected Markdown flavor information
 */
export class FlavorInfo {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(FlavorInfo.prototype);
        obj.__wbg_ptr = ptr;
        FlavorInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FlavorInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_flavorinfo_free(ptr, 0);
    }
    /**
     * Confidence score 0.0 - 1.0
     * @returns {number}
     */
    get confidence() {
        const ret = wasm.__wbg_get_flavorinfo_confidence(this.__wbg_ptr);
        return ret;
    }
    /**
     * Whether frontmatter was detected (yaml, toml, json)
     * @returns {string | undefined}
     */
    get frontmatter() {
        const ret = wasm.__wbg_get_flavorinfo_frontmatter(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Whether MDX/JSX components were detected
     * @returns {boolean}
     */
    get jsx() {
        const ret = wasm.__wbg_get_flavorinfo_jsx(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Whether math syntax was detected (katex, latex)
     * @returns {boolean}
     */
    get math() {
        const ret = wasm.__wbg_get_flavorinfo_math(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Whether mermaid diagrams were detected
     * @returns {boolean}
     */
    get mermaid() {
        const ret = wasm.__wbg_get_flavorinfo_mermaid(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Primary detected flavor: "gfm", "obsidian", "mdx", "pandoc", "commonmark"
     * @returns {string}
     */
    get primary() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_flavorinfo_primary(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Whether wikilinks [[...]] were detected
     * @returns {boolean}
     */
    get wikilinks() {
        const ret = wasm.__wbg_get_flavorinfo_wikilinks(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Confidence score 0.0 - 1.0
     * @param {number} arg0
     */
    set confidence(arg0) {
        wasm.__wbg_set_flavorinfo_confidence(this.__wbg_ptr, arg0);
    }
    /**
     * Whether frontmatter was detected (yaml, toml, json)
     * @param {string | null} [arg0]
     */
    set frontmatter(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_flavorinfo_frontmatter(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Whether MDX/JSX components were detected
     * @param {boolean} arg0
     */
    set jsx(arg0) {
        wasm.__wbg_set_flavorinfo_jsx(this.__wbg_ptr, arg0);
    }
    /**
     * Whether math syntax was detected (katex, latex)
     * @param {boolean} arg0
     */
    set math(arg0) {
        wasm.__wbg_set_flavorinfo_math(this.__wbg_ptr, arg0);
    }
    /**
     * Whether mermaid diagrams were detected
     * @param {boolean} arg0
     */
    set mermaid(arg0) {
        wasm.__wbg_set_flavorinfo_mermaid(this.__wbg_ptr, arg0);
    }
    /**
     * Primary detected flavor: "gfm", "obsidian", "mdx", "pandoc", "commonmark"
     * @param {string} arg0
     */
    set primary(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_flavorinfo_primary(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Whether wikilinks [[...]] were detected
     * @param {boolean} arg0
     */
    set wikilinks(arg0) {
        wasm.__wbg_set_flavorinfo_wikilinks(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) FlavorInfo.prototype[Symbol.dispose] = FlavorInfo.prototype.free;

/**
 * Render result containing HTML and metadata
 */
export class RenderResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RenderResult.prototype);
        obj.__wbg_ptr = ptr;
        RenderResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RenderResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_renderresult_free(ptr, 0);
    }
    /**
     * Detected flavor information
     * @returns {FlavorInfo}
     */
    get flavor() {
        const ret = wasm.__wbg_get_renderresult_flavor(this.__wbg_ptr);
        return FlavorInfo.__wrap(ret);
    }
    /**
     * Rendered HTML output
     * @returns {string}
     */
    get html() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_renderresult_html(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Extracted title (first h1)
     * @returns {string | undefined}
     */
    get title() {
        const ret = wasm.__wbg_get_renderresult_title(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Table of contents entries
     * @returns {string}
     */
    get toc_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_renderresult_toc_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Detected flavor information
     * @param {FlavorInfo} arg0
     */
    set flavor(arg0) {
        _assertClass(arg0, FlavorInfo);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_renderresult_flavor(this.__wbg_ptr, ptr0);
    }
    /**
     * Rendered HTML output
     * @param {string} arg0
     */
    set html(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_renderresult_html(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Extracted title (first h1)
     * @param {string | null} [arg0]
     */
    set title(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_renderresult_title(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Table of contents entries
     * @param {string} arg0
     */
    set toc_json(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_renderresult_toc_json(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) RenderResult.prototype[Symbol.dispose] = RenderResult.prototype.free;

/**
 * WASM-specific: detect flavor only (no rendering)
 * @param {string} markdown
 * @returns {any}
 */
export function detectFlavor(markdown) {
    const ptr0 = passStringToWasm0(markdown, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.detectFlavor(ptr0, len0);
    return ret;
}

/**
 * Main entry point: parse and render Markdown to HTML
 * @param {string} markdown
 * @returns {RenderResult}
 */
export function render(markdown) {
    const ptr0 = passStringToWasm0(markdown, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.render(ptr0, len0);
    return RenderResult.__wrap(ret);
}

/**
 * WASM-specific: render with JSON options
 * @param {string} markdown
 * @param {string} options_json
 * @returns {RenderResult}
 */
export function renderWithOptions(markdown, options_json) {
    const ptr0 = passStringToWasm0(markdown, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(options_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.renderWithOptions(ptr0, len0, ptr1, len1);
    return RenderResult.__wrap(ret);
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_6ddd609b62940d55: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_new_ab79df5bd7c26067: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_set_6be42768c690e380: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbindgen_cast_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./mdcore_engine_bg.js": import0,
    };
}

const FlavorInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_flavorinfo_free(ptr >>> 0, 1));
const RenderResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_renderresult_free(ptr >>> 0, 1));

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('mdcore_engine_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
