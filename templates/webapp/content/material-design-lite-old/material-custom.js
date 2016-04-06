(function() {
    'use strict';

    /* Código de inicialización */
    initializeSearchBoxComponent();

    /* Funciones */

    function initializeSearchBoxComponent() {
        var searchDropdownMenuContent = document.querySelector('.mdl-searchbox__dropdown__menu__item--content');

        searchDropdownMenuContent.addEventListener('click', stopEventPropagation, false);
    }

    function stopEventPropagation(ev) {
        ev.stopPropagation();
    }

}());
