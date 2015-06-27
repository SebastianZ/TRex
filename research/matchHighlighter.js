(function () {
  "use strict";

  var MatchHighlighter = function () {
  };
  MatchHighlighter.prototype = new Highlighter("searchText");
  MatchHighlighter.prototype.constructor = MatchHighlighter;
  var prototype = MatchHighlighter.prototype;

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

  prototype.clearHighlight = function () {
      var childNodes = this.field.childNodes;
      for (var i = 0, len = childNodes.length; i < len; i++) {
          if (childNodes[i].nodeType == Node.ELEMENT_NODE) {
              childNodes[i].classList.remove("match");
          }
      }
  };

  prototype.matches = [];

  prototype.highlight = function () {
      var searchText = this.field.textContent;
      var regexPattern = window.regExpField.textContent;
      var regex = null;
      this.matches = [];
      // xxxFarshid: Would there be a better way instead of wrapping
      // into the try...catch block?
      try {
          regex = new RegExp(regexPattern, "g");
      }
      catch (e) { }

      var match = null;
      var lastIndex = -1;
      if (regex && regexPattern) {
          while ((match = regex.exec(searchText)) != null) {

              // NOTE: It's weird that the next match with exec() func on a RegExp
              // with some patterns like "a|" never finish (goes into an infinite loop).
              if (lastIndex == regex.lastIndex) {
                  this.matches = [];
                  break;
              }
              lastIndex = regex.lastIndex;

              this.matches.push({
                  start: match.index,
                  end: match.index + match[0].length
              });
          }
      }

      if (!this.matches.length) {
          this.clearHighlight();
          return;
      }

      var selectionOffset = this.getSelectionOffset(this.field);
      this.field.textContent = "";
      this.field.appendChild(this.highlightMatches(searchText, this.matches));
      var selection = window.getSelection();
      selection.removeAllRanges();
      var range = this.getRangeByOffset(this.field, selectionOffset);
      selection.addRange(range);
  }

  window.MatchHighlighter = MatchHighlighter;
})();