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
      switch(token.type) {
        case "Alternation":
          var tokenSpan = document.createElement("span");
          tokenSpan.setAttribute("class", token.type);

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

          parent.appendChild(tokenSpan);
          break;
          
        case "CapturingGroup":
        case "NonCapturingGroup":
        case "PositiveLookAhead":
        case "NegativeLookAhead":
        case "CharacterClass":
          var groupBrackets = brackets[token.type];
          var tokenSpan = document.createElement("span");
          tokenSpan.classList.add(token.type);
          var leftBracketSpan = document.createElement("span");
          leftBracketSpan.classList.add("bracket");
          if (token.error) {
            leftBracketSpan.classList.add("error");
            leftBracketSpan.title = token.error;
          }
          leftBracketSpan.textContent = groupBrackets.opening;
          tokenSpan.appendChild(leftBracketSpan);

          token.body.forEach(function outputSubToken(subToken) {
            outputToken(tokenSpan, subToken);
          });

          if (!token.error) {
            var rightBracketSpan = leftBracketSpan.cloneNode();
            rightBracketSpan.textContent = groupBrackets.closing;
            tokenSpan.appendChild(rightBracketSpan);
          }

          parent.appendChild(tokenSpan);
          break;

        default:
          var tokenSpan = document.createElement("span");
          tokenSpan.setAttribute("class", token.type);
          if (token.value !== undefined) {
            tokenSpan.textContent = token.value;
          }
          parent.appendChild(tokenSpan);

          if (token.body) {
            token.body.forEach(function outputSubToken(subToken) {
              outputToken(tokenSpan, subToken);
            });
          }
      }
    }

    let highlightedRegExp = new DocumentFragment();
    outputToken(highlightedRegExp, token);

    return highlightedRegExp;
  };

  window.RegExpHighlighter = RegExpHighlighter;
})();