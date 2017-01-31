(function() {
  'use strict';

  /**
   * Class constructor for dropdown MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
  var SearchBox = function SearchBox(element) {
    this.element_ = element;

    // Initialize instance.
    this.init();
  };
  window.SearchBox = SearchBox;
})();
