/* See license.txt for terms of usage */

"use strict";

const IGNORED_KEY_CODES = new Set([
  17, // Ctrl key
  18, // Alt key
  225, // AltGr key
  224, // Meta key
  16, // Shift key
  20, // Caps Lock key
  9, // Tab key
  13, // Return key
  93, // Context Menu key
  27, // Escape key
  33, // Page up key
  34, // Page down key
  144, // Num Lock key
  19, // Pause key
  44 // Print Screen key
]);

class Controller {
  constructor(regExpField, searchTextField, regExpFormatter, searchTextFormatter) {
    let self = this;
    function handleInput() {
      self.updateDisplay();
    }

    function handleMouseEvent(evt) {
      self.regExpFormatter.highlight();
      let searchText = self.searchTextField.textContent;
      let matches = RegExpTester.test(self.regExpField.textContent, "", searchText);
      console.log(searchText, matches);
      self.searchTextFormatter.highlightMatches(matches);
    }

    function handleKeyboardEvent(evt) {
      if (!IGNORED_KEY_CODES.has(evt.keyCode)) {
        self.regExpFormatter.highlight();
        let searchText = self.searchTextField.textContent;
        let matches = RegExpTester.test(self.regExpField.textContent, "", searchText);
        console.log(searchText, matches);
        self.searchTextFormatter.highlightMatches(matches);
      }
    }

    this.tokenizer = new RegExpTokenizer();
    this.rangeTool = new RangeTool();
    this.regExpField = regExpField;
    this.searchTextField = searchTextField;
    this.regExpFormatter = regExpFormatter;
    this.searchTextFormatter = searchTextFormatter;

    this.regExpField.contentEditable = true;
    this.searchTextField.contentEditable = true;

    this.updateDisplay();
    this.regExpField.addEventListener("input", handleInput);

    this.regExpField.addEventListener("mousedown", handleMouseEvent);
    this.regExpField.addEventListener("mouseup", handleMouseEvent);

    this.regExpField.addEventListener("keypress", handleKeyboardEvent);
    this.regExpField.addEventListener("keyup", handleKeyboardEvent);
  }

  updateDisplay() {
    let tokens = this.tokenizer.tokenize(this.regExpField.textContent);
    let formattedRegExp = this.regExpFormatter.format(tokens);

    let selectionOffset = this.rangeTool.getSelectionOffset(this.regExpField);
    this.regExpField.replaceChild(formattedRegExp, this.regExpField.firstChild);

    let selection = window.getSelection();
    selection.removeAllRanges();
    let range = this.rangeTool.getRangeByOffset(this.regExpField, selectionOffset);
    selection.addRange(range);

    this.searchTextField.textContent = this.searchTextField.textContent;
  }
}