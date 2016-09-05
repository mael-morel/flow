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
    },
    3: {
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
    },
    4: {
        version: 4,
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
    },
    5: {
        version: 5,
        maxTasksOnOnePerson: 2,
        maxPeopleOnOneTask: 2,
        warmupTime: 1,
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
}