(function () {
  "use strict";

  let RegExpHighlighter = function() { };
  let prototype = RegExpHighlighter.prototype;

  prototype.highlight = function(token) {
    let brackets = {
        "CapturingGroup": {
          opening: "(",
          closing: ")"
        },
        "NonCapturingGroup": {
          opening: "(?:",
          closing: ")"
        },
        "PositiveLookAhead": {
          opening: "(?=",
          closing: ")"
        },
        "NegativeLookAhead": {
          opening: "(?!",
          closing: ")"
        },
        "CharacterClass": {
          opening: "[",
          closing: "]"
        }
    }

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
        case "CharacterClass":
          var groupBrackets = brackets[token.type];
          var leftBracketSpan = document.createElement("span");
          leftBracketSpan.classList.add("bracket");
          if (token.error) {
            leftBracketSpan.classList.add("error");
            leftBracketSpan.title = token.error;
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

          if (!token.error) {
            var rightBracketSpan = leftBracketSpan.cloneNode();
            rightBracketSpan.textContent = groupBrackets.closing;
            tokenSpan.appendChild(rightBracketSpan);
          }
          break;

        case "StartAnchor":
        case "EndAnchor":
        case "OptionalQuantifier":
        case "ZeroOrMoreQuantifier":
        case "OneOrMoreQuantifier":
          var tokenOutput = {
            "StartAnchor": "^",
            "EndAnchor": "$",
            "OptionalQuantifier": "?",
            "ZeroOrMoreQuantifier": "*",
            "OneOrMoreQuantifier": "+"
          };
          tokenSpan.textContent = tokenOutput[token.type] + (token.lazy ? "?" : "");
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
        tokenSpan.title = token.error;
      }

      parent.appendChild(tokenSpan);
    }

    let highlightedRegExp = new DocumentFragment();
    outputToken(highlightedRegExp, token);

    return highlightedRegExp;
  };

  window.RegExpHighlighter = RegExpHighlighter;
})();