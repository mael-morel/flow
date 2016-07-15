function Column(definition, simulation) {
	this.name = definition.name;
	this.tasks = [];
	this.children = [];
	this.parent = null;
	this.ignoreLimit = definition.ignoreLimit;
	this.queue = definition.queue;
	this.simulation = simulation;
	this.label = definition.cfdLabel;
	this.shortLabel = definition.cfdShortLabel;
	this.boardLabel = definition.label;
	this.index = -1;
	this.configuration = simulation.configuration;
	
	this.getTasksAssignedToOneOrMoreOrderedByNumberOfPeople = function() {
		var result = [];
		this.tasks.forEach(function(task) {
			if (task.peopleAssigned.every(function(person) {
				return person.tasksWorkingOn.length == 1;
				})) {
					result.push(task);
				}
		});
		result.sort(function(a, b) {
			return a.peopleAssigned.length > b.peopleAssigned.length;
		});
		return result;
	}
	
	this.getNotAssignedTasks = function() {
		var result = [];
		this.tasks.forEach(function(task) {
			if(task.peopleAssigned.length == 0) {
				result.push(task);
			}
		});
		return result;
	}
	
	this.isQueue = function() {
		return this.queue == true;
	}
	
	this.addTask = function(task) {
		this.tasks.push(task);
		task.column = this;
		task.arrivalTime[this.name] = this.simulation.time;
	}
	
	this.moveTaskTo = function(task, nextColumn) {
		this.tasks.splice(this.tasks.indexOf(task), 1);
		task.column = nextColumn;
		if (nextColumn) {
			nextColumn.tasks.push(task);
			task.arrivalTime[nextColumn.name] = this.simulation.time;
		}
	}
	
	this.availableSpace = function(task) {
		if (this.ignoreLimit) return true;
		var limit = this.limit();
		var numberOfTasks = this.tasks.length;
		if (this.children.length > 0) {
			//checking for parent column of task
			var indexOfTasksColumn = this.children.indexOf(task.column);
			if (indexOfTasksColumn < 0) {
				this.children.forEach(function(subColumn) {
					if (!subColumn.ignoreLimit)
						numberOfTasks += subColumn.tasks.length;
				});
			}
		}
		return limit - numberOfTasks > 0 && (!this.parent || this.parent.availableSpace(task));
	}
	
	this.limit = function() {
		var limit = this.configuration.get("columns.limits." + this.name);
		if (typeof limit == "string") {
			limit = parseInt(limit);
		}
		return !limit ? Number.POSITIVE_INFINITY : Math.abs(limit)
	}
	
	this.isFirstColumn = function() {
		return this.index == 0;
	}
}