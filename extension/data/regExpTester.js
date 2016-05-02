/* See license.txt for terms of usage */

"use strict";

class RegExpTester {
  static test(regExpString, flags, searchText) {
    let regExp = new RegExp(regExpString, "g");

    let matches = [];

    let match = null;
    while (match = regExp.exec(searchText)) {
      matches.push({
        start: regExp.lastIndex - match[0].length,
        end: regExp.lastIndex
      });
    }
    return matches;
  }
}