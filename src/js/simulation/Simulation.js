function Simulation(hookSelector, externalConfig) {

    this.configuration = new Configuration(externalConfig);

    this.hourLengthInSeconds = 1;
    this.ticksPerHour = 12;
    this.time;
    this.taskCounter;
    this.timeoutHandler;
    this.gui = new GUI(hookSelector, this, this.configuration);
    this.board;
    this.stats;
    this.team;

    this.initBasics = function () {
        this.configuration.clearListeners();
        this.time = 0;
        this.taskCounter = 1;
        this.team = new Team(this.configuration);
        this.board = new Board(this.ticksPerHour, this);
        this.stats = new Stats(this, this.configuration);
        this.team.initTeam();
        this.gui.init();
    }

    this.play = function () {
        if (!this.timeoutHandler)
            this.timeoutHandler = setTimeout(this.tick.bind(this), this.hourLengthInSeconds * 1000 / this.ticksPerHour);
    }

    this.stop = function () {
        clearTimeout(this.timeoutHandler);
        this.timeoutHandler = null;
        this.initBasics();
    }

    this.pause = function () {
        clearTimeout(this.timeoutHandler);
        this.timeoutHandler = null;
    }
    this.isRunning = function () {
        return this.timeoutHandler != null;
    }

    this.tick = function () {
        this.timeoutHandler = null;
        this.addNewTasks(this.board);
        this.board.reprioritiseTasks(this.prioritisationStrategies[this.configuration.get("columns.prioritisationStrategy")]);
        this.board.removeTasksOverLimitFromBacklog();
        this.doWork();
        this.moveTasks(this.board.columns);
        this.assignTeamMembersToTasks();
        this.stats.recalculateStats(this);
        this.removeDoneTasks();
        this.gui.update(this.board, this.stats);
        this.play();
        this.time += 60 / this.ticksPerHour;
    }

    this.taskArrivalStrategies = {
        "scrum": function (createTaskFunction) {
            var length = this.configuration.get('tasks.arrivalStrategy.configs.scrum.length');
            var tasks = this.configuration.get('tasks.arrivalStrategy.configs.scrum.tasks');
            var includeExisting = this.configuration.get('tasks.arrivalStrategy.configs.scrum.include-existing');
            if (includeExisting) tasks = tasks - this.board.getCurrentWip();
            if (this.time / (60 * 8) % length == 0) {
                for (var i = 0; i < tasks; i++) {
                    this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
                }
            }
        }.bind(this),
        "up-to-limit": function (createTaskFunction) {
            var limit = this.board.columns[0].limit();
            if (limit == Number.POSITIVE_INFINITY) limit = 1;
            for (var i = this.board.columns[0].tasks.length; i < limit; i++) {
                this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
            }
        }.bind(this),
        "constant-push": function (createTaskFunction) {
            var demand = this.configuration.get('tasks.arrivalStrategy.configs.constant-push.demand');
            var ticksPerDay = 8 * this.ticksPerHour;
            var distanceInTicks = ticksPerDay / demand;
            var tickDuration = 60 / this.ticksPerHour;
            var currentTick = (this.time) / tickDuration;
            var deltaIndex = currentTick - Math.floor(currentTick / distanceInTicks) * distanceInTicks;
            var spawnTasks = deltaIndex < 1;
            if (spawnTasks) {
                var noOfTasksToSpawn = 1;
                if (demand > ticksPerDay) {
                    noOfTasksToSpawn += Math.floor(demand / ticksPerDay) - 1;
                    var distanceInTicks = ticksPerDay / (demand % ticksPerDay);
                    var deltaIndex = currentTick - Math.floor(currentTick / distanceInTicks) * distanceInTicks;
                    var spawnTask = deltaIndex < 1;
                    noOfTasksToSpawn += spawnTask ? 1 : 0;
                }
                for (var i = 0; i < noOfTasksToSpawn; i++) {
                    this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
                }
            }

        }.bind(this),
        "random-push": function (createTaskFunction) {
            var demand = this.configuration.get('tasks.arrivalStrategy.configs.random-push.demand');
            var batchSize = this.configuration.get('tasks.arrivalStrategy.configs.random-push.batch-size');
            var ticksPerDay = 8 * this.ticksPerHour;
            var probabilityOfSpawningNow = demand / ticksPerDay / batchSize;
            if (Math.random() < probabilityOfSpawningNow) {
                batchSize = Math.max(demand / ticksPerDay, batchSize);
                var noOfTasksToSpawn = Math.max(0, Math.round(normal_random(batchSize, batchSize / 3, true)));
                for (var i = 0; i < noOfTasksToSpawn; i++) {
                    this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
                }
            }
        }.bind(this),
    };

    this.taskSizeStrategies = {
        "constant": function (id, time) {
            var conf = this.configuration.get("tasks.sizeStrategy.configs.constant");
            var activeStates = this.configuration.getActiveStates();
            var taskConfig = {};
            activeStates.forEach(function (element) {
                taskConfig[element] = conf[element] * 60;
            });
            return new Task(id, time, taskConfig);
        }.bind(this),

        "normal": function (id, time) {
            var conf = this.configuration.get("tasks.sizeStrategy.configs.normal");
            var activeStates = this.configuration.getActiveStates();
            var taskConfig = {};
            activeStates.forEach(function (element) {
                taskConfig[element] = normal_random(conf[element], conf[element + "-variation"]) * 60;
            });
            return new Task(id, time, taskConfig);
        }.bind(this),

        "tshirt": function (id, time) {
            var conf = this.configuration.get("tasks.sizeStrategy.configs.tshirt");
            var smallProbability = parseFloat(conf["small-probability"]);
            var mediumProbability = parseFloat(conf["medium-probability"]);
            var largeProbability = parseFloat(conf["large-probability"]);
            var xlargeProbability = parseFloat(conf["xlarge-probability"]);
            var tshirtSizeRandom = Math.random() * (smallProbability + mediumProbability + largeProbability + xlargeProbability);
            var size = "small";
            if (tshirtSizeRandom > smallProbability) size = "medium";
            if (tshirtSizeRandom > smallProbability + mediumProbability) size = "large";
            if (tshirtSizeRandom > smallProbability + mediumProbability + largeProbability) size = "xlarge";
            var totalSize = parseFloat(conf[size + "-effort"]);
            var activeStates = this.configuration.getActiveStates();
            var taskConfig = {};
            var sum = 0;
            activeStates.forEach(function (element) {
                sum += conf[element];
            });
            activeStates.forEach(function (element) {
                var percentage = parseFloat(conf[element]);
                var effort = 60 * totalSize * percentage / sum;
                taskConfig[element] = normal_random(effort, effort / 2);
            });
            return new Task(id, time, taskConfig);
        }.bind(this),
    };

    this.prioritisationStrategies = {
        fifo: function (tasksList) {
        },
        value: function (tasksList) {
            tasksList.sort(function (taskA, taskB) {
                return taskB.value.totalValue() - taskA.value.totalValue();
            }.bind(this));
        }.bind(this),
        cd3: function (tasksList) {
            tasksList.sort(function (taskA, taskB) {
                return taskB.value.costOfDelay(this.time, this.stats.leadTime.getAvg()) / taskB.getRemainingWork() - taskA.value.costOfDelay(this.time, this.stats.leadTime.getAvg()) / taskA.getRemainingWork();
            }.bind(this));
        }.bind(this)
    };

    this.addNewTasks = function () {
        var sizeStrategy = this.configuration.get("tasks.sizeStrategy.current");
        var arrivalStrategy = this.configuration.get("tasks.arrivalStrategy.current");
        this.taskArrivalStrategies[arrivalStrategy](this.taskSizeStrategies[sizeStrategy]);
    }
    this.moveTasks = function (columns) {
        var changed = true;
        while (changed) {
            changed = false;
            for (var i = 0; i < columns.length; i++) {
                var column = columns[i];
                for (var j = 0; j < column.tasks.length; j++) {
                    var task = column.tasks[j];
                    if (task.finished()) {
                        var nextColumn = this.findNextColumn(task, columns);
                        if (nextColumn != column) {
                            changed = true;
                            column.moveTaskTo(task, nextColumn);
                        }
                    }
                }
            }
        }
    }

    this.removeDoneTasks = function () {
        if (this.time % (60 * 8) == 0) this.board.cleanDoneAndDropped();
    }

    this.findNextColumn = function (task, columns) {
        var column = task.column;
        var index = column.index;
        while (column && task.finished(column) && (!columns[index + 1] || columns[index + 1].availableSpace(task))) {
            column = columns[++index];
        }
        if (!column) {
            // move to done just before removing from the board
            column = columns[columns.length - 1];
        }
        return column;
    }
    /*
    1. sprobowac przypisac bezrobotnych do wolnych taskow, zgodnie z priorytetami
    2. jesli dalej sa wolne taski, poszukac chetnych do multitaskingu
    3. jesli dalej sa wolni ludzie, poszukaj najbardziej multitaskowane taski do objecia pracy nad
    4. jesli dalej sa wolni ludzie, poszukaj im taska do sparowania sie
     */
    this.assignTeamMembersToTasks = function () {
        var unassignedTasks = this.board.getNotAssignedTasks();
        this.assignNonWorkingToUnassignedTasks(unassignedTasks);
        this.assignWorkingToUnassignedTasksIfPossible(unassignedTasks);
        this.assignNonWorkingToMultitaskedTasks();
        this.swarmNonWorking();
    }

    this.assignNonWorkingToUnassignedTasks = function(unassignedTasks) {
        var membersSortedBySkill = this.team.membersSortedBySkill;
        membersSortedBySkill.forEach(function(personAndActivity) {
            if (personAndActivity.person.tasksWorkingOn.length != 0) return;
            var task = unassignedTasks[personAndActivity.activityIndex].shift();
            if (task) {
                personAndActivity.person.assignTo(task);
            }
        });
    }

    this.assignWorkingToUnassignedTasksIfPossible = function(unassignedTasks) {
        var membersSortedBySkill = this.team.membersSortedBySkill;
        var maxTasksOnOnePerson = this.configuration.get("maxTasksOnOnePerson");
        var workingMembers = this.team.getPeopleAssignedToAtLeastOneTaskAndLessThan(maxTasksOnOnePerson);
        while (workingMembers.length > 0) {
            var currentTaskCount = workingMembers[0].tasksWorkingOn.length;
            membersSortedBySkill.forEach(function (personAndActivity) {
                if (personAndActivity.person.tasksWorkingOn.length != currentTaskCount) return;
                var task = unassignedTasks[personAndActivity.activityIndex].shift();
                if (task) {
                    personAndActivity.person.assignTo(task);
                }
            });
            workingMembers = workingMembers.filter(function(person) {
                return person.tasksWorkingOn.length != currentTaskCount && person.tasksWorkingOn.length < maxTasksOnOnePerson;
            });
        }
    }

    this.assignNonWorkingToMultitaskedTasks = function() {
        var membersSortedBySkill = this.team.membersSortedBySkill;
        var multitaskedTasks = this.board.getMostMultitaskedTasks();
        membersSortedBySkill.forEach(function(personAndActivity) {
            if (personAndActivity.person.tasksWorkingOn.length != 0) return;
            var task = multitaskedTasks[personAndActivity.activityIndex].shift();
            if (task) {
                task.unassignPeople();
                personAndActivity.person.assignTo(task);
            }
        });
    }

    this.swarmNonWorking = function() {
        var membersSortedBySkill = this.team.membersSortedBySkill;
        var maxPeopleOnOneTask = this.configuration.get("maxPeopleOnOneTask");
        var tasksToSwarm = this.board.getTasksToSwarm();
        while (true) {
            var lowestCount = Math.min.apply(null, tasksToSwarm.map(function(element) {
                return element.length > 0 ? element[0].peopleAssigned.length : Number.POSITIVE_INFINITY;
            }));
            if (lowestCount >= maxPeopleOnOneTask) break;
            var filteredTasksToSwarm = tasksToSwarm.map(function(tasksInColumn) {
                return tasksInColumn.filter(function(task) {
                    return task.peopleAssigned.length == lowestCount;
                });
            })
            membersSortedBySkill.forEach(function (personAndActivity) {
                if (personAndActivity.person.tasksWorkingOn.length != 0) return;
                var tasksInColumn = filteredTasksToSwarm[personAndActivity.activityIndex];
                for (var i = 0; i<tasksInColumn.length; i++) {
                    var task = tasksInColumn[i];
                    if (task.peopleAssigned.indexOf(personAndActivity.person) < 0) {
                        personAndActivity.person.assignTo(task);
                        tasksInColumn.splice(tasksInColumn.indexOf(task), 1);
                        return;
                    }
                }
            });
            filteredTasksToSwarm.forEach(function(tasksInColumn, index) {
                tasksInColumn.forEach(function(task) {
                    tasksToSwarm[index].splice(tasksToSwarm[index].indexOf(task), 1);
                });
            });
        }

    }

    this.assignTeamMembersToTasksByColumn = function (column) {
        var notWorkingPpl = this.team.getNotWorkingForColumn(column);
        var tasksWithNoAssignee = column.getNotAssignedTasks();
        var i;
        for (i = 0; i < notWorkingPpl.length && i < tasksWithNoAssignee.length; i++) {
            notWorkingPpl[i].assignTo(tasksWithNoAssignee[i]);
        }
        var stoppedAtIndex = i;
        if (stoppedAtIndex < tasksWithNoAssignee.length) {
            var workingPpl = this.team.getWorkingInColumn(column);
            var j = 0;
            for (; i < tasksWithNoAssignee.length && workingPpl.length > 0 && workingPpl[j].tasksWorkingOn.length < this.configuration.get("maxTasksOnOnePerson"); i++) {
                workingPpl[j].assignTo(tasksWithNoAssignee[i]);
                if (workingPpl[j].tasksWorkingOn.length > workingPpl[(j + 1) % workingPpl.length].tasksWorkingOn.length) {
                    j = (j + 1) % workingPpl.length;
                } else {
                    j = 0;
                }
            }
        }
        if (stoppedAtIndex < notWorkingPpl.length) {
            i = stoppedAtIndex;
            var peopleWithMoreTasks = this.team.getPeopleAssignedToMoreThanOneTask(column);
            var j = 0;
            for (; i < notWorkingPpl.length && j < peopleWithMoreTasks.length; i++) {
                var person = peopleWithMoreTasks[j];
                var task = person.tasksWorkingOn[0];
                task.unassignPeople();
                notWorkingPpl[i].assignTo(task);
                if (!peopleWithMoreTasks[j + 1] || person.tasksWorkingOn.length < peopleWithMoreTasks[j + 1].tasksWorkingOn.length || person.tasksWorkingOn.length == 1) {
                    j++;
                }
            }
            stoppedAtIndex = i;
        }
        if (stoppedAtIndex < notWorkingPpl.length) {
            i = stoppedAtIndex;
            var tasks = column.getTasksAssignedToOneOrMoreOrderedByNumberOfPeople();
            var j = 0;
            for (; i < notWorkingPpl.length && tasks.length > 0 && tasks[j].peopleAssigned.length < this.configuration.get("maxPeopleOnOneTask"); i++) {
                notWorkingPpl[i].assignTo(tasks[j]);
                if (tasks[j].peopleAssigned.length > tasks[(j + 1) % tasks.length].peopleAssigned.length) {
                    j = (j + 1) % tasks.length;
                } else {
                    j = 0;
                }
            }
        }
    }

    this.doWork = function () {
        this.team.doWork(this.ticksPerHour);
    }

    this.initBasics();
}