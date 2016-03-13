/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function() {
  'use strict';

  /**
   * MaterialSelectfield class
   * @param {Element} element_ DOM element on which selectfield is attached
   */
  var MaterialSelectfield = function MaterialSelectfield(element_) {
    this.element_ = element_;

    // Initialize component
    this.init();
  };
  window['MaterialSelectfield'] = MaterialSelectfield;

  /**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
  MaterialSelectfield.prototype.CssClasses_ = {
    LABEL: 'mdl-selectfield__label',
    SELECT: 'mdl-selectfield__select',
    SELECTED_OPTION: 'mdl-selectfield__selected-option',
    MENU: 'mdl-selectfield__menu',
    MENU_ITEM: 'mdl-selectfield__menu-item',
    BACKDROP: 'mdl-selectfield__backdrop',
    RIPPLE: 'mdl-ripple',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_CONTAINER: 'mdl-button__ripple-container',

    IS_UPGRADED: 'is-upgraded',
    IS_DISABLED: 'is-disabled',
    IS_FOCUSED: 'is-focused',
    IS_OPENED: 'is-opened',
    IS_SELECTED: 'is-selected',
    IS_DIRTY: 'is-dirty',
    IS_INVALID: 'is-invalid',

    FIXED: 'mdl-selectfield--fixed'
  };

  /**
   * Keycode used in Selectfield component
   *
   * @enum {Number}
   * @private
   */
  MaterialSelectfield.prototype.KeyCodes_ = {
    ESCAPE: 27
  };

  /**
   * Check Selectfield classe states
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.checkClasses_ = function() {
    this.checkDirty_();
    this.checkValidity_();
    this.checkDisabled_();
  };

  /**
   * Check if selectfield has value
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.checkDirty_ = function() {
    if (this.select_.validity.valueMissing) {
      this.element_.classList.remove(this.CssClasses_.IS_DIRTY);
    } else {
      this.element_.classList.add(this.CssClasses_.IS_DIRTY);
    }
  };

  /**
   * Check select validity
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.checkValidity_ = function() {
    if (this.select_.validity.valid) {
      this.element_.classList.remove(this.CssClasses_.IS_INVALID);
    } else {
      this.element_.classList.add(this.CssClasses_.IS_INVALID);
    }
  };

  /**
   * Check if selectfield is disabled
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.checkDisabled_ = function() {
    if (this.select_.disabled) {
      this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
      this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
  };

  /**
   * Check for selected option value
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.checkSelectedOption_ = function() {
    if (!this.element_.classList.contains(this.CssClasses_.IS_DIRTY)) {
      return;
    }

    if (this.select_.validity.valueMissing) {
      this.selectedOptionValueElement_.innerText = '';
    } else {
      var options = this.select_.querySelectorAll('option');
      var index = this.select_.selectedIndex;
      this.selectedOptionValueElement_.innerText = options[index].innerHTML;
    }
  };

  /**
   * Element click handler
   * @param  {Event} e Element event object
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.elementClickHandler_ = function(e) {
    e.preventDefault();
  };

  /**
   * Menu item click handler
   * @param  {Event} e Current menu item event object
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.menuItemClickHandler_ = function(e) {
    var selectedItem = e.target;
    var index = selectedItem.getAttribute('data-index');
    this.selectOption_(index);
    this.close();
  };

  /**
   * Document click handler
   * @param {Event} e document click event object
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.documentClickHandler_ = function(e) {
    if (this.selectedOptionElement_ === e.srcElement) {
      return e.stopPropagation();
    }
    if (this.selectedOptionElement_ === e.srcElement.parentNode) {
      return e.stopPropagation();
    }
    if (this.element_.classList.contains(this.CssClasses_.IS_OPENED)) {
      e.stopPropagation();
    }
    this.close();
  };

  /**
   * Escape key keyup handler
   * @param  {Event} e Keyup event object
   * @return {void}
   */
  MaterialSelectfield.prototype.escapeKeyupHandler_ = function(e) {
    var keyCode = e.keyCode;
    if (keyCode === this.KeyCodes_.ESCAPE) {
      e.preventDefault();
      this.close();
    }
  };

  /**
   * Selected option click handler
   * @param {Event} e Selected option click event object
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.selectedOptionClickHandler_ = function(e) {
    e.preventDefault();
    if (this.element_.classList.contains(this.CssClasses_.IS_OPENED)) {
      this.close();
    } else {
      this.open();
    }
  };

  /**
   * Render selectfield component
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.render_ = function() {
    if (this.menuElement_) {
      return;
    }

    // Render selectfield menu
    this.renderMenu_();

    if (this.element_.classList.contains(this.CssClasses_.FIXED)) {
      this.backdropElement_ = document.createElement('div');
      this.backdropElement_.classList.add(this.CssClasses_.BACKDROP);
      document.appendChild(this.backdropElement_);
      document.body.appendChild(this.menuElement_);
    } else {
      this.element_.appendChild(this.menuElement_);
    }

    if (this.element_.classList.contains(this.CssClasses_.IS_DIRTY)) {
      var index = this.select_.selectedIndex;
      var menuItems =
        this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
      var selectedMenuItem =
        this.menuElement_.querySelector(
          '.' + this.CssClasses_.MENU_ITEM +
          '.' + this.CssClasses_.IS_SELECTED
        );
      var menuItemsCount = menuItems.length;

      // Calculate top offset
      var topOffset = 0;
      if (index < 2) {
        topOffset = -(index * 48);
      } else if (index > ((menuItemsCount - 1) - 2)) {
        if (index === (menuItemsCount - 1)) {
          topOffset = -(4 * 48);
        } else if (index === (menuItemsCount - 2)) {
          topOffset = -(3 * 48);
        } else {
          topOffset = -(2 * 48);
        }
      } else {
        topOffset = -(2 * 48);
      }
      if (topOffset < 0) {
        this.menuElement_.style.top = topOffset + 'px';
      }

      // Calculate which menu item is in click ofcus
      var focusMenuItem = selectedMenuItem;
      for (var i = 0; i < 2; i++) {
        if (focusMenuItem.previousSibling) {
          focusMenuItem = focusMenuItem.previousSibling;
        }
      }
      this.menuElement_.scrollTop = focusMenuItem.offsetTop - 8;
    } else {
      this.menuElement_.style.top = '0px';
    }
  };

  /**
   * Render selectfield menu
   * @private
   * @return {Element} Selectfield menu
   */
  MaterialSelectfield.prototype.renderMenu_ = function() {
    if (!this.menuElement_) {
      this.menuElement_ = document.createElement('div');
      this.menuElement_.classList.add(this.CssClasses_.MENU);

      var options = this.select_.querySelectorAll('option');
      for (var i = 0; i < options.length; i++) {
        var option = options[i];
        var menuItem = this.renderMenuItem_(option);
        menuItem.setAttribute('data-index', i);
        menuItem.setAttribute('data-value', option.value);

        // Check if current option is selected
        if (this.select_.selectedIndex === i) {
          menuItem.classList.add(this.CssClasses_.IS_SELECTED);
        }

        this.menuElement_.appendChild(menuItem);
      }
    }

    return this.menuElement_;
  };

  /**
   * Render selectfield menu item
   * @param  {Element} option Select option element
   * @private
   * @return {Element}        Rendered menu item element
   */
  MaterialSelectfield.prototype.renderMenuItem_ = function(option) {
    var menuItem = document.createElement('div');
    menuItem.classList.add(this.CssClasses_.MENU_ITEM);
    menuItem.innerHTML = option.innerHTML;
    menuItem.addEventListener('click', this.boundMenuItemClickHandler);

    return menuItem;
  };

  /**
   * Select option in hidden select element
   * @param  {number} index Selected menu item index
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.selectOption_ = function(index) {
    index = parseInt(index, 10);
    if (this.select_.selectedIndex === index) {
      // Currently selected option is selected again, do nothing.
      return;
    }

    this.select_.selectedIndex = index;
    var selectedItem =
      this.menuElement_.querySelector('.' + this.CssClasses_.IS_SELECTED);

    if (selectedItem) {
      selectedItem.classList.remove(this.CssClasses_.IS_SELECTED);
    }

    var menuItems =
      this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
    if (menuItems[index]) {
      menuItems[index].classList.add(this.CssClasses_.IS_SELECTED);
    }

    this.selectedOptionValueElement_.innerHTML = menuItems[index].innerHTML;
    this.checkClasses_();
  };

  /**
   * Open selectfield component widget
   * @public
   * @return {void}
   */
  MaterialSelectfield.prototype.open = function() {
    if (this.element_.classList.contains(this.CssClasses_.IS_OPENED)) {
      return;
    }

    this.render_();
    document.body.addEventListener('click', this.boundDocumentClickHandler);
    document.body.addEventListener('keyup', this.boundEscapeKeyupHandler);
    setTimeout(function() {
      this.element_.classList.add(this.CssClasses_.IS_OPENED);
      this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
    }.bind(this));
  };
  MaterialSelectfield.prototype['open'] = MaterialSelectfield.prototype.open;

  /**
   * Close selectfield component widget
   * @public
   * @return {void} [description]
   */
  MaterialSelectfield.prototype.close = function() {
    if (!this.element_.classList.contains(this.CssClasses_.IS_OPENED)) {
      // return;
    }
    this.element_.classList.remove(this.CssClasses_.IS_OPENED);
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
    document.body.removeEventListener('click', this.boundDocumentClickHandler);
    document.body.removeEventListener('keyup', this.boundEscapeKeyupHandler);
    setTimeout(function() {
      if (this.menuElement_.remove) {
        this.menuElement_.remove();
      } else {
        this.menuElement_.parentNode.removeChild(this.menuElement_);
      }
      this.menuElement_ = null;
    }.bind(this), 200);
  };
  MaterialSelectfield.prototype['close'] = MaterialSelectfield.prototype.close;

  /**
   * Enable selectfield
   * @public
   * @return {void}
   */
  MaterialSelectfield.prototype.enable = function() {
    this.select_.disabled = false;
    this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    this.selectedOptionElement_
      .addEventListener('click', this.boundSelectedOptionClickHandler);
  };
  MaterialSelectfield.prototype['enable'] =
    MaterialSelectfield.prototype.enable;

  /**
   * Disable selectfield
   * @public
   * @return {void}
   */
  MaterialSelectfield.prototype.disable = function() {
    this.select_.disabled = true;
    this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    this.selectedOptionElement_
      .removeEventListener('click', this.boundSelectedOptionClickHandler);
  };
  MaterialSelectfield.prototype['disable'] =
    MaterialSelectfield.prototype.disable;

  /**
   * Initialize component
   * @return {void}
   */
  MaterialSelectfield.prototype.init = function() {
    if (this.element_) {
      this.select_ = this.element_.querySelector('.' + this.CssClasses_.SELECT);
      if (!this.select_) {
        throw new Error('Component must have select element as a child');
      }

      // Prepare event handlers
      this.boundElementClickHandler =
        this.elementClickHandler_.bind(this);
      this.boundSelectedOptionClickHandler =
        this.selectedOptionClickHandler_.bind(this);
      this.boundDocumentClickHandler =
        this.documentClickHandler_.bind(this);
      this.boundEscapeKeyupHandler =
        this.escapeKeyupHandler_.bind(this);
      this.boundMenuItemClickHandler =
        this.menuItemClickHandler_.bind(this);

      this.selectedOptionValueElement_ = document.createElement('span');
      this.selectedOptionElement_ = document.createElement('div');
      this.selectedOptionElement_.classList.add(this.CssClasses_.SELECTED_OPTION);
      this.selectedOptionElement_.appendChild(this.selectedOptionValueElement_);

      var arrowIcon = document.createElement('i');
      arrowIcon.classList.add('material-icons');
      arrowIcon.innerHTML = 'arrow_drop_down';
      this.selectedOptionElement_.appendChild(arrowIcon);
      this.element_.appendChild(this.selectedOptionElement_);

      var options = this.select_.querySelectorAll('option');
      if (options[this.select_.selectedIndex]) {
        this.selectedOptionValueElement_.innerText =
          options[this.select_.selectedIndex].innerText;
      }

      if (this.select_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
      }
      if (this.element_.classList.contains(this.CssClasses_.IS_DISABLED)) {
        this.disable();
      } else {
        this.enable();
        this.element_.addEventListener('click', this.boundElementClickHandler);
      }

      // @TODO: Remove after initial development
      // this.open();
      this.checkClasses_();

      console.log(this.select_.selectedIndex);

      this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
  };

  // The component registers itself. It can assume componentHandler is available
  // in the global scope.
  componentHandler.register({
    constructor: MaterialSelectfield,
    classAsString: 'MaterialSelectfield',
    cssClass: 'mdl-js-selectfield',
    widget: true
  });
})();
