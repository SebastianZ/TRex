(function () {
  "use strict";

  let RegExpTokenizer = function() { };
  let prototype = RegExpTokenizer.prototype;

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

    let length = str.length;
    let i = 0;
    let ast = new token("RegularExpression", i, length, {body: []});
    let parent = ast.body;
    let currentToken = null;
    while (i < length) {
      let char = str.charAt(i);
      let addToParent = true;

      if (currentToken && currentToken.type === "Literal") {
        currentToken.value += char;
        currentToken.loc.end++;
        addToParent = false;
      } else {
        currentToken = new token("Literal", i, null, {value: char});
      }

      if (addToParent) {
        if (Array.isArray(parent)) {
          parent.push(currentToken);
        } else {
          parent = currentToken;
        }
      }

      i = currentToken.loc.end;
    }

    this.token = ast;

    return ast;
  };

  window.RegExpTokenizer = RegExpTokenizer;
})();