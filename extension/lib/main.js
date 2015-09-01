/* See license.txt for terms of usage */

"use strict";

const { TRexExtension } = require("./extension.js");
const { RegExpPanel } = require("./regExpPanel.js");

function main(options, callbacks) {
  RegExpPanel.initialize(options);
}

function onUnload(reason) {
  RegExpPanel.shutdown(reason);
}

exports.main = main;
exports.onUnload = onUnload;
