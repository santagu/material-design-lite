(function() {
  'use strict';

  /* Códigos a ejecutar cuando se carga la página */
  initializeListDetailDialog();
  initializeLoginDialog();

  /************************ Funciones *************************************/

  /**
   * Ejecuta todo el javascrit necesario para que funcione correctamente
   * diálogo de detalle del listado. Cuando se pulsa sobre una fila de un
   * listado se debe abrir un dialogo con el detalle.
   */
  function initializeListDetailDialog() {

    var listDetailDialog = document.querySelector('#dialog-list-detail-1');
    var showListDetailDialogButton =
      document.querySelector('#show-dialog-list-detail-1');

    if (!listDetailDialog.showModal) {
      dialogPolyfill.registerDialog(listDetailDialog);
    }
    showListDetailDialogButton.addEventListener('click', function() {
      listDetailDialog.showModal();
    });
  }

  /**
   * Ejecuta todo el js necesario para que funcione el diálogo de login cuando
   * se pulsa sobre el menú del usuario en desconectar o cambiar de usuario
   */
  function initializeLoginDialog() {
    var loginDialog = document.querySelector('#dialog-login');
    var showLoginDialogButton = document.querySelector('#show-login-dialog');
    if (!loginDialog.showModal) {
      dialogPolyfill.registerDialog(loginDialog);
    }
    showLoginDialogButton.addEventListener('click', function() {
      loginDialog.showModal();
    });

    var userPassLoginDialog = document.querySelector('#dialog-login-user-pass');
    var showuserPassLoginDialogButton =
      document.querySelector('#show-user-pass-login-dialog');
    if (!userPassLoginDialog.showModal) {
      dialogPolyfill.registerDialog(userPassLoginDialog);
    }
    showuserPassLoginDialogButton.addEventListener('click', function() {
      loginDialog.close();
      userPassLoginDialog.showModal();
    });
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
