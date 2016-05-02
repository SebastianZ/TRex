/* See license.txt for terms of usage */

"use strict";

const BRACKETS = new Map([
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

const PREFIXES= new Map([
  ["HexEscapeSequence", "x"],
  ["UnicodeEscapeSequence", "u"],
  ["ControlLetterEscape", "c"]
]);

const TOKENS = new Map([
   ["StartAnchor", "^"],
   ["EndAnchor", "$"],
   ["AnyCharacter", "."],
   ["OptionalQuantifier", "?"],
   ["ZeroOrMoreQuantifier", "*"],
   ["OneOrMoreQuantifier", "+"]
 ]);

const ERROR_MESSAGES = new Map([
  ["noClosingBracket", "Unmatched opening bracket."],
  ["additionalClosingBracket", "Unmatched closing bracket."],
  ["unescapedSlash", "Unescasped forward slash."],
  ["invalidCharRange", "Range values reversed. Start character is greater than end character."],
  ["lookbehind", "Lookbehinds not supported in JavaScript."],
  ["invalidRepetitionRange", "Quantifier minimum is greater than maximum."],
  ["danglingBackslash", "Dangling backslash."],
  ["invalidQuantifierTarget", "Invalid target for quantifier."]
]);

class RegExpFormatter {
  format(tokens) {
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
          var groupBrackets = BRACKETS.get(token.type);
          var leftBracketSpan = document.createElement("span");
          leftBracketSpan.classList.add("bracket");
          if (token.error) {
            leftBracketSpan.classList.add("error");
            leftBracketSpan.title = ERROR_MESSAGES.get(token.error);
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
          tokenSpan.textContent = TOKENS.get(token.type) + (token.lazy ? "?" : "");
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
        tokenSpan.title = ERROR_MESSAGES.get(token.error);
      }

      parent.appendChild(tokenSpan);
    }

    var formattedRegExp = new DocumentFragment();
    outputToken(formattedRegExp, tokens);

    return formattedRegExp;
  }

  highlight() {
    var highlightedGroup = document.getElementsByClassName("highlighted");

    // Remove old highlights
    if (highlightedGroup.length > 0) {
      highlightedGroup[0].classList.remove("highlighted");
    }

    var selection = window.getSelection();
    var selectedElement = selection.anchorNode.parentElement;
    var highlightedGroup = null;
    if (selectedElement.classList.contains("bracket") && selection.anchorOffset === 1) {
      highlightedGroup = selectedElement.parentElement;
    } else if (selectedElement.previousElementSibling &&
        selectedElement.previousElementSibling.classList.contains("group") &&
        selection.anchorOffset === 0) {
      highlightedGroup = selectedElement.previousElementSibling;
    } else if (selection.anchorOffset === 0 && !selectedElement.classList.contains("Range")) {
      var element = selectedElement;
      while (!element.previousElementSibling &&
          (element.parentElement.classList.contains("Alternation") ||
              element.parentElement.classList.contains("Range"))) {
        element = element.parentElement;
      }

      if (element.previousElementSibling && element.previousElementSibling.classList.contains("bracket")) {
        highlightedGroup = element.parentElement;
      }
    }

    if (highlightedGroup) {
      highlightedGroup.classList.add("highlighted");
    }
  }
}
