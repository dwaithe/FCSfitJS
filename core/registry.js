// FocusCore: a tiny module registry for core/.
//
// core/ has to run in three places with no build step: as <script> tags in index.html opened from file://, inside a Web
// Worker, and under Node for the tests. ES modules and `new Worker(url)` are
// blocked on file:// pages, so every core file is a plain script that calls
//   FocusCore.define(name, [dependency names], factory)
// and the worker is created from a Blob holding the same factory sources
// (FocusCore.workerSource). Nothing here uses Node or Electron APIs.

;(function (root) {
  'use strict'

  function install (root) {
    if (root.FocusCore) return root.FocusCore
    const modules = {}
    const order = [] // [name, deps, factory] in definition order

    const FocusCore = {
      /**
       * Register a module. Dependencies must already be defined.
       * @param {string} name e.g. 'io/pt3'
       * @param {string[]} deps names of modules passed to the factory
       * @param {function(...object): object} factory returns the exports
       */
      define (name, deps, factory) {
        if (modules[name]) return modules[name]
        const args = deps.map((d) => {
          if (!modules[d]) throw new Error(`FocusCore: ${name} needs ${d}, which is not loaded yet`)
          return modules[d]
        })
        modules[name] = factory(...args)
        order.push([name, deps, factory])
        return modules[name]
      },

      /** Exports of a defined module. */
      require (name) {
        if (!modules[name]) throw new Error(`FocusCore: module ${name} is not loaded`)
        return modules[name]
      },

      /**
       * JavaScript source that recreates this registry and every module
       * defined so far, followed by `main` (a function run with the worker's
       * global scope). Used to start a Web Worker from a Blob.
       */
      workerSource (main) {
        let src = `;(${install.toString()})(self);\n`
        for (const [name, deps, factory] of order) {
          src += `self.FocusCore.define(${JSON.stringify(name)}, ${JSON.stringify(deps)}, ${factory.toString()});\n`
        }
        if (main) src += `;(${main.toString()})(self);\n`
        return src
      }
    }
    root.FocusCore = FocusCore
    return FocusCore
  }

  install(root)
})(typeof globalThis !== 'undefined' ? globalThis : self)
