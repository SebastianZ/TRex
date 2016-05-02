/* See license.txt for terms of usage */

"use strict";

const { Panel } = require("dev/panel");
const { Tool } = require("dev/toolbox");
const { Class } = require("sdk/core/heritage");
const self = require("sdk/self");

const RegExpPanel = Class({
  extends: Panel,
  label: "Regular Expressions",
  tooltip: "Create and debug regular expressions",
  icon: "./icon-16.png",
  url: "./panel.html",

  setup: function(options) {
    this.debuggee = options.debuggee;
  },

  dispose: function() {
    this.debuggee = null;
  },

  onReady: function() {
    this.debuggee.start();
    this.postMessage("init", [this.debuggee]);
  }
});

exports.RegExpPanel = RegExpPanel;

const regExpTool = new Tool({
  name: "RegExpTool",
  panels: {
    regExpPanel: RegExpPanel
  }
});
