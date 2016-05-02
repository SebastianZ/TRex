/* See license.txt for terms of usage */

"use strict";

class RangeTool {
  getSelectionOffset(rootNode) {
    var selectionRange = window.getSelection();

    var parent = selectionRange.anchorNode;
    if (parent) {
      while (parent !== document.documentElement && parent.id !== rootNode.id) {
        parent = parent.parentElement;
      }

      if (parent === document.documentElement) {
        return 0;
      }
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
  }

  getRangeByOffset(rootNode, offset) {
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
  }
}
