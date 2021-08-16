'use strict';

var gulp = require('gulp'),
    exist = require('@existdb/gulp-exist'),
    del = require('del')

var PRODUCTION = (!!process.env.NODE_ENV || process.env.NODE_ENV === 'production')

console.log('Production? %s', PRODUCTION)

const exClient = exist.createClient({
    host: 'localhost',
    port: '8080',
    path: '/exist/xmlrpc',
    basic_auth: {user: 'admin', pass: ''}
})

const html5TargetConfiguration = {
    target: '/db/apps/ecpo',
    html5AsBinary: true
}

const targetConfiguration = {
    target: '/db/apps/ecpo/',
    html5AsBinary: false
}

function clean () {
    return del(['build/**/*']);
}

function deploy_styles () {
    return gulp.src('resources/css/*.css', {base: './'})
        .pipe(exClient.newer(targetConfiguration))
        .pipe(exClient.dest(targetConfiguration))
}

// files in project root //

const components = [
    'components/*.html',
    'components/**/*.js'
];

function deploy_components () {
    return gulp.src(components, {base: './'})
        .pipe(exClient.newer(html5TargetConfiguration))
        .pipe(exClient.dest(html5TargetConfiguration))
}

// extracted for speed of normal development workflow

const bower = [
    'bower_components/**/*',
    '!bower_components/**/LICENSE',
    '!bower_components/**/COPYING',
    '!bower_components/**/AUTHORS',
    '!bower_components/**/Makefile',
    '!bower_components/**/*.mustache',
    '!bower_components/**/yarn.lock',
    '!bower_components/**/bin/*',
    '!bower_components/**/docs/*',
    '!bower_components/**/man/*',
    '!bower_components/**/test/*',
]

function deploy_bower () {
    return gulp.src(bower, {base: './'})
        .pipe(exClient.newer(html5TargetConfiguration))
        .pipe(exClient.dest(html5TargetConfiguration))
}

const otherPaths = [
    '*.html',
    '*.xql',
    'templates/**/*',
    'transforms/**/*',
    'resources/**/*',
    '!resources/css/*',
    'modules/**/*',
    'components/demo/**'
];

function deploy_other () {
    return gulp.src(otherPaths, {base: './'})
        .pipe(exClient.newer(targetConfiguration))
        .pipe(exClient.dest(targetConfiguration))
}

// this will wath bower dependencies also
function watch_all () {
    gulp.watch('resources/css/!*', deploy_styles)
    gulp.watch(otherPaths, deploy_other)
    gulp.watch(components, deploy_components)
    gulp.watch(bower, deploy_bower)
}

// it is way faster not to watch bower dependencies due to massive amount of files to watch
function watch () {
    gulp.watch('resources/css/!*', deploy_styles)
    gulp.watch(otherPaths, deploy_other)
    gulp.watch(components, deploy_components)
}

const deploy = gulp.parallel(deploy_other, deploy_components, deploy_styles, deploy_bower)

exports.clean = clean
exports.deploy = deploy
exports.watch_all = gulp.series(deploy, watch_all)
exports.watch = gulp.series(deploy, watch)
exports.default = gulp.series(deploy, watch_all)
