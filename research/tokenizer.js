(function () {
  "use strict";

  let RegExpTokenizer = function() { };
  let prototype = RegExpTokenizer.prototype;

  RegExpTokenizer.ESCAPE_CHAR_TYPES = [
    "ControlEscape",
    "ControlLetterEscape",
    "HexEscapeSequence",
    "UnicodeEscapeSequence",
    "IdentityEscape",
    "CharacterClassEscape"
  ];

  RegExpTokenizer.ESCAPE_CHARS = {
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

  RegExpTokenizer.ESCACPE_CHAR_CODES = {
    "0" : 0,
    "t" : 9,
    "n" : 10,
    "v" : 11,
    "f" : 12,
    "r" : 13
  };

  prototype.token = null;
  prototype.capturingGroups = [];

  prototype.tokenize = function(str) {
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
    let parent = ast.body;
    let currentToken = ast;
    let stack = [];
    let charClass = false;
    while (i < length) {
      let char = str.charAt(i);
      let addToParent = true;
      let newParentToken = null;

      if (char === "(" && !charClass) {
        currentToken = new token("", i, null, {body: []});
        this.parseGroup(str, currentToken);

        if (currentToken.type === "CapturingGroup") {
          this.capturingGroups.push(currentToken);
        }

        stack.push(parentToken);
        newParentToken = currentToken;
      } else if (char === "[") {
        let negated = (str[i + 1] === "^");
        charClass = true;
        currentToken = new token("CharacterClass", i, i + (negated ? 2 : 1), {negated: negated, body: []});
        stack.push(parentToken);
        newParentToken = currentToken;
      } else if ((char === ")" && !charClass) || (char === "]" && charClass)) {
        if (char === "]" && charClass) {
          charClass = false;
        }

        if (stack.length > 0) {
          let stackToken = stack.pop();
          currentToken = parentToken;
          currentToken.loc.end = i + 1;
          newParentToken = stackToken;
          addToParent = false;
        } else {
          currentToken.error = "additionalClosingGroup";
        }
      } else if (char === "\\") {
        currentToken = new token("", i);
        this.parseEscapeSequence(str, currentToken);
      } else if (char === "." && !charClass) {
        currentToken = new token("AnyCharacter", i);
      } else if ("?*+{".contains(char) && !charClass) {
        currentToken = new token("", i, null, {lazy: false});
        this.parseQuantifier(str, currentToken);
      } else if ((char === "^" || char === "$") && !charClass) {
        currentToken = new token((char === "^" ? "Start" : "End") + "Anchor", i);
      } else {
        if (currentToken && currentToken.type === "Literal" && !charClass) {
          currentToken.value += char;
          currentToken.loc.end++;
          addToParent = false;
        } else {
          currentToken = new token("Literal", i, null, {value: char});
        }
      }

      if (addToParent) {
        if (Array.isArray(parent)) {
          parent.push(currentToken);
        } else {
          parent = currentToken;
        }
      }

      if (newParentToken) {
        parentToken = newParentToken;
        parent = newParentToken[newParentToken.hasOwnProperty("right") ? "right" : "body"];
      }

      i = currentToken.loc.end;
    }

    this.token = ast;

    return ast;
  };

  prototype.parseGroup = function(str, token) {
    let match = str.substr(token.loc.start, 3).match(/\?(?::|<?[!=])/);
    if (match) {
      if (match[0].contains(":")) {
        token.type = "NonCapturingGroup";
      } else {
        token.type = match[0].contains("=") ? "Positive" : "Negative";
        token.type += "Look" + (match[0].contains("<") ? "Behind" : "Ahead");

        if (match[0].contains("<"))
          token.error = "lookbehind";
      }

      token.loc.end += match[0].length; 
    } else {
      token.type = "CapturingGroup";
    }
  };

  prototype.parseQuantifier = function(str, token) {
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
        token.type = "RepetitionQuantifier";
        let i = token.loc.end;
        while (str[i] && /[\d,]/.test(str[i])) {
          i++;
          token.loc.end = i;
        }
        if (i === str.length)
          token.error = "RepetitionQuantifierNotClosed";
        else if (str[i] !== "}")
          token.error = "InvalidRepetitionQuantifier";
        else
          token.loc.end++;

        let repetitions = str.substr(token.loc.start + 1, token.loc.end - 1).match(/^(\d*)(,(\d*))?\}/);
        if (repetitions) {
          if (repetitions[3] !== undefined) {
            token.type = "Variable" + token.type;
            token.min = repetitions[1] !== "" ? Number(repetitions[1]) : null;
            token.max = repetitions[3] !== "" ? Number(repetitions[3]) : null;
          } else {
            token.type = "Fixed" + token.type;
            token.repetitions = Number(repetitions[1]);
          }
        } else
          token.error = "InvalidRepetitionQuantifier";
    }

    if (str[token.loc.end] === "?") {
      token.lazy = true;
      token.loc.end++;
    }
  };

  prototype.parseEscapeSequence = function(str, token) {
    let escapeCharType = RegExpTokenizer.ESCAPE_CHARS[str[token.loc.end]];
    if (escapeCharType === undefined)
      escapeCharType = 4;
    token.type = RegExpTokenizer.ESCAPE_CHAR_TYPES[escapeCharType];
    switch (token.type) {
      case "ControlEscape":
      case "IdentityEscape":
      case "CharacterClassEscape":
        token.char = str[token.loc.end];
        if (token.type == "ControlEscape") {
          token.value = RegExpTokenizer.ESCACPE_CHAR_CODES[token.char];
        }
        token.loc.end++;
        break;

      case "ControlLetterEscape":
        token.char = str[token.loc.end + 1];
        token.value = token.char.charCodeAt(0) - 64;
        token.loc.end += 2;
        break;

      case "HexEscapeSequence":
        token.sequence = str.substr(token.loc.end + 1, 2);
        token.loc.end += 3;
        break;

      case "UnicodeEscapeSequence":
        token.sequence = str.substr(token.loc.end + 1, 4);
        token.loc.end += 5;
        break;
    }

    return;
  };

  window.RegExpTokenizer = RegExpTokenizer;
})();