/* See license.txt for terms of usage */

"use strict";

class RegExpTester {
  static test(regExpString, flags, searchText) {
    let flagsForTesting = flags.includes("g") ? flags : flags + "g";
    let regExp = new RegExp(regExpString, flagsForTesting);

    let matches = [];

    let match = null;
    while(match = regExp.exec(searchText)) {
      matches.push({
        start: regExp.lastIndex - match[0].length,
        end: regExp.lastIndex
      });
      if(!flags.includes("g"))
        break;
    }
    return matches;
  }
}