(function() {
  'use strict';

  /* Códigos a ejecutar cuando se carga la página */
  initializeExtendedDialogActions();
  
  /**************** Funciones (en orden alfabético) **************************/

  
  /**
   * Registra en el evento click de un elemento que se abra un determinado
   * diálogo.
   *
   * @param  {String} dialogId id del dialog que se abrirá al hacer click en el
   *                           elemento
   * @param  {String} clickeableElementsQuerySelector cadena de selección de
   *                                                  elementos que cuando se
   *                                                  pulsen abren el dialogo
   */
  function addShowDialogActionOnClickListener(dialogId,
    clickeableElementsQuerySelector) {

    var dialogToShow = document.querySelector(dialogId);
    /**
     * contiene un NodeList con todos los nodos DOM que, al pulsarse, abren
     * el dialogo de detalle del listado
     * @type {NodeList}
     */
    var clickebleElementsNodeList =
      document.querySelectorAll(clickeableElementsQuerySelector);

    // Registramos el polyfill por si el navegador no soporta elemento dialog
    if (!dialogToShow.showModal) {
      dialogPolyfill.registerDialog(dialogToShow);
    }

    // Por cada nodo se añade evento para que al pulsar se abra el dialogo
    forEachNode(clickebleElementsNodeList, function(index, value) {
      value.addEventListener('click', function() {
        dialogToShow.showModal();
      });
    });
  }

  /**
   * Ejecuta todo el js necesario para que funcione el diálogo de búsqueda
   * avanzada cuando se pulsa sobre el icono de la barra de herramientas
   * o la ayuda de la búsqueda
   */
  function initializeExtendedDialogActions() {
    var elementsWichOpenDialog =
      document.querySelectorAll("*[data-mdl-on-click-open-dialog-id]");

    // Por cada nodo se añade evento para que al pulsar se abra el dialogo
    forEachNode(elementsWichOpenDialog, function(index, value) {
      var dialogIdToShow = value.getAttribute("data-mdl-on-click-open-dialog-id");
      var dialogToShow = document.querySelector("#" + dialogIdToShow);
      value.addEventListener('click', function() {
        dialogToShow.showModal();
      });
    });    
      
     var elementsWichCloseDialog =
      document.querySelectorAll("*[data-mdl-on-click-close-dialog-id]");

    // Por cada nodo se añade evento para que al pulsar se abra el dialogo
    forEachNode(elementsWichCloseDialog, function(index, value) {
      var dialogIdToClose = value.getAttribute("data-mdl-on-click-close-dialog-id");
      var dialogToClose = document.querySelector("#" + dialogIdToClose);
      value.addEventListener('click', function() {
        dialogToClose.close();
      });
    });
    
  }

  /**
   * Inicializa las acciones asociadas al mdl-dialog--extended:
   * Asocia los eventos de abrir el dialogo y cerrarlo donde se 
   * encuentre el data-mdl-open-dialgo-id o close correspondiente
   * Esto facilita el desarrollo
   */
  function initializeAdvancedSearchDialog() {

    addShowDialogActionOnClickListener(
      '#advanced-search-dialog', '#searchbox__advanced-search-button');
  }

  /**
   * Ejecuta todo el js necesario para que funcione el diálogo de login cuando
   * se pulsa sobre el menú del usuario en desconectar o cambiar de usuario
   */
  function initializeLoginDialog() {

    addShowDialogActionOnClickListener(
      '#dialog-login', '#show-login-dialog');
    addShowDialogActionOnClickListener(
      '#dialog-login-user-pass', '#show-user-pass-login-dialog');
  }

  /**
   * Para recorrer un NodeList tal como se haría con un array y foreach
   * https://css-tricks.com/snippets/javascript/loop-queryselectorall-matches
   *
   * @param  {NodeList} nodelist lista de nodos tal como lo
   *                             devuelve document.querySelector()
   * @param  {Function} callback función a ejercutar por cada nodo
   * @param  {Object}   scope  (opcional) this que se utiliza para esta función
   */
  function forEachNode(nodelist, callback, scope) {
    for (var i = 0; i < nodelist.length; i++) {
      callback.call(scope, i, nodelist[i]); // passes back stuff we need
    }
  }

  /* Códigos a ejercutar cuando se carga la página */
  // initializeSearchBoxComponent();
  //
  // /* Funciones */
  //
  // function initializeSearchBoxComponent() {
  //   var searchDropdownMenuContent =
  //     document.querySelector('.mdl-searchbox__dropdown__menu__item--content');
  //
  //   searchDropdownMenuContent.addEventListener('click', stopEventPropagation,
  //     false);
  // }
  //
  // function stopEventPropagation(ev) {
  //   ev.stopPropagation();
  // }
}());
