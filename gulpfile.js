var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    sass = require('gulp-sass'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    clean = require('gulp-clean'),
    runSequence = require('run-sequence'),
    mainBowerFiles = require('gulp-main-bower-files'),
    gulpFilter = require('gulp-filter');


// Lint Task
gulp.task('lint', function () {
    return gulp.src('app/js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Compile Our Sass - future ;)
gulp.task('sass', function () {
    return gulp.src('scss/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('dist/app/css'));
});

gulp.task('clean', function () {
    return gulp.src('dist', {read: false})
        .pipe(clean());
});

// Concatenate & Minify JS
//TODO: minify uglify after react refactor
gulp.task('scripts', function () {
    return gulp.src('app/js/*.js')
        .pipe(concat('flow.js'))
        .pipe(gulp.dest('dist'))
        .pipe(rename('flow.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist/app/js'));
});

// Copy html resources
gulp.task('html-copy', function () {
    return gulp.src('app/**/*.html')
        .pipe(gulp.dest('dist/app'));
});

//TODO: remove after sass impl
gulp.task('css-copy', function () {
    return gulp.src('app/css/**')
        .pipe(gulp.dest('dist/app/css'));
});

// Copy js files
gulp.task('js-copy', function () {
    return gulp.src('app/js/**')
        .pipe(gulp.dest('dist/app/js'));
});

//TODO: can't remove - some libs doesn't exist in bower repo
gulp.task('libs-copy', function () {
    return gulp.src('app/libs/**')
        .pipe(gulp.dest('dist/app/libs'));
});

// Watch Files For Changes
gulp.task('watch', function () {
    gulp.watch('js/*.js', ['lint', 'scripts']);
    gulp.watch('scss/*.scss', ['sass']);
});

gulp.task('main-bower-files', function () {
    var filterJS = gulpFilter('**/*.js', {restore: true});
    return gulp.src('./bower.json')
        .pipe(mainBowerFiles({
            overrides: {
                bootstrap: {
                    main: [
                        './dist/js/bootstrap.js',
                        './dist/css/*.min.*',
                        './dist/fonts/*.*'
                    ]
                },
                'bootstrap-slider': {
                    main: [
                        './bootstrap-slider.js',
                        './slider.css'
                    ]
                }
            }
        }))
        .pipe(filterJS)
        .pipe(concat('vendor.js'))
        .pipe(uglify())
        .pipe(filterJS.restore)
        .pipe(gulp.dest('dist/app/libs'));
});


// Default Task
gulp.task('default', function () {
    runSequence(
        'clean',
        [
            'html-copy',
            'css-copy',
            'libs-copy',
            'js-copy'],
        'main-bower-files');
});