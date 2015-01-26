(function () {
  "use strict";

  let RegExpTokenizer = function() {};

  RegExpTokenizer.ESCAPE_CHAR_TYPES = [
    "IdentityEscape",
    "ControlEscape",
    "ControlLetterEscape",
    "CharacterClassEscape"
  ];

  RegExpTokenizer.ESCAPE_CHARS = {
    "a": 0,
    "0": 1,
    "t": 1,
    "n": 1,
    "v": 1,
    "f": 1,
    "r": 1,
    "c": 2,
    "w": 3,
    "W": 3,
    "d": 3,
    "D": 3,
    "s": 3,
    "S": 3,
    "b": 3,
    "B": 3
  };

  RegExpTokenizer.prototype.tokenize = function(str) {
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
    let capGroups = [];
    let charClass = null;
    let root = new token("RegularExpression", 0, str.length, {body: []});
    let parent = root;
    while (i < length) {
      let char = str[i];

      if (char === "(" && !charClass) {
        if (currentToken)
          parent.body.push(currentToken);
        currentToken = new token("", i, i + 1, {body: []});
        parent = currentToken;

        this.parseGroup(str, currentToken);
        if (currentToken.type === "CapturingGroup")
          capGroups.push(currentToken);
        //console.log(capGroups);
      } else if (char === ")" && !charClass) {
        if (capGroups.length > 0) {
          let capGroup = capGroups.pop();
          parent.body.push(currentToken);
          currentToken = capGroup;
          parent = capGroups.length > 0 ? capGroups[capGroups.length - 1] : root;
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
      } else if (char === "]" && charClass) {
        if (currentToken && currentToken.type !== "Range")
          parent.body.push(currentToken);
        parent = root;
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
      } else if (char === "\\") {
        this.parseEscapeSequence(str, i, currentToken);
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
        if (!currentToken || currentToken.type !== "Literal") {
          if (currentToken && currentToken.type !== "CapturingGroup" &&
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
    if (capGroups.length !== 0)
      parent.error = "missingClosingGroup";

    return root;
  };

  RegExpTokenizer.prototype.parseGroup = function(str, token) {
    let match = str.substr(token.loc.start, 3).match(/\?(?::|<?[!=])/);
    if (match) {
      token.type = match.contains("=") ? "Positive" : "Negative";
      token.type += "Look" + (match.contains("<") ? "Behind" : "Ahead");

      if (match.contains("<"))
        token.error = "lookbehind";
    } else {
      token.type = "CapturingGroup";
    }
  };

  RegExpTokenizer.prototype.parseQuantifier = function(str, token) {
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

  RegExpTokenizer.prototype.parseEscapeSequence = function(str, i, block) {
    block.type = RegExpTokenizer.ESCAPE_CHAR_TYPES[RegExpTokenizer.ESCAPE_CHARS[str[i + 1]]],
    block.loc = {
      start: i,
      end: i + 1
    }

    return;
  };

  window.RegExpTokenizer = RegExpTokenizer;
})();