function Team(configuration) {
    this.members = [];
    this.removedButWorking = [];
    this.configuration = configuration;

    this.doWork = function (ticksPerHour) {
        this.members.forEach(function (person) {
            person.work(ticksPerHour);
        });
        this.removedButWorking = this.removedButWorking.filter(function (person) {
            return person.tasksWorkingOn.length != 0;
        })
        this.removedButWorking.forEach(function (person) {
            person.work(ticksPerHour);
        });
    }

    this.getNotWorkingForColumn = function (column, specialisation) {
        var result = [];
        this.members.forEach(function (person) {
            if (person.tasksWorkingOn.length == 0 && (!specialisation || person.specialisation == specialisation) && person.isAllowedToWorkIn(column.name)) {
                result.push(person);
            }
        });
        return result;
    }

    this.getNotWorking = function () {
        var result = [];
        this.members.forEach(function (person) {
            if (person.tasksWorkingOn.length == 0) result.push(person);
        });
        return result;
    }

    this.getSpecialistsWorkingInColumnOrderedByTaskCount = function (column, specialisation) {
        var result = [];
        column.tasks.forEach(function (task) {
            if (task.peopleAssigned.length == 1 && (!specialisation || task.peopleAssigned[0].specialisation == specialisation)) {
                var person = task.peopleAssigned[0];
                if (result.indexOf(person) == -1 && person.isAllowedToWorkIn(column.name)) {
                    result.push(person);
                }
            }
        });
        result.sort(function (a, b) {
            return a.tasksWorkingOn.length > b.tasksWorkingOn.length;
        });
        return result;
    }

    this.getPeopleAssignedToMoreThanOneTaskOrderderByTaskCountAndSpecialisation = function (column) {
        var result = [];
        column.tasks.forEach(function (task) {
            var person = task.peopleAssigned[0];
            if (task.peopleAssigned.length == 1 && person.tasksWorkingOn.length > 1) {
                if (result.indexOf(person) == -1) {
                    result.push(person);
                }
            }
        });
        result.sort(function (personA, personB) { //TODO: to be tested!
            if (personA.specialisation == personB.specialisation) {
                return personA.tasksWorkingOn.length < personB.tasksWorkingOn.length;
            }
            if (personA.specialisation == column.name) {
                return true;
            }
            if (personB.specialisation == column.name) {
                return false;
            }
            return personA.tasksWorkingOn.length < personB.tasksWorkingOn.length;
        });
        return result;
    }

    this.updateTeam = function (newConfig) {
        for (var i=0; i<this.members.length; i++) {
            this.members[i].unassignFromAll();
        }
        for (var i=0; i<newConfig.length; i++) {
            for (var j=0; j<newConfig[i].count; j++) {
                this.members.push(new Person(newConfig[i].name, newConfig[i].productivity, this, this.configuration));
            }
        }
    }
    this.configuration.onChange("team", this.updateTeam.bind(this));

    this.initTeam = function () {
        this.updateTeam(this.configuration.get("team"));
    }
}