;(function() {
"use strict";

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

/**
 * A component handler interface using the revealing module design pattern.
 * More details on this design pattern here:
 * https://github.com/jasonmayes/mdl-component-design-pattern
 *
 * @author Jason Mayes.
 */
/* exported componentHandler */

// Pre-defining the componentHandler interface, for closure documentation and
// static verification.
var componentHandler = {
  /**
   * Searches existing DOM for elements of our component type and upgrades them
   * if they have not already been upgraded.
   *
   * @param {string=} optJsClass the programatic name of the element class we
   * need to create a new instance of.
   * @param {string=} optCssClass the name of the CSS class elements of this
   * type will have.
   */
  upgradeDom: function(optJsClass, optCssClass) {}, // eslint-disable-line
  /**
   * Upgrades a specific element rather than all in the DOM.
   *
   * @param {!Element} element The element we wish to upgrade.
   * @param {string=} optJsClass Optional name of the class we want to upgrade
   * the element to.
   */
  upgradeElement: function(element, optJsClass) {}, // eslint-disable-line
  /**
   * Upgrades a specific list of elements rather than all in the DOM.
   *
   * @param {!Element|!Array<!Element>|!NodeList|!HTMLCollection} elements
   * The elements we wish to upgrade.
   */
  upgradeElements: function(elements) {}, // eslint-disable-line
  /**
   * Upgrades all registered components found in the current DOM. This is
   * automatically called on window load.
   */
  upgradeAllRegistered: function() {},
  /**
   * Allows user to be alerted to any upgrades that are performed for a given
   * component type
   *
   * @param {string} jsClass The class name of the MDL component we wish
   * to hook into for any upgrades performed.
   * @param {function(!HTMLElement)} callback The function to call upon an
   * upgrade. This function should expect 1 parameter - the HTMLElement which
   * got upgraded.
   */
  registerUpgradedCallback: function(jsClass, callback) {}, // eslint-disable-line
  /**
   * Registers a class for future use and attempts to upgrade existing DOM.
   *
   * @param {componentHandler.ComponentConfigPublic} config the registration configuration
   */
  register: function(config) {}, // eslint-disable-line
  /**
   * Downgrade either a given node, an array of nodes, or a NodeList.
   *
   * @param {!Node|!Array<!Node>|!NodeList} nodes The list of nodes.
   */
  downgradeElements: function(nodes) {} // eslint-disable-line
};

componentHandler = (function() {
  'use strict';

  /** @type {!Array<componentHandler.ComponentConfig>} */
  var registeredComponents_ = [];

  /** @type {!Array<componentHandler.Component>} */
  var createdComponents_ = [];

  var componentConfigProperty_ = 'mdlComponentConfigInternal_';

  /**
   * Searches registered components for a class we are interested in using.
   * Optionally replaces a match with passed object if specified.
   *
   * @param {string} name The name of a class we want to use.
   * @param {componentHandler.ComponentConfig=} optReplace Optional object to replace match with.
   * @return {!Object|boolean} Registered components.
   * @private
   */
  function findRegisteredClass_(name, optReplace) {
    for (var i = 0; i < registeredComponents_.length; i++) {
      if (registeredComponents_[i].className === name) {
        if (typeof optReplace !== 'undefined') {
          registeredComponents_[i] = optReplace;
        }
        return registeredComponents_[i];
      }
    }
    return false;
  }

  /**
   * Returns an array of the classNames of the upgraded classes on the element.
   *
   * @param {!Element} element The element to fetch data from.
   * @return {!Array<string>} Array of classNames.
   * @private
   */
  function getUpgradedListOfElement_(element) {
    var dataUpgraded = element.getAttribute('data-upgraded');
    // Use `['']` as default value to conform the `,name,name...` style.
    return dataUpgraded === null ? [''] : dataUpgraded.split(',');
  }

  /**
   * Returns true if the given element has already been upgraded for the given
   * class.
   *
   * @param {!Element} element The element we want to check.
   * @param {string} jsClass The class to check for.
   * @return {boolean} Whether the element is upgraded.
   * @private
   */
  function isElementUpgraded_(element, jsClass) {
    var upgradedList = getUpgradedListOfElement_(element);
    return upgradedList.indexOf(jsClass) !== -1;
  }

  /**
   * Searches existing DOM for elements of our component type and upgrades them
   * if they have not already been upgraded.
   *
   * @param {string=} optJsClass the programatic name of the element class we
   * need to create a new instance of.
   * @param {string=} optCssClass the name of the CSS class elements of this
   * type will have.
   */
  function upgradeDomInternal(optJsClass, optCssClass) {
    if (typeof optJsClass === 'undefined' &&
        typeof optCssClass === 'undefined') {
      for (var i = 0; i < registeredComponents_.length; i++) {
        upgradeDomInternal(registeredComponents_[i].className,
            registeredComponents_[i].cssClass);
      }
    } else {
      var jsClass = /** @type {string} */ (optJsClass);
      if (typeof optCssClass === 'undefined') {
        var registeredClass = findRegisteredClass_(jsClass);
        if (registeredClass) {
          optCssClass = registeredClass.cssClass;
        }
      }

      var elements = document.querySelectorAll('.' + optCssClass);
      for (var n = 0; n < elements.length; n++) {
        upgradeElementInternal(elements[n], jsClass);
      }
    }
  }

  /**
   * Upgrades a specific element rather than all in the DOM.
   *
   * @param {!Element} element The element we wish to upgrade.
   * @param {string=} optJsClass Optional name of the class we want to upgrade
   * the element to.
   */
  function upgradeElementInternal(element, optJsClass) {
    // Verify argument type.
    if (!(typeof element === 'object' && element instanceof Element)) {
      throw new Error('Invalid argument provided to upgrade MDL element.');
    }
    var upgradedList = getUpgradedListOfElement_(element);
    var classesToUpgrade = [];
    // If jsClass is not provided scan the registered components to find the
    // ones matching the element's CSS classList.
    if (!optJsClass) {
      var classList = element.classList;
      registeredComponents_.forEach(function(component) {
        // Match CSS & Not to be upgraded & Not upgraded.
        if (classList.contains(component.cssClass) &&
            classesToUpgrade.indexOf(component) === -1 &&
            !isElementUpgraded_(element, component.className)) {
          classesToUpgrade.push(component);
        }
      });
    } else if (!isElementUpgraded_(element, optJsClass)) {
      classesToUpgrade.push(findRegisteredClass_(optJsClass));
    }

    // Upgrade the element for each classes.
    for (var i = 0, n = classesToUpgrade.length, registeredClass; i < n; i++) {
      registeredClass = classesToUpgrade[i];
      if (registeredClass) {
        // Mark element as upgraded.
        upgradedList.push(registeredClass.className);
        element.setAttribute('data-upgraded', upgradedList.join(','));
        var instance = new registeredClass.classConstructor(element); // eslint-disable-line
        instance[componentConfigProperty_] = registeredClass;
        createdComponents_.push(instance);
        // Call any callbacks the user has registered with this component type.
        for (var j = 0, m = registeredClass.callbacks.length; j < m; j++) {
          registeredClass.callbacks[j](element);
        }

        if (registeredClass.widget) {
          // Assign per element instance for control over API
          element[registeredClass.className] = instance;
        }
      } else {
        throw new Error(
          'Unable to find a registered component for the given class.');
      }

      var ev = document.createEvent('Events');
      ev.initEvent('mdl-componentupgraded', true, true);
      element.dispatchEvent(ev);
    }
  }

  /**
   * Upgrades a specific list of elements rather than all in the DOM.
   *
   * @param {!Element|!Array<!Element>|!NodeList|!HTMLCollection} elements
   * The elements we wish to upgrade.
   */
  function upgradeElementsInternal(elements) {
    if (!Array.isArray(elements)) {
      if (typeof elements.item === 'function') {
        elements = Array.prototype.slice.call(/** @type {Array} */ (elements));
      } else {
        elements = [elements];
      }
    }
    for (var i = 0, n = elements.length, element; i < n; i++) {
      element = elements[i];
      if (element instanceof HTMLElement) {
        upgradeElementInternal(element);
        if (element.children.length > 0) {
          upgradeElementsInternal(element.children);
        }
      }
    }
  }

  /**
   * Registers a class for future use and attempts to upgrade existing DOM.
   *
   * @param {componentHandler.ComponentConfigPublic} config The configuration.
   */
  function registerInternal(config) {
    // In order to support both Closure-compiled and uncompiled code accessing
    // this method, we need to allow for both the dot and array syntax for
    // property access. You'll therefore see the `foo.bar || foo['bar']`
    // pattern repeated across this method.
    var widgetMissing = (typeof config.widget === 'undefined' &&
        typeof config['widget'] === 'undefined');
    var widget = true;

    if (!widgetMissing) {
      widget = config.widget || config['widget'];
    }

    var newConfig = /** @type {componentHandler.ComponentConfig} */ ({
      classConstructor: config.constructor || config['constructor'],
      className: config.classAsString || config['classAsString'],
      cssClass: config.cssClass || config['cssClass'],
      widget: widget,
      callbacks: []
    });

    registeredComponents_.forEach(function(item) {
      if (item.cssClass === newConfig.cssClass) {
        throw new Error('The provided cssClass has already been registered: ' +
            item.cssClass);
      }
      if (item.className === newConfig.className) {
        throw new Error('The provided className has already been registered');
      }
    });

    if (config.constructor.prototype
        .hasOwnProperty(componentConfigProperty_)) {
      throw new Error(
          'MDL component classes must not have ' + componentConfigProperty_ +
          ' defined as a property.');
    }

    var found = findRegisteredClass_(config.classAsString, newConfig);

    if (!found) {
      registeredComponents_.push(newConfig);
    }
  }

  /**
   * Allows user to be alerted to any upgrades that are performed for a given
   * component type
   *
   * @param {string} jsClass The class name of the MDL component we wish
   * to hook into for any upgrades performed.
   * @param {function(!HTMLElement)} callback The function to call upon an
   * upgrade. This function should expect 1 parameter - the HTMLElement which
   * got upgraded.
   */
  function registerUpgradedCallbackInternal(jsClass, callback) {
    var regClass = findRegisteredClass_(jsClass);
    if (regClass) {
      regClass.callbacks.push(callback);
    }
  }

  /**
   * Upgrades all registered components found in the current DOM. This is
   * automatically called on window load.
   */
  function upgradeAllRegisteredInternal() {
    for (var n = 0; n < registeredComponents_.length; n++) {
      upgradeDomInternal(registeredComponents_[n].className);
    }
  }

  /**
   * Check the component for the downgrade method.
   * Execute if found.
   * Remove component from createdComponents list.
   *
   * @param {?componentHandler.Component} component The component to downgrade.
   */
  function deconstructComponentInternal(component) {
    if (component) {
      var componentIndex = createdComponents_.indexOf(component);
      createdComponents_.splice(componentIndex, 1);

      var upgrades =
          component.element_.getAttribute('data-upgraded').split(',');
      var componentPlace =
          upgrades.indexOf(component[componentConfigProperty_].classAsString);
      upgrades.splice(componentPlace, 1);
      component.element_.setAttribute('data-upgraded', upgrades.join(','));

      var ev = document.createEvent('Events');
      ev.initEvent('mdl-componentdowngraded', true, true);
      component.element_.dispatchEvent(ev);
    }
  }

  /**
   * Downgrade either a given node, an array of nodes, or a NodeList.
   *
   * @param {!Node|!Array<!Node>|!NodeList} nodes The list of nodes.
   */
  function downgradeNodesInternal(nodes) {
    /**
     * Auxiliary function to downgrade a single node.
     * @param  {!Node} node the node to be downgraded
     */
    var downgradeNode = function(node) {
      createdComponents_.filter(function(item) {
        return item.element_ === node;
      }).forEach(deconstructComponentInternal);
    };
    if (nodes instanceof Array || nodes instanceof NodeList) {
      for (var n = 0; n < nodes.length; n++) {
        downgradeNode(nodes[n]);
      }
    } else if (nodes instanceof Node) {
      downgradeNode(nodes);
    } else {
      throw new Error('Invalid argument provided to downgrade MDL nodes.');
    }
  }

  // Now return the functions that should be made public with their publicly
  // facing names...
  return {
    upgradeDom: upgradeDomInternal,
    upgradeElement: upgradeElementInternal,
    upgradeElements: upgradeElementsInternal,
    upgradeAllRegistered: upgradeAllRegisteredInternal,
    registerUpgradedCallback: registerUpgradedCallbackInternal,
    register: registerInternal,
    downgradeElements: downgradeNodesInternal
  };
})();

/**
 * Describes the type of a registered component type managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   constructor: Function,
 *   classAsString: string,
 *   cssClass: string,
 *   widget: (string|boolean|undefined)
 * }}
 */
componentHandler.ComponentConfigPublic; // eslint-disable-line

/**
 * Describes the type of a registered component type managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   constructor: !Function,
 *   className: string,
 *   cssClass: string,
 *   widget: (string|boolean),
 *   callbacks: !Array<function(!HTMLElement)>
 * }}
 */
componentHandler.ComponentConfig; // eslint-disable-line

/**
 * Created component (i.e., upgraded element) type as managed by
 * componentHandler. Provided for benefit of the Closure compiler.
 *
 * @typedef {{
 *   element_: !HTMLElement,
 *   className: string,
 *   classAsString: string,
 *   cssClass: string,
 *   widget: string
 * }}
 */
componentHandler.Component; // eslint-disable-line

// Export all symbols, for the benefit of Closure compiler.
// No effect on uncompiled code.
componentHandler['upgradeDom'] = componentHandler.upgradeDom;
componentHandler['upgradeElement'] = componentHandler.upgradeElement;
componentHandler['upgradeElements'] = componentHandler.upgradeElements;
componentHandler['upgradeAllRegistered'] =
    componentHandler.upgradeAllRegistered;
componentHandler['registerUpgradedCallback'] =
    componentHandler.registerUpgradedCallback;
componentHandler['register'] = componentHandler.register;
componentHandler['downgradeElements'] = componentHandler.downgradeElements;
window.componentHandler = componentHandler;
window['componentHandler'] = componentHandler;

window.addEventListener('load', function() {
  'use strict';

  /**
   * Performs a "Cutting the mustard" test. If the browser supports the features
   * tested, adds a mdl-js class to the <html> element. It then upgrades all MDL
   * components requiring JavaScript.
   */
  if (
      'classList' in document.documentElement &&
      'querySelector' in document &&
      'addEventListener' in window &&
      'forEach' in Array.prototype) {
    document.documentElement.classList.add('mdl-js');
    componentHandler.upgradeAllRegistered();
  } else {
    /**
     * Dummy function to avoid JS errors.
     */
    componentHandler.upgradeElement = function() {};
    /**
     * Dummy function to avoid JS errors.
     */
    componentHandler.register = function() {};
  }
});

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
/**
   * Class constructor for Button MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialButton = function MaterialButton(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialButton'] = MaterialButton;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialButton.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialButton.prototype.CssClasses_ = {
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_CONTAINER: 'mdl-button__ripple-container',
    RIPPLE: 'mdl-ripple'
};
/**
   * Handle blur of element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialButton.prototype.blurHandler_ = function (event) {
    if (event) {
        this.element_.blur();
    }
};
// Public methods.
/**
   * Disable button.
   *
   * @public
   */
MaterialButton.prototype.disable = function () {
    this.element_.disabled = true;
};
MaterialButton.prototype['disable'] = MaterialButton.prototype.disable;
/**
   * Enable button.
   *
   * @public
   */
MaterialButton.prototype.enable = function () {
    this.element_.disabled = false;
};
MaterialButton.prototype['enable'] = MaterialButton.prototype.enable;
/**
   * Initialize element.
   */
MaterialButton.prototype.init = function () {
    if (this.element_) {
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            var rippleContainer = document.createElement('span');
            rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            this.rippleElement_ = document.createElement('span');
            this.rippleElement_.classList.add(this.CssClasses_.RIPPLE);
            rippleContainer.appendChild(this.rippleElement_);
            this.boundRippleBlurHandler = this.blurHandler_.bind(this);
            this.rippleElement_.addEventListener('mouseup', this.boundRippleBlurHandler);
            this.element_.appendChild(rippleContainer);
        }
        this.boundButtonBlurHandler = this.blurHandler_.bind(this);
        this.element_.addEventListener('mouseup', this.boundButtonBlurHandler);
        this.element_.addEventListener('mouseleave', this.boundButtonBlurHandler);
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialButton,
    classAsString: 'MaterialButton',
    cssClass: 'mdl-js-button',
    widget: true
});
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
/**
   * Class constructor for Checkbox MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialCheckbox = function MaterialCheckbox(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialCheckbox'] = MaterialCheckbox;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialCheckbox.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialCheckbox.prototype.CssClasses_ = {
    INPUT: 'mdl-checkbox__input',
    BOX_OUTLINE: 'mdl-checkbox__box-outline',
    FOCUS_HELPER: 'mdl-checkbox__focus-helper',
    TICK_OUTLINE: 'mdl-checkbox__tick-outline',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE_CONTAINER: 'mdl-checkbox__ripple-container',
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE: 'mdl-ripple',
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_CHECKED: 'is-checked',
    IS_UPGRADED: 'is-upgraded'
};
/**
   * Handle change of state.
   *
   * @private
   */
MaterialCheckbox.prototype.onChange_ = function () {
    this.updateClasses_();
};
/**
   * Handle focus of element.
   *
   * @private
   */
MaterialCheckbox.prototype.onFocus_ = function () {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus of element.
   *
   * @private
   */
MaterialCheckbox.prototype.onBlur_ = function () {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle mouseup.
   *
   * @private
   */
MaterialCheckbox.prototype.onMouseUp_ = function () {
    this.blur_();
};
/**
   * Handle class updates.
   *
   * @private
   */
MaterialCheckbox.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkToggleState();
};
/**
   * Add blur.
   *
   * @private
   */
MaterialCheckbox.prototype.blur_ = function () {
    // TODO: figure out why there's a focus event being fired after our blur,
    // so that we can avoid this hack.
    window.setTimeout(function () {
        this.inputElement_.blur();
    }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
   * Check the inputs toggle state and update display.
   *
   * @public
   */
MaterialCheckbox.prototype.checkToggleState = function () {
    if (this.inputElement_.checked) {
        this.element_.classList.add(this.CssClasses_.IS_CHECKED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
    }
};
MaterialCheckbox.prototype['checkToggleState'] = MaterialCheckbox.prototype.checkToggleState;
/**
   * Check the inputs disabled state and update display.
   *
   * @public
   */
MaterialCheckbox.prototype.checkDisabled = function () {
    if (this.inputElement_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialCheckbox.prototype['checkDisabled'] = MaterialCheckbox.prototype.checkDisabled;
/**
   * Disable checkbox.
   *
   * @public
   */
MaterialCheckbox.prototype.disable = function () {
    this.inputElement_.disabled = true;
    this.updateClasses_();
};
MaterialCheckbox.prototype['disable'] = MaterialCheckbox.prototype.disable;
/**
   * Enable checkbox.
   *
   * @public
   */
MaterialCheckbox.prototype.enable = function () {
    this.inputElement_.disabled = false;
    this.updateClasses_();
};
MaterialCheckbox.prototype['enable'] = MaterialCheckbox.prototype.enable;
/**
   * Check checkbox.
   *
   * @public
   */
MaterialCheckbox.prototype.check = function () {
    this.inputElement_.checked = true;
    this.updateClasses_();
};
MaterialCheckbox.prototype['check'] = MaterialCheckbox.prototype.check;
/**
   * Uncheck checkbox.
   *
   * @public
   */
MaterialCheckbox.prototype.uncheck = function () {
    this.inputElement_.checked = false;
    this.updateClasses_();
};
MaterialCheckbox.prototype['uncheck'] = MaterialCheckbox.prototype.uncheck;
/**
   * Initialize element.
   */
MaterialCheckbox.prototype.init = function () {
    if (this.element_) {
        this.inputElement_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
        var boxOutline = document.createElement('span');
        boxOutline.classList.add(this.CssClasses_.BOX_OUTLINE);
        var tickContainer = document.createElement('span');
        tickContainer.classList.add(this.CssClasses_.FOCUS_HELPER);
        var tickOutline = document.createElement('span');
        tickOutline.classList.add(this.CssClasses_.TICK_OUTLINE);
        boxOutline.appendChild(tickOutline);
        this.element_.appendChild(tickContainer);
        this.element_.appendChild(boxOutline);
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            this.rippleContainerElement_ = document.createElement('span');
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_EFFECT);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER);
            this.boundRippleMouseUp = this.onMouseUp_.bind(this);
            this.rippleContainerElement_.addEventListener('mouseup', this.boundRippleMouseUp);
            var ripple = document.createElement('span');
            ripple.classList.add(this.CssClasses_.RIPPLE);
            this.rippleContainerElement_.appendChild(ripple);
            this.element_.appendChild(this.rippleContainerElement_);
        }
        this.boundInputOnChange = this.onChange_.bind(this);
        this.boundInputOnFocus = this.onFocus_.bind(this);
        this.boundInputOnBlur = this.onBlur_.bind(this);
        this.boundElementMouseUp = this.onMouseUp_.bind(this);
        this.inputElement_.addEventListener('change', this.boundInputOnChange);
        this.inputElement_.addEventListener('focus', this.boundInputOnFocus);
        this.inputElement_.addEventListener('blur', this.boundInputOnBlur);
        this.element_.addEventListener('mouseup', this.boundElementMouseUp);
        this.updateClasses_();
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialCheckbox,
    classAsString: 'MaterialCheckbox',
    cssClass: 'mdl-js-checkbox',
    widget: true
});
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
/**
   * Class constructor for icon toggle MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialIconToggle = function MaterialIconToggle(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialIconToggle'] = MaterialIconToggle;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialIconToggle.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialIconToggle.prototype.CssClasses_ = {
    INPUT: 'mdl-icon-toggle__input',
    JS_RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE_CONTAINER: 'mdl-icon-toggle__ripple-container',
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE: 'mdl-ripple',
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_CHECKED: 'is-checked'
};
/**
   * Handle change of state.
   *
   * @private
   */
MaterialIconToggle.prototype.onChange_ = function () {
    this.updateClasses_();
};
/**
   * Handle focus of element.
   *
   * @private
   */
MaterialIconToggle.prototype.onFocus_ = function () {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus of element.
   *
   * @private
   */
MaterialIconToggle.prototype.onBlur_ = function () {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle mouseup.
   *
   * @private
   */
MaterialIconToggle.prototype.onMouseUp_ = function () {
    this.blur_();
};
/**
   * Handle class updates.
   *
   * @private
   */
MaterialIconToggle.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkToggleState();
};
/**
   * Add blur.
   *
   * @private
   */
MaterialIconToggle.prototype.blur_ = function () {
    // TODO: figure out why there's a focus event being fired after our blur,
    // so that we can avoid this hack.
    window.setTimeout(function () {
        this.inputElement_.blur();
    }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
   * Check the inputs toggle state and update display.
   *
   * @public
   */
MaterialIconToggle.prototype.checkToggleState = function () {
    if (this.inputElement_.checked) {
        this.element_.classList.add(this.CssClasses_.IS_CHECKED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
    }
};
MaterialIconToggle.prototype['checkToggleState'] = MaterialIconToggle.prototype.checkToggleState;
/**
   * Check the inputs disabled state and update display.
   *
   * @public
   */
MaterialIconToggle.prototype.checkDisabled = function () {
    if (this.inputElement_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialIconToggle.prototype['checkDisabled'] = MaterialIconToggle.prototype.checkDisabled;
/**
   * Disable icon toggle.
   *
   * @public
   */
MaterialIconToggle.prototype.disable = function () {
    this.inputElement_.disabled = true;
    this.updateClasses_();
};
MaterialIconToggle.prototype['disable'] = MaterialIconToggle.prototype.disable;
/**
   * Enable icon toggle.
   *
   * @public
   */
MaterialIconToggle.prototype.enable = function () {
    this.inputElement_.disabled = false;
    this.updateClasses_();
};
MaterialIconToggle.prototype['enable'] = MaterialIconToggle.prototype.enable;
/**
   * Check icon toggle.
   *
   * @public
   */
MaterialIconToggle.prototype.check = function () {
    this.inputElement_.checked = true;
    this.updateClasses_();
};
MaterialIconToggle.prototype['check'] = MaterialIconToggle.prototype.check;
/**
   * Uncheck icon toggle.
   *
   * @public
   */
MaterialIconToggle.prototype.uncheck = function () {
    this.inputElement_.checked = false;
    this.updateClasses_();
};
MaterialIconToggle.prototype['uncheck'] = MaterialIconToggle.prototype.uncheck;
/**
   * Initialize element.
   */
MaterialIconToggle.prototype.init = function () {
    if (this.element_) {
        this.inputElement_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
        if (this.element_.classList.contains(this.CssClasses_.JS_RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            this.rippleContainerElement_ = document.createElement('span');
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            this.rippleContainerElement_.classList.add(this.CssClasses_.JS_RIPPLE_EFFECT);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER);
            this.boundRippleMouseUp = this.onMouseUp_.bind(this);
            this.rippleContainerElement_.addEventListener('mouseup', this.boundRippleMouseUp);
            var ripple = document.createElement('span');
            ripple.classList.add(this.CssClasses_.RIPPLE);
            this.rippleContainerElement_.appendChild(ripple);
            this.element_.appendChild(this.rippleContainerElement_);
        }
        this.boundInputOnChange = this.onChange_.bind(this);
        this.boundInputOnFocus = this.onFocus_.bind(this);
        this.boundInputOnBlur = this.onBlur_.bind(this);
        this.boundElementOnMouseUp = this.onMouseUp_.bind(this);
        this.inputElement_.addEventListener('change', this.boundInputOnChange);
        this.inputElement_.addEventListener('focus', this.boundInputOnFocus);
        this.inputElement_.addEventListener('blur', this.boundInputOnBlur);
        this.element_.addEventListener('mouseup', this.boundElementOnMouseUp);
        this.updateClasses_();
        this.element_.classList.add('is-upgraded');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialIconToggle,
    classAsString: 'MaterialIconToggle',
    cssClass: 'mdl-js-icon-toggle',
    widget: true
});
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
/**
   * Class constructor for dropdown MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialMenu = function MaterialMenu(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialMenu'] = MaterialMenu;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialMenu.prototype.Constant_ = {
    // Total duration of the menu animation.
    TRANSITION_DURATION_SECONDS: 0.3,
    // The fraction of the total duration we want to use for menu item animations.
    TRANSITION_DURATION_FRACTION: 0.8,
    // How long the menu stays open after choosing an option (so the user can see
    // the ripple).
    CLOSE_TIMEOUT: 150
};
/**
   * Keycodes, for code readability.
   *
   * @enum {number}
   * @private
   */
MaterialMenu.prototype.Keycodes_ = {
    ENTER: 13,
    ESCAPE: 27,
    SPACE: 32,
    UP_ARROW: 38,
    DOWN_ARROW: 40
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialMenu.prototype.CssClasses_ = {
    CONTAINER: 'mdl-menu__container',
    OUTLINE: 'mdl-menu__outline',
    ITEM: 'mdl-menu__item',
    ITEM_RIPPLE_CONTAINER: 'mdl-menu__item-ripple-container',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE: 'mdl-ripple',
    // Statuses
    IS_UPGRADED: 'is-upgraded',
    IS_VISIBLE: 'is-visible',
    IS_ANIMATING: 'is-animating',
    // Alignment options
    BOTTOM_LEFT: 'mdl-menu--bottom-left',
    // This is the default.
    BOTTOM_RIGHT: 'mdl-menu--bottom-right',
    TOP_LEFT: 'mdl-menu--top-left',
    TOP_RIGHT: 'mdl-menu--top-right',
    UNALIGNED: 'mdl-menu--unaligned'
};
/**
   * Initialize element.
   */
MaterialMenu.prototype.init = function () {
    if (this.element_) {
        // Create container for the menu.
        var container = document.createElement('div');
        container.classList.add(this.CssClasses_.CONTAINER);
        this.element_.parentElement.insertBefore(container, this.element_);
        this.element_.parentElement.removeChild(this.element_);
        container.appendChild(this.element_);
        this.container_ = container;
        // Create outline for the menu (shadow and background).
        var outline = document.createElement('div');
        outline.classList.add(this.CssClasses_.OUTLINE);
        this.outline_ = outline;
        container.insertBefore(outline, this.element_);
        // Find the "for" element and bind events to it.
        var forElId = this.element_.getAttribute('for') || this.element_.getAttribute('data-mdl-for');
        var forEl = null;
        if (forElId) {
            forEl = document.getElementById(forElId);
            if (forEl) {
                this.forElement_ = forEl;
                forEl.addEventListener('click', this.handleForClick_.bind(this));
                forEl.addEventListener('keydown', this.handleForKeyboardEvent_.bind(this));
            }
        }
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM);
        this.boundItemKeydown_ = this.handleItemKeyboardEvent_.bind(this);
        this.boundItemClick_ = this.handleItemClick_.bind(this);
        for (var i = 0; i < items.length; i++) {
            // Add a listener to each menu item.
            items[i].addEventListener('click', this.boundItemClick_);
            // Add a tab index to each menu item.
            items[i].tabIndex = '-1';
            // Add a keyboard listener to each menu item.
            items[i].addEventListener('keydown', this.boundItemKeydown_);
        }
        // Add ripple classes to each item, if the user has enabled ripples.
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            for (var j = 0; j < items.length; j++) {
                var item = items[j];
                var rippleContainer = document.createElement('span');
                rippleContainer.classList.add(this.CssClasses_.ITEM_RIPPLE_CONTAINER);
                var ripple = document.createElement('span');
                ripple.classList.add(this.CssClasses_.RIPPLE);
                rippleContainer.appendChild(ripple);
                item.appendChild(rippleContainer);
                item.classList.add(this.CssClasses_.RIPPLE_EFFECT);
            }
        }
        // Copy alignment classes to the container, so the outline can use them.
        if (this.element_.classList.contains(this.CssClasses_.BOTTOM_LEFT)) {
            this.outline_.classList.add(this.CssClasses_.BOTTOM_LEFT);
        }
        if (this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)) {
            this.outline_.classList.add(this.CssClasses_.BOTTOM_RIGHT);
        }
        if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT)) {
            this.outline_.classList.add(this.CssClasses_.TOP_LEFT);
        }
        if (this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
            this.outline_.classList.add(this.CssClasses_.TOP_RIGHT);
        }
        if (this.element_.classList.contains(this.CssClasses_.UNALIGNED)) {
            this.outline_.classList.add(this.CssClasses_.UNALIGNED);
        }
        container.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
/**
   * Handles a click on the "for" element, by positioning the menu and then
   * toggling it.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialMenu.prototype.handleForClick_ = function (evt) {
    if (this.element_ && this.forElement_) {
        var rect = this.forElement_.getBoundingClientRect();
        var forRect = this.forElement_.parentElement.getBoundingClientRect();
        if (this.element_.classList.contains(this.CssClasses_.UNALIGNED)) {
        } else if (this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)) {
            // Position below the "for" element, aligned to its right.
            this.container_.style.right = forRect.right - rect.right + 'px';
            this.container_.style.top = this.forElement_.offsetTop + this.forElement_.offsetHeight + 'px';
        } else if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT)) {
            // Position above the "for" element, aligned to its left.
            this.container_.style.left = this.forElement_.offsetLeft + 'px';
            this.container_.style.bottom = forRect.bottom - rect.top + 'px';
        } else if (this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
            // Position above the "for" element, aligned to its right.
            this.container_.style.right = forRect.right - rect.right + 'px';
            this.container_.style.bottom = forRect.bottom - rect.top + 'px';
        } else {
            // Default: position below the "for" element, aligned to its left.
            this.container_.style.left = this.forElement_.offsetLeft + 'px';
            this.container_.style.top = this.forElement_.offsetTop + this.forElement_.offsetHeight + 'px';
        }
    }
    this.toggle(evt);
};
/**
   * Handles a keyboard event on the "for" element.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialMenu.prototype.handleForKeyboardEvent_ = function (evt) {
    if (this.element_ && this.container_ && this.forElement_) {
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM + ':not([disabled])');
        if (items && items.length > 0 && this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
            if (evt.keyCode === this.Keycodes_.UP_ARROW) {
                evt.preventDefault();
                items[items.length - 1].focus();
            } else if (evt.keyCode === this.Keycodes_.DOWN_ARROW) {
                evt.preventDefault();
                items[0].focus();
            }
        }
    }
};
/**
   * Handles a keyboard event on an item.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialMenu.prototype.handleItemKeyboardEvent_ = function (evt) {
    if (this.element_ && this.container_) {
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM + ':not([disabled])');
        if (items && items.length > 0 && this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
            var currentIndex = Array.prototype.slice.call(items).indexOf(evt.target);
            if (evt.keyCode === this.Keycodes_.UP_ARROW) {
                evt.preventDefault();
                if (currentIndex > 0) {
                    items[currentIndex - 1].focus();
                } else {
                    items[items.length - 1].focus();
                }
            } else if (evt.keyCode === this.Keycodes_.DOWN_ARROW) {
                evt.preventDefault();
                if (items.length > currentIndex + 1) {
                    items[currentIndex + 1].focus();
                } else {
                    items[0].focus();
                }
            } else if (evt.keyCode === this.Keycodes_.SPACE || evt.keyCode === this.Keycodes_.ENTER) {
                evt.preventDefault();
                // Send mousedown and mouseup to trigger ripple.
                var e = new MouseEvent('mousedown');
                evt.target.dispatchEvent(e);
                e = new MouseEvent('mouseup');
                evt.target.dispatchEvent(e);
                // Send click.
                evt.target.click();
            } else if (evt.keyCode === this.Keycodes_.ESCAPE) {
                evt.preventDefault();
                this.hide();
            }
        }
    }
};
/**
   * Handles a click event on an item.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialMenu.prototype.handleItemClick_ = function (evt) {
    if (evt.target.hasAttribute('disabled')) {
        evt.stopPropagation();
    } else {
        // Wait some time before closing menu, so the user can see the ripple.
        this.closing_ = true;
        window.setTimeout(function () {
            this.hide();
            this.closing_ = false;
        }.bind(this), this.Constant_.CLOSE_TIMEOUT);
    }
};
/**
   * Calculates the initial clip (for opening the menu) or final clip (for closing
   * it), and applies it. This allows us to animate from or to the correct point,
   * that is, the point it's aligned to in the "for" element.
   *
   * @param {number} height Height of the clip rectangle
   * @param {number} width Width of the clip rectangle
   * @private
   */
MaterialMenu.prototype.applyClip_ = function (height, width) {
    if (this.element_.classList.contains(this.CssClasses_.UNALIGNED)) {
        // Do not clip.
        this.element_.style.clip = '';
    } else if (this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)) {
        // Clip to the top right corner of the menu.
        this.element_.style.clip = 'rect(0 ' + width + 'px 0 ' + width + 'px)';
    } else if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT)) {
        // Clip to the bottom left corner of the menu.
        this.element_.style.clip = 'rect(' + height + 'px 0 ' + height + 'px 0)';
    } else if (this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
        // Clip to the bottom right corner of the menu.
        this.element_.style.clip = 'rect(' + height + 'px ' + width + 'px ' + height + 'px ' + width + 'px)';
    } else {
        // Default: do not clip (same as clipping to the top left corner).
        this.element_.style.clip = '';
    }
};
/**
   * Cleanup function to remove animation listeners.
   *
   * @param {Event} evt The event being handled.
   * @private
   */
MaterialMenu.prototype.removeAnimationEndListener_ = function (evt) {
    evt.target.classList.remove(MaterialMenu.prototype.CssClasses_.IS_ANIMATING);
};
/**
   * Adds an event listener to clean up after the animation ends.
   *
   * @private
   */
MaterialMenu.prototype.addAnimationEndListener_ = function () {
    this.element_.addEventListener('transitionend', this.removeAnimationEndListener_);
    this.element_.addEventListener('webkitTransitionEnd', this.removeAnimationEndListener_);
};
/**
   * Displays the menu.
   *
   * @param {Event} evt The event being handled.
   * @public
   */
MaterialMenu.prototype.show = function (evt) {
    if (this.element_ && this.container_ && this.outline_) {
        // Measure the inner element.
        var height = this.element_.getBoundingClientRect().height;
        var width = this.element_.getBoundingClientRect().width;
        // Apply the inner element's size to the container and outline.
        this.container_.style.width = width + 'px';
        this.container_.style.height = height + 'px';
        this.outline_.style.width = width + 'px';
        this.outline_.style.height = height + 'px';
        var transitionDuration = this.Constant_.TRANSITION_DURATION_SECONDS * this.Constant_.TRANSITION_DURATION_FRACTION;
        // Calculate transition delays for individual menu items, so that they fade
        // in one at a time.
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM);
        for (var i = 0; i < items.length; i++) {
            var itemDelay = null;
            if (this.element_.classList.contains(this.CssClasses_.TOP_LEFT) || this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)) {
                itemDelay = (height - items[i].offsetTop - items[i].offsetHeight) / height * transitionDuration + 's';
            } else {
                itemDelay = items[i].offsetTop / height * transitionDuration + 's';
            }
            items[i].style.transitionDelay = itemDelay;
        }
        // Apply the initial clip to the text before we start animating.
        this.applyClip_(height, width);
        // Wait for the next frame, turn on animation, and apply the final clip.
        // Also make it visible. This triggers the transitions.
        requestAnimationFrame(function () {
            this.element_.classList.add(this.CssClasses_.IS_ANIMATING);
            this.element_.style.clip = 'rect(0 ' + width + 'px ' + height + 'px 0)';
            this.container_.classList.add(this.CssClasses_.IS_VISIBLE);
        }.bind(this));
        // Clean up after the animation is complete.
        this.addAnimationEndListener_();
        // Add a click listener to the document, to close the menu.
        var callback = function (e) {
            // Check to see if the document is processing the same event that
            // displayed the menu in the first place. If so, do nothing.
            // Also check to see if the menu is in the process of closing itself, and
            // do nothing in that case.
            // Also check if the clicked element is a menu item
            // if so, do nothing.
            if (e !== evt && !this.closing_ && e.target.parentNode !== this.element_) {
                document.removeEventListener('click', callback);
                this.hide();
            }
        }.bind(this);
        document.addEventListener('click', callback);
    }
};
MaterialMenu.prototype['show'] = MaterialMenu.prototype.show;
/**
   * Hides the menu.
   *
   * @public
   */
MaterialMenu.prototype.hide = function () {
    if (this.element_ && this.container_ && this.outline_) {
        var items = this.element_.querySelectorAll('.' + this.CssClasses_.ITEM);
        // Remove all transition delays; menu items fade out concurrently.
        for (var i = 0; i < items.length; i++) {
            items[i].style.removeProperty('transition-delay');
        }
        // Measure the inner element.
        var rect = this.element_.getBoundingClientRect();
        var height = rect.height;
        var width = rect.width;
        // Turn on animation, and apply the final clip. Also make invisible.
        // This triggers the transitions.
        this.element_.classList.add(this.CssClasses_.IS_ANIMATING);
        this.applyClip_(height, width);
        this.container_.classList.remove(this.CssClasses_.IS_VISIBLE);
        // Clean up after the animation is complete.
        this.addAnimationEndListener_();
    }
};
MaterialMenu.prototype['hide'] = MaterialMenu.prototype.hide;
/**
   * Displays or hides the menu, depending on current state.
   *
   * @param {Event} evt The event being handled.
   * @public
   */
MaterialMenu.prototype.toggle = function (evt) {
    if (this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
        this.hide();
    } else {
        this.show(evt);
    }
};
MaterialMenu.prototype['toggle'] = MaterialMenu.prototype.toggle;
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialMenu,
    classAsString: 'MaterialMenu',
    cssClass: 'mdl-js-menu',
    widget: true
});
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
/**
   * Class constructor for Progress MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialProgress = function MaterialProgress(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialProgress'] = MaterialProgress;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialProgress.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialProgress.prototype.CssClasses_ = { INDETERMINATE_CLASS: 'mdl-progress__indeterminate' };
/**
   * Set the current progress of the progressbar.
   *
   * @param {number} p Percentage of the progress (0-100)
   * @public
   */
MaterialProgress.prototype.setProgress = function (p) {
    if (this.element_.classList.contains(this.CssClasses_.INDETERMINATE_CLASS)) {
        return;
    }
    this.progressbar_.style.width = p + '%';
};
MaterialProgress.prototype['setProgress'] = MaterialProgress.prototype.setProgress;
/**
   * Set the current progress of the buffer.
   *
   * @param {number} p Percentage of the buffer (0-100)
   * @public
   */
MaterialProgress.prototype.setBuffer = function (p) {
    this.bufferbar_.style.width = p + '%';
    this.auxbar_.style.width = 100 - p + '%';
};
MaterialProgress.prototype['setBuffer'] = MaterialProgress.prototype.setBuffer;
/**
   * Initialize element.
   */
MaterialProgress.prototype.init = function () {
    if (this.element_) {
        var el = document.createElement('div');
        el.className = 'progressbar bar bar1';
        this.element_.appendChild(el);
        this.progressbar_ = el;
        el = document.createElement('div');
        el.className = 'bufferbar bar bar2';
        this.element_.appendChild(el);
        this.bufferbar_ = el;
        el = document.createElement('div');
        el.className = 'auxbar bar bar3';
        this.element_.appendChild(el);
        this.auxbar_ = el;
        this.progressbar_.style.width = '0%';
        this.bufferbar_.style.width = '100%';
        this.auxbar_.style.width = '0%';
        this.element_.classList.add('is-upgraded');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialProgress,
    classAsString: 'MaterialProgress',
    cssClass: 'mdl-js-progress',
    widget: true
});
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
/**
   * Class constructor for Radio MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialRadio = function MaterialRadio(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialRadio'] = MaterialRadio;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialRadio.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialRadio.prototype.CssClasses_ = {
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_CHECKED: 'is-checked',
    IS_UPGRADED: 'is-upgraded',
    JS_RADIO: 'mdl-js-radio',
    RADIO_BTN: 'mdl-radio__button',
    RADIO_OUTER_CIRCLE: 'mdl-radio__outer-circle',
    RADIO_INNER_CIRCLE: 'mdl-radio__inner-circle',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE_CONTAINER: 'mdl-radio__ripple-container',
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE: 'mdl-ripple'
};
/**
   * Handle change of state.
   *
   * @private
   */
MaterialRadio.prototype.onChange_ = function () {
    // Since other radio buttons don't get change events, we need to look for
    // them to update their classes.
    var radios = document.getElementsByClassName(this.CssClasses_.JS_RADIO);
    for (var i = 0; i < radios.length; i++) {
        var button = radios[i].querySelector('.' + this.CssClasses_.RADIO_BTN);
        // Different name == different group, so no point updating those.
        if (button.getAttribute('name') === this.btnElement_.getAttribute('name')) {
            radios[i]['MaterialRadio'].updateClasses_();
        }
    }
};
/**
   * Handle focus.
   *
   * @private
   */
MaterialRadio.prototype.onFocus_ = function () {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus.
   *
   * @private
   */
MaterialRadio.prototype.onBlur_ = function () {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle mouseup.
   *
   * @private
   */
MaterialRadio.prototype.onMouseup_ = function () {
    this.blur_();
};
/**
   * Update classes.
   *
   * @private
   */
MaterialRadio.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkToggleState();
};
/**
   * Add blur.
   *
   * @private
   */
MaterialRadio.prototype.blur_ = function () {
    // TODO: figure out why there's a focus event being fired after our blur,
    // so that we can avoid this hack.
    window.setTimeout(function () {
        this.btnElement_.blur();
    }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
   * Check the components disabled state.
   *
   * @public
   */
MaterialRadio.prototype.checkDisabled = function () {
    if (this.btnElement_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialRadio.prototype['checkDisabled'] = MaterialRadio.prototype.checkDisabled;
/**
   * Check the components toggled state.
   *
   * @public
   */
MaterialRadio.prototype.checkToggleState = function () {
    if (this.btnElement_.checked) {
        this.element_.classList.add(this.CssClasses_.IS_CHECKED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
    }
};
MaterialRadio.prototype['checkToggleState'] = MaterialRadio.prototype.checkToggleState;
/**
   * Disable radio.
   *
   * @public
   */
MaterialRadio.prototype.disable = function () {
    this.btnElement_.disabled = true;
    this.updateClasses_();
};
MaterialRadio.prototype['disable'] = MaterialRadio.prototype.disable;
/**
   * Enable radio.
   *
   * @public
   */
MaterialRadio.prototype.enable = function () {
    this.btnElement_.disabled = false;
    this.updateClasses_();
};
MaterialRadio.prototype['enable'] = MaterialRadio.prototype.enable;
/**
   * Check radio.
   *
   * @public
   */
MaterialRadio.prototype.check = function () {
    this.btnElement_.checked = true;
    this.updateClasses_();
};
MaterialRadio.prototype['check'] = MaterialRadio.prototype.check;
/**
   * Uncheck radio.
   *
   * @public
   */
MaterialRadio.prototype.uncheck = function () {
    this.btnElement_.checked = false;
    this.updateClasses_();
};
MaterialRadio.prototype['uncheck'] = MaterialRadio.prototype.uncheck;
/**
   * Initialize element.
   */
MaterialRadio.prototype.init = function () {
    if (this.element_) {
        this.btnElement_ = this.element_.querySelector('.' + this.CssClasses_.RADIO_BTN);
        this.boundChangeHandler_ = this.onChange_.bind(this);
        this.boundFocusHandler_ = this.onChange_.bind(this);
        this.boundBlurHandler_ = this.onBlur_.bind(this);
        this.boundMouseUpHandler_ = this.onMouseup_.bind(this);
        var outerCircle = document.createElement('span');
        outerCircle.classList.add(this.CssClasses_.RADIO_OUTER_CIRCLE);
        var innerCircle = document.createElement('span');
        innerCircle.classList.add(this.CssClasses_.RADIO_INNER_CIRCLE);
        this.element_.appendChild(outerCircle);
        this.element_.appendChild(innerCircle);
        var rippleContainer;
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            rippleContainer = document.createElement('span');
            rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            rippleContainer.classList.add(this.CssClasses_.RIPPLE_EFFECT);
            rippleContainer.classList.add(this.CssClasses_.RIPPLE_CENTER);
            rippleContainer.addEventListener('mouseup', this.boundMouseUpHandler_);
            var ripple = document.createElement('span');
            ripple.classList.add(this.CssClasses_.RIPPLE);
            rippleContainer.appendChild(ripple);
            this.element_.appendChild(rippleContainer);
        }
        this.btnElement_.addEventListener('change', this.boundChangeHandler_);
        this.btnElement_.addEventListener('focus', this.boundFocusHandler_);
        this.btnElement_.addEventListener('blur', this.boundBlurHandler_);
        this.element_.addEventListener('mouseup', this.boundMouseUpHandler_);
        this.updateClasses_();
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialRadio,
    classAsString: 'MaterialRadio',
    cssClass: 'mdl-js-radio',
    widget: true
});
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
/**
   * Class constructor for Slider MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialSlider = function MaterialSlider(element) {
    this.element_ = element;
    // Browser feature detection.
    this.isIE_ = window.navigator.msPointerEnabled;
    // Initialize instance.
    this.init();
};
window['MaterialSlider'] = MaterialSlider;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialSlider.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialSlider.prototype.CssClasses_ = {
    IE_CONTAINER: 'mdl-slider__ie-container',
    SLIDER_CONTAINER: 'mdl-slider__container',
    BACKGROUND_FLEX: 'mdl-slider__background-flex',
    BACKGROUND_LOWER: 'mdl-slider__background-lower',
    BACKGROUND_UPPER: 'mdl-slider__background-upper',
    IS_LOWEST_VALUE: 'is-lowest-value',
    IS_UPGRADED: 'is-upgraded'
};
/**
   * Handle input on element.
   *
   * @private
   */
MaterialSlider.prototype.onInput_ = function () {
    this.updateValueStyles_();
};
/**
   * Handle change on element.
   *
   * @private
   */
MaterialSlider.prototype.onChange_ = function () {
    this.updateValueStyles_();
};
/**
   * Handle mouseup on element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialSlider.prototype.onMouseUp_ = function (event) {
    event.target.blur();
};
/**
   * Handle mousedown on container element.
   * This handler is purpose is to not require the use to click
   * exactly on the 2px slider element, as FireFox seems to be very
   * strict about this.
   *
   * @param {Event} event The event that fired.
   * @private
   * @suppress {missingProperties}
   */
MaterialSlider.prototype.onContainerMouseDown_ = function (event) {
    // If this click is not on the parent element (but rather some child)
    // ignore. It may still bubble up.
    if (event.target !== this.element_.parentElement) {
        return;
    }
    // Discard the original event and create a new event that
    // is on the slider element.
    event.preventDefault();
    var newEvent = new MouseEvent('mousedown', {
        target: event.target,
        buttons: event.buttons,
        clientX: event.clientX,
        clientY: this.element_.getBoundingClientRect().y
    });
    this.element_.dispatchEvent(newEvent);
};
/**
   * Handle updating of values.
   *
   * @private
   */
MaterialSlider.prototype.updateValueStyles_ = function () {
    // Calculate and apply percentages to div structure behind slider.
    var fraction = (this.element_.value - this.element_.min) / (this.element_.max - this.element_.min);
    if (fraction === 0) {
        this.element_.classList.add(this.CssClasses_.IS_LOWEST_VALUE);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_LOWEST_VALUE);
    }
    if (!this.isIE_) {
        this.backgroundLower_.style.flex = fraction;
        this.backgroundLower_.style.webkitFlex = fraction;
        this.backgroundUpper_.style.flex = 1 - fraction;
        this.backgroundUpper_.style.webkitFlex = 1 - fraction;
    }
};
// Public methods.
/**
   * Disable slider.
   *
   * @public
   */
MaterialSlider.prototype.disable = function () {
    this.element_.disabled = true;
};
MaterialSlider.prototype['disable'] = MaterialSlider.prototype.disable;
/**
   * Enable slider.
   *
   * @public
   */
MaterialSlider.prototype.enable = function () {
    this.element_.disabled = false;
};
MaterialSlider.prototype['enable'] = MaterialSlider.prototype.enable;
/**
   * Update slider value.
   *
   * @param {number} value The value to which to set the control (optional).
   * @public
   */
MaterialSlider.prototype.change = function (value) {
    if (typeof value !== 'undefined') {
        this.element_.value = value;
    }
    this.updateValueStyles_();
};
MaterialSlider.prototype['change'] = MaterialSlider.prototype.change;
/**
   * Initialize element.
   */
MaterialSlider.prototype.init = function () {
    if (this.element_) {
        if (this.isIE_) {
            // Since we need to specify a very large height in IE due to
            // implementation limitations, we add a parent here that trims it down to
            // a reasonable size.
            var containerIE = document.createElement('div');
            containerIE.classList.add(this.CssClasses_.IE_CONTAINER);
            this.element_.parentElement.insertBefore(containerIE, this.element_);
            this.element_.parentElement.removeChild(this.element_);
            containerIE.appendChild(this.element_);
        } else {
            // For non-IE browsers, we need a div structure that sits behind the
            // slider and allows us to style the left and right sides of it with
            // different colors.
            var container = document.createElement('div');
            container.classList.add(this.CssClasses_.SLIDER_CONTAINER);
            this.element_.parentElement.insertBefore(container, this.element_);
            this.element_.parentElement.removeChild(this.element_);
            container.appendChild(this.element_);
            var backgroundFlex = document.createElement('div');
            backgroundFlex.classList.add(this.CssClasses_.BACKGROUND_FLEX);
            container.appendChild(backgroundFlex);
            this.backgroundLower_ = document.createElement('div');
            this.backgroundLower_.classList.add(this.CssClasses_.BACKGROUND_LOWER);
            backgroundFlex.appendChild(this.backgroundLower_);
            this.backgroundUpper_ = document.createElement('div');
            this.backgroundUpper_.classList.add(this.CssClasses_.BACKGROUND_UPPER);
            backgroundFlex.appendChild(this.backgroundUpper_);
        }
        this.boundInputHandler = this.onInput_.bind(this);
        this.boundChangeHandler = this.onChange_.bind(this);
        this.boundMouseUpHandler = this.onMouseUp_.bind(this);
        this.boundContainerMouseDownHandler = this.onContainerMouseDown_.bind(this);
        this.element_.addEventListener('input', this.boundInputHandler);
        this.element_.addEventListener('change', this.boundChangeHandler);
        this.element_.addEventListener('mouseup', this.boundMouseUpHandler);
        this.element_.parentElement.addEventListener('mousedown', this.boundContainerMouseDownHandler);
        this.updateValueStyles_();
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialSlider,
    classAsString: 'MaterialSlider',
    cssClass: 'mdl-js-slider',
    widget: true
});
/**
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
/**
   * Class constructor for Snackbar MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialSnackbar = function MaterialSnackbar(element) {
    this.element_ = element;
    this.textElement_ = this.element_.querySelector('.' + this.cssClasses_.MESSAGE);
    this.actionElement_ = this.element_.querySelector('.' + this.cssClasses_.ACTION);
    if (!this.textElement_) {
        throw new Error('There must be a message element for a snackbar.');
    }
    if (!this.actionElement_) {
        throw new Error('There must be an action element for a snackbar.');
    }
    this.active = false;
    this.actionHandler_ = undefined;
    this.message_ = undefined;
    this.actionText_ = undefined;
    this.queuedNotifications_ = [];
    this.setActionHidden_(true);
};
window['MaterialSnackbar'] = MaterialSnackbar;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialSnackbar.prototype.Constant_ = {
    // The duration of the snackbar show/hide animation, in ms.
    ANIMATION_LENGTH: 250
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialSnackbar.prototype.cssClasses_ = {
    SNACKBAR: 'mdl-snackbar',
    MESSAGE: 'mdl-snackbar__text',
    ACTION: 'mdl-snackbar__action',
    ACTIVE: 'mdl-snackbar--active'
};
/**
   * Display the snackbar.
   *
   * @private
   */
MaterialSnackbar.prototype.displaySnackbar_ = function () {
    this.element_.setAttribute('aria-hidden', 'true');
    if (this.actionHandler_) {
        this.actionElement_.textContent = this.actionText_;
        this.actionElement_.addEventListener('click', this.actionHandler_);
        this.setActionHidden_(false);
    }
    this.textElement_.textContent = this.message_;
    this.element_.classList.add(this.cssClasses_.ACTIVE);
    this.element_.setAttribute('aria-hidden', 'false');
    setTimeout(this.cleanup_.bind(this), this.timeout_);
};
/**
   * Show the snackbar.
   *
   * @param {Object} data The data for the notification.
   * @public
   */
MaterialSnackbar.prototype.showSnackbar = function (data) {
    if (data === undefined) {
        throw new Error('Please provide a data object with at least a message to display.');
    }
    if (data['message'] === undefined) {
        throw new Error('Please provide a message to be displayed.');
    }
    if (data['actionHandler'] && !data['actionText']) {
        throw new Error('Please provide action text with the handler.');
    }
    if (this.active) {
        this.queuedNotifications_.push(data);
    } else {
        this.active = true;
        this.message_ = data['message'];
        if (data['timeout']) {
            this.timeout_ = data['timeout'];
        } else {
            this.timeout_ = 2750;
        }
        if (data['actionHandler']) {
            this.actionHandler_ = data['actionHandler'];
        }
        if (data['actionText']) {
            this.actionText_ = data['actionText'];
        }
        this.displaySnackbar_();
    }
};
MaterialSnackbar.prototype['showSnackbar'] = MaterialSnackbar.prototype.showSnackbar;
/**
   * Check if the queue has items within it.
   * If it does, display the next entry.
   *
   * @private
   */
MaterialSnackbar.prototype.checkQueue_ = function () {
    if (this.queuedNotifications_.length > 0) {
        this.showSnackbar(this.queuedNotifications_.shift());
    }
};
/**
   * Cleanup the snackbar event listeners and accessiblity attributes.
   *
   * @private
   */
MaterialSnackbar.prototype.cleanup_ = function () {
    this.element_.classList.remove(this.cssClasses_.ACTIVE);
    setTimeout(function () {
        this.element_.setAttribute('aria-hidden', 'true');
        this.textElement_.textContent = '';
        if (!this.actionElement_.getAttribute('aria-hidden')) {
            this.setActionHidden_(true);
            this.actionElement_.textContent = '';
            this.actionElement_.removeEventListener('click', this.actionHandler_);
        }
        this.actionHandler_ = undefined;
        this.message_ = undefined;
        this.actionText_ = undefined;
        this.active = false;
        this.checkQueue_();
    }.bind(this), this.Constant_.ANIMATION_LENGTH);
};
/**
   * Set the action handler hidden state.
   *
   * @param {boolean} value Whether or not to set to 'hidden'.
   * @private
   */
MaterialSnackbar.prototype.setActionHidden_ = function (value) {
    if (value) {
        this.actionElement_.setAttribute('aria-hidden', 'true');
    } else {
        this.actionElement_.removeAttribute('aria-hidden');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialSnackbar,
    classAsString: 'MaterialSnackbar',
    cssClass: 'mdl-js-snackbar',
    widget: true
});
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
/**
   * Class constructor for Spinner MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @param {HTMLElement} element The element that will be upgraded.
   * @constructor
   */
var MaterialSpinner = function MaterialSpinner(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialSpinner'] = MaterialSpinner;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialSpinner.prototype.Constant_ = { MDL_SPINNER_LAYER_COUNT: 4 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialSpinner.prototype.CssClasses_ = {
    MDL_SPINNER_LAYER: 'mdl-spinner__layer',
    MDL_SPINNER_CIRCLE_CLIPPER: 'mdl-spinner__circle-clipper',
    MDL_SPINNER_CIRCLE: 'mdl-spinner__circle',
    MDL_SPINNER_GAP_PATCH: 'mdl-spinner__gap-patch',
    MDL_SPINNER_LEFT: 'mdl-spinner__left',
    MDL_SPINNER_RIGHT: 'mdl-spinner__right'
};
/**
   * Auxiliary method to create a spinner layer.
   *
   * @param {number} index Index of the layer to be created.
   * @public
   */
MaterialSpinner.prototype.createLayer = function (index) {
    var layer = document.createElement('div');
    layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER);
    layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER + '-' + index);
    var leftClipper = document.createElement('div');
    leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
    leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_LEFT);
    var gapPatch = document.createElement('div');
    gapPatch.classList.add(this.CssClasses_.MDL_SPINNER_GAP_PATCH);
    var rightClipper = document.createElement('div');
    rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
    rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_RIGHT);
    var circleOwners = [
        leftClipper,
        gapPatch,
        rightClipper
    ];
    for (var i = 0; i < circleOwners.length; i++) {
        var circle = document.createElement('div');
        circle.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE);
        circleOwners[i].appendChild(circle);
    }
    layer.appendChild(leftClipper);
    layer.appendChild(gapPatch);
    layer.appendChild(rightClipper);
    this.element_.appendChild(layer);
};
MaterialSpinner.prototype['createLayer'] = MaterialSpinner.prototype.createLayer;
/**
   * Stops the spinner animation.
   * Public method for users who need to stop the spinner for any reason.
   *
   * @public
   */
MaterialSpinner.prototype.stop = function () {
    this.element_.classList.remove('is-active');
};
MaterialSpinner.prototype['stop'] = MaterialSpinner.prototype.stop;
/**
   * Starts the spinner animation.
   * Public method for users who need to manually start the spinner for any reason
   * (instead of just adding the 'is-active' class to their markup).
   *
   * @public
   */
MaterialSpinner.prototype.start = function () {
    this.element_.classList.add('is-active');
};
MaterialSpinner.prototype['start'] = MaterialSpinner.prototype.start;
/**
   * Initialize element.
   */
MaterialSpinner.prototype.init = function () {
    if (this.element_) {
        for (var i = 1; i <= this.Constant_.MDL_SPINNER_LAYER_COUNT; i++) {
            this.createLayer(i);
        }
        this.element_.classList.add('is-upgraded');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialSpinner,
    classAsString: 'MaterialSpinner',
    cssClass: 'mdl-js-spinner',
    widget: true
});
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
/**
   * Class constructor for Checkbox MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialSwitch = function MaterialSwitch(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialSwitch'] = MaterialSwitch;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialSwitch.prototype.Constant_ = { TINY_TIMEOUT: 0.001 };
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialSwitch.prototype.CssClasses_ = {
    INPUT: 'mdl-switch__input',
    TRACK: 'mdl-switch__track',
    THUMB: 'mdl-switch__thumb',
    FOCUS_HELPER: 'mdl-switch__focus-helper',
    RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE_CONTAINER: 'mdl-switch__ripple-container',
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE: 'mdl-ripple',
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_CHECKED: 'is-checked'
};
/**
   * Handle change of state.
   *
   * @private
   */
MaterialSwitch.prototype.onChange_ = function () {
    this.updateClasses_();
};
/**
   * Handle focus of element.
   *
   * @private
   */
MaterialSwitch.prototype.onFocus_ = function () {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus of element.
   *
   * @private
   */
MaterialSwitch.prototype.onBlur_ = function () {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle mouseup.
   *
   * @private
   */
MaterialSwitch.prototype.onMouseUp_ = function () {
    this.blur_();
};
/**
   * Handle class updates.
   *
   * @private
   */
MaterialSwitch.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkToggleState();
};
/**
   * Add blur.
   *
   * @private
   */
MaterialSwitch.prototype.blur_ = function () {
    // TODO: figure out why there's a focus event being fired after our blur,
    // so that we can avoid this hack.
    window.setTimeout(function () {
        this.inputElement_.blur();
    }.bind(this), this.Constant_.TINY_TIMEOUT);
};
// Public methods.
/**
   * Check the components disabled state.
   *
   * @public
   */
MaterialSwitch.prototype.checkDisabled = function () {
    if (this.inputElement_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialSwitch.prototype['checkDisabled'] = MaterialSwitch.prototype.checkDisabled;
/**
   * Check the components toggled state.
   *
   * @public
   */
MaterialSwitch.prototype.checkToggleState = function () {
    if (this.inputElement_.checked) {
        this.element_.classList.add(this.CssClasses_.IS_CHECKED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_CHECKED);
    }
};
MaterialSwitch.prototype['checkToggleState'] = MaterialSwitch.prototype.checkToggleState;
/**
   * Disable switch.
   *
   * @public
   */
MaterialSwitch.prototype.disable = function () {
    this.inputElement_.disabled = true;
    this.updateClasses_();
};
MaterialSwitch.prototype['disable'] = MaterialSwitch.prototype.disable;
/**
   * Enable switch.
   *
   * @public
   */
MaterialSwitch.prototype.enable = function () {
    this.inputElement_.disabled = false;
    this.updateClasses_();
};
MaterialSwitch.prototype['enable'] = MaterialSwitch.prototype.enable;
/**
   * Activate switch.
   *
   * @public
   */
MaterialSwitch.prototype.on = function () {
    this.inputElement_.checked = true;
    this.updateClasses_();
};
MaterialSwitch.prototype['on'] = MaterialSwitch.prototype.on;
/**
   * Deactivate switch.
   *
   * @public
   */
MaterialSwitch.prototype.off = function () {
    this.inputElement_.checked = false;
    this.updateClasses_();
};
MaterialSwitch.prototype['off'] = MaterialSwitch.prototype.off;
/**
   * Initialize element.
   */
MaterialSwitch.prototype.init = function () {
    if (this.element_) {
        this.inputElement_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
        var track = document.createElement('div');
        track.classList.add(this.CssClasses_.TRACK);
        var thumb = document.createElement('div');
        thumb.classList.add(this.CssClasses_.THUMB);
        var focusHelper = document.createElement('span');
        focusHelper.classList.add(this.CssClasses_.FOCUS_HELPER);
        thumb.appendChild(focusHelper);
        this.element_.appendChild(track);
        this.element_.appendChild(thumb);
        this.boundMouseUpHandler = this.onMouseUp_.bind(this);
        if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
            this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            this.rippleContainerElement_ = document.createElement('span');
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_EFFECT);
            this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER);
            this.rippleContainerElement_.addEventListener('mouseup', this.boundMouseUpHandler);
            var ripple = document.createElement('span');
            ripple.classList.add(this.CssClasses_.RIPPLE);
            this.rippleContainerElement_.appendChild(ripple);
            this.element_.appendChild(this.rippleContainerElement_);
        }
        this.boundChangeHandler = this.onChange_.bind(this);
        this.boundFocusHandler = this.onFocus_.bind(this);
        this.boundBlurHandler = this.onBlur_.bind(this);
        this.inputElement_.addEventListener('change', this.boundChangeHandler);
        this.inputElement_.addEventListener('focus', this.boundFocusHandler);
        this.inputElement_.addEventListener('blur', this.boundBlurHandler);
        this.element_.addEventListener('mouseup', this.boundMouseUpHandler);
        this.updateClasses_();
        this.element_.classList.add('is-upgraded');
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialSwitch,
    classAsString: 'MaterialSwitch',
    cssClass: 'mdl-js-switch',
    widget: true
});
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
/**
   * Class constructor for Tabs MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {Element} element The element that will be upgraded.
   */
var MaterialTabs = function MaterialTabs(element) {
    // Stores the HTML element.
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialTabs'] = MaterialTabs;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string}
   * @private
   */
MaterialTabs.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialTabs.prototype.CssClasses_ = {
    TAB_CLASS: 'mdl-tabs__tab',
    PANEL_CLASS: 'mdl-tabs__panel',
    ACTIVE_CLASS: 'is-active',
    UPGRADED_CLASS: 'is-upgraded',
    MDL_JS_RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    MDL_RIPPLE_CONTAINER: 'mdl-tabs__ripple-container',
    MDL_RIPPLE: 'mdl-ripple',
    MDL_JS_RIPPLE_EFFECT_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events'
};
/**
   * Handle clicks to a tabs component
   *
   * @private
   */
MaterialTabs.prototype.initTabs_ = function () {
    if (this.element_.classList.contains(this.CssClasses_.MDL_JS_RIPPLE_EFFECT)) {
        this.element_.classList.add(this.CssClasses_.MDL_JS_RIPPLE_EFFECT_IGNORE_EVENTS);
    }
    // Select element tabs, document panels
    this.tabs_ = this.element_.querySelectorAll('.' + this.CssClasses_.TAB_CLASS);
    this.panels_ = this.element_.querySelectorAll('.' + this.CssClasses_.PANEL_CLASS);
    // Create new tabs for each tab element
    for (var i = 0; i < this.tabs_.length; i++) {
        new MaterialTab(this.tabs_[i], this);
    }
    this.element_.classList.add(this.CssClasses_.UPGRADED_CLASS);
};
/**
   * Reset tab state, dropping active classes
   *
   * @private
   */
MaterialTabs.prototype.resetTabState_ = function () {
    for (var k = 0; k < this.tabs_.length; k++) {
        this.tabs_[k].classList.remove(this.CssClasses_.ACTIVE_CLASS);
    }
};
/**
   * Reset panel state, droping active classes
   *
   * @private
   */
MaterialTabs.prototype.resetPanelState_ = function () {
    for (var j = 0; j < this.panels_.length; j++) {
        this.panels_[j].classList.remove(this.CssClasses_.ACTIVE_CLASS);
    }
};
/**
   * Initialize element.
   */
MaterialTabs.prototype.init = function () {
    if (this.element_) {
        this.initTabs_();
    }
};
/**
   * Constructor for an individual tab.
   *
   * @constructor
   * @param {Element} tab The HTML element for the tab.
   * @param {MaterialTabs} ctx The MaterialTabs object that owns the tab.
   */
function MaterialTab(tab, ctx) {
    if (tab) {
        if (ctx.element_.classList.contains(ctx.CssClasses_.MDL_JS_RIPPLE_EFFECT)) {
            var rippleContainer = document.createElement('span');
            rippleContainer.classList.add(ctx.CssClasses_.MDL_RIPPLE_CONTAINER);
            rippleContainer.classList.add(ctx.CssClasses_.MDL_JS_RIPPLE_EFFECT);
            var ripple = document.createElement('span');
            ripple.classList.add(ctx.CssClasses_.MDL_RIPPLE);
            rippleContainer.appendChild(ripple);
            tab.appendChild(rippleContainer);
        }
        tab.addEventListener('click', function (e) {
            e.preventDefault();
            var href = tab.href.split('#')[1];
            var panel = ctx.element_.querySelector('#' + href);
            ctx.resetTabState_();
            ctx.resetPanelState_();
            tab.classList.add(ctx.CssClasses_.ACTIVE_CLASS);
            panel.classList.add(ctx.CssClasses_.ACTIVE_CLASS);
        });
    }
}
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialTabs,
    classAsString: 'MaterialTabs',
    cssClass: 'mdl-js-tabs'
});
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
/**
   * Class constructor for Textfield MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialTextfield = function MaterialTextfield(element) {
    this.element_ = element;
    this.maxRows = this.Constant_.NO_MAX_ROWS;
    // Initialize instance.
    this.init();
};
window['MaterialTextfield'] = MaterialTextfield;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialTextfield.prototype.Constant_ = {
    NO_MAX_ROWS: -1,
    MAX_ROWS_ATTRIBUTE: 'maxrows'
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialTextfield.prototype.CssClasses_ = {
    LABEL: 'mdl-textfield__label',
    INPUT: 'mdl-textfield__input',
    IS_DIRTY: 'is-dirty',
    IS_FOCUSED: 'is-focused',
    IS_DISABLED: 'is-disabled',
    IS_INVALID: 'is-invalid',
    IS_UPGRADED: 'is-upgraded',
    HAS_PLACEHOLDER: 'has-placeholder'
};
/**
   * Handle input being entered.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialTextfield.prototype.onKeyDown_ = function (event) {
    var currentRowCount = event.target.value.split('\n').length;
    if (event.keyCode === 13) {
        if (currentRowCount >= this.maxRows) {
            event.preventDefault();
        }
    }
};
/**
   * Handle focus.
   *
   * @private
   */
MaterialTextfield.prototype.onFocus_ = function () {
    this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle lost focus.
   *
   * @private
   */
MaterialTextfield.prototype.onBlur_ = function () {
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
};
/**
   * Handle reset event from out side.
   *
   * @private
   */
MaterialTextfield.prototype.onReset_ = function () {
    this.updateClasses_();
};
/**
   * Handle class updates.
   *
   * @private
   */
MaterialTextfield.prototype.updateClasses_ = function () {
    this.checkDisabled();
    this.checkValidity();
    this.checkDirty();
    this.checkFocus();
};
// Public methods.
/**
   * Check the disabled state and update field accordingly.
   *
   * @public
   */
MaterialTextfield.prototype.checkDisabled = function () {
    if (this.input_.disabled) {
        this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    }
};
MaterialTextfield.prototype['checkDisabled'] = MaterialTextfield.prototype.checkDisabled;
/**
  * Check the focus state and update field accordingly.
  *
  * @public
  */
MaterialTextfield.prototype.checkFocus = function () {
    if (this.element_.querySelector(':focus')) {
        this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
    }
};
MaterialTextfield.prototype['checkFocus'] = MaterialTextfield.prototype.checkFocus;
/**
   * Check the validity state and update field accordingly.
   *
   * @public
   */
MaterialTextfield.prototype.checkValidity = function () {
    if (this.input_.validity) {
        if (this.input_.validity.valid) {
            this.element_.classList.remove(this.CssClasses_.IS_INVALID);
        } else {
            this.element_.classList.add(this.CssClasses_.IS_INVALID);
        }
    }
};
MaterialTextfield.prototype['checkValidity'] = MaterialTextfield.prototype.checkValidity;
/**
   * Check the dirty state and update field accordingly.
   *
   * @public
   */
MaterialTextfield.prototype.checkDirty = function () {
    if (this.input_.value && this.input_.value.length > 0) {
        this.element_.classList.add(this.CssClasses_.IS_DIRTY);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_DIRTY);
    }
};
MaterialTextfield.prototype['checkDirty'] = MaterialTextfield.prototype.checkDirty;
/**
   * Disable text field.
   *
   * @public
   */
MaterialTextfield.prototype.disable = function () {
    this.input_.disabled = true;
    this.updateClasses_();
};
MaterialTextfield.prototype['disable'] = MaterialTextfield.prototype.disable;
/**
   * Enable text field.
   *
   * @public
   */
MaterialTextfield.prototype.enable = function () {
    this.input_.disabled = false;
    this.updateClasses_();
};
MaterialTextfield.prototype['enable'] = MaterialTextfield.prototype.enable;
/**
   * Update text field value.
   *
   * @param {string} value The value to which to set the control (optional).
   * @public
   */
MaterialTextfield.prototype.change = function (value) {
    this.input_.value = value || '';
    this.updateClasses_();
};
MaterialTextfield.prototype['change'] = MaterialTextfield.prototype.change;
/**
   * Focus text field.
   *
   * @public
   */
MaterialTextfield.prototype.focus = function () {
    this.input_.focus();
    this.updateClasses_();
};
MaterialTextfield.prototype['focus'] = MaterialTextfield.prototype.focus;
/**
   * Blur text field.
   *
   * @public
   */
MaterialTextfield.prototype.blur = function () {
    this.input_.blur();
    this.updateClasses_();
};
MaterialTextfield.prototype['blur'] = MaterialTextfield.prototype.blur;
/**
   * Initialize element.
   */
MaterialTextfield.prototype.init = function () {
    if (this.element_) {
        this.label_ = this.element_.querySelector('.' + this.CssClasses_.LABEL);
        this.input_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
        if (this.input_) {
            if (this.input_.hasAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE)) {
                this.maxRows = parseInt(this.input_.getAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE), 10);
                if (isNaN(this.maxRows)) {
                    this.maxRows = this.Constant_.NO_MAX_ROWS;
                }
            }
            if (this.input_.hasAttribute('placeholder')) {
                this.element_.classList.add(this.CssClasses_.HAS_PLACEHOLDER);
            }
            this.boundUpdateClassesHandler = this.updateClasses_.bind(this);
            this.boundFocusHandler = this.onFocus_.bind(this);
            this.boundBlurHandler = this.onBlur_.bind(this);
            this.boundResetHandler = this.onReset_.bind(this);
            this.input_.addEventListener('input', this.boundUpdateClassesHandler);
            this.input_.addEventListener('focus', this.boundFocusHandler);
            this.input_.addEventListener('blur', this.boundBlurHandler);
            this.input_.addEventListener('reset', this.boundResetHandler);
            if (this.maxRows !== this.Constant_.NO_MAX_ROWS) {
                // TODO: This should handle pasting multi line text.
                // Currently doesn't.
                this.boundKeyDownHandler = this.onKeyDown_.bind(this);
                this.input_.addEventListener('keydown', this.boundKeyDownHandler);
            }
            var invalid = this.element_.classList.contains(this.CssClasses_.IS_INVALID);
            this.updateClasses_();
            this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
            if (invalid) {
                this.element_.classList.add(this.CssClasses_.IS_INVALID);
            }
            if (this.input_.hasAttribute('autofocus')) {
                this.element_.focus();
                this.checkFocus();
            }
        }
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialTextfield,
    classAsString: 'MaterialTextfield',
    cssClass: 'mdl-js-textfield',
    widget: true
});
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
MaterialSelectfield.prototype.checkClasses_ = function () {
    this.checkDirty_();
    this.checkValidity_();
    this.checkDisabled_();
};
/**
   * Check if selectfield has value
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.checkDirty_ = function () {
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
MaterialSelectfield.prototype.checkValidity_ = function () {
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
MaterialSelectfield.prototype.checkDisabled_ = function () {
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
MaterialSelectfield.prototype.checkSelectedOption_ = function () {
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
   * Trigger document click event to close all other selectfield elements
   * except currently active
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.triggerDocumentClickEvent_ = function () {
    var evt;
    if (window.CustomEvent) {
        try {
            evt = new CustomEvent('click', {
                sourceElement: this.selectedOptionElement_,
                bubbles: false
            });
            document.body.dispatchEvent(evt);
        } catch (e) {
        }
    } else {
        evt = document.createEvent('CustomEvent');
        evt.initEvent('click', false, false);
        document.body.fireEvent(evt);
    }
};
/**
   * Element click handler
   * @param  {Event} e Element event object
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.elementClickHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
};
/**
   * Element focus handler
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.elementFocusHandler_ = function () {
    if (this.element_.classList.contains(this.CssClasses_.IS_DISABLED)) {
        return;
    }
    if (!this.element_.classList.contains(this.CssClasses_.IS_FOCUSED)) {
        this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
        this.element_.addEventListener('keydown', this.boundElementKeydownHandler);
        this.element_.addEventListener('focusout', this.boundElementFocusoutHandler);
        this.triggerDocumentClickEvent_();
    }
};
/**
   * Element focus handler
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.elementFocusoutHandler_ = function () {
    if (this.menuElement_) {
        return;
    }
    if (this.element_.classList.contains(this.CssClasses_.IS_FOCUSED)) {
        this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
        this.element_.removeEventListener('keydown', this.boundElementKeydownHandler);
        this.element_.removeEventListener('focusout', this.boundElementFocusoutHandler);
    }
};
/**
   * Element keydown handler
   * @param  {Event} e Element event object
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.elementKeydownHandler_ = function (e) {
    if (this.menuElement_) {
        return;
    }
    var keyCode = e.keyCode;
    if (keyCode === this.KeyCodes_.ENTER) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.open();
    } else if (keyCode === this.KeyCodes_.KEY_UP) {
        if (!this.menuElement_) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.open();
            this.activateSelectedMenuItem_();
        }
    } else if (keyCode === this.KeyCodes_.KEY_DOWN) {
        if (!this.menuElement_) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.open();
            this.activateSelectedMenuItem_();
        }
    }
};
/**
   * Select keydown handler
   * @param  {Event} e Element event object
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.selectKeydownHandler_ = function (e) {
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
MaterialSelectfield.prototype.menuItemClickHandler_ = function (e) {
    var selectedItem;
    var timeout = 0;
    if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
        selectedItem = e.target.parentNode;
        if (selectedItem.classList.contains(this.CssClasses_.RIPPLE_CONTAINER)) {
            selectedItem = selectedItem.parentNode;
        }
        timeout = 100;
    } else {
        selectedItem = e.target;
    }
    setTimeout(function () {
        var index = null;
        if (selectedItem.getAttribute) {
            index = selectedItem.getAttribute('data-index');
        } else {
            index = selectedItem.attributes.getNamedItem('data-index').value;
        }
        if (index !== null) {
            this.selectOption_(index);
            if (!this.select_.multiple) {
                this.close();
            }
        }
    }.bind(this), timeout);
};
/**
   * Document click handler
   * @param {Event} e document click event object
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.documentClickHandler_ = function (e) {
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
MaterialSelectfield.prototype.keyboardNavigationHandler_ = function (e) {
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
MaterialSelectfield.prototype.selectedOptionClickHandler_ = function (e) {
    e.preventDefault();
    if (this.element_.classList.contains(this.CssClasses_.IS_OPENED)) {
        this.close();
    } else {
        this.triggerDocumentClickEvent_();
        this.open();
    }
};
/**
   * Return  currently active menu item index
   * @return {Number} Current active menu item index
   */
MaterialSelectfield.prototype.getActiveMenuItemIndex_ = function () {
    var index = -1;
    if (this.menuElement_) {
        var menuItems = this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
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
   * Get focus menu item for currently active menu item. Focus item is the one
   * to scroll menu element to so that active item is in the middle (3rd item).
   * @param  {Element} menuItem Menu item element
   * @return {Element}          Focus menu item element
   */
MaterialSelectfield.prototype.getFocusMenuItem_ = function (menuItem) {
    var focusMenuItem = menuItem;
    for (var i = 0; i < 2; i++) {
        if (focusMenuItem.previousSibling) {
            focusMenuItem = focusMenuItem.previousSibling;
        }
    }
    return focusMenuItem;
};
/**
   * Switch current active menu item to one above if exists.
   * If current one is first, switch to last.
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.menuItemUp_ = function () {
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
    var menuItems = this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
    if (menuItems[activeIndex]) {
        menuItems[activeIndex].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
    if (menuItems[upIndex]) {
        menuItems[upIndex].classList.add(this.CssClasses_.IS_ACTIVE);
        menuItems[upIndex].focus();
        var focusItem = this.getFocusMenuItem_(menuItems[upIndex]);
        this.menuElement_.scrollTop = focusItem.offsetTop - 8;
    }
};
/**
   * Switch current active menu item to one below if exists.
   * If current one is last, switch to first.
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.menuItemDown_ = function () {
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
    var menuItems = this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
    if (menuItems[activeIndex]) {
        menuItems[activeIndex].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
    if (menuItems[downIndex]) {
        menuItems[downIndex].classList.add(this.CssClasses_.IS_ACTIVE);
        menuItems[downIndex].focus();
        var focusItem = this.getFocusMenuItem_(menuItems[downIndex]);
        this.menuElement_.scrollTop = focusItem.offsetTop - 8;
    }
};
/**
   * Activate currently selected menu item
   * @return {void}
   */
MaterialSelectfield.prototype.activateSelectedMenuItem_ = function () {
    var activeIndex;
    var menuItems;
    activeIndex = this.getActiveMenuItemIndex_();
    menuItems = this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
    if (menuItems[activeIndex]) {
        menuItems[activeIndex].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
    if (menuItems[this.select_.selectedIndex]) {
        menuItems[this.select_.selectedIndex].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
};
/**
   * Select current active menu item.
   * @private
   * @return {void}
   */
MaterialSelectfield.prototype.menuItemSelect_ = function () {
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
MaterialSelectfield.prototype.render_ = function () {
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
        var menuItems = this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
        var selectedMenuItem = this.menuElement_.querySelector('.' + this.CssClasses_.MENU_ITEM + '.' + this.CssClasses_.IS_SELECTED);
        var menuItemsCount = menuItems.length;
        // Calculate top offset
        var topOffset = 0;
        if (index < 2) {
            topOffset = -(index * 48);
        } else if (index > menuItemsCount - 1 - 2) {
            if (index === menuItemsCount - 1) {
                topOffset = -(4 * 48);
            } else if (index === menuItemsCount - 2) {
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
MaterialSelectfield.prototype.renderMenu_ = function () {
    if (!this.menuElement_) {
        this.menuElement_ = document.createElement('div');
        this.menuElement_.classList.add(this.CssClasses_.MENU);
        var options = this.select_.querySelectorAll('option');
        for (var i = 0; i < options.length; i++) {
            var option = options[i];
            var menuItem = this.renderMenuItem_(option);
            if (menuItem.setAttribute) {
                menuItem.setAttribute('data-index', i);
                menuItem.setAttribute('data-value', option.value);
            } else {
                var indexAttr = document.createAttribute('data-index');
                indexAttr.value = i;
                var valueAttr = document.createAttribute('data-value');
                valueAttr.value = option.value;
                menuItem.attributes.setNamedItem(indexAttr);
                menuItem.attributes.setNamedItem(valueAttr);
            }
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
MaterialSelectfield.prototype.renderMenuItem_ = function (option) {
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
        rippleContainer.addEventListener('mouseup', this.boundMenuItemClickHandler);
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
MaterialSelectfield.prototype.selectOption_ = function (index) {
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
                menuItems = this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
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
                selectedItem = this.menuElement_.querySelector('.' + this.CssClasses_.IS_SELECTED);
                if (selectedItem) {
                    selectedItem.classList.remove(this.CssClasses_.IS_SELECTED);
                }
            }
        }
    }
    if (this.select_.multiple) {
        selectedOption = this.select_.options[index];
        // Currently selected option is already selected, unselect it since this
        // is multiple options select input
        if (selectedOption) {
            if (selectedOption.selected) {
                selectedOption.selected = false;
            } else {
                selectedOption.selected = true;
            }
        }
        if (this.menuElement_) {
            menuItems = this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
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
            selectedItem = this.menuElement_.querySelector('.' + this.CssClasses_.IS_SELECTED);
            if (selectedItem) {
                selectedItem.classList.remove(this.CssClasses_.IS_SELECTED);
            }
            menuItems = this.menuElement_.querySelectorAll('.' + this.CssClasses_.MENU_ITEM);
            if (menuItems[index]) {
                menuItems[index].classList.add(this.CssClasses_.IS_SELECTED);
                this.selectedOptionValueElement_.innerHTML = menuItems[index].innerHTML;
            } else {
                this.selectedOptionValueElement_.innerHTML = '';
            }
        }
        var selectOptions = this.select_.options;
        if (selectOptions[index]) {
            this.selectedOptionValueElement_.innerHTML = selectOptions[index].label;
        } else {
            this.selectedOptionValueElement_.innerHTML = '';
        }
    }
    this.checkClasses_();
    var changeEvent;
    if (window.Event) {
        try {
            changeEvent = new Event('change', { bubbles: false });
            this.element_.dispatchEvent(changeEvent);
            this.select_.dispatchEvent(changeEvent);
        } catch (e) {
        }
    } else {
        changeEvent = document.createEvent('Event');
        changeEvent.initEvent('click', false, false);
        this.select_.fireEvent(changeEvent);
    }
};
/**
   * Open selectfield component widget
   * @public
   * @return {void}
   */
MaterialSelectfield.prototype.open = function () {
    if (this.element_.classList.contains(this.CssClasses_.IS_OPENED)) {
        return;
    }
    this.render_();
    document.body.addEventListener('click', this.boundDocumentClickHandler);
    document.body.addEventListener('keydown', this.boundKeyboardNavigationHandler);
    setTimeout(function () {
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
MaterialSelectfield.prototype.close = function () {
    if (!this.element_.classList.contains(this.CssClasses_.IS_OPENED)) {
        return;
    }
    this.element_.classList.remove(this.CssClasses_.IS_OPENED);
    this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
    document.body.removeEventListener('click', this.boundDocumentClickHandler);
    document.body.removeEventListener('keydown', this.boundKeyboardNavigationHandler);
    setTimeout(function () {
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
MaterialSelectfield.prototype.enable = function () {
    this.select_.disabled = false;
    this.element_.tabIndex = 0;
    this.element_.classList.remove(this.CssClasses_.IS_DISABLED);
    this.selectedOptionElement_.addEventListener('click', this.boundSelectedOptionClickHandler);
};
MaterialSelectfield.prototype['enable'] = MaterialSelectfield.prototype.enable;
/**
   * Disable selectfield
   * @public
   * @return {void}
   */
MaterialSelectfield.prototype.disable = function () {
    this.select_.disabled = true;
    this.element_.tabIndex = -1;
    this.element_.classList.add(this.CssClasses_.IS_DISABLED);
    this.selectedOptionElement_.removeEventListener('click', this.boundSelectedOptionClickHandler);
};
MaterialSelectfield.prototype['disable'] = MaterialSelectfield.prototype.disable;
/**
   * Set currently selected index in select element
   * @param {Number} index Selected index
   */
MaterialSelectfield.prototype.setSelectedIndex = function (index) {
    this.selectOption_(index);
};
MaterialSelectfield.prototype['setSelectedIndex'] = MaterialSelectfield.prototype.setSelectedIndex;
/**
   * Set currently selected value in select element
   * @param {Number} value Selected value
   */
MaterialSelectfield.prototype.setSelectedValue = function (value) {
    console.log(value);
};
MaterialSelectfield.prototype['setSelectedValue'] = MaterialSelectfield.prototype.setSelectedValue;
/**
   * Initialize component
   * @return {void}
   */
MaterialSelectfield.prototype.init = function () {
    if (this.element_) {
        this.select_ = this.element_.querySelector('.' + this.CssClasses_.SELECT);
        if (!this.select_) {
            throw new Error('Component must have select element as a child');
        }
        if (this.element_.tabIndex < 0) {
            this.element_.setAttribute('tabindex', 0);
        }
        // Prepare event handlers
        this.boundElementClickHandler = this.elementClickHandler_.bind(this);
        this.boundElementFocusHandler = this.elementFocusHandler_.bind(this);
        this.boundElementFocusoutHandler = this.elementFocusoutHandler_.bind(this);
        this.boundElementKeydownHandler = this.elementKeydownHandler_.bind(this);
        this.boundSelectKeydownHandler = this.selectKeydownHandler_.bind(this);
        this.boundSelectedOptionClickHandler = this.selectedOptionClickHandler_.bind(this);
        this.boundDocumentClickHandler = this.documentClickHandler_.bind(this);
        this.boundKeyboardNavigationHandler = this.keyboardNavigationHandler_.bind(this);
        this.boundMenuItemClickHandler = this.menuItemClickHandler_.bind(this);
        this.element_.addEventListener('focus', this.boundElementFocusHandler);
        this.selectedOptionValueElement_ = document.createElement('span');
        this.selectedOptionValueElement_.classList.add(this.CssClasses_.SELECTED_OPTION_TITLE);
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
                this.selectedOptionValueElement_.innerText = options[this.select_.selectedIndex].innerText;
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
/**
   * Class constructor for Tooltip MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialTooltip = function MaterialTooltip(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialTooltip'] = MaterialTooltip;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialTooltip.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialTooltip.prototype.CssClasses_ = {
    IS_ACTIVE: 'is-active',
    BOTTOM: 'mdl-tooltip--bottom',
    LEFT: 'mdl-tooltip--left',
    RIGHT: 'mdl-tooltip--right',
    TOP: 'mdl-tooltip--top'
};
/**
   * Handle mouseenter for tooltip.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialTooltip.prototype.handleMouseEnter_ = function (event) {
    var props = event.target.getBoundingClientRect();
    var left = props.left + props.width / 2;
    var top = props.top + props.height / 2;
    var marginLeft = -1 * (this.element_.offsetWidth / 2);
    var marginTop = -1 * (this.element_.offsetHeight / 2);
    if (this.element_.classList.contains(this.CssClasses_.LEFT) || this.element_.classList.contains(this.CssClasses_.RIGHT)) {
        left = props.width / 2;
        if (top + marginTop < 0) {
            this.element_.style.top = 0;
            this.element_.style.marginTop = 0;
        } else {
            this.element_.style.top = top + 'px';
            this.element_.style.marginTop = marginTop + 'px';
        }
    } else if (left + marginLeft < 0) {
        this.element_.style.left = 0;
        this.element_.style.marginLeft = 0;
    } else {
        this.element_.style.left = left + 'px';
        this.element_.style.marginLeft = marginLeft + 'px';
    }
    if (this.element_.classList.contains(this.CssClasses_.TOP)) {
        this.element_.style.top = props.top - this.element_.offsetHeight - 10 + 'px';
    } else if (this.element_.classList.contains(this.CssClasses_.RIGHT)) {
        this.element_.style.left = props.left + props.width + 10 + 'px';
    } else if (this.element_.classList.contains(this.CssClasses_.LEFT)) {
        this.element_.style.left = props.left - this.element_.offsetWidth - 10 + 'px';
    } else {
        this.element_.style.top = props.top + props.height + 10 + 'px';
    }
    this.element_.classList.add(this.CssClasses_.IS_ACTIVE);
};
/**
   * Handle mouseleave for tooltip.
   *
   * @private
   */
MaterialTooltip.prototype.handleMouseLeave_ = function () {
    this.element_.classList.remove(this.CssClasses_.IS_ACTIVE);
};
/**
   * Initialize element.
   */
MaterialTooltip.prototype.init = function () {
    if (this.element_) {
        var forElId = this.element_.getAttribute('for');
        if (forElId) {
            this.forElement_ = document.getElementById(forElId);
        }
        if (this.forElement_) {
            // It's left here because it prevents accidental text selection on Android
            if (!this.forElement_.hasAttribute('tabindex')) {
                this.forElement_.setAttribute('tabindex', '0');
            }
            this.boundMouseEnterHandler = this.handleMouseEnter_.bind(this);
            this.boundMouseLeaveHandler = this.handleMouseLeave_.bind(this);
            this.forElement_.addEventListener('mouseenter', this.boundMouseEnterHandler, false);
            this.forElement_.addEventListener('touchend', this.boundMouseEnterHandler, false);
            this.forElement_.addEventListener('mouseleave', this.boundMouseLeaveHandler, false);
            window.addEventListener('touchstart', this.boundMouseLeaveHandler);
        }
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialTooltip,
    classAsString: 'MaterialTooltip',
    cssClass: 'mdl-tooltip'
});
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
/**
   * Class constructor for Layout MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialLayout = function MaterialLayout(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialLayout'] = MaterialLayout;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialLayout.prototype.Constant_ = {
    MAX_WIDTH: '(max-width: 1024px)',
    TAB_SCROLL_PIXELS: 100,
    RESIZE_TIMEOUT: 100,
    MENU_ICON: '&#xE5D2;',
    CHEVRON_LEFT: 'chevron_left',
    CHEVRON_RIGHT: 'chevron_right'
};
/**
   * Keycodes, for code readability.
   *
   * @enum {number}
   * @private
   */
MaterialLayout.prototype.Keycodes_ = {
    ENTER: 13,
    ESCAPE: 27,
    SPACE: 32
};
/**
   * Modes.
   *
   * @enum {number}
   * @private
   */
MaterialLayout.prototype.Mode_ = {
    STANDARD: 0,
    SEAMED: 1,
    WATERFALL: 2,
    SCROLL: 3
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialLayout.prototype.CssClasses_ = {
    CONTAINER: 'mdl-layout__container',
    HEADER: 'mdl-layout__header',
    DRAWER: 'mdl-layout__drawer',
    CONTENT: 'mdl-layout__content',
    DRAWER_BTN: 'mdl-layout__drawer-button',
    ICON: 'material-icons',
    JS_RIPPLE_EFFECT: 'mdl-js-ripple-effect',
    RIPPLE_CONTAINER: 'mdl-layout__tab-ripple-container',
    RIPPLE: 'mdl-ripple',
    RIPPLE_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    HEADER_SEAMED: 'mdl-layout__header--seamed',
    HEADER_WATERFALL: 'mdl-layout__header--waterfall',
    HEADER_SCROLL: 'mdl-layout__header--scroll',
    FIXED_HEADER: 'mdl-layout--fixed-header',
    OBFUSCATOR: 'mdl-layout__obfuscator',
    TAB_BAR: 'mdl-layout__tab-bar',
    TAB_CONTAINER: 'mdl-layout__tab-bar-container',
    TAB: 'mdl-layout__tab',
    TAB_BAR_BUTTON: 'mdl-layout__tab-bar-button',
    TAB_BAR_LEFT_BUTTON: 'mdl-layout__tab-bar-left-button',
    TAB_BAR_RIGHT_BUTTON: 'mdl-layout__tab-bar-right-button',
    PANEL: 'mdl-layout__tab-panel',
    HAS_DRAWER: 'has-drawer',
    HAS_TABS: 'has-tabs',
    HAS_SCROLLING_HEADER: 'has-scrolling-header',
    CASTING_SHADOW: 'is-casting-shadow',
    IS_COMPACT: 'is-compact',
    IS_SMALL_SCREEN: 'is-small-screen',
    IS_DRAWER_OPEN: 'is-visible',
    IS_ACTIVE: 'is-active',
    IS_UPGRADED: 'is-upgraded',
    IS_ANIMATING: 'is-animating',
    ON_LARGE_SCREEN: 'mdl-layout--large-screen-only',
    ON_SMALL_SCREEN: 'mdl-layout--small-screen-only'
};
/**
   * Handles scrolling on the content.
   *
   * @private
   */
MaterialLayout.prototype.contentScrollHandler_ = function () {
    if (this.header_.classList.contains(this.CssClasses_.IS_ANIMATING)) {
        return;
    }
    var headerVisible = !this.element_.classList.contains(this.CssClasses_.IS_SMALL_SCREEN) || this.element_.classList.contains(this.CssClasses_.FIXED_HEADER);
    if (this.content_.scrollTop > 0 && !this.header_.classList.contains(this.CssClasses_.IS_COMPACT)) {
        this.header_.classList.add(this.CssClasses_.CASTING_SHADOW);
        this.header_.classList.add(this.CssClasses_.IS_COMPACT);
        if (headerVisible) {
            this.header_.classList.add(this.CssClasses_.IS_ANIMATING);
        }
    } else if (this.content_.scrollTop <= 0 && this.header_.classList.contains(this.CssClasses_.IS_COMPACT)) {
        this.header_.classList.remove(this.CssClasses_.CASTING_SHADOW);
        this.header_.classList.remove(this.CssClasses_.IS_COMPACT);
        if (headerVisible) {
            this.header_.classList.add(this.CssClasses_.IS_ANIMATING);
        }
    }
};
/**
   * Handles a keyboard event on the drawer.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialLayout.prototype.keyboardEventHandler_ = function (evt) {
    // Only react when the drawer is open.
    if (evt.keyCode === this.Keycodes_.ESCAPE && this.drawer_.classList.contains(this.CssClasses_.IS_DRAWER_OPEN)) {
        this.toggleDrawer();
    }
};
/**
   * Handles changes in screen size.
   *
   * @private
   */
MaterialLayout.prototype.screenSizeHandler_ = function () {
    if (this.screenSizeMediaQuery_.matches) {
        this.element_.classList.add(this.CssClasses_.IS_SMALL_SCREEN);
    } else {
        this.element_.classList.remove(this.CssClasses_.IS_SMALL_SCREEN);
        // Collapse drawer (if any) when moving to a large screen size.
        if (this.drawer_) {
            this.drawer_.classList.remove(this.CssClasses_.IS_DRAWER_OPEN);
            this.obfuscator_.classList.remove(this.CssClasses_.IS_DRAWER_OPEN);
        }
    }
};
/**
   * Handles events of drawer button.
   *
   * @param {Event} evt The event that fired.
   * @private
   */
MaterialLayout.prototype.drawerToggleHandler_ = function (evt) {
    if (evt && evt.type === 'keydown') {
        if (evt.keyCode === this.Keycodes_.SPACE || evt.keyCode === this.Keycodes_.ENTER) {
            // prevent scrolling in drawer nav
            evt.preventDefault();
        } else {
            // prevent other keys
            return;
        }
    }
    this.toggleDrawer();
};
/**
   * Handles (un)setting the `is-animating` class
   *
   * @private
   */
MaterialLayout.prototype.headerTransitionEndHandler_ = function () {
    this.header_.classList.remove(this.CssClasses_.IS_ANIMATING);
};
/**
   * Handles expanding the header on click
   *
   * @private
   */
MaterialLayout.prototype.headerClickHandler_ = function () {
    if (this.header_.classList.contains(this.CssClasses_.IS_COMPACT)) {
        this.header_.classList.remove(this.CssClasses_.IS_COMPACT);
        this.header_.classList.add(this.CssClasses_.IS_ANIMATING);
    }
};
/**
   * Reset tab state, dropping active classes
   *
   * @param {NodeList} tabs The tabs to reset.
   * @private
   */
MaterialLayout.prototype.resetTabState_ = function (tabs) {
    for (var k = 0; k < tabs.length; k++) {
        tabs[k].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
};
/**
   * Reset panel state, droping active classes
   *
   * @param {NodeList} panels The panels to reset.
   * @private
   */
MaterialLayout.prototype.resetPanelState_ = function (panels) {
    for (var j = 0; j < panels.length; j++) {
        panels[j].classList.remove(this.CssClasses_.IS_ACTIVE);
    }
};
/**
  * Toggle drawer state
  *
  * @public
  */
MaterialLayout.prototype.toggleDrawer = function () {
    var drawerButton = this.element_.querySelector('.' + this.CssClasses_.DRAWER_BTN);
    this.drawer_.classList.toggle(this.CssClasses_.IS_DRAWER_OPEN);
    this.obfuscator_.classList.toggle(this.CssClasses_.IS_DRAWER_OPEN);
    // Set accessibility properties.
    if (this.drawer_.classList.contains(this.CssClasses_.IS_DRAWER_OPEN)) {
        this.drawer_.setAttribute('aria-hidden', 'false');
        drawerButton.setAttribute('aria-expanded', 'true');
    } else {
        this.drawer_.setAttribute('aria-hidden', 'true');
        drawerButton.setAttribute('aria-expanded', 'false');
    }
};
MaterialLayout.prototype['toggleDrawer'] = MaterialLayout.prototype.toggleDrawer;
/**
   * Initialize element.
   */
MaterialLayout.prototype.init = function () {
    if (this.element_) {
        var container = document.createElement('div');
        container.classList.add(this.CssClasses_.CONTAINER);
        var focusedElement = this.element_.querySelector(':focus');
        this.element_.parentElement.insertBefore(container, this.element_);
        this.element_.parentElement.removeChild(this.element_);
        container.appendChild(this.element_);
        if (focusedElement) {
            focusedElement.focus();
        }
        var directChildren = this.element_.childNodes;
        var numChildren = directChildren.length;
        for (var c = 0; c < numChildren; c++) {
            var child = directChildren[c];
            if (child.classList && child.classList.contains(this.CssClasses_.HEADER)) {
                this.header_ = child;
            }
            if (child.classList && child.classList.contains(this.CssClasses_.DRAWER)) {
                this.drawer_ = child;
            }
            if (child.classList && child.classList.contains(this.CssClasses_.CONTENT)) {
                this.content_ = child;
            }
        }
        window.addEventListener('pageshow', function (e) {
            if (e.persisted) {
                // when page is loaded from back/forward cache
                // trigger repaint to let layout scroll in safari
                this.element_.style.overflowY = 'hidden';
                requestAnimationFrame(function () {
                    this.element_.style.overflowY = '';
                }.bind(this));
            }
        }.bind(this), false);
        if (this.header_) {
            this.tabBar_ = this.header_.querySelector('.' + this.CssClasses_.TAB_BAR);
        }
        var mode = this.Mode_.STANDARD;
        if (this.header_) {
            if (this.header_.classList.contains(this.CssClasses_.HEADER_SEAMED)) {
                mode = this.Mode_.SEAMED;
            } else if (this.header_.classList.contains(this.CssClasses_.HEADER_WATERFALL)) {
                mode = this.Mode_.WATERFALL;
                this.header_.addEventListener('transitionend', this.headerTransitionEndHandler_.bind(this));
                this.header_.addEventListener('click', this.headerClickHandler_.bind(this));
            } else if (this.header_.classList.contains(this.CssClasses_.HEADER_SCROLL)) {
                mode = this.Mode_.SCROLL;
                container.classList.add(this.CssClasses_.HAS_SCROLLING_HEADER);
            }
            if (mode === this.Mode_.STANDARD) {
                this.header_.classList.add(this.CssClasses_.CASTING_SHADOW);
                if (this.tabBar_) {
                    this.tabBar_.classList.add(this.CssClasses_.CASTING_SHADOW);
                }
            } else if (mode === this.Mode_.SEAMED || mode === this.Mode_.SCROLL) {
                this.header_.classList.remove(this.CssClasses_.CASTING_SHADOW);
                if (this.tabBar_) {
                    this.tabBar_.classList.remove(this.CssClasses_.CASTING_SHADOW);
                }
            } else if (mode === this.Mode_.WATERFALL) {
                // Add and remove shadows depending on scroll position.
                // Also add/remove auxiliary class for styling of the compact version of
                // the header.
                this.content_.addEventListener('scroll', this.contentScrollHandler_.bind(this));
                this.contentScrollHandler_();
            }
        }
        // Add drawer toggling button to our layout, if we have an openable drawer.
        if (this.drawer_) {
            var drawerButton = this.element_.querySelector('.' + this.CssClasses_.DRAWER_BTN);
            if (!drawerButton) {
                drawerButton = document.createElement('div');
                drawerButton.setAttribute('aria-expanded', 'false');
                drawerButton.setAttribute('role', 'button');
                drawerButton.setAttribute('tabindex', '0');
                drawerButton.classList.add(this.CssClasses_.DRAWER_BTN);
                var drawerButtonIcon = document.createElement('i');
                drawerButtonIcon.classList.add(this.CssClasses_.ICON);
                drawerButtonIcon.innerHTML = this.Constant_.MENU_ICON;
                drawerButton.appendChild(drawerButtonIcon);
            }
            if (this.drawer_.classList.contains(this.CssClasses_.ON_LARGE_SCREEN)) {
                // If drawer has ON_LARGE_SCREEN class then add it to the drawer toggle button as well.
                drawerButton.classList.add(this.CssClasses_.ON_LARGE_SCREEN);
            } else if (this.drawer_.classList.contains(this.CssClasses_.ON_SMALL_SCREEN)) {
                // If drawer has ON_SMALL_SCREEN class then add it to the drawer toggle button as well.
                drawerButton.classList.add(this.CssClasses_.ON_SMALL_SCREEN);
            }
            drawerButton.addEventListener('click', this.drawerToggleHandler_.bind(this));
            drawerButton.addEventListener('keydown', this.drawerToggleHandler_.bind(this));
            // Add a class if the layout has a drawer, for altering the left padding.
            // Adds the HAS_DRAWER to the elements since this.header_ may or may
            // not be present.
            this.element_.classList.add(this.CssClasses_.HAS_DRAWER);
            // If we have a fixed header, add the button to the header rather than
            // the layout.
            if (this.element_.classList.contains(this.CssClasses_.FIXED_HEADER)) {
                this.header_.insertBefore(drawerButton, this.header_.firstChild);
            } else {
                this.element_.insertBefore(drawerButton, this.content_);
            }
            var obfuscator = document.createElement('div');
            obfuscator.classList.add(this.CssClasses_.OBFUSCATOR);
            this.element_.appendChild(obfuscator);
            obfuscator.addEventListener('click', this.drawerToggleHandler_.bind(this));
            this.obfuscator_ = obfuscator;
            this.drawer_.addEventListener('keydown', this.keyboardEventHandler_.bind(this));
            this.drawer_.setAttribute('aria-hidden', 'true');
        }
        // Keep an eye on screen size, and add/remove auxiliary class for styling
        // of small screens.
        this.screenSizeMediaQuery_ = window.matchMedia(this.Constant_.MAX_WIDTH);
        this.screenSizeMediaQuery_.addListener(this.screenSizeHandler_.bind(this));
        this.screenSizeHandler_();
        // Initialize tabs, if any.
        if (this.header_ && this.tabBar_) {
            this.element_.classList.add(this.CssClasses_.HAS_TABS);
            var tabContainer = document.createElement('div');
            tabContainer.classList.add(this.CssClasses_.TAB_CONTAINER);
            this.header_.insertBefore(tabContainer, this.tabBar_);
            this.header_.removeChild(this.tabBar_);
            var leftButton = document.createElement('div');
            leftButton.classList.add(this.CssClasses_.TAB_BAR_BUTTON);
            leftButton.classList.add(this.CssClasses_.TAB_BAR_LEFT_BUTTON);
            var leftButtonIcon = document.createElement('i');
            leftButtonIcon.classList.add(this.CssClasses_.ICON);
            leftButtonIcon.textContent = this.Constant_.CHEVRON_LEFT;
            leftButton.appendChild(leftButtonIcon);
            leftButton.addEventListener('click', function () {
                this.tabBar_.scrollLeft -= this.Constant_.TAB_SCROLL_PIXELS;
            }.bind(this));
            var rightButton = document.createElement('div');
            rightButton.classList.add(this.CssClasses_.TAB_BAR_BUTTON);
            rightButton.classList.add(this.CssClasses_.TAB_BAR_RIGHT_BUTTON);
            var rightButtonIcon = document.createElement('i');
            rightButtonIcon.classList.add(this.CssClasses_.ICON);
            rightButtonIcon.textContent = this.Constant_.CHEVRON_RIGHT;
            rightButton.appendChild(rightButtonIcon);
            rightButton.addEventListener('click', function () {
                this.tabBar_.scrollLeft += this.Constant_.TAB_SCROLL_PIXELS;
            }.bind(this));
            tabContainer.appendChild(leftButton);
            tabContainer.appendChild(this.tabBar_);
            tabContainer.appendChild(rightButton);
            // Add and remove tab buttons depending on scroll position and total
            // window size.
            var tabUpdateHandler = function () {
                if (this.tabBar_.scrollLeft > 0) {
                    leftButton.classList.add(this.CssClasses_.IS_ACTIVE);
                } else {
                    leftButton.classList.remove(this.CssClasses_.IS_ACTIVE);
                }
                if (this.tabBar_.scrollLeft < this.tabBar_.scrollWidth - this.tabBar_.offsetWidth) {
                    rightButton.classList.add(this.CssClasses_.IS_ACTIVE);
                } else {
                    rightButton.classList.remove(this.CssClasses_.IS_ACTIVE);
                }
            }.bind(this);
            this.tabBar_.addEventListener('scroll', tabUpdateHandler);
            tabUpdateHandler();
            // Update tabs when the window resizes.
            var windowResizeHandler = function () {
                // Use timeouts to make sure it doesn't happen too often.
                if (this.resizeTimeoutId_) {
                    clearTimeout(this.resizeTimeoutId_);
                }
                this.resizeTimeoutId_ = setTimeout(function () {
                    tabUpdateHandler();
                    this.resizeTimeoutId_ = null;
                }.bind(this), this.Constant_.RESIZE_TIMEOUT);
            }.bind(this);
            window.addEventListener('resize', windowResizeHandler);
            if (this.tabBar_.classList.contains(this.CssClasses_.JS_RIPPLE_EFFECT)) {
                this.tabBar_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);
            }
            // Select element tabs, document panels
            var tabs = this.tabBar_.querySelectorAll('.' + this.CssClasses_.TAB);
            var panels = this.content_.querySelectorAll('.' + this.CssClasses_.PANEL);
            // Create new tabs for each tab element
            for (var i = 0; i < tabs.length; i++) {
                new MaterialLayoutTab(tabs[i], tabs, panels, this);
            }
        }
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
/**
   * Constructor for an individual tab.
   *
   * @constructor
   * @param {HTMLElement} tab The HTML element for the tab.
   * @param {!NodeList} tabs Array with HTML elements for all tabs.
   * @param {!NodeList} panels Array with HTML elements for all panels.
   * @param {MaterialLayout} layout The MaterialLayout object that owns the tab.
   */
function MaterialLayoutTab(tab, tabs, panels, layout) {
    /**
     * Auxiliary method to programmatically select a tab in the UI.
     */
    function selectTab() {
        var href = tab.href.split('#')[1];
        var panel = layout.content_.querySelector('#' + href);
        layout.resetTabState_(tabs);
        layout.resetPanelState_(panels);
        tab.classList.add(layout.CssClasses_.IS_ACTIVE);
        panel.classList.add(layout.CssClasses_.IS_ACTIVE);
    }
    if (layout.tabBar_.classList.contains(layout.CssClasses_.JS_RIPPLE_EFFECT)) {
        var rippleContainer = document.createElement('span');
        rippleContainer.classList.add(layout.CssClasses_.RIPPLE_CONTAINER);
        rippleContainer.classList.add(layout.CssClasses_.JS_RIPPLE_EFFECT);
        var ripple = document.createElement('span');
        ripple.classList.add(layout.CssClasses_.RIPPLE);
        rippleContainer.appendChild(ripple);
        tab.appendChild(rippleContainer);
    }
    tab.addEventListener('click', function (e) {
        if (tab.getAttribute('href').charAt(0) === '#') {
            e.preventDefault();
            selectTab();
        }
    });
    tab.show = selectTab;
    tab.addEventListener('click', function (e) {
        e.preventDefault();
        var href = tab.href.split('#')[1];
        var panel = layout.content_.querySelector('#' + href);
        layout.resetTabState_(tabs);
        layout.resetPanelState_(panels);
        tab.classList.add(layout.CssClasses_.IS_ACTIVE);
        panel.classList.add(layout.CssClasses_.IS_ACTIVE);
    });
}
window['MaterialLayoutTab'] = MaterialLayoutTab;
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialLayout,
    classAsString: 'MaterialLayout',
    cssClass: 'mdl-js-layout'
});
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
/**
   * Class constructor for Data Table Card MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {Element} element The element that will be upgraded.
   */
var MaterialDataTable = function MaterialDataTable(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialDataTable'] = MaterialDataTable;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialDataTable.prototype.Constant_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialDataTable.prototype.CssClasses_ = {
    DATA_TABLE: 'mdl-data-table',
    SELECTABLE: 'mdl-data-table--selectable',
    SELECT_ELEMENT: 'mdl-data-table__select',
    IS_SELECTED: 'is-selected',
    IS_UPGRADED: 'is-upgraded'
};
/**
   * Generates and returns a function that toggles the selection state of a
   * single row (or multiple rows).
   *
   * @param {Element} checkbox Checkbox that toggles the selection state.
   * @param {Element} row Row to toggle when checkbox changes.
   * @param {(Array<Object>|NodeList)=} optRows Rows to toggle when checkbox changes.
   * @return {?function()} a function to toggle the selection state of the row(s).
   * @private
   */
MaterialDataTable.prototype.selectRow_ = function (checkbox, row, optRows) {
    if (row) {
        return function () {
            if (checkbox.checked) {
                row.classList.add(this.CssClasses_.IS_SELECTED);
            } else {
                row.classList.remove(this.CssClasses_.IS_SELECTED);
            }
        }.bind(this);
    }
    if (optRows) {
        return function () {
            var i;
            var el;
            if (checkbox.checked) {
                for (i = 0; i < optRows.length; i++) {
                    el = optRows[i].querySelector('td').querySelector('.mdl-checkbox');
                    el['MaterialCheckbox'].check();
                    optRows[i].classList.add(this.CssClasses_.IS_SELECTED);
                }
            } else {
                for (i = 0; i < optRows.length; i++) {
                    el = optRows[i].querySelector('td').querySelector('.mdl-checkbox');
                    el['MaterialCheckbox'].uncheck();
                    optRows[i].classList.remove(this.CssClasses_.IS_SELECTED);
                }
            }
        }.bind(this);
    }
    return null;
};
/**
   * Creates a checkbox for a single or or multiple rows and hooks up the
   * event handling.
   *
   * @param {Element} row Row to toggle when checkbox changes.
   * @param {(Array<Object>|NodeList)=} optRows Rows to toggle when checkbox changes.
   * @return {Element} the created parent label.
   * @private
   */
MaterialDataTable.prototype.createCheckbox_ = function (row, optRows) {
    var label = document.createElement('label');
    var labelClasses = [
        'mdl-checkbox',
        'mdl-js-checkbox',
        'mdl-js-ripple-effect',
        this.CssClasses_.SELECT_ELEMENT
    ];
    label.className = labelClasses.join(' ');
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('mdl-checkbox__input');
    if (row) {
        checkbox.checked = row.classList.contains(this.CssClasses_.IS_SELECTED);
        checkbox.addEventListener('change', this.selectRow_(checkbox, row));
    } else if (optRows) {
        checkbox.addEventListener('change', this.selectRow_(checkbox, null, optRows));
    }
    label.appendChild(checkbox);
    componentHandler.upgradeElement(label, 'MaterialCheckbox');
    return label;
};
/**
   * Initialize element.
   */
MaterialDataTable.prototype.init = function () {
    if (this.element_) {
        var firstHeader = this.element_.querySelector('th');
        var bodyRows = Array.prototype.slice.call(this.element_.querySelectorAll('tbody tr'));
        var footRows = Array.prototype.slice.call(this.element_.querySelectorAll('tfoot tr'));
        var rows = bodyRows.concat(footRows);
        if (this.element_.classList.contains(this.CssClasses_.SELECTABLE)) {
            var th = document.createElement('th');
            var headerCheckbox = this.createCheckbox_(null, rows);
            th.appendChild(headerCheckbox);
            firstHeader.parentElement.insertBefore(th, firstHeader);
            for (var i = 0; i < rows.length; i++) {
                var firstCell = rows[i].querySelector('td');
                if (firstCell) {
                    var td = document.createElement('td');
                    if (rows[i].parentNode.nodeName.toUpperCase() === 'TBODY') {
                        var rowCheckbox = this.createCheckbox_(rows[i]);
                        td.appendChild(rowCheckbox);
                    }
                    rows[i].insertBefore(td, firstCell);
                }
            }
            this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
        }
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialDataTable,
    classAsString: 'MaterialDataTable',
    cssClass: 'mdl-js-data-table'
});
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
/**
   * Class constructor for date picker MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialDatePicker = function MaterialDatePicker(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialDatePicker'] = MaterialDatePicker;
/**
   * Global date picker locales
   * Currently allowed formats: ['mm/dd/yyyy', 'dd.mm.yyyy', 'yyyy-mm-dd']
   * @type {Object}
   * @public
   */
MaterialDatePicker.locales = {
    /**
     * Date format for input formatting
     * @type {string}
     */
    format: 'yyyy-mm-dd',
    weekStart: 0,
    weekDays: [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
    ],
    weekDaysShort: [
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat'
    ],
    weekDaysLetter: [
        'S',
        'M',
        'T',
        'W',
        'T',
        'F',
        'S'
    ],
    months: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ],
    monthsShort: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
    ],
    actions: {
        cancel: 'Cancel',
        ok: 'Ok'
    }
};
/**
   * Instance based date picker locales.
   * Overrides global date picker locales
   *
   * @type {Object}
   * @public
   */
MaterialDatePicker.prototype.locales = {};
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialDatePicker.prototype.Constant_ = {};
/**
   * Store events in one place so they can be updated easily.
   *
   * @enum {string}
   * @private
   */
MaterialDatePicker.prototype.Event_ = {};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialDatePicker.prototype.CssClasses_ = {
    // General component classes
    IS_UPGRADED: 'is-upgraded',
    IS_VISIBLE: 'is-visible',
    IS_ATTACHED: 'is-attached',
    IS_INVALID: 'is-invalid',
    IS_FOCUSED: 'is-focused',
    IS_DIRTY: 'is-dirty',
    IS_FIXED: 'is-fixed',
    // Appearance classes
    INLINE: 'mdl-datepicker--inline',
    FIXED: 'mdl-datepicker--fixed',
    LANDSCAPE: 'mdl-datepicker--landscape',
    // Datepicker related classes
    BACKDROP: 'mdl-datepicker__backdrop',
    WIDGET: 'mdl-datepicker__widget',
    INPUT: 'mdl-datepicker__input',
    NAVIGATION: 'mdl-datepicker__navigation',
    CALENDAR: 'mdl-datepicker__calendar',
    YEAR: 'mdl-datepicker__year',
    YEAR_SELECTED: 'is-selected',
    YEAR_DISABLED: 'is-disabled',
    YEAR_PICKER: 'is-year-picker',
    YEAR_PICKER_ELEMENT: 'mdl-datepicker__year-picker',
    MONTH: 'mdl-datepicker__month',
    WEEKS: 'mdl-datepicker__weeks',
    WEEK: 'mdl-datepicker__week',
    WEEK_DAYS: 'mdl-datepicker__week-days',
    DATE: 'mdl-datepicker__date',
    DATE_TODAY: 'is-today',
    DATE_SELECTED: 'is-selected',
    DATE_EMPTY: 'is-empty',
    DATE_DISABLED: 'is-disabled',
    MONTH_CURRENT: 'mdl-datepicker__current-month',
    MONTH_PREVIOUS: 'mdl-datepicker__previous-month',
    MONTH_NEXT: 'mdl-datepicker__next-month',
    HEADER: 'mdl-datepicker__header',
    HEADER_YEAR: 'mdl-datepicker__header-year',
    HEADER_DATE: 'mdl-datepicker__header-date',
    CALENDAR_PREVIOUS: 'mdl-datepicker__calendar--previous',
    CALENDAR_NEXT: 'mdl-datepicker__calendar--next',
    ACTIONS: 'mdl-datepicker__actions',
    ACTION_CANCEL: 'mdl-datepicker__cancel',
    ACTION_OK: 'mdl-datepicker__ok'
};
MaterialDatePicker.prototype.isInitialized_ = null;
MaterialDatePicker.prototype.currentDate_ = null;
MaterialDatePicker.prototype.selectedDate_ = null;
MaterialDatePicker.prototype.pickedDate_ = null;
MaterialDatePicker.prototype.minDate_ = null;
MaterialDatePicker.prototype.maxDate_ = null;
/**
   * Trigger date picker internal events
   * @param {string} eventName  Event which will be triggered on component element
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.triggerEvent_ = function (eventName) {
    var evt = document.createEvent('Events');
    evt.initEvent(eventName, false, false);
    this.element_.dispatchEvent(evt);
};
/**
   * Cancel action click handler
   * @param {Event} e click event object
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.cancelHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.close();
    if (this.selectedDate_) {
        this.pickedDate_.setFullYear(this.selectedDate_.getFullYear());
        this.pickedDate_.setMonth(this.selectedDate_.getMonth());
        this.pickedDate_.setDate(this.selectedDate_.getDate());
    }
    this.updateHeader_();
    this.updateMonthTitle_();
    this.changeCurrentMonth_(this.pickedDate_);
    if (this.element_.classList.contains(this.CssClasses_.YEAR_PICKER)) {
        this.element_.classList.remove(this.CssClasses_.YEAR_PICKER);
    }
};
/**
   * Ok action click handler
   * @param {Event} e click event object
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.okHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (!this.selectedDate_) {
        this.selectedDate_ = new Date();
    }
    this.selectedDate_.setFullYear(this.pickedDate_.getFullYear());
    this.selectedDate_.setMonth(this.pickedDate_.getMonth());
    this.selectedDate_.setDate(this.pickedDate_.getDate());
    if (this.input_) {
        this.input_.value = this.formatInputDate_(this.selectedDate_);
        if (this.element_.MaterialTextfield) {
            this.element_.MaterialTextfield.checkValidity();
        }
    }
    this.element_.classList.add(this.CssClasses_.IS_DIRTY);
    if (this.element_.classList.contains(this.CssClasses_.YEAR_PICKER)) {
        this.element_.classList.remove(this.CssClasses_.YEAR_PICKER);
    }
    this.triggerEvent_('change');
    this.close();
};
/**
   * Date picker input focus handler
   * @param {Event} e focus event object
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.inputFocusHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.input_.blur();
    this.open();
};
/**
   * Date picker input blur handler
   * @param {Event} e focusout event object
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.inputBlurHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
};
/**
   * Header year click handler
   * @param {Event} e Click event object
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.headerYearClickHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (this.widgetElement_ && !this.widgetElement_.classList.contains(this.CssClasses_.YEAR_PICKER)) {
        this.widgetElement_.classList.add(this.CssClasses_.YEAR_PICKER);
        var selectedYear = this.yearPickerElement_.querySelector('.' + this.CssClasses_.YEAR_SELECTED);
        if (selectedYear) {
            var focusYear = selectedYear;
            for (var i = 0; i < 3; i++) {
                if (focusYear.previousElementSibling) {
                    focusYear = focusYear.previousElementSibling;
                }
            }
            focusYear.parentNode.scrollTop = focusYear.offsetTop;
        }
    }
};
/**
   * Header date click handler
   * @param {Event} e Click event object
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.headerDateClickHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (this.widgetElement_ && this.widgetElement_.classList.contains(this.CssClasses_.YEAR_PICKER)) {
        this.widgetElement_.classList.remove(this.CssClasses_.YEAR_PICKER);
    }
};
/**
   * Picker year click handler
   * @private
   * @param {Event} e Click event object
   * @return {void}
   */
MaterialDatePicker.prototype.pickYearHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var selectedYear = this.yearPickerElement_.querySelector('.' + this.CssClasses_.YEAR_SELECTED);
    if (selectedYear && selectedYear.classList.contains(this.CssClasses_.YEAR_SELECTED)) {
        selectedYear.classList.remove(this.CssClasses_.YEAR_SELECTED);
    }
    var currentYear = e.target;
    currentYear.classList.add(this.CssClasses_.YEAR_SELECTED);
    var currentYearInt = parseInt(currentYear.getAttribute('data-year'), 10);
    this.pickedDate_.setFullYear(currentYearInt);
    var pickedDate = new Date(this.pickedDate_.getTime());
    if (!this.isInRange_(pickedDate)) {
        if (this.minDate_ && !this.maxDate_ && pickedDate.getTime() < this.minDate_.getTime()) {
            pickedDate.setFullYear(this.minDate_.getFullYear());
            pickedDate.setMonth(this.minDate_.getMonth());
            pickedDate.setDate(this.minDate_.getDate());
        } else if (!this.minDate_ && this.maxDate_ && pickedDate.getTime() > this.maxDate_.getTime()) {
            pickedDate.setFullYear(this.maxDate_.getFullYear());
            pickedDate.setMonth(this.maxDate_.getMonth());
            pickedDate.setDate(this.maxDate_.getDate());
        } else {
            pickedDate.setFullYear(this.minDate_.getFullYear());
            pickedDate.setMonth(this.minDate_.getMonth());
            pickedDate.setDate(this.minDate_.getDate());
        }
        this.pickedDate_.setFullYear(pickedDate.getFullYear());
        this.pickedDate_.setMonth(pickedDate.getMonth());
        this.pickedDate_.setDate(pickedDate.getDate());
    }
    this.currentMonth_.setFullYear(currentYearInt);
    this.currentMonth_.setMonth(this.pickedDate_.getMonth());
    this.currentMonth_.setDate(this.pickedDate_.getDate());
    this.updateHeader_();
    this.updateMonthTitle_();
    this.changeCurrentMonth_(this.currentMonth_);
};
/**
   * Select date action click handler
   * @param {Event} e Click event object
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.pickDateHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var previousDate = this.calendarElement_.querySelector('.' + this.CssClasses_.DATE + '.' + this.CssClasses_.DATE_SELECTED);
    if (previousDate) {
        previousDate.classList.remove(this.CssClasses_.DATE_SELECTED);
    }
    // Select current date
    var pickedDate = e.target;
    var pickedDateInt = pickedDate.getAttribute('data-date');
    pickedDate.classList.add(this.CssClasses_.DATE_SELECTED);
    var nextPickedDate = new Date(this.pickedDate_.getTime());
    nextPickedDate.setFullYear(this.currentMonth_.getFullYear());
    nextPickedDate.setMonth(this.currentMonth_.getMonth());
    nextPickedDate.setDate(pickedDateInt);
    if (this.isInRange_(nextPickedDate)) {
        this.pickedDate_.setFullYear(this.currentMonth_.getFullYear());
        this.pickedDate_.setMonth(this.currentMonth_.getMonth());
        this.pickedDate_.setDate(pickedDateInt);
        this.updateHeader_();
        this.updateYearPicker_();
    }
};
/**
   * Previous date picker month handler
   * @param {Event} e Click event object
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.previousMonthHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var previousMonth = new Date(this.currentMonth_.getTime());
    previousMonth.setDate(1);
    previousMonth.setMonth(this.currentMonth_.getMonth() - 1);
    this.changeCurrentMonth_(previousMonth);
};
/**
   * Next date picker month handler
   * @param {Event} e Click event object
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.nextMonthHandler_ = function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var nextMonth = new Date(this.currentMonth_.getTime());
    nextMonth.setDate(1);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.changeCurrentMonth_(nextMonth);
};
/**
   * Format given date for input value
   * @param  {Date} dateObject Date object to format
   * @private
   * @return {string} Formatted date string
   */
MaterialDatePicker.prototype.formatInputDate_ = function (dateObject) {
    var dateFormatted;
    // If given format is actually function,
    // execute in global scope with selected date as parameter
    if (typeof this.locales.format === 'function') {
        var formatFunction = this.locales.format;
        var selectedDate = this.selectedDate_;
        return formatFunction.call(window, selectedDate);
    }
    /**
     * Append leading zero if necessary
     * @param {number} number Number to append leading zero
     * @return {string} String containing leading zero if needed
     */
    var addLeadingZero = function (number) {
        return ('0' + number).substr(-2, 2);
    };
    switch (this.locales.format) {
    case 'dd.mm.yyyy':
        dateFormatted = [
            addLeadingZero(dateObject.getDate()),
            addLeadingZero(dateObject.getMonth() + 1),
            dateObject.getFullYear()
        ].join('.');
        break;
    case 'yyyy-mm-dd':
        dateFormatted = [
            dateObject.getFullYear(),
            addLeadingZero(dateObject.getMonth() + 1),
            addLeadingZero(dateObject.getDate())
        ].join('-');
        break;
    case 'mm/dd/yyyy':
        dateFormatted = [
            addLeadingZero(dateObject.getMonth() + 1),
            addLeadingZero(dateObject.getDate()),
            dateObject.getFullYear()
        ].join('/');
        break;
    default:
        dateFormatted = [
            addLeadingZero(dateObject.getMonth() + 1),
            addLeadingZero(dateObject.getDate()),
            dateObject.getFullYear()
        ].join('/');
        break;
    }
    return dateFormatted;
};
/**
   * Format given date for header display
   * @param  {Date} date Current picked date object
   * @return {string} Formatted date
   */
MaterialDatePicker.prototype.formatHeaderDate_ = function (date) {
    return this.locales.weekDaysShort[date.getDay()] + ', ' + this.locales.monthsShort[date.getMonth()] + ' ' + date.getDate();
};
/**
   * Check if given date is today
   * @param  {Date} currentDate Date object to check "is today" state
   * @return {boolean} Date "is today" status
   */
MaterialDatePicker.prototype.isToday_ = function (currentDate) {
    var today = new Date();
    if (today.getFullYear() !== currentDate.getFullYear()) {
        return false;
    }
    if (today.getMonth() !== currentDate.getMonth()) {
        return false;
    }
    if (today.getDate() !== currentDate.getDate()) {
        return false;
    }
    return true;
};
/**
   * Check if given date is selected date
   * @param  {Date} currentDate Date object to check "is picked" state
   * @return {boolean} Date "is picked" state
   */
MaterialDatePicker.prototype.isPickedDate_ = function (currentDate) {
    if (!this.pickedDate_) {
        return false;
    }
    if (this.pickedDate_.getFullYear() !== currentDate.getFullYear()) {
        return false;
    }
    if (this.pickedDate_.getMonth() !== currentDate.getMonth()) {
        return false;
    }
    if (this.pickedDate_.getDate() !== currentDate.getDate()) {
        return false;
    }
    return true;
};
/**
   * Check if given date is in range, if range is set.
   * @private
   * @param  {Date} dateObject Date to check if it is in defined date range
   * @return {boolean} Date "in range" state
   */
MaterialDatePicker.prototype.isInRange_ = function (dateObject) {
    var isInRange = true;
    if (this.minDate_ && !this.maxDate_) {
        if (this.minDate_.getTime() > dateObject.getTime()) {
            isInRange = false;
        }
    } else if (!this.minDate_ && this.maxDate_) {
        if (this.maxDate_.getTime() < dateObject.getTime()) {
            isInRange = false;
        }
    } else if (this.minDate_ && this.maxDate_) {
        if (this.minDate_.getTime() <= dateObject.getTime() && dateObject.getTime() <= this.maxDate_.getTime()) {
        } else {
            isInRange = false;
        }
    }
    return isInRange;
};
/**
   * Check if given year is in range, if range is set
   * @param  {number} year Year to check "in range" state
   * @return {boolean} Year "in range" state
   */
MaterialDatePicker.prototype.isYearInRange_ = function (year) {
    var isInRange = true;
    if (this.minDate_ && !this.maxDate_) {
        if (this.minDate_.getFullYear() > year) {
            isInRange = false;
        }
    } else if (!this.minDate_ && this.maxDate_) {
        if (this.maxDate_.getFullYear() < year) {
            isInRange = false;
        }
    } else if (this.minDate_ && this.maxDate_) {
        if (this.minDate_.getFullYear() <= year && year <= this.maxDate_.getFullYear()) {
        } else {
            isInRange = false;
        }
    }
    return isInRange;
};
/**
   * Change current month and rerender calendar
   * @private
   * @param  {Date} nextMonth Next month object
   * @return {void}
   */
MaterialDatePicker.prototype.changeCurrentMonth_ = function (nextMonth) {
    if (!nextMonth) {
        return undefined;
    }
    var currentMonthElement = this.renderMonth_(nextMonth);
    if (this.currentMonthElement_) {
        this.calendarElement_.insertBefore(currentMonthElement, this.currentMonthElement_);
    } else {
        this.calendarElement_.appendChild(currentMonthElement);
    }
    var dateButtons = this.currentMonthElement_.querySelectorAll('.' + this.CssClasses_.DATE);
    for (var i = 0; i < dateButtons.length; i++) {
        var dateButton = dateButtons[i];
        dateButton.removeEventListener('click', this.boundPickDateHandler);
    }
    if (this.currentMonthElement_.remove) {
        this.currentMonthElement_.remove();
    } else {
        this.currentMonthElement_.parentNode.removeChild(this.currentMonthElement_);
    }
    this.currentMonthElement_ = currentMonthElement;
    this.currentMonth_ = nextMonth;
    this.updateMonthTitle_();
};
/**
   * Render datepicker dialog
   *
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.render_ = function () {
    if (!this.widgetElement_) {
        this.widgetElement_ = document.createElement('div');
        this.widgetElement_.classList.add(this.CssClasses_.WIDGET);
        // Append header element
        this.widgetElement_.appendChild(this.renderHeader_());
        this.widgetElement_.appendChild(this.renderCalendar_());
        if (this.element_.classList.contains(this.CssClasses_.FIXED)) {
            this.widgetElement_.classList.add(this.CssClasses_.IS_FIXED);
            document.body.appendChild(this.widgetElement_);
        } else {
            this.element_.appendChild(this.widgetElement_);
        }
    }
};
/**
   * Render date picker header element
   * @private
   * @return {Element} Date picker header element
   */
MaterialDatePicker.prototype.renderHeader_ = function () {
    if (!this.headerElement_) {
        this.headerElement_ = document.createElement('div');
        this.headerYearElement_ = document.createElement('div');
        this.headerDateElement_ = document.createElement('div');
        // Add appropriate classes
        this.headerElement_.classList.add(this.CssClasses_.HEADER);
        this.headerYearElement_.classList.add(this.CssClasses_.HEADER_YEAR);
        this.headerDateElement_.classList.add(this.CssClasses_.HEADER_DATE);
        // Bind click events
        this.boundHeaderYearClickHandler = this.headerYearClickHandler_.bind(this);
        this.boundHeaderDateClickHandler = this.headerDateClickHandler_.bind(this);
        this.headerYearElement_.addEventListener('click', this.boundHeaderYearClickHandler);
        this.headerDateElement_.addEventListener('click', this.boundHeaderDateClickHandler);
        // Assemble header element
        this.headerElement_.appendChild(this.headerYearElement_);
        this.headerElement_.appendChild(this.headerDateElement_);
        // Setup initial header values
        this.updateHeader_();
    }
    return this.headerElement_;
};
/**
   * Update header date and year
   *
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.updateHeader_ = function () {
    if (this.headerYearElement_) {
        this.headerYearElement_.innerHTML = this.pickedDate_.getFullYear();
    }
    if (this.headerDateElement_) {
        this.headerDateElement_.innerHTML = this.formatHeaderDate_(this.pickedDate_);
    }
};
/**
   * Update current month title
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.updateMonthTitle_ = function () {
    this.currentMonthTitleElement_.innerHTML = this.locales.months[this.currentMonth_.getMonth()] + ', ' + this.currentMonth_.getFullYear();
};
/**
   * Update year picker current year
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.updateYearPicker_ = function () {
    var pickedYear = this.yearPickerElement_.querySelector('.' + this.CssClasses_.YEAR_SELECTED);
    if (pickedYear) {
        pickedYear.classList.remove(this.CssClasses_.YEAR_SELECTED);
    }
    pickedYear = this.yearPickerElement_.querySelector('.' + this.CssClasses_.YEAR + '[data-year="' + this.pickedDate_.getFullYear() + '"]');
    pickedYear.classList.add(this.CssClasses_.YEAR_SELECTED);
    var focusYear = pickedYear;
    for (var i = 0; i < 3; i++) {
        if (focusYear.previousElementSibling) {
            focusYear = focusYear.previousElementSibling;
        }
    }
    focusYear.parentNode.scrollTop = focusYear.offsetTop;
};
/**
   * Render entire date picker content
   * @private
   * @return {Element} Date picker calendar element
   */
MaterialDatePicker.prototype.renderCalendar_ = function () {
    if (!this.calendarElement_) {
        this.calendarElement_ = document.createElement('div');
        this.calendarElement_.classList.add(this.CssClasses_.CALENDAR);
        this.calendarElement_.appendChild(this.renderNavigation_());
        this.calendarElement_.appendChild(this.renderWeekDays_());
        this.currentMonthElement_ = this.renderMonth_(this.currentMonth_);
        this.calendarElement_.appendChild(this.currentMonthElement_);
        this.calendarElement_.appendChild(this.renderYearPicker_());
        this.calendarElement_.appendChild(this.renderActions_());
    }
    return this.calendarElement_;
};
/**
   * Render month navigation
   * @private
   * @return {Element} Date picker navigation element
   */
MaterialDatePicker.prototype.renderNavigation_ = function () {
    if (!this.navigationElement_) {
        this.navigationElement_ = document.createElement('div');
        this.navigationElement_.classList.add(this.CssClasses_.NAVIGATION);
        var previousMonth = document.createElement('button');
        previousMonth.setAttribute('type', 'button');
        previousMonth.classList.add('mdl-button');
        previousMonth.classList.add('mdl-js-button');
        previousMonth.classList.add('mdl-button--icon');
        previousMonth.classList.add(this.CssClasses_.MONTH_PREVIOUS);
        var previousIcon = document.createElement('i');
        previousIcon.classList.add('material-icons');
        previousIcon.innerHTML = 'keyboard_arrow_left';
        previousMonth.appendChild(previousIcon);
        var nextMonth = document.createElement('button');
        nextMonth.setAttribute('type', 'button');
        nextMonth.classList.add('mdl-button');
        nextMonth.classList.add('mdl-js-button');
        nextMonth.classList.add('mdl-button--icon');
        nextMonth.classList.add(this.CssClasses_.MONTH_NEXT);
        var nextIcon = document.createElement('i');
        nextIcon.classList.add('material-icons');
        nextIcon.innerHTML = 'keyboard_arrow_right';
        nextMonth.appendChild(nextIcon);
        // Bind month change event
        this.boundPreviousMonthHandler = this.previousMonthHandler_.bind(this);
        this.boundNextMonthHandler = this.nextMonthHandler_.bind(this);
        previousMonth.addEventListener('click', this.boundPreviousMonthHandler, true);
        nextMonth.addEventListener('click', this.boundNextMonthHandler, true);
        this.currentMonthTitleElement_ = document.createElement('div');
        this.currentMonthTitleElement_.classList.add(this.CssClasses_.MONTH_CURRENT);
        if (this.currentMonth_) {
            this.updateMonthTitle_();
        }
        this.navigationElement_.appendChild(previousMonth);
        this.navigationElement_.appendChild(this.currentMonthTitleElement_);
        this.navigationElement_.appendChild(nextMonth);
        componentHandler.upgradeElement(previousMonth);
        componentHandler.upgradeElement(nextMonth);
    }
    return this.navigationElement_;
};
/**
   * Render date picker week days heading
   *
   * @private
   * @return {Element} Date picker week days heading element
   */
MaterialDatePicker.prototype.renderWeekDays_ = function () {
    if (!this.weekDaysElement_) {
        this.weekDaysElement_ = document.createElement('div');
        this.weekDaysElement_.classList.add(this.CssClasses_.WEEK_DAYS);
        var weekStart = this.locales.weekStart;
        for (var i = 0; i <= 6; i++) {
            var weekDay = document.createElement('button');
            weekDay.setAttribute('type', 'button');
            weekDay.classList.add(this.CssClasses_.DATE);
            weekDay.classList.add(this.CssClasses_.DATE_EMPTY);
            weekDay.innerHTML = this.locales.weekDaysLetter[weekStart];
            this.weekDaysElement_.appendChild(weekDay);
            weekStart += 1;
            if (weekStart > 6) {
                weekStart = 0;
            }
        }
    }
    return this.weekDaysElement_;
};
/**
   * Render date picker weeks
   * @param {Date} monthObject Date object from which month element will be rendered
   * @private
   * @return {Element} Date picker month element
   */
MaterialDatePicker.prototype.renderMonth_ = function (monthObject) {
    var month = document.createElement('div');
    month.classList.add(this.CssClasses_.MONTH);
    var firstDay = new Date(monthObject.getTime());
    var lastDay = new Date(monthObject.getTime());
    var currentDay = new Date(firstDay.getTime());
    var currentDayInt = 1;
    // Set first day of the month
    firstDay.setDate(1);
    // Set last day of the month
    lastDay.setDate(1);
    lastDay.setMonth(lastDay.getMonth() + 1);
    lastDay.setDate(lastDay.getDate() - 1);
    var renderDays = true;
    var weekStart = this.locales.weekStart;
    while (renderDays) {
        var week = document.createElement('div');
        week.classList.add(this.CssClasses_.WEEK);
        for (var i = 0; i <= 6; i++) {
            currentDay.setDate(currentDayInt);
            if (currentDayInt > lastDay.getDate()) {
                renderDays = false;
                break;
            }
            var weekDay = document.createElement('button');
            weekDay.classList.add(this.CssClasses_.DATE);
            if (currentDay.getDay() === weekStart && currentDay.getDate() <= lastDay.getDate()) {
                weekDay.innerHTML = currentDayInt;
                weekDay.setAttribute('data-date', currentDayInt);
                weekDay.setAttribute('type', 'button');
                currentDayInt++;
                if (!this.isInRange_(currentDay)) {
                    weekDay.classList.add(this.CssClasses_.DATE_DISABLED);
                }
                // Bind select date event
                if (!weekDay.classList.contains(this.CssClasses_.DATE_DISABLED)) {
                    if (this.isToday_(currentDay)) {
                        weekDay.classList.add(this.CssClasses_.DATE_TODAY);
                    }
                    // Check if current day is selected
                    if (this.isPickedDate_(currentDay)) {
                        weekDay.classList.add(this.CssClasses_.DATE_SELECTED);
                    }
                    this.boundPickDateHandler = this.pickDateHandler_.bind(this);
                    weekDay.addEventListener('click', this.boundPickDateHandler, true);
                }
            } else {
                // Render empty date
                weekDay.classList.add(this.CssClasses_.DATE_EMPTY);
            }
            weekStart += 1;
            if (weekStart > 6) {
                weekStart = 0;
            }
            week.appendChild(weekDay);
        }
        month.appendChild(week);
    }
    return month;
};
/**
   * Render year picker
   * @private
   * @return {Element} Date picker "year picker" element
   */
MaterialDatePicker.prototype.renderYearPicker_ = function () {
    var year;
    var yearButton;
    if (this.yearPickerElement_) {
        // Year picker already rendered, just need to update state
        var yearButtons = this.yearPickerElement_.querySelectorAll('.' + this.CssClasses_.YEAR);
        for (var i = 0; i < yearButtons.length; i++) {
            yearButton = null;
            yearButton = yearButtons[i];
            var existingYear = parseInt(yearButton.getAttribute('data-year'), 10);
            if (this.isYearInRange_(existingYear)) {
                if (yearButton.classList.contains(this.CssClasses_.YEAR_DISABLED)) {
                    yearButton.classList.remove(this.CssClasses_.YEAR_DISABLED);
                }
                // First try remove, then add event listener again to avoid duplication
                yearButton.removeEventListener('click', this.boundPickYearHandler);
                yearButton.addEventListener('click', this.boundPickYearHandler);
            } else {
                yearButton.removeEventListener('click', this.boundPickYearHandler);
                yearButton.classList.add(this.CssClasses_.YEAR_DISABLED);
            }
        }
    } else {
        this.yearPickerElement_ = document.createElement('div');
        this.yearPickerElement_.classList.add(this.CssClasses_.YEAR_PICKER_ELEMENT);
        var today = new Date();
        var startYear = today.getFullYear() - 100;
        var endYear = today.getFullYear() + 100;
        this.boundPickYearHandler = this.pickYearHandler_.bind(this);
        for (year = startYear; year <= endYear; year++) {
            yearButton = document.createElement('button');
            yearButton.classList.add(this.CssClasses_.YEAR);
            yearButton.setAttribute('data-year', year);
            yearButton.setAttribute('type', 'button');
            yearButton.innerHTML = year;
            if (this.isYearInRange_(year)) {
                yearButton.addEventListener('click', this.boundPickYearHandler);
                if (this.pickedDate_) {
                    if (this.pickedDate_.getFullYear() === year) {
                        yearButton.classList.add(this.CssClasses_.YEAR_SELECTED);
                    }
                }
            } else {
                yearButton.classList.add(this.CssClasses_.YEAR_DISABLED);
            }
            this.yearPickerElement_.appendChild(yearButton);
        }
    }
    return this.yearPickerElement_;
};
/**
   * Render date picker actions
   * @private
   * @return {Element} Date picker actions element
   */
MaterialDatePicker.prototype.renderActions_ = function () {
    if (!this.actionsElement_) {
        this.actionsElement_ = document.createElement('div');
        this.actionsElement_.classList.add(this.CssClasses_.ACTIONS);
        // Cancel button
        this.cancelElement_ = document.createElement('button');
        this.cancelElement_.classList.add('mdl-button');
        this.cancelElement_.classList.add('mdl-js-button');
        this.cancelElement_.classList.add('mdl-button--accent');
        this.cancelElement_.classList.add(this.CssClasses_.ACTION_CANCEL);
        this.cancelElement_.setAttribute('type', 'button');
        this.cancelElement_.innerHTML = this.locales.actions.cancel || 'Cancel';
        // OK button
        this.okElement_ = document.createElement('button');
        this.okElement_.classList.add('mdl-button');
        this.okElement_.classList.add('mdl-js-button');
        this.okElement_.classList.add('mdl-button--accent');
        this.okElement_.classList.add(this.CssClasses_.ACTION_OK);
        this.okElement_.setAttribute('type', 'button');
        this.okElement_.innerHTML = this.locales.actions.ok || 'OK';
        // Bind events
        this.boundCancelActionHandler = this.cancelHandler_.bind(this);
        this.boundOkActionHandler = this.okHandler_.bind(this);
        this.cancelElement_.addEventListener('click', this.boundCancelActionHandler, true);
        this.okElement_.addEventListener('click', this.boundOkActionHandler, true);
        this.actionsElement_.appendChild(this.cancelElement_);
        this.actionsElement_.appendChild(this.okElement_);
        componentHandler.upgradeElement(this.cancelElement_);
        componentHandler.upgradeElement(this.okElement_);
    }
    return this.actionsElement_;
};
/**
   * Destroy all properties and widget elements
   * @private
   * @return {void}
   */
MaterialDatePicker.prototype.destroy_ = function () {
    var i = 0;
    if (this.yearPickerElement_) {
        var yearButtons = this.yearPickerElement_.querySelectorAll('.' + this.CssClasses_.YEAR);
        for (i = 0; i < yearButtons.length; i++) {
            var yearButton = yearButtons[i];
            yearButton.removeEventListener('click', this.boundPickYearHandler);
        }
    }
    if (this.currentMonthElement_) {
        var dateButtons = this.currentMonthElement_.querySelectorAll('.' + this.CssClasses_.DATE);
        for (i = 0; i < dateButtons.length; i++) {
            var dateButton = dateButtons[i];
            dateButton.removeEventListener('click', this.boundPickDateHandler);
        }
    }
    if (this.cancelElement_) {
        componentHandler.downgradeElements(this.cancelElement_);
        this.cancelElement_.removeEventListener('click', this.boundCancelActionHandler);
    }
    if (this.okElement_) {
        componentHandler.downgradeElements(this.okElement_);
        this.okElement_.removeEventListener('click', this.boundOkActionHandler);
    }
    if (this.actionsElement_) {
        this.actionsElement_ = null;
    }
    if (this.navigationElement_) {
        var previousMonth = this.navigationElement_.querySelector('.' + this.CssClasses_.MONTH_PREVIOUS);
        var nextMonth = this.navigationElement_.querySelector('.' + this.CssClasses_.MONTH_NEXT);
        if (previousMonth) {
            previousMonth.removeEventListener('click', this.boundPreviousMonthHandler);
        }
        if (nextMonth) {
            nextMonth.removeEventListener('click', this.boundNextMonthHandler);
        }
        this.navigationElement_ = null;
    }
    if (this.headerDateElement_) {
        this.headerDateElement_.removeEventListener('click', this.boundHeaderDateClickHandler);
        this.headerDateElement_ = null;
    }
    if (this.headerYearElement_) {
        this.headerYearElement_.removeEventListener('click', this.boundHeaderYearClickHandler);
        this.headerYearElement_ = null;
    }
    if (this.headerElement_) {
        this.headerElement_ = null;
    }
    if (this.weekDaysElement_) {
        this.weekDaysElement_ = null;
    }
    if (this.calendarElement_) {
        this.calendarElement_ = null;
    }
    if (this.widgetElement_) {
        if (this.widgetElement_.remove) {
            this.widgetElement_.remove();
        } else {
            this.widgetElement_.parentNode.removeChild(this.widgetElement_);
        }
        this.widgetElement_ = null;
    }
};
/**
   * Open date picker dialog
   * @public
   * @return {void}
   */
MaterialDatePicker.prototype.open = function () {
    // Date picker widget already opened
    if (this.widgetElement_ && this.widgetElement_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
        return;
    }
    if (!this.widgetElement_) {
        this.render_();
    }
    if (!this.element_.classList.contains(this.CssClasses_.IS_FOCUSED)) {
        this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
    }
    // Slightly delay picker show to enable animation
    setTimeout(function () {
        if (this.backdrop_) {
            this.backdrop_.style.display = 'block';
        }
        this.widgetElement_.classList.add(this.CssClasses_.IS_VISIBLE);
        this.element_.classList.add(this.CssClasses_.IS_VISIBLE);
        this.triggerEvent_('open');
    }.bind(this), 0);
};
MaterialDatePicker.prototype['open'] = MaterialDatePicker.prototype.open;
/**
   * Close date picker dialog
   *
   * @public
   * @return {void}
   */
MaterialDatePicker.prototype.close = function () {
    // Inline styles can't be closed.
    // @TODO: This should be reviewed with Google guys
    if (this.element_.classList.contains(this.CssClasses_.INLINE)) {
        return;
    }
    // Date picker widget already closed
    if (!this.widgetElement_ || !this.widgetElement_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
        return;
    }
    if (this.element_.classList.contains(this.CssClasses_.IS_FOCUSED)) {
        this.element_.classList.remove(this.CssClasses_.IS_FOCUSED);
    }
    if (this.widgetElement_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
        if (this.backdrop_) {
            this.backdrop_.style.display = 'none';
        }
        this.widgetElement_.classList.remove(this.CssClasses_.IS_VISIBLE);
        this.element_.classList.remove(this.CssClasses_.IS_VISIBLE);
        this.triggerEvent_('close');
        setTimeout(function () {
            // Destroy all properties and widget elements after close
            this.destroy_();
        }.bind(this), 200);
    }
};
MaterialDatePicker.prototype['close'] = MaterialDatePicker.prototype.close;
/**
   * Get selected date to datepicker
   * @public
   * @return {Date} Current selected date
   */
MaterialDatePicker.prototype.getSelectedDate = function () {
    return this.selectedDate_;
};
MaterialDatePicker.prototype['getSelectedDate'] = MaterialDatePicker.prototype.getSelectedDate;
/**
   * Set selected date to datepicker
   *
   * @param  {Date} selectedDate Date object to be set as selected in picker
   * @public
   * @return {Date} Current selected date
   */
MaterialDatePicker.prototype.setSelectedDate = function (selectedDate) {
    if (selectedDate && this.isInRange_(selectedDate)) {
        this.pickedDate_ = selectedDate;
        this.currentMonth_ = selectedDate;
        this.selectedDate_ = selectedDate;
        this.render_();
        if (this.input_) {
            this.input_.value = this.formatInputDate_(this.selectedDate_);
            if (this.element_.MaterialTextfield) {
                this.element_.MaterialTextfield.checkValidity();
            }
        }
        this.element_.classList.add(this.CssClasses_.IS_DIRTY);
    }
    return this.getSelectedDate();
};
MaterialDatePicker.prototype['setSelectedDate'] = MaterialDatePicker.prototype.setSelectedDate;
/**
   * Set allowed date picker range. Dates outside of the range can't be selected.
   * @param {Date} minDate Minimum date
   * @param {Date} maxDate Maximum date
   */
MaterialDatePicker.prototype.setRange = function (minDate, maxDate) {
    if (minDate && minDate instanceof Date) {
        // Set minimum lowest possible value of the date
        minDate.setHours(0);
        minDate.setMinutes(0);
        minDate.setSeconds(0);
        minDate.setMilliseconds(0);
    }
    this.minDate_ = minDate || null;
    if (maxDate && maxDate instanceof Date) {
        // Set maximum highest possible value of the date
        maxDate.setHours(23);
        maxDate.setMinutes(59);
        maxDate.setSeconds(59);
        maxDate.setMilliseconds(999);
    }
    this.maxDate_ = maxDate || null;
    // Means that widget exists and is opened
    if (this.widgetElement_) {
        this.changeCurrentMonth_(this.currentMonth_);
        this.renderYearPicker_();
    }
};
MaterialDatePicker.prototype['setRange'] = MaterialDatePicker.prototype.setRange;
/**
   * Initialize element.
   */
MaterialDatePicker.prototype.init = function () {
    if (this.element_) {
        // Load default configuration
        this.locales = Object.create(MaterialDatePicker.locales);
        this.input_ = this.element_.querySelector('.' + this.CssClasses_.INPUT);
        if (this.input_) {
            if (!this.element_.getAttribute('upgraded')) {
                componentHandler.upgradeElement(this.element_, 'MaterialTextfield');
            }
            // Bind input events
            this.boundInputFocusHandler = this.inputFocusHandler_.bind(this);
            this.boundInputBlurHandler = this.inputBlurHandler_.bind(this);
            this.input_.addEventListener('focus', this.boundInputFocusHandler, true);
            this.input_.addEventListener('focusout', this.boundInputBlurHandler, true);
        }
        // Setup properties default values.
        this.pickedDate_ = new Date();
        this.currentMonth_ = new Date();
        this.selectedDate_ = null;
        if (this.element_.classList.contains(this.CssClasses_.FIXED)) {
            this.backdrop_ = document.createElement('div');
            this.backdrop_.classList.add(this.CssClasses_.BACKDROP);
            this.backdrop_.style.display = 'none';
            this.backdrop_.setAttribute('tabindex', -1);
            document.body.appendChild(this.backdrop_);
        }
        if (this.element_.classList.contains(this.CssClasses_.IS_VISIBLE)) {
            // Hide datepicker until it is fully rendered
            this.element_.classList.remove(this.CssClasses_.IS_VISIBLE);
            // Once rendered, show datepicker
            this.open();
        }
        // Set private isInitialized_ property for internal tracking
        this.isInitialized_ = true;
        // Add "is-updated" class
        this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
    }
};
/**
   * Downgrade datepicker component
   * @return {void}
   */
MaterialDatePicker.prototype.mdlDowngrade_ = function () {
    if (this.input_) {
        this.input_.removeEventListener('focus', this.boundInputFocusHandler, true);
        this.input_.removeEventListener('focusout', this.boundInputBlurHandler, true);
    }
    this.destroy_();
    if (this.backdrop_) {
        if (this.backdrop_.remove) {
            this.backdrop_.remove();
        } else {
            this.backdrop_.parentNode.removeChild(this.backdrop_);
        }
    }
    // Trigger "destroy" event for all those who are listening
    // for other component events
    this.triggerEvent_('destroy');
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialDatePicker,
    classAsString: 'MaterialDatePicker',
    cssClass: 'mdl-js-datepicker',
    widget: true
});
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
/**
   * Class constructor for Ripple MDL component.
   * Implements MDL component design pattern defined at:
   * https://github.com/jasonmayes/mdl-component-design-pattern
   *
   * @constructor
   * @param {HTMLElement} element The element that will be upgraded.
   */
var MaterialRipple = function MaterialRipple(element) {
    this.element_ = element;
    // Initialize instance.
    this.init();
};
window['MaterialRipple'] = MaterialRipple;
/**
   * Store constants in one place so they can be updated easily.
   *
   * @enum {string | number}
   * @private
   */
MaterialRipple.prototype.Constant_ = {
    INITIAL_SCALE: 'scale(0.0001, 0.0001)',
    INITIAL_SIZE: '1px',
    INITIAL_OPACITY: '0.4',
    FINAL_OPACITY: '0',
    FINAL_SCALE: ''
};
/**
   * Store strings for class names defined by this component that are used in
   * JavaScript. This allows us to simply change it in one place should we
   * decide to modify at a later date.
   *
   * @enum {string}
   * @private
   */
MaterialRipple.prototype.CssClasses_ = {
    RIPPLE_CENTER: 'mdl-ripple--center',
    RIPPLE_EFFECT_IGNORE_EVENTS: 'mdl-js-ripple-effect--ignore-events',
    RIPPLE: 'mdl-ripple',
    IS_ANIMATING: 'is-animating',
    IS_VISIBLE: 'is-visible'
};
/**
   * Handle mouse / finger down on element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialRipple.prototype.downHandler_ = function (event) {
    if (!this.rippleElement_.style.width && !this.rippleElement_.style.height) {
        var rect = this.element_.getBoundingClientRect();
        this.boundHeight = rect.height;
        this.boundWidth = rect.width;
        this.rippleSize_ = Math.sqrt(rect.width * rect.width + rect.height * rect.height) * 2 + 2;
        this.rippleElement_.style.width = this.rippleSize_ + 'px';
        this.rippleElement_.style.height = this.rippleSize_ + 'px';
    }
    this.rippleElement_.classList.add(this.CssClasses_.IS_VISIBLE);
    if (event.type === 'mousedown' && this.ignoringMouseDown_) {
        this.ignoringMouseDown_ = false;
    } else {
        if (event.type === 'touchstart') {
            this.ignoringMouseDown_ = true;
        }
        var frameCount = this.getFrameCount();
        if (frameCount > 0) {
            return;
        }
        this.setFrameCount(1);
        var bound = event.currentTarget.getBoundingClientRect();
        var x;
        var y;
        // Check if we are handling a keyboard click.
        if (event.clientX === 0 && event.clientY === 0) {
            x = Math.round(bound.width / 2);
            y = Math.round(bound.height / 2);
        } else {
            var clientX = event.clientX ? event.clientX : event.touches[0].clientX;
            var clientY = event.clientY ? event.clientY : event.touches[0].clientY;
            x = Math.round(clientX - bound.left);
            y = Math.round(clientY - bound.top);
        }
        this.setRippleXY(x, y);
        this.setRippleStyles(true);
        requestAnimationFrame(this.animFrameHandler.bind(this));
    }
};
/**
   * Handle mouse / finger up on element.
   *
   * @param {Event} event The event that fired.
   * @private
   */
MaterialRipple.prototype.upHandler_ = function (event) {
    // Don't fire for the artificial "mouseup" generated by a double-click.
    if (event && event.detail !== 2) {
        // Allow a repaint to occur before removing this class, so the animation
        // shows for tap events, which seem to trigger a mouseup too soon after
        // mousedown.
        window.setTimeout(function () {
            this.rippleElement_.classList.remove(this.CssClasses_.IS_VISIBLE);
        }.bind(this), 0);
    }
};
/**
   * Initialize element.
   */
MaterialRipple.prototype.init = function () {
    if (this.element_) {
        var recentering = this.element_.classList.contains(this.CssClasses_.RIPPLE_CENTER);
        if (!this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT_IGNORE_EVENTS)) {
            this.rippleElement_ = this.element_.querySelector('.' + this.CssClasses_.RIPPLE);
            this.frameCount_ = 0;
            this.rippleSize_ = 0;
            this.x_ = 0;
            this.y_ = 0;
            // Touch start produces a compat mouse down event, which would cause a
            // second ripples. To avoid that, we use this property to ignore the first
            // mouse down after a touch start.
            this.ignoringMouseDown_ = false;
            this.boundDownHandler = this.downHandler_.bind(this);
            this.element_.addEventListener('mousedown', this.boundDownHandler);
            this.element_.addEventListener('touchstart', this.boundDownHandler);
            this.boundUpHandler = this.upHandler_.bind(this);
            this.element_.addEventListener('mouseup', this.boundUpHandler);
            this.element_.addEventListener('mouseleave', this.boundUpHandler);
            this.element_.addEventListener('touchend', this.boundUpHandler);
            this.element_.addEventListener('blur', this.boundUpHandler);
            /**
         * Getter for frameCount_.
         * @return {number} the frame count.
         */
            this.getFrameCount = function () {
                return this.frameCount_;
            };
            /**
         * Setter for frameCount_.
         * @param {number} fC the frame count.
         */
            this.setFrameCount = function (fC) {
                this.frameCount_ = fC;
            };
            /**
         * Getter for rippleElement_.
         * @return {Element} the ripple element.
         */
            this.getRippleElement = function () {
                return this.rippleElement_;
            };
            /**
         * Sets the ripple X and Y coordinates.
         * @param  {number} newX the new X coordinate
         * @param  {number} newY the new Y coordinate
         */
            this.setRippleXY = function (newX, newY) {
                this.x_ = newX;
                this.y_ = newY;
            };
            /**
         * Sets the ripple styles.
         * @param  {boolean} start whether or not this is the start frame.
         */
            this.setRippleStyles = function (start) {
                if (this.rippleElement_ !== null) {
                    var transformString;
                    var scale;
                    var offset = 'translate(' + this.x_ + 'px, ' + this.y_ + 'px)';
                    if (start) {
                        scale = this.Constant_.INITIAL_SCALE;
                    } else {
                        scale = this.Constant_.FINAL_SCALE;
                        if (recentering) {
                            offset = 'translate(' + this.boundWidth / 2 + 'px, ' + this.boundHeight / 2 + 'px)';
                        }
                    }
                    transformString = 'translate(-50%, -50%) ' + offset + scale;
                    this.rippleElement_.style.webkitTransform = transformString;
                    this.rippleElement_.style.msTransform = transformString;
                    this.rippleElement_.style.transform = transformString;
                    if (start) {
                        this.rippleElement_.classList.remove(this.CssClasses_.IS_ANIMATING);
                    } else {
                        this.rippleElement_.classList.add(this.CssClasses_.IS_ANIMATING);
                    }
                }
            };
            /**
         * Handles an animation frame.
         */
            this.animFrameHandler = function () {
                if (this.frameCount_-- > 0) {
                    requestAnimationFrame(this.animFrameHandler.bind(this));
                } else {
                    this.setRippleStyles(false);
                }
            };
        }
    }
};
// The component registers itself. It can assume componentHandler is available
// in the global scope.
componentHandler.register({
    constructor: MaterialRipple,
    classAsString: 'MaterialRipple',
    cssClass: 'mdl-js-ripple-effect',
    widget: false
});
}());
