/* runtime.js — CoffeeHaml jsx-runtime shim (classic script, NO ES modules).
 *
 * CoffeeHaml emits:  import { jsx, jsxs, Fragment } from "./runtime.js";
 * build.mjs strips that import line. These globals satisfy the bare
 * identifiers (jsx / jsxs / Fragment) the generated code references.
 *
 * The shim forwards to React.createElement. `key` (3rd arg) is only ever
 * attached when present, so React never complains about a spurious key=null.
 */
(function (global) {
  var mk = function (type, props, key) {
    if (key === undefined || key === null) {
      return React.createElement(type, props);
    }
    return React.createElement(type, Object.assign({}, props, { key: key }));
  };
  global.jsx = mk;
  global.jsxs = mk;
  global.Fragment = React.Fragment;
})(window);
