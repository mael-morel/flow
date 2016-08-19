function Person(productivity, team, configuration) {
    this.tasksWorkingOn = [];
    this.productivityPerHour = 60;
    this.team = team;
    this.markedAsRemoved = false;
    this.configuration = configuration;
    this.productivity = productivity;

    this.assignTo = function (task) {
        this.tasksWorkingOn.push(task);
        task.peopleAssigned.push(this);
    }

    this.work = function (ticksPerHour) {
        if (this.tasksWorkingOn.length == 0) return;
        var workPerTask = this.productivityPerHour / this.tasksWorkingOn.length / ticksPerHour;
        this.tasksWorkingOn.forEach(function (task) {
            task.work(workPerTask * (this.productivity[task.column.name] / 100));
            if (task.finished()) {
                task.unassignPeople();
            }
        }.bind(this));
    }

    this.isAllowedToWorkIn = function (columnName) {
        return this.productivity[columnName] > 0;
    }
} 