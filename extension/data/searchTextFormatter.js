/* See license.txt for terms of usage */

"use strict";

class SearchTextFormatter {
  constructor(field) {
    this.field = field;
  }

  highlightMatches(matches = []) {
    console.log(matches);
    let searchText = this.field.textContent;
    let highlightedSearchText = new DocumentFragment();
    let previousMatchEnd = 0;
    console.log("highlightMatches", matches);
    matches.forEach(function highlightMatch(match) {
      if (match.start !== 0) {
        let textNode = document.createTextNode(searchText.substring(previousMatchEnd, match.start));
        highlightedSearchText.appendChild(textNode);
      }
      var matchNode = document.createElement("span");
      matchNode.classList.add("match");
      matchNode.textContent = searchText.substring(match.start, match.end);
      highlightedSearchText.appendChild(matchNode);
      previousMatchEnd = match.end;
    });

    if (matches.length > 0 && matches[matches.length - 1].end < searchText.length) {
      let textNode = document.createTextNode(searchText.substring(previousMatchEnd, searchText.length));
      highlightedSearchText.appendChild(textNode);
    }
    this.field.textContent = "";
    this.field.appendChild(highlightedSearchText, this.field.firstChild);
  }
}
