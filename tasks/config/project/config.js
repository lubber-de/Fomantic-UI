/*******************************
            Set-up
*******************************/

const
    fs       = require('fs'),
    path     = require('path'),

    defaults = require('../defaults')
;

/*******************************
            Exports
*******************************/

module.exports = {

    getPath: function (file, directory) {
        let
            configPath,
            walk = function (directory) {
                let
                    nextDirectory = path.resolve(path.join(directory, path.sep, '..')),
                    currentPath   = path.normalize(path.join(directory, file))
                ;
                if (fs.existsSync(currentPath)) {
                    // found the file
                    configPath = path.normalize(directory);
                } else {
                    // reached file system root, let's stop
                    if (nextDirectory === directory) {
                        return;
                    }
                    // otherwise recurse
                    walk(nextDirectory, file);
                }
            }
        ;

        // start the walk from outside require-dot-files directory
        file = file || defaults.files.config;
        directory = directory || path.join(__dirname, path.sep, '..');
        walk(directory);

        return configPath || '';
    },

    // adds additional derived values to a config object
    addDerivedValues: function (config) {
        /* --------------
            File Paths
        --------------- */

        let
            configPath = this.getPath(),
            sourcePaths = {},
            outputPaths = {},
            folder
        ;

        // resolve paths (config location + base + path)
        for (folder in config.paths.source) {
            if (Object.prototype.hasOwnProperty.call(config.paths.source, folder)) {
                sourcePaths[folder] = path.resolve(path.join(configPath, config.base, config.paths.source[folder]));
            }
        }
        for (folder in config.paths.output) {
            if (Object.prototype.hasOwnProperty.call(config.paths.output, folder)) {
                outputPaths[folder] = path.resolve(path.join(configPath, config.base, config.paths.output[folder]));
            }
        }

        // set config paths to full paths
        config.paths.source = sourcePaths;
        config.paths.output = outputPaths;

        // resolve "clean" command path
        config.paths.clean = path.resolve(path.join(configPath, config.base, config.paths.clean));

        /* --------------
             CSS URLs
        --------------- */

        // determine asset paths in CSS by finding relative path between themes and output
        // force forward slashes

        config.paths.assets = {
            source: '../../themes', // source asset path is always the same
            uncompressed: './' + path.relative(config.paths.output.uncompressed, config.paths.output.themes).replace(/\\/g, '/'),
            compressed: './' + path.relative(config.paths.output.compressed, config.paths.output.themes).replace(/\\/g, '/'),
            packaged: './' + path.relative(config.paths.output.packaged, config.paths.output.themes).replace(/\\/g, '/'),
        };

        /* --------------
            Permission
        --------------- */

        if (config.permission) {
            config.hasPermissions = true;
            config.parsedPermissions = typeof config.permission === 'string' ? parseInt(config.permission, 8) : config.permission;
        } else {
            // pass a blank object to avoid causing errors
            config.permission = {};
            config.hasPermissions = false;
            config.parsedPermissions = {};
        }

        /* --------------
             Globs
        --------------- */

        if (!config.globs) {
            config.globs = {};
        }

        // remove duplicates from the component array
        if (Array.isArray(config.components)) {
            config.components = config.components.filter(function (component, index) {
                return config.components.indexOf(component) === index;
            });
        }

        const components = Array.isArray(config.components) && config.components.length > 0
            ? config.components
            : defaults.components;
        const individuals =  Array.isArray(config.individuals) && config.individuals.length > 0
            ? config.individuals
            : [];
        const componentsExceptIndividuals = components.filter((component) => !individuals.includes(component));

        // takes the component object and creates file glob matching selected components
        config.globs.components = componentsExceptIndividuals.length === 1 ? componentsExceptIndividuals[0] : '{' + componentsExceptIndividuals.join(',') + '}';

        // components that should be built, but excluded from main .css/.js files
        config.globs.individuals = individuals.length === 1
            ? individuals[0]
            : (individuals.length > 1
                ? '{' + individuals.join(',') + '}'
                : undefined);
    },

};
