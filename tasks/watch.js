/*******************************
 *          Watch Task
 *******************************/

const
    // node dependencies
    console    = require('@fomantic/better-console'),

    // user config
    config     = require('./config/user'),

    // task config
    install    = require('./config/project/install'),

    css        = require('./build/css'),
    js         = require('./build/javascript'),
    assets     = require('./build/assets')
;

// export task
module.exports = function (callback) {
    if (!install.isSetup()) {
        console.error('Cannot watch files. Run "gulp install" to set-up Fomantic');
        callback();

        return;
    }

    console.clear();
    console.log('Watching source files for changes');

    /* --------------
        Watch CSS
    --------------- */
    css.watch('default', config);

    /* --------------
        Watch JS
    --------------- */

    js.watch('default', config);

    /* --------------
       Watch Assets
    --------------- */

    assets.watch('default', config);

    callback();
};
