/*!
 * # Fomantic-UI - Common Methods and settings
 * http://github.com/fomantic/Fomantic-UI/
 *
 *
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

window.semantic = window.semantic || {};
semantic.commonMethods = {
  setting: function(name, value) {
    module.debug('Changing setting', name, value);
    if( $.isPlainObject(name) ) {
      $.extend(true, settings, name);
    }
    else if(value !== undefined) {
      if($.isPlainObject(settings[name])) {
        $.extend(true, settings[name], value);
      }
      else {
        settings[name] = value;
      }
    }
    else {
      return settings[name];
    }
  },
  internal: function(name, value) {
    if( $.isPlainObject(name) ) {
      $.extend(true, module, name);
    }
    else if(value !== undefined) {
      module[name] = value;
    }
    else {
      return module[name];
    }
  },
  debug: function() {
    if(!settings.silent && settings.debug) {
      if(settings.performance) {
        module.performance.log(arguments);
      }
      else {
        module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
        module.debug.apply(console, arguments);
      }
    }
  },
  verbose: function() {
    if(!settings.silent && settings.verbose && settings.debug) {
      if(settings.performance) {
        module.performance.log(arguments);
      }
      else {
        module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
        module.verbose.apply(console, arguments);
      }
    }
  },
  error: function() {
    if(!settings.silent) {
      module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
      module.error.apply(console, arguments);
    }
  },
  performance: {
    log: function(message) {
      var
      currentTime,
          executionTime,
          previousTime
      ;
      if(settings.performance) {
        currentTime   = new Date().getTime();
        previousTime  = time || currentTime;
        executionTime = currentTime - previousTime;
        time          = currentTime;
        performance.push({
          'Name'           : message[0],
          'Arguments'      : [].slice.call(message, 1) || '',
          'Element'        : element,
          'Execution Time' : executionTime
        });
      }
      clearTimeout(module.performance.timer);
      module.performance.timer = setTimeout(module.performance.display, 500);
    },
    display: function() {
      var
      title = settings.name + ':',
          totalTime = 0
      ;
      time = false;
      clearTimeout(module.performance.timer);
      $.each(performance, function(index, data) {
        totalTime += data['Execution Time'];
      });
      title += ' ' + totalTime + 'ms';
      if(moduleSelector) {
        title += ' \'' + moduleSelector + '\'';
      }
      if($allModules.length > 1) {
        title += ' ' + '(' + $allModules.length + ')';
      }
      if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
        console.groupCollapsed(title);
        if(console.table) {
          console.table(performance);
        }
        else {
          $.each(performance, function(index, data) {
            console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
          });
        }
        console.groupEnd();
      }
      performance = [];
    }
  },
  invoke: function(query, passedArguments, context) {
    var
    object = instance,
        maxDepth,
        found,
        response
    ;
    passedArguments = passedArguments || queryArguments;
    context         = element         || context;
    if(typeof query == 'string' && object !== undefined) {
      query    = query.split(/[\. ]/);
      maxDepth = query.length - 1;
      $.each(query, function(depth, value) {
        var camelCaseValue = (depth != maxDepth)
        ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
        : query
        ;
        if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
          object = object[camelCaseValue];
        }
        else if( object[camelCaseValue] !== undefined ) {
          found = object[camelCaseValue];
          return false;
        }
        else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
          object = object[value];
        }
        else if( object[value] !== undefined ) {
          found = object[value];
          return false;
        }
        else {
          return false;
        }
      });
    }
    if ( $.isFunction( found ) ) {
      response = found.apply(context, passedArguments);
    }
    else if(found !== undefined) {
      response = found;
    }
    if(Array.isArray(returnedValue)) {
      returnedValue.push(response);
    }
    else if(returnedValue !== undefined) {
      returnedValue = [returnedValue, response];
    }
    else if(response !== undefined) {
      returnedValue = response;
    }
    return found;
  }
};
semantic.commonSettings = {
  silent                 : false,
  debug                  : false,
  verbose                : false,
  performance            : true
};
