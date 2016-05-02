/* See license.txt for terms of usage */

"use strict";

class RangeTool {
  getSelectionOffset(rootNode) {
    let selectionRange = window.getSelection();

    let parent = selectionRange.anchorNode;
    if (parent) {
      while (parent !== document.documentElement && parent.id !== rootNode.id) {
        parent = parent.parentElement;
      }

      if (parent === document.documentElement) {
        return 0;
      }
    }

    let offset = selectionRange.anchorOffset;

    let node = selectionRange.anchorNode;
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
    let node = rootNode;
    let anchorOffset = offset;
    while (node) {
      let contentLength = node.textContent.length;
      if (contentLength >= anchorOffset) {
        if (node.nodeType === Node.TEXT_NODE) {
          break;
        } else if (node.firstChild) {
          node = node.firstChild;
        } else {
          break;
        }
      } else {
        anchorOffset -= contentLength;
        node = node.nextSibling;
      }
    }

    let range = document.createRange();
    range.setStart(node, anchorOffset);
    range.setEnd(node, anchorOffset);

    return range;
  }
}
