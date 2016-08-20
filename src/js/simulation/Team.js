function Team(configuration) {
    this.members = [];
    this.membersSortedBySkill = [];
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

    this.getPeopleAssignedToMoreThanOneTask = function (column) {
        var result = [];
        column.tasks.forEach(function (task) {
            var person = task.peopleAssigned[0];
            if (task.peopleAssigned.length == 1 && person.tasksWorkingOn.length > 1) {
                if (result.indexOf(person) == -1) {
                    result.push(person);
                }
            }
        });
        result.sort(function (a, b) {
            return a.tasksWorkingOn.length * a.productivity[column.name] < b.tasksWorkingOn.length * b.productivity[column.name];
        });
        return result;
    }

    this.updateTeam = function (newConfig) {
        for (var i=0; i<this.members.length; i++) {
            this.members[i].unassignFromAll();
        }
        this.members = [];
        for (var i=0; i<newConfig.length; i++) {
            for (var j=0; j<newConfig[i].count; j++) {
                this.members.push(new Person(newConfig[i].name, newConfig[i].productivity, i));
            }
        }
        this.membersSortedBySkill = [];
        var membersGroupedAndSorted = [];
        var activities = this.configuration.getActiveStates();
        for (var i=0; i<activities.length; i++) {
            var activity = activities[i];
            var membersWithSomeProductivity = this.members.filter(function(person) {
                return person.productivity[activity] > 0;
            });
            membersWithSomeProductivity.sort(function(a, b) {
                return a.productivity[activity] < b.productivity[activity];
            });
            membersGroupedAndSorted.push(membersWithSomeProductivity);
        }
        var personWithHighestSkill = null;
        do {
            personWithHighestSkill = null;
            var skillGroupIndex = null;
            membersGroupedAndSorted.forEach(function(skillGroup, index) {
                if (skillGroup.length ==0) return;
                var personFromGroup = skillGroup[0];
                var activity = activities[index];
                if (personWithHighestSkill == null) {
                    personWithHighestSkill = personFromGroup;
                    skillGroupIndex = index;
                } else {
                    if (personFromGroup.productivity[activity] >= personWithHighestSkill.productivity[activities[skillGroupIndex]]) {
                        personWithHighestSkill = personFromGroup;
                        skillGroupIndex = index;
                    }
                }
            });
            if (personWithHighestSkill) {
                this.membersSortedBySkill.push({person: personWithHighestSkill, activity: activities[skillGroupIndex]});
                membersGroupedAndSorted[skillGroupIndex].shift();
            }
        } while (personWithHighestSkill != null);
    }
    this.configuration.onChange("team", this.updateTeam.bind(this));

    this.initTeam = function () {
        this.updateTeam(this.configuration.get("team"));
    }
}