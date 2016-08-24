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

    this.recreateTeam = function (newConfig) {
        for (var i=0; i<this.members.length; i++) {
            this.members[i].unassignFromAll();
        }
        this.members = [];
        for (var i=0; i<newConfig.length; i++) {
            for (var j=0; j<newConfig[i].count; j++) {
                this.members.push(new Person(newConfig[i].name, newConfig[i].productivity, i));
            }
        }
        this.recreateMembersSortedBySkill();
    }

    this.updateTeamNamesAndCount = function(newConfig) {
        newConfig.forEach(function(memberType, index) {
            var membersOfType = this.members.filter(function (member) {
                return (member.typeIndex == index);
            });
            membersOfType.forEach(function(member) {
                member.name = memberType.name;
            });

            if (membersOfType.length < memberType.count) {
                for (var i = 0; i < memberType.count - membersOfType.length; i++) {
                    this.members.push(new Person(memberType.name, memberType.productivity, index));
                }
            } else if (membersOfType.length > memberType.count) {
                for (var i = 0; i < membersOfType.length - memberType.count; i++) {
                    this.members.splice(this.members.indexOf(membersOfType[i]), 1);
                    membersOfType[i].unassignFromAll();
                }
            }
        }.bind(this));
        this.recreateMembersSortedBySkill();
    }

    this.recreateMembersSortedBySkill = function() {
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

    this.updateTeam = function(newConfig, path, oldConfig) {
        if (!equalProductivities(newConfig, oldConfig)) {
            this.recreateTeam(newConfig);
        } else {
            this.updateTeamNamesAndCount(newConfig);
        }
    }

    function equalProductivities (config1, config2) {
        if (config1.length != config2.length) return false;
        return config1.every(function(memberType, index) {
            var keys = Object.keys(memberType.productivity);
            return keys.every(function (key) {
                return memberType.productivity[key] == config2[index].productivity[key];
            });
        });
    }

    this.configuration.onChange("team", this.updateTeam.bind(this));



    this.initTeam = function () {
        this.recreateTeam(this.configuration.get("team"));
    }
}