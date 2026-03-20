/* @ts-self-types="./mdcore_engine.d.ts" */

import * as wasm from "./mdcore_engine_bg.wasm";
import { __wbg_set_wasm } from "./mdcore_engine_bg.js";
__wbg_set_wasm(wasm);

export {
    FlavorInfo, RenderResult, detectFlavor, render, renderWithOptions
} from "./mdcore_engine_bg.js";
