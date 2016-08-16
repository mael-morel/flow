var historicalConfigs = {
    1: {
        maxTasksOnOnePerson: 2,
        maxPeopleOnOneTask: 2,
        stats: {
            noOfDaysForMovingAverage: 5,
        },
        columns: {
            prioritisationStrategy: "fifo",
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
    },
    2: {
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
                {
                    name: "developmentDone",
                    queue: true,
                    label: "Done",
                    cfdLabel: "Development Done",
                    cfdShortLabel: "Dev Done"
                },
                {name: "qa", queue: false, label: "Doing", cfdLabel: "QA", cfdShortLabel: "QA"},
                {name: "qaDone", queue: true, label: "Done", cfdLabel: "QA Done", cfdShortLabel: "QA Done"},
                {name: "deployment", queue: false, label: "Doing", cfdLabel: "Deployment", cfdShortLabel: "Depl"},
                {
                    name: "deploymentDone",
                    queue: true,
                    label: "Done",
                    cfdLabel: "Deployment Done",
                    cfdShortLabel: "Depl Done",
                    ignoreLimit: true
                },
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
}