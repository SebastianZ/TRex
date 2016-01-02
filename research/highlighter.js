(function () {
  "use strict";

  var Highlighter = function(fieldID) {
    this.ignoredInputKeyCodes = new Set([
      37, // Left key
      39, // Right key
      38, // Up key
      40, // Down key
      17, // Ctrl key
      18, // Alt key
      225, // AltGr key
      224, // Meta key
      16, // Shift key
      20, // Caps Lock key
      9, // Tab key
      13, // Return key
      93, // Context Menu key
      27, // Escape key
      33, // Page up key
      34, // Page down key
      36, // Home key
      35, // End key
      144, // Num Lock key
      19, // Pause key
      44 // Print Screen key
    ]);

    var self = this;
    window.addEventListener("DOMContentLoaded", function onLoad() {
      self.field = document.getElementById(fieldID);
      self.field.contentEditable = true;

      self.highlight();

      self.field.addEventListener("input", function onFieldInput(evt) {
        if (!self.ignoredInputKeyCodes.has(evt.keyCode)) {
          self.highlight();
        }
      }); 
    });
  };

  var prototype = Highlighter.prototype;

  prototype.highlight = function() {
  };

  window.Highlighter = Highlighter;
})();
