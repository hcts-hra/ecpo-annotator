'use strict';

var gulp = require('gulp'),
    exist = require('gulp-exist'),
    del = require('del')

var PRODUCTION = (!!process.env.NODE_ENV || process.env.NODE_ENV === 'production')

console.log('Production? %s', PRODUCTION)

exist.defineMimeTypes({
    'application/xml': ['odd']
})

var exClient = exist.createClient({
    host: 'localhost',
    port: '8080',
    path: '/exist/xmlrpc',
    basic_auth: {user: 'admin', pass: ''}
})

var html5TargetConfiguration = {
    target: '/db/apps/ecpo',
    html5AsBinary: true
}

var targetConfiguration = {
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

var components = [
    'components/*.html',
    'components/**/*.js',
    // 'bower_components/**/*'
];

gulp.task('deploy:components', function () {
    return gulp.src(components, {base: './'})
        .pipe(exClient.newer(html5TargetConfiguration))
        .pipe(exClient.dest(html5TargetConfiguration))
})

var otherPaths = [
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

gulp.task('deploy', ['deploy:other', 'deploy:components', 'deploy:styles'])

gulp.task('watch', ['deploy'], function () {
    gulp.watch('resources/css/!*', ['deploy:styles'])
    gulp.watch(otherPaths, ['deploy:other'])
    gulp.watch(components, ['deploy:components'])
})

gulp.task('default', ['watch'])
