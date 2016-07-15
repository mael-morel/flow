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
				{name: "input", queue: true, label: "Backlog", cfdLabel: "Backlog", cfdShortLabel: "Bl"},
				{name: "analysis", queue: false, label: "Doing", cfdLabel: "Analysis", cfdShortLabel: "An"},
				{name: "analysisDone", queue: true, label: "Done", cfdLabel: "Analysis Done", cfdShortLabel: "An Done"},
				{name: "development", queue: false, label: "Doing", cfdLabel: "Development", cfdShortLabel: "Dev"},
				{name: "developmentDone", queue: true, label: "Done", cfdLabel: "Development Done", cfdShortLabel: "Dev Done"},
				{name: "qa", queue: false, label: "Doing", cfdLabel: "QA", cfdShortLabel: "QA"},
				{name: "qaDone", queue: true, label: "Done", cfdLabel: "QA Done", cfdShortLabel: "QA Done"},
				{name: "deployment", queue: false, label: "Doing", cfdLabel: "Deployment", cfdShortLabel: "Depl"},
				{name: "deploymentDone", queue: true, label: "Done", cfdLabel: "Deployment Done", cfdShortLabel: "Depl Done", ignoreLimit: true},
				{name: "analysisWithQueue", label: "Analysis", children: ["analysis", "analysisDone"]},
				{name: "developmentWithQueue", label: "Development", children: ["development", "developmentDone"]},
				{name: "qaWithQueue", label: "QA", children: ["qa", "qaDone"]},
				{name: "deploymentWithQueue", label: "Deployment", children: ["deployment", "deploymentDone"]},
			],
			limits: {
				input: null,
				analysis: null,
				analysisDone: null,
				analysisWithQueue: 5,
				development: null,
				developmentDone: null,
				developmentWithQueue: 5,
				qa: null,
				qaDone: null,
				qaWithQueue: 3,
				deployment: 5,
			},
		},
		team: {
			workingOutOfSpecialisationCoefficient: 50,
			analysis: {
				headcount: 2,
				columns: ['analysis'],
			},
			development: {
				headcount: 5,
				columns: ['development'],
			},
			qa: {
				headcount: 3,
				columns: ['qa'],
			},
			deployment: {
				headcount: 1,
				columns: ['deployment'],
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
						analysis: 2,
						development: 7,
						qa: 4,
						deployment: 1,
					},
					normal: {
						analysis: 2,
						development: 7,
						qa: 4,
						deployment: 1,
						"analysis-variation": 2,
						"development-variation": 4,
						"qa-variation": 3,
						"deployment-variation": 2,
					},
					tshirt: {
						analysis: 14,
						development: 50,
						qa: 28,
						deployment: 8,
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
			var columnDefinitions = this.data.columns.definitions;
			$.extend(this.data, externalConfig);
			this.data.columns.definitions = columnDefinitions;
		}.bind(this),
		2: function(externalConfig){
			$.extend(this.data, externalConfig);
		}.bind(this),
	};
	this.loadExternalConfig = function(externalConfig) {
		var version = externalConfig.version;
		if (!version) version = 1;
		this.loaders[version](externalConfig);
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
		var value = enclosingObject[path[path.length - 1]];
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
}