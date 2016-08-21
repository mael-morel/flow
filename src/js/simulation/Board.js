function Board(ticksPerHour, simulation) {
    this.columns = null;
    this.tasks = {};
    this.ticksPerHour = ticksPerHour;
    this.droppedTasks = [];

    this.reprioritiseTasks = function (sortTasksFun) {
        for (var i = 0; i < this.columns.length - 2; i++) {
            sortTasksFun(this.columns[i].tasks);
        }
    }

    this.lastColumn = function () {
        return this.columns[this.columns.length - 1];
    }

    this.addTask = function (task) {
        this.columns[0].addTask(task);
        this.tasks[task.id] = task;
    }

    this.cleanDoneAndDropped = function () {
        var lastColumn = this.columns[this.columns.length - 1];
        lastColumn.tasks.forEach(function (task) {
            task.column = null;
            delete this.tasks[task.id];
        }.bind(this));
        lastColumn.tasks = [];
        this.droppedTasks = [];
    }

    this.getCurrentWip = function () {
        return Object.keys(this.tasks).length - this.getDoneTasksCount();
    }

    this.getColumnByName = function (columnName) {
        for (var i = 0; i < this.columns.length; i++) {
            if (this.columns[i].name == columnName) {
                return this.columns[i];
            }
        }
    }

    this.getDoneTasksCount = function (start, end) {
        return this.getDoneTasks(start, end).length;
    }

    this.getDoneTasks = function (start, end) {
        var result = [];
        var tasks = this.lastColumn().tasks;
        var columnName = this.lastColumn().name;
        if (!start || !end)
            return tasks.slice();
        var count = 0;
        for (var i = 0; i < tasks.length; i++) {
            var timeFinished = tasks[i].arrivalTime[columnName];
            if (timeFinished > start && timeFinished <= end) result.push(tasks[i]);
        }
        return result;
    }

    this.getCostOfDelay = function () {
        var cod = 0;
        this.columns.slice(0, this.columns.length - 1).forEach(function (column) {
            column.tasks.forEach(function (task) {
                cod += task.value.costOfDelay(simulation.time);
            }.bind(this));
        }.bind(this));
        return cod;
    }

    this.removeTasksOverLimitFromBacklog = function () {
        var limit = this.columns[0].limit();
        var freshlyRemovedTasks = this.columns[0].tasks.splice(limit, this.columns[0].tasks.length);
        this.droppedTasks = this.droppedTasks.concat(freshlyRemovedTasks);
        freshlyRemovedTasks.forEach(function (task) {
            task.column = null;
            delete this.tasks[task.id];
        }.bind(this));
    }

    this.getNotAssignedTasks = function () {
        var result = [];
        this.columns.forEach(function (column) {
            if (!column.isQueue()) {
                result.push(column.getNotAssignedTasks());
            }
        });
        return result;
    }

    this.getMostMultitaskedTasks = function () {
        var result = [];
        this.columns.forEach(function (column) {
            if (!column.isQueue()) {
                result.push(column.getMostMultitaskedTasks());
            }
        });
        return result;
    }

    this.getTasksToSwarm = function () {
        var result = [];
        this.columns.forEach(function (column) {
            if (!column.isQueue()) {
                result.push(column.getTasksToSwarm());
            }
        });
        return result;
    }

    this.createColumns = function () {
        var definitions = simulation.configuration.get("columns.definitions");
        var parentDefinitions = definitions.filter(function (element) {
            return element.children && element.children.length > 0;
        });
        var childrenDefinitions = definitions.filter(function (element) {
            return !element.children || element.children.length == 0;
        });
        var parentColumns = this.createParentColumns(parentDefinitions);
        this.columns = this.createColumnInstances(childrenDefinitions, parentDefinitions, parentColumns);
    }

    this.createParentColumns = function (parentDefinitions) {
        var result = {};
        for (var i = 0; i < parentDefinitions.length; i++) {
            var definition = parentDefinitions[i];
            result[definition.name] = new Column(definition, simulation);
        }
        return result;
    }

    this.createColumnInstances = function (childrenDefinitions, parentDefinitions, parentColumns) {
        var result = [];
        for (var i = 0; i < childrenDefinitions.length; i++) {
            var definition = childrenDefinitions[i];
            var column = new Column(definition, simulation);
            column.index = i;
            for (var j = 0; j < parentDefinitions.length; j++) {
                if (parentDefinitions[j].children.indexOf(definition.name) != -1) {
                    column.parent = parentColumns[parentDefinitions[j].name];
                    parentColumns[parentDefinitions[j].name].children.push(column);
                }
            }
            result.push(column);
        }
        return result;
    }

    this.createColumns();
}