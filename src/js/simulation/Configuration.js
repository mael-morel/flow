function Configuration(externalConfig) {
	this.data = {
		version: 2,
		maxTasksOnOnePerson: 2,
		maxPeopleOnOneTask: 2,
		stats: {
			noOfDaysForMovingAverage: 5,
		},
		columns: {
			prioritisationStrategy: "fifo",
			definitions: [
				{name: "col0", queue: true, label: "Backlog", cfdLabel: "Backlog", cfdShortLabel: "Bl"},
				{name: "col1", queue: false, label: "Doing", cfdLabel: "Analysis", cfdShortLabel: "An"},
				{name: "col2", queue: true, label: "Done", cfdLabel: "Analysis Done", cfdShortLabel: "An Done"},
				{name: "col3", queue: false, label: "Doing", cfdLabel: "Development", cfdShortLabel: "Dev"},
				{name: "col4", queue: true, label: "Done", cfdLabel: "Development Done", cfdShortLabel: "Dev Done"},
				{name: "col5", queue: false, label: "Doing", cfdLabel: "QA", cfdShortLabel: "QA"},
				{name: "col6", queue: true, label: "Done", cfdLabel: "QA Done", cfdShortLabel: "QA Done"},
				{name: "col7", queue: false, label: "Doing", cfdLabel: "Deployment", cfdShortLabel: "Depl"},
				{name: "col8", queue: true, label: "Done", cfdLabel: "Deployment Done", cfdShortLabel: "Depl Done", ignoreLimit: true},
				{name: "colgrp0", label: "Analysis", children: ["col1", "col2"]},
				{name: "colgrp1", label: "Development", children: ["col3", "col4"]},
				{name: "colgrp2", label: "QA", children: ["col5", "col6"]},
				{name: "colgrp3", label: "Deployment", children: ["col7", "col8"]},
			],
			limits: {
				col0: null,
				col1: null,
				col2: null,
				colgrp0: 5,
				col3: null,
				col4: null,
				colgrp1: 5,
				col5: null,
				col6: null,
				colgrp2: 3,
				col7: 5,
			},
		},
		team: {
			workingOutOfSpecialisationCoefficient: 50,
			col1: {
				headcount: 2,
				columns: ['col1'],
			},
			col3: {
				headcount: 5,
				columns: ['col3'],
			},
			col5: {
				headcount: 3,
				columns: ['col5'],
			},
			col7: {
				headcount: 1,
				columns: ['col7'],
			},
		},
		tasks: {
			arrivalStrategy: {
				current: "up-to-limit",
				configs: {
					scrum: {
						length: 10,
						tasks: 55,
						"include-existing": false,
					},
					"constant-push": {
						demand: 5.5,
					},
					"random-push": {
						demand: 5.5,
						"batch-size": 1,
					}
				}
			},
			sizeStrategy: {
				current: "constant",
				configs: {
					constant: {
						col1: 2,
						col3: 7,
						col5: 4,
						col7: 1,
					},
					normal: {
						col1: 2,
						col3: 7,
						col5: 4,
						col7: 1,
						"col1-variation": 2,
						"col3-variation": 4,
						"col5-variation": 3,
						"col7-variation": 2,
					},
					tshirt: {
						col1: 14,
						col3: 50,
						col5: 28,
						col7: 8,
						"small-probability": 45,
						"medium-probability": 30,
						"large-probability": 20,
						"xlarge-probability": 5,
						"small-effort": 3,
						"medium-effort": 10,
						"large-effort": 25,
						"xlarge-effort": 75,
					}
				}
			}
		}
	}
	
	this.loaders = {
		1: function(externalConfig) {
			var columnDefinitions = historicalConfigs[2].columns.definitions;
			externalConfig.columns.definitions = columnDefinitions;
			externalConfig.version = 2;
		}.bind(this),
	};
	this.loadExternalConfig = function(externalConfig) {
		if (!externalConfig || Object.keys(externalConfig).length == 0) return;
		var version = externalConfig.version;
		if (!version) version = 1;
		while (version != 2) {
			this.loaders[version](externalConfig);
			version = externalConfig.version;
		}
		$.extend(this.data, externalConfig);
	}
	this.loadExternalConfig(externalConfig);
		
	this.listeners = {};
	this.listenersAfter = {};
	this.listenersActive = true;
	this.cache = {};
	
	this.set = function(property, newValue) {
		this.cache = {};
		var path = property.split(".");
		var enclosingObject = this.data;
		for (var i=0; i < path.length - 1; i++) {
			enclosingObject = enclosingObject[path[i]];
		}
		var oldValue = enclosingObject[path[path.length - 1]];
		enclosingObject[path[path.length - 1]] = newValue;
		if (this.listenersActive && oldValue != newValue) {
			var launchListeners = function(list) {
				if (list[property]) {
					for (var i=0; i<list[property].length; i++) {
						list[property][i](newValue, property);
					}
				}
			}
			launchListeners(this.listeners);
			launchListeners(this.listenersAfter);
		}
	}
	this.get = function(property) {
		var cached = this.cache[property];
		if (cached != undefined) {
			return cached;
		} 
		var path = property.split(".");
		var enclosingObject = this.data;
		for (var i=0; i < path.length - 1; i++) {
			enclosingObject = enclosingObject[path[i]];
		}
		var value = enclosingObject ? enclosingObject[path[path.length - 1]] : undefined;
		this.cache[property] = value;
		return value;
	}
	this.onChange = function(property, listenerFun) {
		this._onChange(property, listenerFun, this.listeners);
	}
	this.afterChange = function(property, listenerFun) {
		this._onChange(property, listenerFun, this.listenersAfter);
	}
	this._onChange = function(property, listenerFun, list) {
		var listenersForProperty = list[property];
		if (!listenersForProperty) {
			listenersForProperty = [];
			list[property] = listenersForProperty;
		}
		listenersForProperty.push(listenerFun);
	}
	
	this.pauseListeners = function() {
		this.listenersActive = false;
	}
	this.activateListeners = function() {
		this.listenersActive = true;
	}
	this.clearListeners = function() {
		this.listeners = {};
		this.listenersAfter = {};
	}
	this.getActiveStates = function() {
		var definitions = this.get("columns.definitions");
		var activeColumnNames = [];
		definitions.forEach(function(element) {
			if (!element.queue && (!element.children || element.children.length == 0)) {
				activeColumnNames.push(element.name);
			}
		});
		return activeColumnNames;
	}
}