/* See license.txt for terms of usage */

"use strict";

class SearchTextFormatter {
  highlightMatches(searchText, matches = []) {
    var highlightedSearchText = new DocumentFragment();
    var previousMatchEnd = 0;
    matches.forEach(function highlightMatches(match) {
      if (match.start !== 0) {
        var textNode = document.createTextNode(searchText.substring(previousMatchEnd, match.start));
        highlightedSearchText.appendChild(textNode);
      }
      var matchNode = document.createElement("span");
      matchNode.classList.add("match");
      matchNode.textContent = searchText.substring(match.start, match.end);
      highlightedSearchText.appendChild(matchNode);
      previousMatchEnd = match.end;
    });

    if (matches.length > 0 && matches[matches.length - 1].end < searchText.length) {
      var textNode = document.createTextNode(searchText.substring(previousMatchEnd, searchText.length));
      highlightedSearchText.appendChild(textNode);
    }
    return highlightedSearchText;
  }

  highlight() {
    var rangeTool = new RangeTool(this.field); 
    var selectionOffset = rangeTool.getSelectionOffset(this.field);
    var searchText = this.field.textContent;
    this.field.textContent = "";
    this.field.appendChild(this.highlightMatches(searchText, this.matches));
    var selection = window.getSelection();
    selection.removeAllRanges();
    var range = rangeTool.getRangeByOffset(this.field, selectionOffset);
    selection.addRange(range);
  }
}
