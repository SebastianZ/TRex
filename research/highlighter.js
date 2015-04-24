(function () {
  "use strict";

  var Highlighter = function(fieldID) {
    this.ignoredInputKeyCodes = new Set([
      KeyEvent.DOM_VK_LEFT,
      KeyEvent.DOM_VK_RIGHT,
      KeyEvent.DOM_VK_UP,
      KeyEvent.DOM_VK_DOWN,
      KeyEvent.DOM_VK_CONTROL,
      KeyEvent.DOM_VK_ALT,
      KeyEvent.DOM_VK_ALTGR,
      KeyEvent.DOM_VK_META,
      KeyEvent.DOM_VK_SHIFT,
      KeyEvent.DOM_VK_CAPS_LOCK,
      KeyEvent.DOM_VK_TAB,
      KeyEvent.DOM_VK_RETURN,
      KeyEvent.DOM_VK_CONTEXT_MENU,
      KeyEvent.DOM_VK_ESCAPE,
      KeyEvent.DOM_VK_HOME,
      KeyEvent.DOM_VK_END,
      KeyEvent.DOM_VK_PAGE_UP,
      KeyEvent.DOM_VK_PAGE_DOWN,
      KeyEvent.DOM_VK_NUM_LOCK,
      KeyEvent.DOM_VK_PAUSE,
      KeyEvent.DOM_VK_PRINTSCREEN
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

  prototype.getSelectionOffset = function(rootNode) {
    var selectionRange = window.getSelection();

    var parent = selectionRange.anchorNode;
    while (parent !== document.documentElement && parent.id !== rootNode.id) {
      parent = parent.parentElement;
    }

    if (parent === document.documentElement) {
      return 0;
    }

    var offset = selectionRange.anchorOffset;

    var node = selectionRange.anchorNode;
    while(node && node.id !== rootNode.id) {
      if (node.previousSibling) {
        node = node.previousSibling;
        offset += node.textContent.length;
      } else {
        node = node.parentElement;
      }
    }

    return offset;
  };

  prototype.getRangeByOffset = function(rootNode, offset) {
    var node = rootNode;
    var anchorOffset = offset;
    while (node) {
      var contentLength = node.textContent.length;
      if (contentLength >= anchorOffset) {
        if (node.nodeType === Node.TEXT_NODE) {
          break;
        } else {
          node = node.firstChild;
        }
      } else {
        anchorOffset -= contentLength;
        node = node.nextSibling;
      }
    }

    var range = document.createRange();
    range.setStart(node, anchorOffset);
    range.setEnd(node, anchorOffset);

    return range;
  };

  prototype.highlight = function() {
  };

  window.Highlighter = Highlighter;
})();
