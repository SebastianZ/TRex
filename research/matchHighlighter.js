(function () {
  "use strict";

  let MatchHighlighter = function() { };
  let prototype = MatchHighlighter.prototype;

  prototype.highlight = function(searchText, matches) {
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

  window.MatchHighlighter = MatchHighlighter;
})();