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
    SELECTED_OPTION_TITLE: 'mdl-selectfield__selected-option-title',
    MENU: 'mdl-selectfield__menu',
    MENU_ITEM: 'mdl-selectfield__menu-item',
    MENU_ITEM_ICON_CHECKED: 'mdl-selectfield__menu-item-icon-checked',
    MENU_ITEM_ICON_UNCHECKED: 'mdl-selectfield__menu-item-icon-unchecked',
    BACKDROP: 'mdl-selectfield__backdrop',
    RIPPLE: 'mdl-ripple',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_CONTAINER: 'mdl-button__ripple-container',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',

    IS_UPGRADED: 'is-upgraded',
    IS_DISABLED: 'is-disabled',
    IS_FOCUSED: 'is-focused',
    IS_OPENED: 'is-opened',
    IS_SELECTED: 'is-selected',
    IS_ACTIVE: 'is-active',
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
    ENTER: 13,
    ESCAPE: 27,
    KEY_UP: 38,
    KEY_DOWN: 40
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
    if (this.select_.value) {
      this.element_.classList.add(this.CssClasses_.IS_DIRTY);
    } else {
      this.element_.classList.remove(this.CssClasses_.IS_DIRTY);
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
    e.stopPropagation();
  };

  /**
   * Element focus handler
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.elementFocusHandler_ = function() {
    if (this.element_.classList.contains(this.CssClasses_.IS_DISABLED)) {
      return;
    }
    if (!this.element_.classList.contains(this.CssClasses_.IS_FOCUSED)) {
      this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
    }
  };

  /**
   * Element focus handler
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.elementFocusoutHandler_ = function() {
    if (this.menuElement_) {
      return;
    }
    if (this.element_.classList.contains(this.CssClasses_.IS_FOCUSED)) {
      this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
    }
  };

  /**
   * Element keydown handler
   * @param  {Event} e Element event object
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.elementKeydownHandler_ = function(e) {
    if (this.menuElement_) {
      return;
    }
    var keyCode = e.keyCode;
    if (keyCode === this.KeyCodes_.ENTER) {
      e.preventDefault();
      e.stopPropagation();
      this.open();
    }
  };

  /**
   * Select keydown handler
   * @param  {Event} e Element event object
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.selectKeydownHandler_ = function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  /**
   * Menu item click handler
   * @param  {Event} e Current menu item event object
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.menuItemClickHandler_ = function(e) {
    var selectedItem;
    var timeout = 0;
    if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
      selectedItem = e.target.parentNode;
      timeout = 100;
    } else {
      selectedItem = e.target;
    }
    setTimeout(function() {
      var index = selectedItem.getAttribute('data-index');
      this.selectOption_(index);
      if (!this.select_.multiple) {
        this.close();
      }
    }.bind(this), timeout);
  };

  /**
   * Document click handler
   * @param {Event} e document click event object
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.documentClickHandler_ = function(e) {
    console.log(e);
    if (this.selectedOptionElement_ === e.target) {
      return e.stopPropagation();
    }
    if (this.selectedOptionElement_ === e.target.parentNode) {
      return e.stopPropagation();
    }
    if (e.target.classList.contains(this.CssClasses_.MENU_ITEM)) {
      return e.stopPropagation();
    }
    if (e.target.parentNode.classList.contains(this.CssClasses_.MENU_ITEM)) {
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
  MaterialSelectfield.prototype.keyboardNavigationHandler_ = function(e) {
    var keyCode = e.keyCode;
    if (keyCode === this.KeyCodes_.ESCAPE) {
      e.preventDefault();
      this.close();
    } else if (keyCode === this.KeyCodes_.KEY_UP) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.menuItemUp_();
    } else if (keyCode === this.KeyCodes_.KEY_DOWN) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.menuItemDown_();
    } else if (keyCode === this.KeyCodes_.ENTER) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.menuItemSelect_();
    }
  };

  /**
   * Selected option click handler
   * @param {Event} e Selected option click event object
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.selectedOptionClickHandler_ = function(e) {
    console.log(e);
    e.preventDefault();
    if (this.element_.classList.contains(this.CssClasses_.IS_OPENED)) {
      this.close();
    } else {
      var evt = new CustomEvent('click', {
        sourceElement: this.selectedOptionElement_,
        bubbles: false
      });
      console.log(evt);
      document.body.dispatchEvent(evt);
      // this.select_.focus();
      this.open();
    }
  };

  /**
   * Return  currently active menu item index
   * @return {Number} Current active menu item index
   */
  MaterialSelectfield.prototype.getActiveMenuItemIndex_ = function() {
    var index = -1;
    if (this.menuElement_) {
      var menuItems =
        this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
      for (var i = 0; i < menuItems.length; i++) {
        var menuItem = menuItems[i];
        if (menuItem.classList.contains(this.CssClasses_.IS_ACTIVE)) {
          index = i;
          break;
        }
      }
    }
    if (index < 0 && !this.select_.multiple) {
      index = this.select_.selectedIndex;
    }
    return index;
  };

  /**
   * Switch current active menu item to one above if exists.
   * If current one is first, switch to last.
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.menuItemUp_ = function() {
    if (!this.menuElement_) {
      return;
    }
    var activeIndex = this.getActiveMenuItemIndex_();
    if (activeIndex < 0) {
      activeIndex = 0;
    }
    var upIndex = activeIndex - 1;

    if (upIndex < 0) {
      upIndex = this.select_.options.length - 1;
    }
    var menuItems =
      this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
    if (menuItems[activeIndex]) {
      menuItems[activeIndex].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
    if (menuItems[upIndex]) {
      menuItems[upIndex].classList.add(this.CssClasses_.IS_ACTIVE);
      menuItems[upIndex].focus();
      var focusItem = menuItems[upIndex];
      for (var i = 0; i < 2; i++) {
        if (focusItem.previousSibling) {
          focusItem = focusItem.previousSibling;
        }
      }
      this.menuElement_.scrollTop = focusItem.offsetTop - 8;
    }
  };

  /**
   * Switch current active menu item to one below if exists.
   * If current one is last, switch to first.
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.menuItemDown_ = function() {
    if (!this.menuElement_) {
      return;
    }
    var activeIndex = this.getActiveMenuItemIndex_();
    if (activeIndex < 0) {
      activeIndex = this.select_.options.length - 1;
    }
    var downIndex = activeIndex + 1;

    if (downIndex >= this.select_.options.length) {
      downIndex = 0;
    }
    var menuItems =
      this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
    if (menuItems[activeIndex]) {
      menuItems[activeIndex].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
    if (menuItems[downIndex]) {
      menuItems[downIndex].classList.add(this.CssClasses_.IS_ACTIVE);
      menuItems[downIndex].focus();
      var focusItem = menuItems[downIndex];
      for (var i = 0; i < 2; i++) {
        if (focusItem.previousSibling) {
          focusItem = focusItem.previousSibling;
        }
      }
      this.menuElement_.scrollTop = focusItem.offsetTop - 8;
    }
  };

  /**
   * Select current active menu item.
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.menuItemSelect_ = function() {
    var activeIndex = this.getActiveMenuItemIndex_();
    if (activeIndex >= 0 && activeIndex < this.select_.options.length) {
      this.selectOption_(activeIndex);
      if (!this.select_.multiple) {
        this.close();
      }
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

      if (selectedMenuItem) {
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
    if (option.selected) {
      menuItem.classList.add(this.CssClasses_.IS_SELECTED);
    }
    menuItem.innerHTML = option.innerHTML;
    if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
      menuItem.classList.add(this.CssClasses_.RIPPLE_EFFECT);
      var rippleContainer = document.createElement('span');
      rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
      var rippleElement = document.createElement('span');
      rippleElement.classList.add(this.CssClasses_.RIPPLE);
      rippleContainer.appendChild(rippleElement);
      rippleContainer.addEventListener('mouseup',
        this.boundMenuItemClickHandler);
      menuItem.appendChild(rippleContainer);
      componentHandler.upgradeElement(menuItem, 'MaterialRipple');
    } else {
      menuItem.addEventListener('click', this.boundMenuItemClickHandler);
    }
    return menuItem;
  };

  /**
   * Select option in hidden select element.
   * Since this method can be called using API, we must check
   * if menuElement_ exists to do the necesarry logic. This can be
   * bypassed by ensuring that menuElement_ always exist, but since we didn't
   * want to contain unnecesary DOM elements this is must-have.
   * @param  {number} index Selected menu item index
   * @private
   * @return {void}
   */
  MaterialSelectfield.prototype.selectOption_ = function(index) {
    var iterator = 0;
    var option;
    var menuItems;
    var selectedItem;
    var selectedOption;

    index = parseInt(index, 10);
    if (!this.select_.multiple && this.select_.selectedIndex === index) {
      // Currently selected option is selected again, do nothing
      return;
    }

    if (!this.select_.options[index]) {
      // We assume that select menu is cleared using API
      if (this.select_.multiple) {
        if (this.menuElement_) {
          menuItems =
            this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
        }

        for (iterator = 0; iterator < this.select_.options.length; iterator++) {
          option = this.select_.options[iterator];
          option.selected = false;
          if (menuItems[index]) {
            menuItems[index].classList.remove(this.CssClasses_.IS_SELECTED);
          }
        }
      } else {
        this.select_.selectedIndex = index;
        if (this.menuElement_) {
          selectedItem =
            this.menuElement_.querySelectorAll('.' + this.CssClasses_.IS_SELECTED);
          selectedItem.classList.remove(this.CssClasses_.IS_SELECTED);
        }
      }
    }

    if (this.select_.multiple) {
      selectedOption = this.select_.options[index];
      // Currently selected option is already selected, unselect it since this
      // is multiple options select input
      if (selectedOption.selected) {
        selectedOption.selected = false;
      } else {
        selectedOption.selected = true;
      }

      if (this.menuElement_) {
        menuItems =
          this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
        if (menuItems[index]) {
          if (selectedOption.selected) {
            menuItems[index].classList.add(this.CssClasses_.IS_SELECTED);
          } else {
            menuItems[index].classList.remove(this.CssClasses_.IS_SELECTED);
          }
        }
      }

      var selectedValues = [];
      for (iterator = 0; iterator < this.select_.options.length; iterator++) {
        option = this.select_.options[iterator];
        if (option && option.selected) {
          selectedValues.push(option.label);
        }
      }

      this.selectedOptionValueElement_.innerHTML = selectedValues.join(', ');
    } else {
      this.select_.selectedIndex = index;

      if (this.menuElement_) {
        selectedItem =
          this.menuElement_.querySelector('.' + this.CssClasses_.IS_SELECTED);

        if (selectedItem) {
          selectedItem.classList.remove(this.CssClasses_.IS_SELECTED);
        }
        menuItems =
          this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
        if (menuItems[index]) {
          menuItems[index].classList.add(this.CssClasses_.IS_SELECTED);
          this.selectedOptionValueElement_.innerHTML = menuItems[index].innerHTML;
        } else {
          this.selectedOptionValueElement_.innerHTML = '';
        }
      }

      var selectOptions = this.select_.options;
      if (selectOptions[index]) {
        this.selectedOptionValueElement_.innerHTML =
          selectOptions[index].label;
      } else {
        this.selectedOptionValueElement_.innerHTML = '';
      }
    }

    this.checkClasses_();

    var changeEvent = new Event('change', {bubbles: false});
    this.element_.dispatchEvent(changeEvent);
    this.select_.dispatchEvent(changeEvent);
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
    document.body.addEventListener('keydown', this.boundKeyboardNavigationHandler);
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
      return;
    }
    this.element_.classList.remove(this.CssClasses_.IS_OPENED);
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
    document.body.removeEventListener('click', this.boundDocumentClickHandler);
    document.body.removeEventListener('keydown', this.boundKeyboardNavigationHandler);
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
   * Set currently selected index in select element
   * @param {Number} index Selected index
   */
  MaterialSelectfield.prototype.setSelectedIndex = function(index) {
    this.selectOption_(index);
  };
  MaterialSelectfield.prototype['setSelectedIndex'] =
    MaterialSelectfield.prototype.setSelectedIndex;

  /**
   * Set currently selected value in select element
   * @param {Number} value Selected value
   */
  MaterialSelectfield.prototype.setSelectedValue = function(value) {
    console.log(value);
  };
  MaterialSelectfield.prototype['setSelectedValue'] =
    MaterialSelectfield.prototype.setSelectedValue;

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
      this.element_.setAttribute('tabindex', 0);

      // Prepare event handlers
      this.boundElementClickHandler =
        this.elementClickHandler_.bind(this);
      this.boundElementFocusHandler =
        this.elementFocusHandler_.bind(this);
      this.boundElementFocusoutHandler =
        this.elementFocusoutHandler_.bind(this);
      this.boundElementKeydownHandler =
        this.elementKeydownHandler_.bind(this);
      this.boundSelectKeydownHandler =
        this.selectKeydownHandler_.bind(this);
      this.boundSelectedOptionClickHandler =
        this.selectedOptionClickHandler_.bind(this);
      this.boundDocumentClickHandler =
        this.documentClickHandler_.bind(this);
      this.boundKeyboardNavigationHandler =
        this.keyboardNavigationHandler_.bind(this);
      this.boundMenuItemClickHandler =
        this.menuItemClickHandler_.bind(this);

      this.element_.addEventListener('keydown', this.boundElementKeydownHandler);
      this.element_.addEventListener('focus', this.boundElementFocusHandler);
      this.element_.addEventListener('focusout', this.boundElementFocusoutHandler);

      this.selectedOptionValueElement_ = document.createElement('span');
      this.selectedOptionValueElement_
        .classList.add(this.CssClasses_.SELECTED_OPTION_TITLE);
      this.selectedOptionElement_ = document.createElement('div');
      this.selectedOptionElement_.classList.add(this.CssClasses_.SELECTED_OPTION);
      this.selectedOptionElement_.appendChild(this.selectedOptionValueElement_);

      var arrowIcon = document.createElement('i');
      arrowIcon.classList.add('material-icons');
      arrowIcon.innerHTML = 'arrow_drop_down';
      this.selectedOptionElement_.appendChild(arrowIcon);
      this.element_.appendChild(this.selectedOptionElement_);

      var options = this.select_.options;
      if (this.select_.multiple) {
        var option;
        var values = [];
        for (var i = 0; i < options.length; i++) {
          option = options[i];
          if (option.selected) {
            values.push(option.label);
          }
        }
        this.selectedOptionValueElement_.innerHTML = values.join(', ');
      } else {
        this.selectedOptionValueElement_.innerText = '';
        if (options[this.select_.selectedIndex]) {
          this.selectedOptionValueElement_.innerText =
            options[this.select_.selectedIndex].innerText;
        }
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
      if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
        this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
      }

      // @TODO: Remove after initial development
      // this.open();
      this.checkClasses_();

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
