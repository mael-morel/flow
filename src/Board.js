function Board(ticksPerHour, simulation) {
	this.columns = null;
	this.tasks = {};
	this.ticksPerHour = ticksPerHour;
	this.droppedTasks = [];
	
	createColumns(this, simulation);
	
	this.reprioritiseTasks = function(sortTasksFun) {
		for (var i=0; i<this.columns.length -2; i++) {
			sortTasksFun(this.columns[i].tasks);
		}
	}
	
	this.lastColumn = function() {
		return this.columns[this.columns.length - 1];
	}
	
	this.addTask = function(task) {
		this.columns[0].addTask(task);
		this.tasks[task.id] = task;
	}
	
	this.cleanDoneAndDropped = function() {
		var lastColumn = this.columns[this.columns.length - 1];
		lastColumn.tasks.forEach(function(task) {
			task.column = null;
			delete this.tasks[task.id];
		}.bind(this));
		lastColumn.tasks = [];
		this.droppedTasks = [];
	}
	
	this.getCurrentWip = function() {
		return Object.keys(this.tasks).length - this.getDoneTasksCount();
	}
	
	this.getColumnByName = function(columnName) {
		for (var i = 0; i < this.columns.length; i++) {
			if (this.columns[i].name == columnName) {
				return this.columns[i];
			}
		}
	}
	
	this.getDoneTasksCount = function(start, end) {
		return this.getDoneTasks(start, end).length;
	}
	
	this.getDoneTasks = function(start, end) {
		var result = [];
		var tasks = this.lastColumn().tasks;
		var columnName = this.lastColumn().name;
		if (!start || !end)
			return tasks.slice();
		var count = 0;
		for (var i=0; i < tasks.length; i++) {
			var timeFinished = tasks[i].arrivalTime[columnName];
			if(timeFinished > start && timeFinished <= end) result.push(tasks[i]);
		}
		return result;
	}
	
	this.getCostOfDelay = function() {
		var cod = 0;
		this.columns.slice(0, this.columns.length - 1).forEach(function(column) {
			column.tasks.forEach(function(task) {
				cod += task.value.costOfDelay(simulation.time);
			}.bind(this));
		}.bind(this));
		return cod;
	}
	
	this.removeTasksOverLimitFromBacklog = function() {
		var limit = this.columns[0].limit();
		var freshlyRemovedTasks = this.columns[0].tasks.splice(limit, this.columns[0].tasks.length);
		this.droppedTasks = this.droppedTasks.concat(freshlyRemovedTasks);
		freshlyRemovedTasks.forEach(function(task) {
			task.column = null;
			delete this.tasks[task.id];
		}.bind(this));
	}
	
	function createColumns(board, simulation) {
		board.columns = [];
		var columns = board.columns;
		columns.push(new Column("input", true, simulation, "Backlog"));
		Array.prototype.push.apply(columns, createColumnWithChildren("analysis", simulation, "Analysis", "An").children);
		Array.prototype.push.apply(columns, createColumnWithChildren("development", simulation, "Development", "Dev").children);
		Array.prototype.push.apply(columns, createColumnWithChildren("qa", simulation, "QA", "QA").children);
		Array.prototype.push.apply(columns, createColumnWithChildren("deployment", simulation, "Deployment", "Depl").children);
		board.columns[board.columns.length - 1].ignoreLimit = true;
		for (var i=0; i< columns.length; i++) {
			columns[i].index = i;
		}
	}

	function createColumnWithChildren(name, simulation, label, shortLabel) {
		var parentColumn = new Column(name + "WithQueue", false, simulation);
		var column = new Column(name, false, simulation, label, shortLabel);
		column.parent = parentColumn;
		var done = new Column(name + "Done", true, simulation, label + " Done", shortLabel + " D");
		done.parent = parentColumn;
		parentColumn.children.push(column);
		parentColumn.children.push(done);
		return parentColumn;
	}
}