(function () {
  "use strict";

  let RegExpHighlighter = function() { };
  let prototype = RegExpHighlighter.prototype;

  prototype.highlight = function(token) {
    let brackets = new Map([
      ["CapturingGroup", {
        opening: "(",
        closing: ")"
      }],
      ["NonCapturingGroup", {
        opening: "(?:",
        closing: ")"
      }],
      ["PositiveLookAhead", {
        opening: "(?=",
        closing: ")"
      }],
      ["NegativeLookAhead", {
        opening: "(?!",
        closing: ")"
      }],
      ["PositiveLookBehind", {
        opening: "(?<=",
        closing: ")"
      }],
      ["NegativeLookBehind", {
        opening: "(?<!",
        closing: ")"
      }],
      ["CharacterClass", {
        opening: "[",
        closing: "]"
      }],
    ]);

    var prefix = new Map([
      ["HexEscapeSequence", "x"],
      ["UnicodeEscapeSequence", "u"],
      ["ControlLetterEscape", "c"]
    ]);

    var tokenOutput = new Map([
       ["StartAnchor", "^"],
       ["EndAnchor", "$"],
       ["AnyCharacter", "."],
       ["OptionalQuantifier", "?"],
       ["ZeroOrMoreQuantifier", "*"],
       ["OneOrMoreQuantifier", "+"]
     ]);

    var errorMessages = new Map([
      ["noClosingBracket", "Unmatched opening bracket."],
      ["additionalClosingBracket", "Unmatched closing bracket."],
      ["unescapedSlash", "Unescasped forward slash."],
      ["invalidCharRange", "Range values reversed. Start character is greater than end character."],
      ["lookbehind", "Lookbehinds not supported in JavaScript."],
      ["invalidRepetitionRange", "Quantifier minimum is greater than maximum."],
      ["danglingBackslash", "Dangling backslash."],
      ["invalidQuantifierTarget", "Invalid target for quantifier."]
    ]);

    function outputToken(parent, token) {
      var handledError = false;
      var tokenSpan = document.createElement("span");
      tokenSpan.classList.add(token.type);

      switch(token.type) {
        case "Alternation":
          token.left.forEach(function outputSubToken(subToken) {
            outputToken(tokenSpan, subToken);
          });

          var pipeSpan = document.createElement("span");
          pipeSpan.setAttribute("class", "pipe");
          pipeSpan.textContent = "|";
          tokenSpan.appendChild(pipeSpan);

          token.right.forEach(function outputSubToken(subToken) {
            outputToken(tokenSpan, subToken);
          });
          break;
          
        case "CapturingGroup":
        case "NonCapturingGroup":
        case "PositiveLookAhead":
        case "NegativeLookAhead":
        case "PositiveLookBehind":
        case "NegativeLookBehind":
        case "CharacterClass":
          var groupBrackets = brackets.get(token.type);
          var leftBracketSpan = document.createElement("span");
          leftBracketSpan.classList.add("bracket");
          if (token.error) {
            leftBracketSpan.classList.add("error");
            leftBracketSpan.title = errorMessages.get(token.error);
            handledError = true;
          } else {
            tokenSpan.classList.add("group");
          }
          leftBracketSpan.textContent = groupBrackets.opening;
          tokenSpan.appendChild(leftBracketSpan);

          if (token.type === "CharacterClass" && token.negated) {
            tokenSpan.appendChild(document.createTextNode("^"));
          }

          token.body.forEach(function outputSubToken(subToken) {
            outputToken(tokenSpan, subToken);
          });

          if (!token.error || (token.body.length !== 0 &&
              (token.loc.end === token.body[token.body.length - 1].loc.end + 1))) {
            var rightBracketSpan = leftBracketSpan.cloneNode();
            rightBracketSpan.textContent = groupBrackets.closing;
            tokenSpan.appendChild(rightBracketSpan);
          }
          break;

        case "IdentityEscape":
        case "CharacterClassEscape":
        case "ControlEscape":
        case "ControlLetterEscape":
        case "HexEscapeSequence":
        case "UnicodeEscapeSequence":
          tokenSpan.textContent = "\\" + (prefix.get(token.type) || "") +
              (token.char || token.sequence || "");
          break;

        case "StartAnchor":
        case "EndAnchor":
        case "AnyCharacter":
        case "OptionalQuantifier":
        case "ZeroOrMoreQuantifier":
        case "OneOrMoreQuantifier":
          tokenSpan.textContent = tokenOutput.get(token.type) + (token.lazy ? "?" : "");
          break;

        case "FixedRepetitionQuantifier":
        case "VariableRepetitionQuantifier":
          tokenSpan.textContent = "{";
          if (token.type === "FixedRepetitionQuantifier") {
            tokenSpan.textContent += token.repetitions;
          } else {
            tokenSpan.textContent += (token.min || "") + "," + (token.max || "");
          }
          tokenSpan.textContent += "}" + (token.lazy ? "?" : "");
          break;

        case "Range":
          outputToken(tokenSpan, token.left);
          tokenSpan.appendChild(document.createTextNode("-"));
          outputToken(tokenSpan, token.right);
          break;

        default:
          if (token.value !== undefined) {
            tokenSpan.textContent = token.value;
          }

          if (token.body) {
            token.body.forEach(function outputSubToken(subToken) {
              outputToken(tokenSpan, subToken);
            });
          }
      }

      if (token.error && !handledError) {
        tokenSpan.classList.add("error");
        tokenSpan.title = errorMessages.get(token.error);
      }

      parent.appendChild(tokenSpan);
    }

    let highlightedRegExp = new DocumentFragment();
    outputToken(highlightedRegExp, token);

    return highlightedRegExp;
  };

  window.RegExpHighlighter = RegExpHighlighter;
})();