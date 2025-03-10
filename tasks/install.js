/*******************************
 *         Install Task
 *******************************/

/*
   Install tasks

   For more notes

   * (NPM) Install - Will ask for where to put fomantic (outside pm folder)
   * (NPM) Upgrade - Will look for fomantic install, copy over files and update if new version
   * Standard installer runs asking for paths to site files etc.
*/

const
    // node dependencies
    fs             = require('fs-extra'),
    path           = require('path'),
    extend         = require('extend'),
    console        = require('@fomantic/better-console'),
    gulp           = require('gulp'),

    // gulp dependencies
    jsonEditor     = require('gulp-json-editor'),
    plumber        = require('@fomantic/gulp-plumber'),
    inquirer       = require('inquirer'),
    rename         = require('gulp-rename'),
    replace        = require('gulp-replace'),
    requireDotFile = require('require-dot-file'),
    wrench         = require('wrench-sui'),

    // install config
    install        = require('./config/project/install'),

    // release config (name/title/etc)
    release        = require('./config/project/release'),

    // shorthand
    questions      = install.questions,
    files          = install.files,
    folders        = install.folders,
    regExp         = install.regExp,
    settings       = install.settings,
    source         = install.source
;

// Export install task
module.exports = function (callback) {
    let
        currentConfig = requireDotFile('semantic.json', process.cwd()),
        manager       = install.getPackageManager(),
        rootQuestions = questions.root,
        installFolder = false,
        answers
    ;

    console.clear();

    /* Test NPM install
    manager = {
        name: 'NPM',
        root: path.normalize(__dirname + '/../'),
    }; */

    /* Don't do end user config if FUI is a sub-module */
    if (install.isSubModule()) {
        console.info('FUI is a sub-module, skipping end-user install');
        callback();

        return;
    }

    if (!fs.pathExistsSync(source.site)) {
        console.log('Missing _site folder. \u001B[92mgulp install\u001B[0m must run inside \u001B[92mnode_modules' + path.sep + 'fomantic-ui\u001B[0m');
        console.error('Aborting.');
        callback();

        return;
    }

    /* -----------------
        Update FUI
    ----------------- */

    // run update scripts if semantic.json exists
    if (currentConfig && manager.name === 'NPM') {
        let
            updateFolder = path.join(manager.root, currentConfig.base),
            updatePaths  = {
                config: path.join(manager.root, files.config),
                tasks: path.join(updateFolder, folders.tasks),
                overridesImport: path.join(updateFolder, folders.overridesImport),
                themeImport: path.join(updateFolder, folders.themeImport),
                definition: path.join(currentConfig.paths.source.definitions),
                site: path.join(currentConfig.paths.source.site),
                theme: path.join(currentConfig.paths.source.themes),
                defaultTheme: path.join(currentConfig.paths.source.themes, folders.defaultTheme),
            }
        ;

        // duck-type if there is a project installed
        if (fs.pathExistsSync(updatePaths.definition)) {
            // perform update if new version
            if (currentConfig.version !== release.version) {
                console.log('Updating Fomantic UI from ' + currentConfig.version + ' to ' + release.version);

                console.info('Updating ui definitions...');
                wrench.copyDirSyncRecursive(source.definitions, updatePaths.definition, settings.wrench.overwrite);

                console.info('Updating default theme...');
                wrench.copyDirSyncRecursive(source.themes, updatePaths.theme, settings.wrench.merge);
                wrench.copyDirSyncRecursive(source.defaultTheme, updatePaths.defaultTheme, settings.wrench.overwrite);

                console.info('Updating tasks...');
                wrench.copyDirSyncRecursive(source.tasks, updatePaths.tasks, settings.wrench.overwrite);

                console.info('Updating gulpfile.js');
                gulp.src(source.userGulpFile)
                    .pipe(plumber())
                    .pipe(gulp.dest(updateFolder))
                ;

                // copy theme import
                console.info('Updating theme import file');
                gulp.src(source.themeImport)
                    .pipe(plumber())
                    .pipe(gulp.dest(updatePaths.themeImport))
                ;
                console.info('Updating overrides import file');
                gulp.src(source.overridesImport)
                    .pipe(plumber())
                    .pipe(gulp.dest(updatePaths.overridesImport))
                ;
                console.info('Adding new site theme files...');
                wrench.copyDirSyncRecursive(source.site, updatePaths.site, settings.wrench.merge);

                console.info('Updating version...');

                // update version number in semantic.json
                gulp.src(updatePaths.config)
                    .pipe(plumber())
                    .pipe(rename(settings.rename.json)) // preserve file extension
                    .pipe(jsonEditor({
                        version: release.version,
                    }))
                    .pipe(gulp.dest(manager.root))
                ;

                console.info('Update complete! Run "\u001B[92mgulp build\u001B[0m" to rebuild dist/ files.');

                callback();

                return;
            }

            console.log('Current version of Fomantic UI already installed');
            callback();

            return;
        }

        console.error('Cannot locate files to update at path:', updatePaths.definition);
        console.log('Running installer');
    }

    /* --------------
      Determine Root
    --------------- */

    // PM that supports Build Tools (NPM Only Now)
    if (manager.name === 'NPM') {
        rootQuestions[0].message = rootQuestions[0].message
            .replace('{packageMessage}', 'We detected you are using ' + manager.name + ' Nice!')
            .replace('{root}', manager.root)
        ;
        // set default path to the detected PM root
        rootQuestions[0].default = manager.root;
        rootQuestions[1].default = manager.root;

        // insert PM questions after "Install Type" question
        Array.prototype.splice.apply(questions.setup, [2, 0].concat(rootQuestions));

        // omit cleanup questions for managed install
        questions.cleanup = [];
    }

    /* --------------
       Create FUI
    --------------- */

    gulp.task('run setup', function (callback) {
        // If auto-install is switched on, we skip the configuration section and simply reuse the configuration from semantic.json
        if (install.shouldAutoInstall()) {
            answers = {
                overwrite: 'yes',
                install: 'auto',
                useRoot: true,
                semanticRoot: currentConfig.base,
            };
            callback();
        } else {
            return inquirer.prompt(questions.setup)
                .then((setupAnswers) => {
                    // hoist
                    answers = setupAnswers;
                })
            ;
        }
    });

    gulp.task('create install files', function (callback) {
        /* --------------
         Exit Conditions
        --------------- */

        // if config exists and user specifies not to proceed
        if (answers.overwrite !== undefined && answers.overwrite === 'no') {
            callback();

            return;
        }
        console.clear();
        if (install.shouldAutoInstall()) {
            console.log('Auto-Installing (Without User Interaction)');
        } else {
            console.log('Installing');
        }
        console.log('------------------------------');

        /* --------------
             Paths
        --------------- */

        let
            installPaths = {
                config: files.config,
                configFolder: folders.config,
                site: answers.site || folders.site,
                themeConfig: files.themeConfig,
                themeConfigFolder: folders.themeConfig,
            }
        ;

        /* --------------
           NPM Install
        --------------- */

        // Check if PM install
        if (manager && (answers.useRoot || answers.customRoot)) {
            // Set root to the custom root path if set
            if (answers.customRoot) {
                if (answers.customRoot === '') {
                    console.log('Unable to proceed, invalid project root');
                    callback();

                    return;
                }
                manager.root = answers.customRoot;
            }

            // special install paths only for PM install
            installPaths = extend(false, {}, installPaths, {
                definition: folders.definitions,
                overridesImport: folders.overridesImport,
                lessImport: folders.lessImport,
                tasks: folders.tasks,
                theme: folders.themes,
                defaultTheme: path.join(folders.themes, folders.defaultTheme),
                themeImport: folders.themeImport,
            });

            // add project root to semantic root
            installFolder = path.join(manager.root, answers.semanticRoot);

            // add install folder to all output paths
            for (let destination in installPaths) {
                if (Object.prototype.hasOwnProperty.call(installPaths, destination)) {
                    // config goes in project root, rest in install folder
                    installPaths[destination] = destination === 'config' || destination === 'configFolder'
                        ? path.normalize(path.join(manager.root, installPaths[destination]))
                        : path.normalize(path.join(installFolder, installPaths[destination]));
                }
            }

            // create project folders
            try {
                fs.mkdirpSync(installFolder);
                fs.mkdirpSync(installPaths.definition);
                fs.mkdirpSync(installPaths.theme);
                fs.mkdirpSync(installPaths.tasks);
            } catch (error) {
                console.error('NPM does not have permissions to create folders at your specified path. Adjust your folders permissions and run "npm install" again');
            }

            console.log('Installing to \u001B[92m' + answers.semanticRoot + '\u001B[0m');

            console.info('Copying UI definitions');
            wrench.copyDirSyncRecursive(source.definitions, installPaths.definition, settings.wrench.overwrite);

            console.info('Copying UI themes');
            wrench.copyDirSyncRecursive(source.themes, installPaths.theme, settings.wrench.merge);
            wrench.copyDirSyncRecursive(source.defaultTheme, installPaths.defaultTheme, settings.wrench.overwrite);

            console.info('Copying gulp tasks');
            wrench.copyDirSyncRecursive(source.tasks, installPaths.tasks, settings.wrench.overwrite);

            // copy theme import
            console.info('Adding theme files');
            gulp.src(source.themeImport)
                .pipe(plumber())
                .pipe(gulp.dest(installPaths.themeImport))
            ;
            gulp.src(source.overridesImport)
                .pipe(plumber())
                .pipe(gulp.dest(installPaths.overridesImport))
            ;
            gulp.src(source.lessImport)
                .pipe(plumber())
                .pipe(gulp.dest(installPaths.lessImport))
            ;

            // create gulp file
            console.info('Creating gulpfile.js');
            gulp.src(source.userGulpFile)
                .pipe(plumber())
                .pipe(gulp.dest(installFolder))
            ;
        }

        /* --------------
            Site Theme
        --------------- */

        // Copy _site templates folder to destination
        if (fs.pathExistsSync(installPaths.site)) {
            console.info('Site folder exists, merging files (no overwrite)', installPaths.site);
        } else {
            console.info('Creating site theme folder', installPaths.site);
        }
        wrench.copyDirSyncRecursive(source.site, installPaths.site, settings.wrench.merge);

        /* --------------
           Theme Config
        --------------- */

        gulp.task('create theme.config', function () {
            let
                // determine path to site theme folder from theme config
                // force CSS path variable to use forward slashes for paths
                pathToSite   = path.relative(path.resolve(installPaths.themeConfigFolder), path.resolve(installPaths.site)).replace(/\\/g, '/'),
                siteVariable = "@siteFolder: '" + pathToSite + "/';"
            ;

            // rewrite site variable in theme.less
            console.info('Adjusting @siteFolder to:', pathToSite + '/');

            if (fs.pathExistsSync(installPaths.themeConfig)) {
                console.info('Modifying src/theme.config (LESS config)', installPaths.themeConfig);

                return gulp.src(installPaths.themeConfig)
                    .pipe(plumber())
                    .pipe(replace(regExp.siteVariable, siteVariable))
                    .pipe(gulp.dest(installPaths.themeConfigFolder))
                ;
            }

            console.info('Creating src/theme.config (LESS config)', installPaths.themeConfig);

            return gulp.src(source.themeConfig)
                .pipe(plumber())
                .pipe(rename({ extname: '' }))
                .pipe(replace(regExp.siteVariable, siteVariable))
                .pipe(gulp.dest(installPaths.themeConfigFolder))
            ;
        });

        /* --------------
          Semantic.json
        --------------- */

        gulp.task('create semantic.json', function () {
            let
                jsonConfig = install.createJSON(answers)
            ;

            // adjust variables in theme.less
            if (fs.pathExistsSync(installPaths.config)) {
                console.info('Extending config file (semantic.json)', installPaths.config);

                return gulp.src(installPaths.config)
                    .pipe(plumber())
                    .pipe(rename(settings.rename.json)) // preserve file extension
                    .pipe(jsonEditor(jsonConfig))
                    .pipe(gulp.dest(installPaths.configFolder))
                ;
            }

            console.info('Creating config file (semantic.json)', installPaths.config);

            return gulp.src(source.config)
                .pipe(plumber())
                .pipe(rename({ extname: '' })) // remove .template from ext
                .pipe(jsonEditor(jsonConfig, { end_with_newline: true }))
                .pipe(gulp.dest(installPaths.configFolder))
            ;
        });

        gulp.series('create theme.config', 'create semantic.json')(callback);
    });

    gulp.task('clean up install', function (callback) {
        // Completion Message
        if (installFolder && !install.shouldAutoInstall()) {
            console.log('\n Setup Complete! \n Installing Peer Dependencies. \u001B[0;31mPlease refrain from ctrl + c\u001B[0m... \n After completion navigate to \u001B[92m' + answers.semanticRoot + '\u001B[0m and run "\u001B[92mgulp build\u001B[0m" to build');
            callback();
        } else {
            console.log('');
            console.log('');

            // If auto-install is switched on, we skip the configuration section and simply build the dependencies
            if (install.shouldAutoInstall()) {
                gulp.series('build')(callback);
            } else {
                // We don't return the inquirer promise on purpose because we handle the callback ourselves
                inquirer.prompt(questions.cleanup)
                    .then((answers) => {
                        if (answers.cleanup === 'yes') {
                            install.setupFiles.forEach((file) => fs.removeSync(file));
                        }
                        if (answers.build === 'yes') {
                            gulp.series('build')(callback);
                        } else {
                            callback();
                        }
                    })
                ;
            }
        }
    });

    gulp.series('run setup', 'create install files', 'clean up install')(callback);
};
