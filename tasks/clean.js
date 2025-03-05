/*******************************
          Clean Task
*******************************/

const
    fs    = require('fs-extra'),
    config = require('./config/user')
;

// cleans distribution files
module.exports = function () {
    return fs.removeSync(config.paths.clean);
};
