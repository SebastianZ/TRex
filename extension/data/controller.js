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
  constructor(regExpField, flagsField, searchTextField, regExpFormatter, searchTextFormatter) {
    let self = this;
    function handleInput() {
      self.updateDisplay();
    }

    function handleMouseEvent(evt) {
      self.updateHighlighting();
    }

    function handleKeyboardEvent(evt) {
      if (!IGNORED_KEY_CODES.has(evt.keyCode)) {
        self.updateHighlighting();
      }
    }

    this.tokenizer = new RegExpTokenizer();
    this.rangeTool = new RangeTool();
    this.regExpField = regExpField;
    this.flagsField = flagsField;
    this.searchTextField = searchTextField;
    this.regExpFormatter = new RegExpFormatter();
    this.searchTextFormatter = new SearchTextFormatter(searchTextField);

    this.regExpField.contentEditable = true;
    this.flagsField.contentEditable = true;
    this.searchTextField.contentEditable = true;

    this.updateDisplay();
    this.updateHighlighting();

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

  updateHighlighting() {
    this.regExpFormatter.highlight();
    let searchText = this.searchTextField.textContent;
    let matches = RegExpTester.test(this.regExpField.textContent, this.flagsField.textContent,
        searchText);
    this.searchTextFormatter.highlightMatches(matches);
  }
}