function Configuration(externalConfig) {
    this.data = {
        version: 3,
        maxTasksOnOnePerson: 2,
        maxPeopleOnOneTask: 2,
        stats: {
            noOfDaysForMovingAverage: 5,
        },
        columns: {
            prioritisationStrategy: "fifo",
            definitions: [
                {name: "col0", queue: true, label: "Backlog", cfdLabel: "Backlog"},
                {name: "col1", queue: false, label: "Doing", cfdLabel: "Analysis"},
                {name: "col2", queue: true, label: "Done", cfdLabel: "Analysis Done"},
                {name: "col3", queue: false, label: "Doing", cfdLabel: "Development"},
                {name: "col4", queue: true, label: "Done", cfdLabel: "Development Done"},
                {name: "col5", queue: false, label: "Doing", cfdLabel: "QA"},
                {name: "col6", queue: true, label: "Done", cfdLabel: "QA Done"},
                {name: "col7", queue: false, label: "Deployment", cfdLabel: "Deployment"},
                {name: "col8", queue: true, label: "Done", cfdLabel: "Done", ignoreLimit: true},
                {name: "colgrp0", label: "Analysis", children: ["col1", "col2"]},
                {name: "colgrp1", label: "Development", children: ["col3", "col4"]},
                {name: "colgrp2", label: "QA", children: ["col5", "col6"]},
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
        team: [
            {name: "Analyst", productivity: {col1: 100, col3: 0, col5: 0, col7: 0}, count: 2},
            {name: "Developer", productivity: {col1: 0, col3: 100, col5: 0, col7: 0}, count: 5},
            {name: "Tester", productivity: {col1: 0, col3: 0, col5: 100, col7: 0}, count: 3},
            {name: "DevOps", productivity: {col1: 0, col3: 0, col5: 0, col7: 100}, count: 1},
        ],
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
        1: function (externalConfig) {
            var columnDefinitions = historicalConfigs[2].columns.definitions;
            externalConfig.columns.definitions = columnDefinitions;
            externalConfig.version = 2;
        }.bind(this),
        2: function (externalConfig) {
            if (externalConfig.columns.definitions[0].name == "input") {
                externalConfig.columns.definitions = historicalConfigs[3].columns.definitions;
                var limits = {};
                var limitsKeys = Object.keys(externalConfig.columns.limits);
                var dictionary = {
                    input: "col0",
                    analysis: "col1",
                    analysisDone: "col2",
                    analysisWithQueue: "colgrp0",
                    development: "col3",
                    developmentDone: "col4",
                    developmentWithQueue: "colgrp1",
                    qa: "col5",
                    qaDone: "col6",
                    qaWithQueue: "colgrp2",
                    deployment: "col7",
                    deploymentDone: "col8",
                };
                for (var i=0; i<limitsKeys.length; i++) {
                    var key = dictionary[limitsKeys[i]];
                    if (!key) {
                        key = limitsKeys[i];
                    }
                    limits[key] = externalConfig.columns.limits[limitsKeys[i]];
                }
                externalConfig.columns.limits = limits;

                var team = externalConfig.team;
                var teamKeys = Object.keys(team);
                var newTeam = {};
                for (var i=0; i<teamKeys.length; i++) {
                    var key = teamKeys[i];
                    if (dictionary[key]) {
                        var personType = team[key];
                        personType.columns = personType.columns.map(function(value) {
                           return dictionary[value];
                        });
                        newTeam[dictionary[key]] = personType;
                    } else {
                        newTeam[key] = team[key];
                    }
                }
                externalConfig.team = newTeam;

                var configs = externalConfig.tasks.sizeStrategy.configs;
                Object.keys(configs).forEach(function(value) {
                    var config = configs[value];
                    Object.keys(config).forEach(function(value) {
                        if (dictionary[value]) {
                            config[dictionary[value]] = config[value];
                            delete config[value];
                        } else if(/.*-variation$/.test(value)) {
                            var subValue = /\w*/.exec(value);
                            config[dictionary[subValue] + '-variation'] = config[value];
                            delete config[value];
                        }
                    });
                });
            } else {
                for (var i = 0; i < externalConfig.columns.definitions.length; i++) {
                    delete externalConfig.columns.definitions[i]['cfdShortLabel'];
                }
            }
            externalConfig.version = 3;
        }
    };
    this.loadExternalConfig = function (externalConfig) {
        if (!externalConfig || Object.keys(externalConfig).length == 0) return;
        var version = externalConfig.version;
        if (!version) version = 1;
        while (version != 3) {
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

    this.set = function (property, newValue) {
        this.cache = {};
        var path = property.split(".");
        var enclosingObject = this.data;
        for (var i = 0; i < path.length - 1; i++) {
            enclosingObject = enclosingObject[path[i]];
        }
        var oldValue = enclosingObject[path[path.length - 1]];
        enclosingObject[path[path.length - 1]] = newValue;
        if (this.listenersActive && oldValue != newValue) {
            var launchListeners = function (list) {
                if (list[property]) {
                    for (var i = 0; i < list[property].length; i++) {
                        list[property][i](newValue, property, oldValue);
                    }
                }
            }
            launchListeners(this.listeners);
            launchListeners(this.listenersAfter);
        }
    }
    this.get = function (property) {
        var cached = this.cache[property];
        if (cached != undefined) {
            return cached;
        }
        var path = property.split(".");
        var enclosingObject = this.data;
        for (var i = 0; i < path.length - 1; i++) {
            enclosingObject = enclosingObject[path[i]];
        }
        var value = enclosingObject ? enclosingObject[path[path.length - 1]] : undefined;
        this.cache[property] = value;
        return value;
    }
    this.onChange = function (property, listenerFun) {
        this._onChange(property, listenerFun, this.listeners);
    }
    this.afterChange = function (property, listenerFun) {
        this._onChange(property, listenerFun, this.listenersAfter);
    }
    this._onChange = function (property, listenerFun, list) {
        var listenersForProperty = list[property];
        if (!listenersForProperty) {
            listenersForProperty = [];
            list[property] = listenersForProperty;
        }
        listenersForProperty.push(listenerFun);
    }

    this.pauseListeners = function () {
        this.listenersActive = false;
    }
    this.activateListeners = function () {
        this.listenersActive = true;
    }
    this.clearListeners = function () {
        this.listeners = {};
        this.listenersAfter = {};
    }
    this.getActiveStates = function () {
        var definitions = this.get("columns.definitions");
        var activeColumnNames = [];
        definitions.forEach(function (element) {
            if (!element.queue && (!element.children || element.children.length == 0)) {
                activeColumnNames.push(element.name);
            }
        });
        return activeColumnNames;
    }
}