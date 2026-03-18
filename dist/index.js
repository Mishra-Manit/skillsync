#!/usr/bin/env bun
// @bun
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// node_modules/@crustjs/core/dist/shared/chunk-vt64gs69.js
import { parseArgs as U } from "util";
function q(B) {
  let J = {}, G = {};
  if (!B)
    return { options: J, aliasToName: G };
  let z = new Map;
  for (let j of Object.keys(B))
    z.set(j, j);
  for (let [j, H] of Object.entries(B)) {
    if (j.startsWith("no-")) {
      let L = j.slice(3);
      throw new W("DEFINITION", `Flag "--${j}" must not use "no-" prefix; define "${L}" and negate with "--no-${L}"`);
    }
    let K = H.type === "boolean" ? "boolean" : "string", Q = { type: K };
    if (H.multiple)
      Q.multiple = true;
    if (H.short) {
      if (H.short.startsWith("no-"))
        throw new W("DEFINITION", `Short alias "-${H.short}" on "--${j}" must not use "no-" prefix (reserved for negation)`);
      let L = z.get(H.short);
      if (L)
        throw new W("DEFINITION", `Alias collision: "-${H.short}" is used by both "--${L}" and "--${j}"`);
      z.set(H.short, j), G[H.short] = j, Q.short = H.short;
    }
    if (H.aliases)
      for (let L of H.aliases) {
        if (L.startsWith("no-"))
          throw new W("DEFINITION", `Alias "--${L}" on "--${j}" must not use "no-" prefix (reserved for negation)`);
        let X = z.get(L);
        if (X)
          throw new W("DEFINITION", `Alias collision: "${L.length === 1 ? "-" : "--"}${L}" is used by both "--${X}" and "--${j}"`);
        z.set(L, j), G[L] = j;
        let $ = { type: K };
        if (H.multiple)
          $.multiple = true;
        J[L] = $;
      }
    J[j] = Q;
  }
  return { options: J, aliasToName: G };
}
function _(B, J, G) {
  if (J === "number") {
    let z = Number(B);
    if (Number.isNaN(z))
      throw new W("PARSE", `Expected number for ${G}, got "${B}"`);
    return z;
  }
  if (J === "boolean")
    return B === "true" || B === "1";
  return B;
}
function I(B, J, G) {
  let z = `--${B}`;
  if (J.multiple && Array.isArray(G))
    return J.type === "boolean" ? G.filter((j) => typeof j === "boolean") : G.map((j) => _(j, J.type, z));
  if (J.type === "boolean") {
    if (typeof G === "boolean")
      return G;
    throw new W("PARSE", `Expected boolean value for flag "${z}", got ${typeof G}`);
  }
  if (typeof G === "string")
    return _(G, J.type, z);
  if (G === true)
    return J.default ?? undefined;
  return G;
}
function M(B, J, G) {
  let z = {};
  for (let j in B) {
    let H = J[j] ?? j;
    if (!(H in G))
      continue;
    let K = B[j], Q = z[H];
    if (Q !== undefined && Array.isArray(Q) && Array.isArray(K))
      Q.push(...K);
    else
      z[H] = K;
  }
  return z;
}
function h(B, J, G) {
  if (!B)
    return {};
  let z = M(J, G, B), j = {};
  for (let [H, K] of Object.entries(B)) {
    let Q = z[H];
    if (Q !== undefined) {
      j[H] = I(H, K, Q);
      continue;
    }
    j[H] = K.default ?? undefined;
  }
  return j;
}
function O(B, J) {
  if (!B)
    return;
  for (let [G, z] of Object.entries(B))
    if (z.required === true && z.default === undefined) {
      if (J[G] === undefined)
        throw new W("VALIDATION", `Missing required flag "--${G}"`);
    }
}
function P(B, J) {
  if (!B)
    return {};
  let G = {}, z = 0;
  for (let j of B) {
    let { name: H } = j;
    if (j.variadic) {
      let K = J.slice(z);
      G[H] = j.type === "string" ? K : K.map((Q) => _(Q, j.type, `<${H}>`)), z = J.length;
    } else if (z < J.length)
      G[H] = _(J[z], j.type, `<${H}>`), z++;
    else
      G[H] = j.default ?? undefined;
  }
  return G;
}
function S(B, J, G) {
  if (!J)
    return;
  for (let z of B) {
    if (z === "--")
      return;
    if (!z.startsWith("--no-"))
      continue;
    let j = z.indexOf("="), H = j === -1 ? z.slice(5) : z.slice(5, j);
    if (!H)
      continue;
    let K = G[H];
    if (!K)
      continue;
    if (K === H)
      continue;
    if (J[K]?.type !== "boolean")
      continue;
    throw new W("PARSE", `Cannot negate alias "--no-${H}"; use "--no-${K}" instead`);
  }
}
function b(B, J) {
  let { args: G, effectiveFlags: z } = B, { options: j, aliasToName: H } = q(z);
  S(J, z, H);
  let K;
  try {
    K = U({ args: J, options: j, strict: true, allowPositionals: true, allowNegative: true, tokens: true });
  } catch (Y) {
    if (Y instanceof Error) {
      let Z = Y.message.match(/Unknown option '(.+?)'/);
      if (Z)
        throw new W("PARSE", `Unknown flag "${Z[1]}"`).withCause(Y);
    }
    throw new W("PARSE", "Failed to parse command arguments").withCause(Y);
  }
  let Q = [], L = [];
  if (K.tokens) {
    let Y = false;
    for (let Z of K.tokens) {
      if (Z.kind === "option-terminator") {
        Y = true;
        continue;
      }
      if (Z.kind === "positional")
        (Y ? Q : L).push(Z.value ?? "");
    }
  } else
    L.push(...K.positionals);
  let X = h(z, K.values, H);
  return { args: P(G, L), flags: X, rawArgs: Q };
}
function E(B, J) {
  let { args: G, effectiveFlags: z } = B, j = J.args, H = J.flags;
  if (G)
    for (let K of G) {
      let { name: Q } = K, L = `argument "<${Q}>"`, X = j[Q];
      if (K.required === true && K.default === undefined) {
        if (K.variadic) {
          if (!Array.isArray(X) || X.length === 0)
            throw new W("VALIDATION", `Missing required ${L}`);
        } else if (X === undefined)
          throw new W("VALIDATION", `Missing required ${L}`);
      }
    }
  O(z, H);
}
var W;
var init_chunk_vt64gs69 = __esm(() => {
  W = class W extends Error {
    code;
    details;
    cause;
    constructor(B, J, ...G) {
      super(J);
      this.name = "CrustError", this.code = B, this.details = G[0];
    }
    is(B) {
      return this.code === B;
    }
    withCause(B) {
      return this.cause = B, this;
    }
  };
});

// node_modules/@crustjs/core/dist/shared/chunk-5apf3vnv.js
var exports_chunk_5apf3vnv = {};
__export(exports_chunk_5apf3vnv, {
  validateCommandTree: () => _2
});
function M2(B) {
  switch (B.type) {
    case "number":
      return "1";
    case "boolean":
      return "true";
    default:
      return "sample";
  }
}
function X(B) {
  let z = [], K = B.effectiveFlags;
  for (let [j, G] of Object.entries(K)) {
    if (G.required !== true || G.default !== undefined)
      continue;
    if (z.push(`--${j}`), G.type !== "boolean")
      z.push(M2(G));
  }
  let J = B.args;
  if (J)
    for (let j of J) {
      if (j.required !== true || j.default !== undefined)
        continue;
      z.push(M2(j));
    }
  return z;
}
function _2(B) {
  let z = [{ command: B, path: [B.meta.name] }], K = new Set;
  while (z.length > 0) {
    let J = z.pop();
    if (!J)
      break;
    let { command: j, path: G } = J;
    if (K.has(j))
      continue;
    K.add(j);
    try {
      let H = b(j, X(j));
      E(j, H);
    } catch (H) {
      let L = H instanceof Error ? H.message : "Unknown validation error";
      throw new W("DEFINITION", `Command "${G.join(" ")}" failed runtime validation: ${L}`).withCause(H);
    }
    for (let [H, L] of Object.entries(j.subCommands))
      z.push({ command: L, path: [...G, H] });
  }
}
var init_chunk_5apf3vnv = __esm(() => {
  init_chunk_vt64gs69();
});

// node_modules/@crustjs/core/dist/index.js
init_chunk_vt64gs69();
function I2(j) {
  return { meta: { name: j }, localFlags: {}, effectiveFlags: {}, args: undefined, subCommands: {}, plugins: [], preRun: undefined, run: undefined, postRun: undefined };
}
function X2(j, q2) {
  let J = {};
  for (let [Q, G] of Object.entries(j))
    if (G.inherit === true)
      J[Q] = G;
  for (let [Q, G] of Object.entries(q2))
    J[Q] = G;
  return J;
}
function D(j, q2) {
  let J = [j.meta.name], Q = j, G = q2;
  while (G.length > 0) {
    let H = Q.subCommands;
    if (!H || Object.keys(H).length === 0)
      break;
    let Z = G[0];
    if (!Z || Z.startsWith("-"))
      break;
    if (Z in H && H[Z]) {
      Q = H[Z], J.push(Z), G = G.slice(1);
      continue;
    }
    if (Q.run)
      break;
    let Y = Object.keys(H);
    throw new W("COMMAND_NOT_FOUND", `Unknown command "${Z}".`, { input: Z, available: Y, commandPath: [...J], parentCommand: Q });
  }
  return { command: Q, argv: G, commandPath: J };
}
function F(j) {
  for (let [q2, J] of Object.entries(j)) {
    if (q2.startsWith("no-")) {
      let Q = q2.slice(3);
      throw new W("DEFINITION", `Flag "--${q2}" must not use "no-" prefix; define "${Q}" and negate with "--no-${Q}"`);
    }
    if (J.short?.startsWith("no-"))
      throw new W("DEFINITION", `Short alias "-${J.short}" on "--${q2}" must not use "no-" prefix (reserved for negation)`);
    if (J.aliases) {
      for (let Q of J.aliases)
        if (Q.startsWith("no-"))
          throw new W("DEFINITION", `Alias "--${Q}" on "--${q2}" must not use "no-" prefix (reserved for negation)`);
    }
  }
}
var P2 = "CRUST_INTERNAL_VALIDATE_ONLY";
var _3 = 130;
var k = "__CRUST_VALIDATE_RESULT__";
function w() {
  let j = new Map;
  return { get(q2) {
    return j.get(q2);
  }, has(q2) {
    return j.has(q2);
  }, set(q2, J) {
    j.set(q2, J);
  }, delete(q2) {
    return j.delete(q2);
  } };
}
function L(j) {
  if (!(j instanceof Error))
    return false;
  return j.name === "CancelledError";
}
function O2(j, q2) {
  j.effectiveFlags = X2(q2, j.localFlags);
  for (let J of Object.values(j.subCommands))
    O2(J, j.effectiveFlags);
}
function N(j) {
  return { addFlag(q2, J, Q) {
    if (J in q2.effectiveFlags)
      j?.push(`Plugin flag "--${J}" on "${q2.meta.name}" overrides existing flag`);
    q2.effectiveFlags[J] = Q;
  }, addSubCommand(q2, J, Q) {
    if (!J.trim())
      throw new W("DEFINITION", "addSubCommand: name must be a non-empty string");
    if (q2.subCommands[J]) {
      j?.push(`Plugin subcommand "${J}" on "${q2.meta.name}" skipped (already exists)`);
      return;
    }
    O2(Q, q2.effectiveFlags), q2.subCommands[J] = Q;
  } };
}
async function b2(j, q2, J) {
  for (let Q of j) {
    if (!Q.setup)
      continue;
    await Q.setup(q2, J);
  }
}
async function T(j, q2, J) {
  let Q = j.map((Z) => Z.middleware).filter((Z) => Boolean(Z)), G = -1, H = async (Z) => {
    if (Z <= G)
      throw new W("DEFINITION", "Plugin middleware called next() multiple times");
    if (G = Z, Z === Q.length) {
      await J();
      return;
    }
    let Y = Q[Z];
    if (!Y)
      throw new W("DEFINITION", "Plugin middleware stack is invalid");
    await Y(q2, () => H(Z + 1));
  };
  await H(0);
}
function x(j) {
  let q2 = [...j.plugins];
  for (let J of Object.values(j.subCommands))
    q2.push(...x(J));
  return q2;
}
function y(j) {
  if (Object.freeze(j), Object.freeze(j.localFlags), Object.freeze(j.effectiveFlags), Object.freeze(j.meta), Object.freeze(j.plugins), j.args)
    Object.freeze(j.args);
  for (let q2 of Object.values(j.subCommands))
    y(q2);
  Object.freeze(j.subCommands);
}

class R {
  _node;
  _inheritedFlags;
  constructor(j) {
    if (!j.trim())
      throw new W("DEFINITION", "meta.name must be a non-empty string");
    this._node = I2(j), this._inheritedFlags = {};
  }
  static _createChild(j, q2) {
    let J = new R(j);
    return J._inheritedFlags = q2, J;
  }
  _clone(j) {
    let q2 = Object.create(Object.getPrototypeOf(this)), J = { ...this._node, localFlags: { ...this._node.localFlags }, effectiveFlags: { ...this._node.effectiveFlags }, subCommands: { ...this._node.subCommands }, plugins: [...this._node.plugins], meta: { ...this._node.meta }, args: this._node.args ? [...this._node.args] : undefined, ...j };
    return q2._node = J, q2._inheritedFlags = this._inheritedFlags, q2;
  }
  meta(j) {
    return this._clone({ meta: { ...this._node.meta, ...j } });
  }
  flags(j) {
    F(j);
    let q2 = {};
    for (let [J, Q] of Object.entries(j))
      q2[J] = { ...Q };
    return this._clone({ localFlags: q2, effectiveFlags: X2(this._inheritedFlags, q2) });
  }
  args(j) {
    let q2 = j.map((J) => ({ ...J }));
    return this._clone({ args: q2 });
  }
  run(j) {
    return this._clone({ run: j });
  }
  preRun(j) {
    return this._clone({ preRun: j });
  }
  postRun(j) {
    return this._clone({ postRun: j });
  }
  use(j) {
    return this._clone({ plugins: [...this._node.plugins, j] });
  }
  sub(j) {
    if (!j.trim())
      throw new W("DEFINITION", "Subcommand name must be a non-empty string");
    let q2 = X2(this._inheritedFlags, this._node.localFlags);
    return R._createChild(j, q2);
  }
  command(j, q2) {
    if (typeof j === "string") {
      let H = j;
      if (!q2)
        throw new W("DEFINITION", "command(name, cb) requires a callback");
      if (!H.trim())
        throw new W("DEFINITION", "Subcommand name must be a non-empty string");
      if (this._node.subCommands[H])
        throw new W("DEFINITION", `Subcommand "${H}" is already registered`);
      let Z = X2(this._inheritedFlags, this._node.localFlags), Y = R._createChild(H, Z), z = q2(Y), W2 = { ...z._node, effectiveFlags: X2(z._inheritedFlags, z._node.localFlags) };
      return this._clone({ subCommands: { ...this._node.subCommands, [H]: W2 } });
    }
    let J = j, Q = J._node.meta.name;
    if (!Q.trim())
      throw new W("DEFINITION", "Subcommand name must be a non-empty string");
    if (this._node.subCommands[Q])
      throw new W("DEFINITION", `Subcommand "${Q}" is already registered`);
    let G = { ...J._node, effectiveFlags: X2(J._inheritedFlags, J._node.localFlags) };
    return this._clone({ subCommands: { ...this._node.subCommands, [Q]: G } });
  }
  async execute(j) {
    let q2 = j?.argv ?? process.argv.slice(2), J = this._node, Q = x(J), G = [], H = w(), Z = { argv: [...q2], rootCommand: J, state: H }, Y = N(G);
    try {
      await b2(Q, Z, Y);
    } catch (W2) {
      if (L(W2)) {
        process.exitCode = _3;
        return;
      }
      if (W2 instanceof W) {
        console.error(`Error: ${W2.message}`), process.exitCode = 1;
        return;
      }
      let K = W2 instanceof Error ? W2.message : String(W2);
      console.error(`Error: ${K}`), process.exitCode = 1;
      return;
    }
    if (y(J), process.env[P2] === "1") {
      let W2 = (async () => {
        try {
          let { validateCommandTree: K } = await Promise.resolve().then(() => (init_chunk_5apf3vnv(), exports_chunk_5apf3vnv));
          K(J);
          for (let U2 of G)
            console.warn(`Warning: ${U2}`);
          return { ok: true };
        } catch (K) {
          let U2 = K instanceof Error ? K.message : String(K);
          return console.error(U2), process.exitCode = 1, { ok: false, error: K };
        }
      })();
      return globalThis[k] = W2, await W2, process.exit(process.exitCode ?? 0);
    }
    for (let W2 of G)
      console.warn(`Warning: ${W2}`);
    let z = { argv: [...q2], rootCommand: J, state: H, route: null, input: null };
    try {
      let W2, K;
      try {
        let U2 = D(J, [...q2]);
        z.route = U2, W2 = U2.command, K = b(W2, U2.argv), z.input = K;
      } catch (U2) {
        await T(Q, z, async () => {
          throw U2;
        });
        return;
      }
      await T(Q, z, async () => {
        if (E(W2, K), !W2.run)
          return;
        let U2 = { args: K.args, flags: K.flags, rawArgs: K.rawArgs, command: W2 }, V;
        try {
          if (W2.preRun)
            await W2.preRun(U2);
          await W2.run(U2);
        } catch (M3) {
          V = M3;
        }
        if (W2.postRun)
          try {
            await W2.postRun(U2);
          } catch (M3) {
            if (!V)
              V = M3;
            else
              console.error(`Error in postRun: ${M3 instanceof Error ? M3.message : String(M3)}`);
          }
        if (V)
          throw V;
      });
    } catch (W2) {
      if (L(W2)) {
        process.exitCode = _3;
        return;
      }
      if (W2 instanceof W) {
        console.error(`Error: ${W2.message}`), process.exitCode = 1;
        return;
      }
      if (W2 instanceof Error) {
        let K = new W("EXECUTION", W2.message).withCause(W2);
        console.error(`Error: ${K.message}`), process.exitCode = 1;
        return;
      }
      console.error(`Error: ${String(W2)}`), process.exitCode = 1;
    }
  }
}

// node_modules/@crustjs/style/dist/index.js
var Pz = Object.defineProperty;
var bz = (z) => z;
function yz(z, Z) {
  this[z] = bz.bind(null, Z);
}
var vz = (z, Z) => {
  for (var V in Z)
    Pz(z, V, { get: Z[V], enumerable: true, configurable: true, set: yz.bind(Z, V) });
};
var q2 = {};
vz(q2, { yellow: () => C, white: () => P3, underline: () => L2, strikethrough: () => T2, reset: () => Iz, red: () => f, magenta: () => S2, italic: () => E2, inverse: () => I3, hidden: () => N2, green: () => W2, gray: () => b3, dim: () => R2, cyan: () => g, brightYellow: () => m, brightWhite: () => h2, brightRed: () => y2, brightMagenta: () => x2, brightGreen: () => v, brightCyan: () => p, brightBlue: () => u, bold: () => M3, blue: () => w2, black: () => k2, bgYellow: () => l, bgWhite: () => o, bgRed: () => d, bgMagenta: () => r, bgGreen: () => n, bgCyan: () => a, bgBrightYellow: () => zz, bgBrightWhite: () => Qz, bgBrightRed: () => t, bgBrightMagenta: () => Zz, bgBrightGreen: () => e, bgBrightCyan: () => $z, bgBrightBlue: () => Vz, bgBrightBlack: () => i, bgBlue: () => s, bgBlack: () => c });
function O3(z, Z) {
  return { open: `\x1B[${z}m`, close: `\x1B[${Z}m` };
}
var Iz = O3(0, 0);
var M3 = O3(1, 22);
var R2 = O3(2, 22);
var E2 = O3(3, 23);
var L2 = O3(4, 24);
var I3 = O3(7, 27);
var N2 = O3(8, 28);
var T2 = O3(9, 29);
var k2 = O3(30, 39);
var f = O3(31, 39);
var W2 = O3(32, 39);
var C = O3(33, 39);
var w2 = O3(34, 39);
var S2 = O3(35, 39);
var g = O3(36, 39);
var P3 = O3(37, 39);
var b3 = O3(90, 39);
var y2 = O3(91, 39);
var v = O3(92, 39);
var m = O3(93, 39);
var u = O3(94, 39);
var x2 = O3(95, 39);
var p = O3(96, 39);
var h2 = O3(97, 39);
var c = O3(40, 49);
var d = O3(41, 49);
var n = O3(42, 49);
var l = O3(43, 49);
var s = O3(44, 49);
var r = O3(45, 49);
var a = O3(46, 49);
var o = O3(47, 49);
var i = O3(100, 49);
var t = O3(101, 49);
var e = O3(102, 49);
var zz = O3(103, 49);
var Vz = O3(104, 49);
var Zz = O3(105, 49);
var $z = O3(106, 49);
var Qz = O3(107, 49);
function jz(z, Z) {
  if (z === "always")
    return true;
  if (z === "never")
    return false;
  let V = Z?.isTTY ?? process.stdout?.isTTY ?? false;
  if ((Z?.noColor !== undefined ? Z.noColor : process.env.NO_COLOR) !== undefined)
    return false;
  return V;
}
function _z(z, Z) {
  if (z === "always")
    return true;
  if (z === "never")
    return false;
  if (!jz(z, Z))
    return false;
  let Q = (Z !== undefined && "colorTerm" in Z ? Z.colorTerm : process.env.COLORTERM)?.toLowerCase();
  if (Q === "truecolor" || Q === "24bit")
    return true;
  let J = Z !== undefined && "term" in Z ? Z.term : process.env.TERM;
  if (J !== undefined) {
    let j = J.toLowerCase();
    if (j.includes("24bit") || j.includes("truecolor") || j.endsWith("-direct"))
      return true;
  }
  return false;
}
function K(z, Z) {
  if (z === "")
    return "";
  let { open: V, close: $ } = Z;
  if (z.includes($))
    z = z.replaceAll($, $ + V);
  return V + z + $;
}
function Dz(z, Z) {
  if (!Number.isInteger(z) || z < 0 || z > 255)
    throw RangeError(`Invalid ${Z} value: ${String(z)}. Must be an integer between 0 and 255.`);
}
function Tz(z, Z, V) {
  Dz(z, "red"), Dz(Z, "green"), Dz(V, "blue");
}
var NV = /^#([0-9a-f]{3})$/i;
var TV = /^#([0-9a-f]{6})$/i;
function Fz(z) {
  let Z = NV.exec(z);
  if (Z) {
    let $ = Z[1], Q = $.charAt(0), X3 = $.charAt(1), J = $.charAt(2);
    return [Number.parseInt(Q + Q, 16), Number.parseInt(X3 + X3, 16), Number.parseInt(J + J, 16)];
  }
  let V = TV.exec(z);
  if (V) {
    let $ = V[1];
    return [Number.parseInt($.slice(0, 2), 16), Number.parseInt($.slice(2, 4), 16), Number.parseInt($.slice(4, 6), 16)];
  }
  throw TypeError(`Invalid hex color: "${z}". Expected format: "#RGB" or "#RRGGBB".`);
}
function Hz(z, Z, V) {
  return Tz(z, Z, V), { open: `\x1B[38;2;${z};${Z};${V}m`, close: "\x1B[39m" };
}
function Gz(z, Z, V) {
  return Tz(z, Z, V), { open: `\x1B[48;2;${z};${Z};${V}m`, close: "\x1B[49m" };
}
function kz(z) {
  let [Z, V, $] = Fz(z);
  return Hz(Z, V, $);
}
function fz(z) {
  let [Z, V, $] = Fz(z);
  return Gz(Z, V, $);
}
function Bz(z, Z, V, $) {
  return K(z, Hz(Z, V, $));
}
function Az(z, Z, V, $) {
  return K(z, Gz(Z, V, $));
}
function qz(z, Z) {
  return K(z, kz(Z));
}
function Mz(z, Z) {
  return K(z, fz(Z));
}
function kV() {
  let { reset: z, ...Z } = q2;
  return Z;
}
var Wz = Object.freeze(kV());
var Rz = Object.freeze(Object.keys(Wz));
function Cz(z) {
  return Wz[z];
}
function fV(z, Z, V) {
  if (!V || z === "")
    return z;
  let $ = z;
  for (let Q = Z.length - 1;Q >= 0; Q--) {
    let X3 = Z[Q];
    if (X3 === undefined)
      continue;
    $ = K($, Cz(X3));
  }
  return $;
}
function WV(z) {
  let Z = new Map;
  function V(Q) {
    return Q.join("|");
  }
  function $(Q) {
    let X3 = V(Q), J = Z.get(X3);
    if (J)
      return J;
    let j = (Y) => fV(Y, Q, z);
    Z.set(X3, j);
    for (let Y of Rz)
      Object.defineProperty(j, Y, { configurable: false, enumerable: true, get() {
        return $([...Q, Y]);
      } });
    return Object.freeze(j);
  }
  return $;
}
function CV(z) {
  let Z = {};
  for (let V of Rz)
    Z[V] = z([V]);
  return Z;
}
function Jz(z) {
  let Z = z?.mode ?? "auto", V = jz(Z, z?.overrides), $ = _z(Z, z?.overrides), Q = WV(V), X3 = CV(Q), J = { enabled: V, trueColorEnabled: $, apply: V ? (j, Y) => K(j, Y) : (j, Y) => j, rgb: $ ? (j, Y, U2, _4) => Bz(j, Y, U2, _4) : (j, Y, U2, _4) => j, bgRgb: $ ? (j, Y, U2, _4) => Az(j, Y, U2, _4) : (j, Y, U2, _4) => j, hex: $ ? (j, Y) => qz(j, Y) : (j, Y) => j, bgHex: $ ? (j, Y) => Mz(j, Y) : (j, Y) => j, ...X3 };
  return Object.freeze(J);
}
var wV = Jz();
function Ez(z) {
  return Object.freeze({ heading1: (V) => z.bold(z.underline(V)), heading2: (V) => z.bold(V), heading3: (V) => z.bold(z.yellow(V)), heading4: (V) => z.yellow(V), heading5: (V) => z.dim(z.yellow(V)), heading6: (V) => z.dim(V), text: (V) => V, emphasis: (V) => z.italic(V), strong: (V) => z.bold(V), strongEmphasis: (V) => z.bold(z.italic(V)), strikethrough: (V) => z.strikethrough(V), inlineCode: (V) => z.cyan(V), linkText: (V) => z.blue(z.underline(V)), linkUrl: (V) => z.dim(z.underline(V)), autolink: (V) => z.blue(z.underline(V)), blockquoteMarker: (V) => z.dim(z.green(V)), blockquoteText: (V) => z.italic(V), listMarker: (V) => z.dim(V), orderedListMarker: (V) => z.dim(V), taskChecked: (V) => z.green(V), taskUnchecked: (V) => z.dim(V), codeFence: (V) => z.dim(V), codeInfo: (V) => z.dim(z.italic(V)), codeText: (V) => z.cyan(V), thematicBreak: (V) => z.dim(V), tableHeader: (V) => z.bold(V), tableCell: (V) => V, tableBorder: (V) => z.dim(V), imageAltText: (V) => z.italic(z.magenta(V)), imageUrl: (V) => z.dim(z.underline(V)) });
}
function wz(z) {
  let Z = Jz(z?.style), V = Ez(Z), $ = z?.overrides;
  if (!$)
    return V;
  let Q = { heading1: $.heading1 ?? V.heading1, heading2: $.heading2 ?? V.heading2, heading3: $.heading3 ?? V.heading3, heading4: $.heading4 ?? V.heading4, heading5: $.heading5 ?? V.heading5, heading6: $.heading6 ?? V.heading6, text: $.text ?? V.text, emphasis: $.emphasis ?? V.emphasis, strong: $.strong ?? V.strong, strongEmphasis: $.strongEmphasis ?? V.strongEmphasis, strikethrough: $.strikethrough ?? V.strikethrough, inlineCode: $.inlineCode ?? V.inlineCode, linkText: $.linkText ?? V.linkText, linkUrl: $.linkUrl ?? V.linkUrl, autolink: $.autolink ?? V.autolink, blockquoteMarker: $.blockquoteMarker ?? V.blockquoteMarker, blockquoteText: $.blockquoteText ?? V.blockquoteText, listMarker: $.listMarker ?? V.listMarker, orderedListMarker: $.orderedListMarker ?? V.orderedListMarker, taskChecked: $.taskChecked ?? V.taskChecked, taskUnchecked: $.taskUnchecked ?? V.taskUnchecked, codeFence: $.codeFence ?? V.codeFence, codeInfo: $.codeInfo ?? V.codeInfo, codeText: $.codeText ?? V.codeText, thematicBreak: $.thematicBreak ?? V.thematicBreak, tableHeader: $.tableHeader ?? V.tableHeader, tableCell: $.tableCell ?? V.tableCell, tableBorder: $.tableBorder ?? V.tableBorder, imageAltText: $.imageAltText ?? V.imageAltText, imageUrl: $.imageUrl ?? V.imageUrl };
  return Object.freeze(Q);
}
var nV = wz();

// node_modules/@crustjs/plugins/dist/index.js
function A2(o2) {
  let n2 = o2.variadic ? `${o2.name}...` : o2.name;
  return o2.required ? `<${n2}>` : `[${n2}]`;
}
function Y(o2, n2, f2) {
  if (o2.usage)
    return o2.usage;
  let s2 = [f2.join(" ")];
  if (Object.keys(n2.subCommands).length > 0 && !n2.run)
    s2.push("<command>");
  if (n2.args)
    for (let r2 of n2.args)
      s2.push(A2(r2));
  if (Object.keys(n2.effectiveFlags).length > 0)
    s2.push("[options]");
  return s2.join(" ");
}
function I4(o2, n2) {
  if (n2.short)
    return `-${n2.short}, --${o2}`;
  return `--${o2}`;
}
function R3(o2) {
  if (Object.keys(o2).length === 0)
    return [];
  let n2 = ["OPTIONS:"];
  for (let [f2, s2] of Object.entries(o2)) {
    let r2 = I4(f2, s2).padEnd(18, " ");
    n2.push(`  ${r2}${s2.description ?? ""}`.trimEnd());
  }
  return n2;
}
function X3(o2) {
  if (!o2.args || o2.args.length === 0)
    return [];
  let n2 = ["ARGS:"];
  for (let f2 of o2.args) {
    let s2 = A2(f2).padEnd(18, " ");
    n2.push(`  ${s2}${f2.description ?? ""}`.trimEnd());
  }
  return n2;
}
function _4(o2) {
  if (Object.keys(o2.subCommands).length === 0)
    return [];
  let n2 = ["COMMANDS:"];
  for (let [f2, s2] of Object.entries(o2.subCommands)) {
    let r2 = f2.padEnd(10, " ");
    n2.push(`  ${r2}${s2.meta.description ?? ""}`.trimEnd());
  }
  return n2;
}
function l2(o2, n2) {
  let f2 = n2 ?? [o2.meta.name], s2 = [];
  s2.push(o2.meta.description ? `${f2.join(" ")} - ${o2.meta.description}` : f2.join(" ")), s2.push(""), s2.push("USAGE:"), s2.push(`  ${Y(o2.meta, o2, f2)}`);
  let r2 = _4(o2);
  if (r2.length > 0)
    s2.push(""), s2.push(...r2);
  let u2 = X3(o2);
  if (u2.length > 0)
    s2.push(""), s2.push(...u2);
  let i2 = R3(o2.effectiveFlags);
  if (i2.length > 0)
    s2.push(""), s2.push(...i2);
  return s2.join(`
`);
}
var z = { type: "boolean", short: "h", inherit: true, description: "Show help" };
function U2(o2, n2) {
  n2(o2, "help", z);
  for (let f2 of Object.values(o2.subCommands))
    U2(f2, n2);
}
function B() {
  return { name: "help", setup(o2, n2) {
    U2(o2.rootCommand, n2.addFlag);
  }, async middleware(o2, n2) {
    if (!o2.route) {
      await n2();
      return;
    }
    let f2 = o2.route.command;
    if (o2.input?.flags.help !== true && f2.run) {
      await n2();
      return;
    }
    console.log(l2(f2, [...o2.route.commandPath]));
  } };
}
function Ho(o2 = "0.0.0") {
  return { name: "version", setup(n2, f2) {
    f2.addFlag(n2.rootCommand, "version", { type: "boolean", short: "v", description: "Show version number" });
  }, async middleware(n2, f2) {
    if (!n2.route || n2.route.command !== n2.rootCommand) {
      await f2();
      return;
    }
    if (!n2.input?.flags.version) {
      await f2();
      return;
    }
    let s2 = typeof o2 === "function" ? o2() : o2;
    console.log(`${n2.rootCommand.meta.name} v${s2}`);
  } };
}

// src/lib/github.ts
async function detectGh() {
  try {
    const versionResult = Bun.spawnSync(["gh", "--version"], {
      stdout: "pipe",
      stderr: "pipe"
    });
    if (!versionResult.success)
      throw new Error("gh exited non-zero");
  } catch {
    process.stderr.write(wV.red(`\u2717 gh CLI is not installed.
`));
    process.stderr.write(wV.dim("  Install it from https://cli.github.com, then run `gh auth login`.\n"));
    process.exit(1);
  }
  const authResult = Bun.spawnSync(["gh", "auth", "status"], {
    stdout: "pipe",
    stderr: "pipe"
  });
  if (!authResult.success) {
    process.stderr.write(wV.red(`\u2717 gh CLI is installed but you are not logged in.
`));
    process.stderr.write(wV.dim("  Run `gh auth login` to authenticate, then retry.\n"));
    process.exit(1);
  }
  const output = authResult.stderr.toString() + authResult.stdout.toString();
  const match = output.match(/Logged in to \S+ account (\S+)/);
  if (!match) {
    process.stderr.write(wV.red(`\u2717 Could not determine GitHub username from gh auth status.
`));
    process.stderr.write(wV.dim("  Try running `gh auth status` manually to inspect the output.\n"));
    process.exit(1);
  }
  return { username: match[1] };
}

// src/commands/create.ts
async function runCreate() {
  const { username } = await detectGh();
  process.stderr.write(wV.bold("skillsync create") + `
`);
  process.stderr.write(wV.yellow("Not yet implemented.") + `
`);
}

// src/commands/join.ts
async function runJoin(repo) {
  const { username } = await detectGh();
  process.stderr.write(wV.bold("skillsync join") + `
`);
  process.stderr.write(`Joining ${repo}...
`);
  process.stderr.write(wV.yellow("Not yet implemented.") + `
`);
}

// src/commands/sync.ts
async function runSync() {
  const { username } = await detectGh();
  process.stderr.write(wV.bold("skillsync sync") + `
`);
  process.stderr.write(wV.yellow("Not yet implemented.") + `
`);
}

// src/commands/status.ts
async function runStatus() {
  const { username } = await detectGh();
  process.stderr.write(wV.bold("skillsync status") + `
`);
  process.stderr.write(wV.yellow("Not yet implemented.") + `
`);
}

// src/commands/import.ts
async function runImport(skillPath) {
  const { username } = await detectGh();
  process.stderr.write(wV.bold("skillsync import") + `
`);
  process.stderr.write(`Importing from ${skillPath}...
`);
  process.stderr.write(wV.yellow("Not yet implemented.") + `
`);
}

// src/commands/check-git.ts
function parseVersion(output) {
  const match = output.match(/gh version (\S+)/);
  return match ? match[1] : "unknown";
}
function parseAuthDetails(output) {
  const hostMatch = output.match(/^(\S+)\s*$/m);
  const authMethodMatch = output.match(/account \S+ \((\S+)\)/);
  const protocolMatch = output.match(/configured to use (\S+) protocol/);
  const tokenMatch = output.match(/Token:\s+(\S+)/);
  const scopesMatch = output.match(/Token scopes:\s+(.+)/);
  return {
    host: hostMatch ? hostMatch[1] : "github.com",
    authMethod: authMethodMatch ? authMethodMatch[1] : "unknown",
    protocol: protocolMatch ? protocolMatch[1] : "unknown",
    token: tokenMatch ? tokenMatch[1] : "unknown",
    scopes: scopesMatch ? scopesMatch[1].replace(/'/g, "").trim() : "unknown"
  };
}
async function runCheckGit() {
  const { username } = await detectGh();
  const versionResult = Bun.spawnSync(["gh", "--version"], {
    stdout: "pipe",
    stderr: "pipe"
  });
  const authResult = Bun.spawnSync(["gh", "auth", "status"], {
    stdout: "pipe",
    stderr: "pipe"
  });
  const version = parseVersion(versionResult.stdout.toString());
  const authOutput = authResult.stderr.toString() + authResult.stdout.toString();
  const { host, authMethod, protocol, token, scopes } = parseAuthDetails(authOutput);
  const label = (s2) => wV.dim(s2.padEnd(11));
  process.stderr.write(`
`);
  process.stderr.write("  " + wV.bold("gh CLI check") + `
`);
  process.stderr.write(`
`);
  process.stderr.write(`  ${label("Version")}${version}
`);
  process.stderr.write(`  ${label("User")}${wV.green("@" + username)}
`);
  process.stderr.write(`  ${label("Host")}${host}
`);
  process.stderr.write(`  ${label("Auth")}${authMethod}
`);
  process.stderr.write(`  ${label("Protocol")}${protocol}
`);
  process.stderr.write(`  ${label("Token")}${token}
`);
  process.stderr.write(`  ${label("Scopes")}${scopes}
`);
  process.stderr.write(`
`);
}

// src/index.ts
var cli = new R("skillsync").meta({ description: "Share and sync Claude Code agents and skills with your team" }).use(B()).use(Ho("0.1.0")).command("create", (cmd) => cmd.meta({ description: "Create a shared team skills repo" }).run(runCreate)).command("join", (cmd) => cmd.meta({ description: "Join a team skills repo" }).args([{ name: "repo", type: "string", required: true }]).run((ctx) => runJoin(ctx.args.repo))).command("sync", (cmd) => cmd.meta({ description: "Pull and push skill updates" }).run(runSync)).command("status", (cmd) => cmd.meta({ description: "Show current sync state" }).run(runStatus)).command("import", (cmd) => cmd.meta({ description: "Import a local skill into the team repo" }).args([{ name: "path", type: "string", required: true }]).run((ctx) => runImport(ctx.args.path))).command("check-git", (cmd) => cmd.meta({ description: "Check gh CLI version and authentication status" }).run(runCheckGit));
await cli.execute();
