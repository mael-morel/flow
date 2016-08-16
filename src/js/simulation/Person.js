function Person(specialisation, team, configuration) {
    this.specialisation = specialisation;
    this.tasksWorkingOn = [];
    this.productivityPerHour = 60;
    this.team = team;
    this.markedAsRemoved = false;
    this.configuration = configuration;

    this.assignTo = function (task) {
        this.tasksWorkingOn.push(task);
        task.peopleAssigned.push(this);
    }

    this.work = function (ticksPerHour) {
        if (this.tasksWorkingOn.length == 0) return;
        var workPerTask = this.productivityPerHour / this.tasksWorkingOn.length / ticksPerHour;
        this.tasksWorkingOn.forEach(function (task) {
            if (task.column.name != specialisation) {
                task.work(workPerTask * (this.configuration.get("team.workingOutOfSpecialisationCoefficient") / 100));
            } else {
                task.work(workPerTask);
            }
            if (task.finished()) {
                task.unassignPeople();
            }
        }.bind(this));
    }

    this.isAllowedToWorkIn = function (columnName) {
        return this.configuration.get("team." + this.specialisation + ".columns").indexOf(columnName) != -1;
    }
} 