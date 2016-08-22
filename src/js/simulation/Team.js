function Team(configuration) {
    this.members = [];
    this.membersSortedBySkill = [];
    this.configuration = configuration;

    this.doWork = function (ticksPerHour) {
        this.members.forEach(function (person) {
            person.work(ticksPerHour);
        });
    }

    this.getNotWorking = function () {
        var result = [];
        this.members.forEach(function (person) {
            if (person.tasksWorkingOn.length == 0) result.push(person);
        });
        return result;
    }

    this.getPeopleAssignedToAtLeastOneTaskAndLessThan = function(lessThan) {
        return this.members.filter(function(person) {
            return person.tasksWorkingOn.length > 0 && person.tasksWorkingOn.length < lessThan && person.tasksWorkingOn[0].peopleAssigned.length == 1;
        }).sort(function(a, b) {
            return a.tasksWorkingOn.length - b.tasksWorkingOn.length;
        });
    }

    this.updateTeam = function (newConfig) {
        for (var i=0; i<this.members.length; i++) {
            this.members[i].unassignFromAll();
        }
        this.members = [];
        for (var i=0; i<newConfig.length; i++) {
            for (var j=0; j<newConfig[i].count; j++) {
                this.members.push(new Person(newConfig[i].name, newConfig[i].productivity, i, newConfig[i].name.substring(0,1) + j));
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
                return b.productivity[activity] - a.productivity[activity];
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
                this.membersSortedBySkill.push({person: personWithHighestSkill, activity: activities[skillGroupIndex], activityIndex: skillGroupIndex});
                membersGroupedAndSorted[skillGroupIndex].shift();
            }
        } while (personWithHighestSkill != null);
    }
    this.configuration.onChange("team", this.updateTeam.bind(this));

    this.initTeam = function () {
        this.updateTeam(this.configuration.get("team"));
    }
}