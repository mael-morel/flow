function Task(taskId, time, size) {
	this.id = "Task" + taskId;
	this.label = "#" + taskId;
	this.created = time;
	this.size = $.extend({}, size);
	this.originalSize = $.extend({}, size);
	this.column = null;
	this.peopleAssigned = [];
	this.arrivalTime = {};
	this.value = new Value(this, time, 10, normal_random(0, 1000));
	
	function Value(task, start, durationInDays, valuePerDay) {
		this.start = start;
		this.end = this.start + durationInDays * 8 * 60;
		this.valuePerDay = valuePerDay;
		this.task = task;
		
		this.costOfDelay = function(now, avgLeadTime) {
			var effort = 0;
			if (task.column.isFirstColumn()) {
				effort = avgLeadTime * 8 * 60 || task.getRemainingWork();
			} else {
				effort = task.getRemainingWork();
			}
			if (now + effort > this.start && now + effort < this.end) {
				return valuePerDay;
			}
			return 0;
		}
		
		this.remainingValue = function(now) {
			return Math.max(0, Math.floor((this.end - Math.max(now, this.start)) / 8)) * this.valuePerDay;
		}
		
		this.currentDailyValue = function(now) {
			if (now > this.start && now < this.end) {
				return valuePerDay;
			}
			return 0;
		}
		
		this.totalValue = function() {
			return Math.floor((this.end - this.start) / 8) * this.valuePerDay
		}
	}
	
	this.finished = function (column) {
		if (!column) {
			column = this.column;
		}
		return this.size[column.name] <= 0 || !this.size[column.name];
	}
	
	this.getRemainingWork = function(){
		var sizeSummed = 0;
		Object.keys(this.size).forEach(function(key) {
			sizeSummed += Math.max(0, this.size[key]);
		}.bind(this));
		return sizeSummed;
	}
	
	this.work = function(amount) {
		this.size[this.column.name] -= amount;
	}
	
	this.unassignPeople = function() {
		this.peopleAssigned.forEach(function(person) {
			person.tasksWorkingOn.splice(person.tasksWorkingOn.indexOf(this), 1);
		}.bind(this));
		this.peopleAssigned = [];
	}
	
	this.getLeadTime = function() {
		return this.arrivalTime[this.column.name] - this.created;
	}
}
