/* See license.txt for terms of usage */

"use strict";

const ESCAPE_CHAR_TYPES = [
  "ControlEscape",
  "ControlLetterEscape",
  "HexEscapeSequence",
  "UnicodeEscapeSequence",
  "IdentityEscape",
  "CharacterClassEscape"
];

const ESCAPE_CHARS = {
  "f": 0,
  "n": 0,
  "r": 0,
  "t": 0,
  "v": 0,
  "c": 1,
  "x": 2,
  "u": 3,
  "d": 5,
  "D": 5,
  "s": 5,
  "S": 5,
  "w": 5,
  "W": 5
};

const ESCACPE_CHAR_CODES = {
  "0" : 0,
  "t" : 9,
  "n" : 10,
  "v" : 11,
  "f" : 12,
  "r" : 13
};

class RegExpTokenizer {
  constructor() {
    this.token = null;
    this.capturingGroups = [];
  }

  tokenize(str) {
    function token(type, start, end, additionalProps) {
      this.type = type;
      if (additionalProps) {
        let self = this;
        Object.getOwnPropertyNames(additionalProps).forEach(function mapPropNames(name) {
          self[name] = additionalProps[name];
        });
      }
      this.loc = {
        start: start,
        end: end || start + 1
      }
    }

    this.token = null;
    this.capturingGroups = [];

    let length = str.length;
    let i = 0;
    let ast = new token("RegularExpression", i, length, {body: []});
    let parentToken = ast;
    let currentToken = ast;
    let stack = [];
    let charClass = false;
    while (i < length) {
      let char = str.charAt(i);
      let addToParent = true;
      let newParentToken = null;

      if (char === "(" && !charClass) {
        currentToken = new token("", i, null, {error: "noClosingBracket", body: []});
        this.parseGroup(str, currentToken);

        if (currentToken.type === "CapturingGroup") {
          this.capturingGroups.push(currentToken);
        }

        stack.push(parentToken);
        newParentToken = currentToken;
      } else if (char === "[" && !charClass) {
        let negated = (str[i + 1] === "^");
        charClass = true;
        currentToken = new token("CharacterClass", i, i + (negated ? 2 : 1),
            {negated: negated, error: "noClosingBracket", body: []});
        stack.push(parentToken);

        newParentToken = currentToken;
      } else if (char === "-" && charClass && currentToken.type !== "Range" &&
          str[i + 1] !== undefined && str[i - 1] !== "[" && !(str[i - 1] === "^" &&
          str[i - 2] === "[") && str[i + 1] !== "]") {
        currentToken = new token("Range", currentToken.loc.start, i + 1,
            {left: currentToken, right: null});
        let parent = parentToken.hasOwnProperty("right") ? "right" : "body";
        parentToken[parent].pop();
        stack.push(parentToken);
        newParentToken = currentToken;
      } else if ((char === ")" && !charClass) || (char === "]" && charClass)) {
        if (char === "]" && charClass) {
          charClass = false;
        }

        if (stack.length > 0) {
          while (parentToken.type === "Alternation") {
            parentToken.loc.end = parentToken.right.length > 0 ?
                parentToken.right[parentToken.right.length - 1].loc.end :
                parentToken.loc.start + 1;
            parentToken = stack.pop();
          }

          let stackToken = stack.pop();
          currentToken = parentToken;
          if (currentToken.error === "noClosingBracket")
            delete currentToken.error;
          currentToken.loc.end = i + 1;
          newParentToken = stackToken;
          addToParent = false;
        } else {
          currentToken = new token("Literal", i, null, {value: char,
              error: "additionalClosingBracket"});
        }
      } else if (char === "\\") {
        let escapeSequenceToken = new token("", i);
        if (this.parseEscapeSequence(str, escapeSequenceToken)) {
          currentToken = escapeSequenceToken;
        } else {
          if (currentToken && currentToken.type === "Literal" && !charClass &&
              !currentToken.error) {
            currentToken.value += char;
            currentToken.loc.end++;
            addToParent = false;
          } else {
            currentToken = new token("Literal", i, null, {value: char});
          }
        }
      } else if (char === "." && !charClass) {
        currentToken = new token("AnyCharacter", i);
      } else if ("?*+{".indexOf(char) !== -1 && !charClass) {
        let quantifierToken = new token("", i);
        this.parseQuantifier(str, quantifierToken);
        if (quantifierToken.type === "") {
          if (currentToken && currentToken.type === "Literal" && !currentToken.error) {
            currentToken.value += char;
            currentToken.loc.end++;
            addToParent = false;
          } else {
            currentToken = new token("Literal", i, null, {value: char});
          }
        } else {
          // Check whether the quantifier target is invalid
          if (currentToken.type.match(/Quantifier|Anchor|^Alternation$/) ||
              (currentToken.type.match(/Group|Look/) && currentToken.error) ||
              (currentToken.type === "IdentityEscape" &&
                  currentToken.char.toLowerCase() === "b")) {
            quantifierToken.error = "invalidQuantifierTarget";
          }
          currentToken = quantifierToken;
        }
      } else if ((char === "^" || char === "$") && !charClass) {
        currentToken = new token((char === "^" ? "Start" : "End") + "Anchor", i);
      } else if (char === "|" && !charClass) {
        let parent = parentToken.hasOwnProperty("right") ? "right" : "body";
        let startLoc = parentToken[parent][0] ? parentToken[parent][0].loc.start : i;
        currentToken = new token("Alternation", startLoc, i + 1,
            {left: parentToken[parent], right: []});
        parentToken[parent] = [];
        stack.push(parentToken);
        newParentToken = currentToken;
      } else {
        if (char === "/" && !charClass) {
          currentToken = new token("Literal", i, null, {value: char, error: "unescapedSlash"});
        } else if (currentToken && currentToken.type === "Literal" && !charClass &&
            !currentToken.error) {
          currentToken.value += char;
          currentToken.loc.end++;
          addToParent = false;
        } else {
          currentToken = new token("Literal", i, null, {value: char});
        }
      }

      if (parentToken.type === "Range" && parentToken !== currentToken) {
        parentToken.loc.end = currentToken.loc.end;
        newParentToken = stack.pop();
      }

      if (addToParent) {
        let parent = parentToken.hasOwnProperty("right") ? "right" : "body";
        if (Array.isArray(parentToken[parent])) {
          parentToken[parent].push(currentToken);
        } else {
          parentToken[parent] = currentToken;
        }
      }

      if (parentToken.type === "Range" && parentToken.right) {
        // Make the character range the current token, as it is complete now,
        // so following characters can check for it
        currentToken = parentToken;

        if (parentToken.left.value && parentToken.right.value &&
            parentToken.left.value.charCodeAt(0) > parentToken.right.value.charCodeAt(0)) {
          parentToken.error = "invalidCharRange";
        }
      }

      if (newParentToken) {
        parentToken = newParentToken;
      }

      i = currentToken.loc.end;
    }

    if (stack.length > 0) {
      parentToken.loc.end = currentToken.loc.end;

      while (stack.length > 0) {
        currentToken = parentToken;
        parentToken = stack.pop();
        parentToken.loc.end = currentToken.loc.end;
      }
    }

    this.token = ast;

    return ast;
  }

  parseGroup(str, token) {
    let match = str.substr(token.loc.start + 1, 3).match(/\?(?::|<?[!=])/);
    if (match) {
      if (match[0].indexOf(":") !== -1) {
        token.type = "NonCapturingGroup";
      } else {
        token.type = match[0].indexOf("=") !== -1 ? "Positive" : "Negative";
        token.type += "Look" + (match[0].indexOf("<") !== -1 ? "Behind" : "Ahead");

        if (match[0].indexOf("<") !== -1)
          token.error = "lookbehind";
      }

      token.loc.end += match[0].length; 
    } else {
      token.type = "CapturingGroup";
    }
  }

  parseQuantifier(str, token) {
    switch (str[token.loc.start]) {
      case "?":
        token.type = "OptionalQuantifier";
        break;

      case "*":
        token.type = "ZeroOrMoreQuantifier";
        break;

      case "+":
        token.type = "OneOrMoreQuantifier";
        break;

      case "{":
        let repetitions = str.substr(token.loc.start).match(/^\{(\d*)(?:,(\d*))?\}/);

        // If no repetition is found, the following characters are parsed normally without error
        if (!repetitions || (!repetitions[1] && !repetitions[2])) {
          return;
        }

        token.type = "RepetitionQuantifier";
        token.loc.end += repetitions[0].length - 1;

        if (repetitions[2] !== undefined) {
          token.type = "Variable" + token.type;
          token.min = repetitions[1] !== "" ? Number(repetitions[1]) : null;
          token.max = repetitions[2] !== "" ? Number(repetitions[2]) : null;

          if (token.min > token.max && token.max !== null) {
            token.error = "invalidRepetitionRange";
          }
        } else {
          token.type = "Fixed" + token.type;
          token.repetitions = Number(repetitions[1]);
        }
    }

    if (str[token.loc.end] === "?") {
      token.lazy = true;
      token.loc.end++;
    } else {
      token.lazy = false;
    }
  }

  parseEscapeSequence(str, token) {
    let escapeCharType = ESCAPE_CHARS[str[token.loc.end]];
    if (escapeCharType === undefined)
      escapeCharType = 4;
    token.type = ESCAPE_CHAR_TYPES[escapeCharType];
    switch (token.type) {
      case "ControlEscape":
      case "IdentityEscape":
      case "CharacterClassEscape": {
        token.char = str[token.loc.end] || "";
        if (token.type === "ControlEscape") {
          token.value = ESCACPE_CHAR_CODES[token.char];
        }

        // Catch backslashes standing at the end of the regexp
        if (token.loc.end === str.length) {
          token.error = "danglingBackslash";
        } else {
          token.loc.end++;
        }
        break;
      }

      case "ControlLetterEscape": {
        token.char = str[token.loc.end + 1] || "";
        if (token.char !== "") {
          token.value = token.char.charCodeAt(0) - 64;
          token.loc.end += 2;
        } else {
          token.loc.end++;
        }
        break;
      }

      case "HexEscapeSequence": {
        let sequence = str.substr(token.loc.end + 1, 2);

        // Only if the four characters following the backslash are a hex value the token is
        // recognized as Unicode escape sequence, otherwise it's interpreted as identity escape
        if (sequence.match(/^[a-f0-9]{2}$/i)) {
          token.sequence = sequence;
          token.loc.end += 3;
        } else {
          token.type = "IdentityEscape";
          token.char = "x";
          token.loc.end++;
        }
        break;
      }

      case "UnicodeEscapeSequence": {
        let sequence = str.substr(token.loc.end + 1, 4);

        // Only if the four characters following the backslash are a hex value the token is
        // recognized as Unicode escape sequence, otherwise it's interpreted as identity escape
        if (sequence.match(/^[a-f0-9]{4}$/i)) {
          token.sequence = sequence;
          token.loc.end += 5;
        } else {
          token.type = "IdentityEscape";
          token.char = "u";
          token.loc.end++;
        }
        break;
      }
    }

    return true;
  }
}
