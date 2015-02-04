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
        end: end
      }
    }

    let i = 0;
    let length = str.length;
    let currentToken = null;
    let stack = [];
    let charClass = null;
    let root = new token("RegularExpression", 0, str.length, {body: []});
    let parent = root;
    while (i < length) {
      let char = str[i];

      if (char === "\\") {
        if (currentToken && currentToken !== parent)
          parent.body.push(currentToken);
  
        currentToken = new token("", i, i + 1);
        this.parseEscapeSequence(str, i, currentToken);
      } else if (char === "(" && !charClass) {
        if (currentToken)
          parent.body.push(currentToken);
        currentToken = new token("", i, i + 1, {body: []});
        parent = currentToken;

        this.parseGroup(str, currentToken);
        if (currentToken.type === "CapturingGroup")
          this.capturingGroups.push(currentToken);
        stack.push(currentToken);
      } else if (char === ")" && !charClass) {
        if (stack.length > 0) {
          let capGroup = stack.pop();
          parent.body.push(currentToken);
          currentToken = capGroup;
          parent = stack.length > 0 ? stack[stack.length - 1] : root;
        } else {
          currentToken.error = "additionalClosingGroup";
        }
        currentToken.loc.end = i + 1;
      } else if (char === "[" && !charClass) {
        if (currentToken && currentToken.type !== "CapturingGroup")
          parent.body.push(currentToken);
        charClass = new token("CharacterClass", i, i + 1, {body: []});
        currentToken = charClass;
        parent = currentToken;
        stack.push(currentToken);
      } else if (char === "]" && charClass) {
        if (currentToken && currentToken.type !== "Range")
          parent.body.push(currentToken);
        stack.pop();
        parent = stack.length > 0 ? stack[stack.length - 1] : root;
        currentToken = charClass;
        charClass = null;
        currentToken.loc.end = i + 1;
      } else if ("?*+{".contains(char) && !charClass) {
        if (currentToken)
          parent.body.push(currentToken);

        let quantifierToken = new token("", i, i + 1, {lazy: false});
        if (!currentToken || currentToken.type.contains("Quantifier"))
          quantifierToken.error = "nothingToRepeat";
        this.parseQuantifier(str, quantifierToken);
        currentToken = quantifierToken;
      } else if (char === "." && !charClass) {
        if (currentToken && currentToken.type !== "CapturingGroup")
          parent.body.push(currentToken);
        currentToken = new token("AnyCharacter", i, i + 1);
      } else if ((char === "^" || char === "$") && !charClass) {
        if (currentToken && currentToken.type !== "CapturingGroup")
          parent.body.push(currentToken);
        currentToken = new token(char === "^" ? "StartAnchor" : "EndAnchor", i, i + 1);
      } else if (char === "-" && charClass) {
        currentToken = new token("Range", currentToken.loc.start, i + 1, {left: currentToken});
      } else {
        if (!currentToken || currentToken.type !== "Literal" || charClass) {
          if (currentToken && currentToken !== parent && currentToken.type !== "CapturingGroup" &&
              currentToken.type !== "CharacterClass" && !currentToken.right) {
            parent.body.push(currentToken);
          }

          let literalToken = new token("Literal", i, i + 1, {value: str[i]});

          if (currentToken && currentToken.type === "Range" && !currentToken.right) {
            currentToken.right = literalToken;
            currentToken.loc.end = i + 1;
          }
          else
            currentToken = literalToken;
        } else {
          currentToken.value += str[i];
          currentToken.loc.end++;
        }
      }

      i = currentToken.loc.end;
    }
  
    parent.body.push(currentToken);
    if (stack.length !== 0)
      parent.error = "missingClosingGroup";

    this.token = root;

    return root;
  };

  prototype.parseGroup = function(str, token) {
    let match = str.substr(token.loc.start, 3).match(/\?(?::|<?[!=])/);
    if (match) {
      token.type = match[0].contains("=") ? "Positive" : "Negative";
      token.type += "Look" + (match[0].contains("<") ? "Behind" : "Ahead");

      if (match[0].contains("<"))
        token.error = "lookbehind";

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
            token.repetitions = repetitions[1];
          }
        } else
          token.error = "InvalidRepetitionQuantifier";
    }

    if (str[token.loc.end] === "?") {
      token.lazy = true;
      token.loc.end++;
    }
  };

  prototype.parseEscapeSequence = function(str, i, token) {
    let escapeCharType = RegExpTokenizer.ESCAPE_CHARS[str[i + 1]];
    if (escapeCharType === undefined)
      escapeCharType = 4;
    token.type = RegExpTokenizer.ESCAPE_CHAR_TYPES[escapeCharType];
    switch (token.type) {
      case "ControlEscape":
      case "IdentityEscape":
      case "CharacterClassEscape":
        token.char = str[i + 1];
        token.loc.end++;
        break;

      case "ControlLetterEscape":
        token.char = str[i + 2];
        token.loc.end += 2;
        break;

      case "HexEscapeSequence":
        token.sequence = str.substr(i + 2, 2);
        token.loc.end += 3;
        break;

      case "UnicodeEscapeSequence":
        token.sequence = str.substr(i + 2, 4);
        token.loc.end += 5;
        break;
    }

    return;
  };

  window.RegExpTokenizer = RegExpTokenizer;
})();