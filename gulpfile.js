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

gulp.task('clean', function () {
    return del(['build/**/*']);
});

gulp.task('deploy:styles', function () {
    return gulp.src('resources/css/*.css', {base: './'})
        .pipe(exClient.newer(targetConfiguration))
        .pipe(exClient.dest(targetConfiguration))
})

// files in project root //

const components = [
    'components/*.html',
    'components/**/*.js'
];

gulp.task('deploy:components', function () {
    return gulp.src(components, {base: './'})
        .pipe(exClient.newer(html5TargetConfiguration))
        .pipe(exClient.dest(html5TargetConfiguration))
})

// extracted for speed of normal development workflow

const bower = 'bower_components/**/*'

gulp.task('deploy:bower', function () {
    return gulp.src(bower, {base: './'})
        .pipe(exClient.newer(html5TargetConfiguration))
        .pipe(exClient.dest(html5TargetConfiguration))
})

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

gulp.task('deploy:other', function () {
    return gulp.src(otherPaths, {base: './'})
        .pipe(exClient.newer(targetConfiguration))
        .pipe(exClient.dest(targetConfiguration))
})

gulp.task('deploy', ['deploy:other', 'deploy:components', 'deploy:styles', 'deploy:bower'])

// it is way faster not to watch bower dependencies due to massive amount of files to watch
gulp.task('watch', ['deploy'], function () {
    gulp.watch('resources/css/!*', ['deploy:styles'])
    gulp.watch(otherPaths, ['deploy:other'])
    gulp.watch(components, ['deploy:components'])
})

// this will wath bower dependencies also
gulp.task('watch:all', ['deploy'], function () {
    gulp.watch('resources/css/!*', ['deploy:styles'])
    gulp.watch(otherPaths, ['deploy:other'])
    gulp.watch(components, ['deploy:components'])
    gulp.watch(bower, ['deploy:bower'])
})

gulp.task('default', ['watch:all'])
