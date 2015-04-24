(function () {
  "use strict";

  let MatchHighlighter = function () {
  };
  MatchHighlighter.prototype = new Highlighter("searchText");
  MatchHighlighter.prototype.constructor = MatchHighlighter;
  let prototype = MatchHighlighter.prototype;

  prototype.highlightMatches = function(searchText, matches) {
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
  };

  prototype.highlight = function() {
    var matches = [
      {
        start: 3,
        end: 8
      },
      {
        start: 14,
        end: 15
      }
    ];

    var selectionOffset = this.getSelectionOffset(this.field);
    var searchText = this.field.textContent;
    this.field.textContent = "";
    this.field.appendChild(this.highlightMatches(searchText, matches));
    var selection = window.getSelection();
    selection.removeAllRanges();
    var range = this.getRangeByOffset(this.field, selectionOffset);
    selection.addRange(range);
  }

  window.MatchHighlighter = MatchHighlighter;
})();