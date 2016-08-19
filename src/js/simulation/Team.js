function Team(configuration) {
    this.members = [];
    this.configuration = configuration;

    this.doWork = function (ticksPerHour) {
        this.members.forEach(function (person) {
            person.work(ticksPerHour);
        });
    }

    this.getNotWorkingForColumn = function (column) {
        var membersFiltered = this.members.filter(function (person) {
            return person.tasksWorkingOn.length == 0 && person.isAllowedToWorkIn(column.name);
        });
        var result = membersFiltered.sort(function(personA, personB) {
            return personA.productivity[column.name] < personB.productivity[column.name];
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

    this.getWorkingInColumn = function (column) {
        var result = [];
        column.tasks.forEach(function (task) {
            if (task.peopleAssigned.length == 1) {
                var person = task.peopleAssigned[0];
                if (result.indexOf(person) == -1 && person.isAllowedToWorkIn(column.name)) {
                    result.push(person);
                }
            }
        });
        result.sort(function (a, b) {
            return a.tasksWorkingOn.length * a.productivity[column.name] < b.tasksWorkingOn.length * b.productivity[column.name];
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
                this.members.push(new Person(newConfig[i].name, newConfig[i].productivity));
            }
        }
    }
    this.configuration.onChange("team", this.updateTeam.bind(this));

    this.initTeam = function () {
        this.updateTeam(this.configuration.get("team"));
    }
}