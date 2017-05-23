function Task(taskId, time, size, warmupTime, value) {
    this.id = "Task" + taskId;
    this.label = "#" + taskId;
    this.created = time;
    this.size = $.extend({}, size);
    this.originalSize = $.extend({}, size);
    this.column = null;
    this.peopleAssigned = [];
    this.arrivalTime = {};
    this.value = value;
    this.value.task = this;
    this.touchCounter = 0;
    this.lastTouchedTime = -1;
    this.warmupTime = warmupTime;
    this.peopleWarmingUp = {};

    this.finished = function (column) {
        if (!column) {
            column = this.column;
        }
        return this.size[column.name] <= 0 || !this.size[column.name];
    }

    this.getRemainingWork = function () {
        var sizeSummed = 0;
        Object.keys(this.size).forEach(function (key) {
            sizeSummed += Math.max(0, this.size[key]);
        }.bind(this));
        return sizeSummed;
    }

    this.work = function (amount, time, person) {
        if (time != this.lastTouchedTime) {
            this.touchCounter++;
            this.lastTouchedTime = time;
            Object.keys(this.peopleWarmingUp).forEach(function (warmingUpPerson) {
                var contains = false;
                for (var i=0 ;i<this.peopleAssigned.length; i++) {
                    if (this.peopleAssigned[i].id == warmingUpPerson) {
                        contains = true;
                        break;
                    }
                }
                if (!contains) {
                    delete this.peopleWarmingUp[warmingUpPerson];
                }
            }.bind(this));
        }
        var warmingCount = this.peopleWarmingUp[person.id];
        if (warmingCount == undefined) {
            warmingCount = this.warmupTime;
        }
        if (warmingCount > 0) {
            this.peopleWarmingUp[person.id] = warmingCount -= amount;
        } else {
            this.size[this.column.name] -= amount;
        }
    }

    this.unassignPeople = function () {
        this.peopleAssigned.forEach(function (person) {
            person.tasksWorkingOn.splice(person.tasksWorkingOn.indexOf(this), 1);
        }.bind(this));
        this.peopleAssigned = [];
    }

    this.getLeadTime = function () {
        return this.arrivalTime[this.column.name] - this.created;
    }

    this.getTouchCount = function() {
        return this.touchCounter;
    }
}
