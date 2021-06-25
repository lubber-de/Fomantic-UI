/*!
 * # Fomantic-UI - Nag
 * http://github.com/fomantic/Fomantic-UI/
 *
 *
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ($, window, document, undefined) {

'use strict';

$.isFunction = $.isFunction || function(obj) {
  return typeof obj === "function" && typeof obj.nodeType !== "number";
};

window = (typeof window != 'undefined' && window.Math == Math)
  ? window
  : (typeof self != 'undefined' && self.Math == Math)
    ? self
    : Function('return this')()
;

$.fn.nag = function(parameters) {
  var
    $allModules    = $(this),
    moduleSelector = $allModules.selector || '',

    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),
    returnedValue
  ;
  $allModules
    .each(function() {
      var
        settings          = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.nag.settings, parameters)
          : $.extend({}, $.fn.nag.settings),

        selector        = settings.selector,
        error           = settings.error,
        namespace       = settings.namespace,

        eventNamespace  = '.' + namespace,
        moduleNamespace = namespace + '-module',

        $module         = $(this),

        $context        = (settings.context)
          ? $(settings.context)
          : $('body'),

        element         = this,
        instance        = $module.data(moduleNamespace),
        storage,
        module
      ;
      module = $.extend({

        initialize: function() {
          module.verbose('Initializing element');
          storage = module.get.storage();
          $module
            .on('click' + eventNamespace, selector.close, module.dismiss)
            .data(moduleNamespace, module)
          ;

          if(settings.detachable && $module.parent()[0] !== $context[0]) {
            $module
              .detach()
              .prependTo($context)
            ;
          }

          if(settings.displayTime > 0) {
            setTimeout(module.hide, settings.displayTime);
          }
          module.show();
        },

        destroy: function() {
          module.verbose('Destroying instance');
          $module
            .removeData(moduleNamespace)
            .off(eventNamespace)
          ;
        },

        show: function() {
          if( module.should.show() && !$module.is(':visible') ) {
            if(settings.onShow.call(element) === false) {
              module.debug('onShow callback returned false, cancelling nag animation');
              return false;
            }
            module.debug('Showing nag', settings.animation.show);
            if(settings.animation.show === 'fade') {
              $module
                .fadeIn(settings.duration, settings.easing, settings.onVisible)
              ;
            }
            else {
              $module
                .slideDown(settings.duration, settings.easing, settings.onVisible)
              ;
            }
          }
        },

        hide: function() {
          if(settings.onHide.call(element) === false) {
            module.debug('onHide callback returned false, cancelling nag animation');
            return false;
          }
          module.debug('Hiding nag', settings.animation.hide);
          if(settings.animation.hide === 'fade') {
            $module
              .fadeOut(settings.duration, settings.easing, settings.onHidden)
            ;
          }
          else {
            $module
              .slideUp(settings.duration, settings.easing, settings.onHidden)
            ;
          }
        },

        dismiss: function(event) {
          if(module.hide() !== false && settings.storageMethod) {
            module.debug('Dismissing nag', settings.storageMethod, settings.key, settings.value, settings.expires);
            module.storage.set(settings.key, settings.value);
          }
          event.stopImmediatePropagation();
          event.preventDefault();
        },

        should: {
          show: function() {
            if(settings.persist) {
              module.debug('Persistent nag is set, can show nag');
              return true;
            }
            if( module.storage.get(settings.key) != settings.value.toString() ) {
              module.debug('Stored value is not set, can show nag', module.storage.get(settings.key));
              return true;
            }
            module.debug('Stored value is set, cannot show nag', module.storage.get(settings.key));
            return false;
          }
        },

        get: {
          expirationDate: function(expires) {
            if (typeof expires === 'number') {
              expires = new Date(Date.now() + expires * 864e5);
            }
            if(expires instanceof Date && expires.getTime() ){
              return expires.toUTCString();
            } else {
              module.error(error.expiresFormat);
            }
          },
          storage: function(){
            if(settings.storageMethod === 'localstorage' && window.localStorage !== undefined) {
              module.debug('Using local storage');
              return window.localStorage;
            }
            else if(settings.storageMethod === 'sessionstorage' && window.sessionStorage !== undefined) {
              module.debug('Using session storage');
              return window.sessionStorage;
            }
            else if("cookie" in document) {
              module.debug('Using cookie');
              return {
                setItem: function(key, value, options) {
                  // RFC6265 compliant encoding
                  key   = encodeURIComponent(key)
                      .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
                      .replace(/[()]/g, escape);
                  value = encodeURIComponent(value)
                      .replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g, decodeURIComponent);

                  var cookieOptions = '';
                  for (var option in options) {
                    if (options.hasOwnProperty(option)) {
                      cookieOptions += '; ' + option;
                      if (typeof options[option] === 'string') {
                        cookieOptions += '=' + options[option].split(';')[0];
                      }
                    }
                  }
                  document.cookie = key + '=' + value + cookieOptions;
                },
                getItem: function(key) {
                  var cookies = document.cookie.split('; ');
                  for (var i = 0, il = cookies.length; i < il; i++) {
                    var parts    = cookies[i].split('='),
                        foundKey = parts[0].replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
                    if (key === foundKey) {
                      return parts[1] || '';
                    }
                  }
                },
                removeItem: function(key, options) {
                  storage.setItem(key,'',options);
                }
              };
            } else {
              module.error(error.noStorage);
            }
          },
          storageOptions: function() {
            var
              options = {}
            ;
            if(settings.expires) {
              options.expires = module.get.expirationDate(settings.expires);
            }
            if(settings.domain) {
              options.domain = settings.domain;
            }
            if(settings.path) {
              options.path = settings.path;
            }
            if(settings.secure) {
              options.secure = settings.secure;
            }
            if(settings.samesite) {
              options.samesite = settings.samesite;
            }
            return options;
          }
        },

        clear: function() {
          module.storage.remove(settings.key);
        },

        storage: {
          set: function(key, value) {
            var
              options = module.get.storageOptions()
            ;
            if(storage === window.localStorage && options.expires) {
              module.debug('Storing expiration value in localStorage', key, options.expires);
              storage.setItem(key + settings.expirationKey, options.expires );
            }
            module.debug('Value stored', key, value);
            try {
              storage.setItem(key, value, options);
            }
            catch(e) {
              module.error(error.setItem, e);
            }
          },
          get: function(key) {
            var
              storedValue
            ;
            storedValue = storage.getItem(key);
            if(storage === window.localStorage) {
              var expiration = storage.getItem(key + settings.expirationKey);
              if(expiration !== null && expiration !== undefined && new Date(expiration) < new Date()) {
                module.debug('Value in localStorage has expired. Deleting key', key);
                module.storage.remove(key);
                storedValue = null;
              }
            }
            if(storedValue == 'undefined' || storedValue == 'null' || storedValue === undefined || storedValue === null) {
              storedValue = undefined;
            }
            return storedValue;
          },
          remove: function(key) {
            var
              options = module.get.storageOptions()
            ;
            options.expires = module.get.expirationDate(-1);
            if(storage === window.localStorage) {
              storage.removeItem(key + settings.expirationKey);
            }
            storage.removeItem(key, options);
          }
        }
      }, semantic.commonMethods);

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.nag.settings = $.extend({

  name        : 'Nag',

  silent      : false,
  debug       : false,
  verbose     : false,
  performance : true,

  namespace   : 'Nag',

  // allows cookie to be overridden
  persist     : false,

  // set to zero to require manually dismissal, otherwise hides on its own
  displayTime : 0,

  animation   : {
    show : 'slide',
    hide : 'slide'
  },

  context       : false,
  detachable    : false,

  expires       : 30,

// cookie storage only options
  domain        : false,
  path          : '/',
  secure        : false,
  samesite      : false,

  // type of storage to use
  storageMethod : 'cookie',

  // value to store in dismissed localstorage/cookie
  key           : 'nag',
  value         : 'dismiss',

// Key suffix to support expiration in localstorage
  expirationKey : 'ExpirationDate',

  error: {
    noStorage       : 'Unsupported storage method',
    method          : 'The method you called is not defined.',
    setItem         : 'Unexpected error while setting value',
    expiresFormat   : '"expires" must be a number of days or a Date Object'
  },

  className     : {
    bottom : 'bottom',
    fixed  : 'fixed'
  },

  selector      : {
    close : '> .close.icon'
  },

  duration      : 500,
  easing        : 'easeOutQuad',

  // callback before show animation, return false to prevent show
  onShow        : function() {},

  // called after show animation
  onVisible     : function() {},

  // callback before hide animation, return false to prevent hide
  onHide        : function() {},

  // callback after hide animation
  onHidden      : function() {}

}, semantic.commonSettings);

// Adds easing
$.extend( $.easing, {
  easeOutQuad: function (x, t, b, c, d) {
    return -c *(t/=d)*(t-2) + b;
  }
});

})( jQuery, window, document );
