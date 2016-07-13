module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		copy: {
			build: {
				cwd: 'src',
				src: ['**', '!**/*.js'],
				dest: 'dist/',
				expand: true
			},
			resources: {
				cwd: 'resources',
				src: ['**'],
				dest: 'dist/',
				expand: true
			},
		},
		clean: {
			build: {
				src: ['dist']
			},
			stylesheets: {
				src: ['dist/**/*.css', '!dist/kanban-flow.css', '!dist/fonts/**', '!dist/libs/**']
			},
			scripts: {
				src: ['dist/**/*.js', '!dist/kanban-flow.js', '!dist/fonts/**', '!dist/libs/**']
			},
		},
		cleanempty: {
		    options: {},
		    src: ['dist/**'],
		},
		uglify: {
			build: {
				options: {
					mangle: false,
					compress: false,
					beautify:true,
				},
				files: {
					'dist/kanban-flow.js': ['src/**/*.js']
				}
			}
		},
		watch: {
			copy: {
				files: ['src/**'],
				tasks: ['build']
			}
		},


	});

	// load the tasks
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-cleanempty');

    grunt.registerTask(
      'scripts', 
      'Compiles the JavaScript files.', 
      [ 'uglify', 'clean:scripts' ]
    );
    grunt.registerTask(
      'build', 
      'Compiles all of the assets and copies the files to the build directory.', 
      [ 'clean:build', 'copy', 'scripts', 'cleanempty' ]
    );

    grunt.registerTask(
      'default', 
      'Watches the project for changes, automatically builds them and runs a server.', 
      [ 'build']
    );

};
