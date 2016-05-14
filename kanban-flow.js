$(document).ready(function() {
	new Simulation().play();
});

function Simulation() {
	this.hourLengthInSeconds = 1;
	this.ticksPerHour = 60;
	this.time;
	this.taskCounter;
	this.timeoutHandler;
	this.gui = new GUI(this);
	this.board;
	this.stats;
	
	this.initBasics = function() {
		this.time = 0;
		this.taskCounter = 1;
		this.board = new Board(this.ticksPerHour);
		this.stats = new Stats();
		this.gui.update(this.board, this.stats);
	}
	this.initBasics();

	this.play = function() {
		if (!this.timeoutHandler)
			this.timeoutHandler = setTimeout(this.tick.bind(this), this.hourLengthInSeconds * 1000 / this.ticksPerHour);
	}
	
	this.stop = function() {
		clearTimeout(this.timeoutHandler);
		this.timeoutHandler = null;
		this.initBasics()
	}
	
	this.pause = function() {
		clearTimeout(this.timeoutHandler);
		this.timeoutHandler = null;
	}

	this.tick = function() {
		this.timeoutHandler = null;
		this.board.updateColumnsLimitsFrom(this.gui);
		this.board.resetColumnsCapacity();
		this.addNewTasks(this.board);
		this.doWork(this.board.columns);
		this.moveTasks(this.board.columns);
		this.stats.recalculateStats(this.board, this.time);
		this.removeDoneTasks();
		this.gui.update(this.board, this.stats);
		this.play();
		this.time += 60/this.ticksPerHour;
	}

	this.addNewTasks = function() {
		var scrumStrategy = function() {
			if (this.time / (60 * 8) % 10 == 0) {
				for (var i = 0; i < 55; i++) {
					this.board.addTask(new Task(this.taskCounter++, this.time));
				}
			}
		}.bind(this);
		var stableFlow = function() {
			if (this.time % 120 == 0 || this.time % 180 == 0) {
				this.board.addTask(new Task(this.taskCounter++, this.time));
			}
		}.bind(this);
		var stableRandomFlow = function() {
			if (this.time % 60 == 0 && Math.random() < 0.7) {
				this.board.addTask(new Task(this.taskCounter++, this.time));
			}
		}.bind(this);

		//stableFlow();
		//stableRandomFlow();
		scrumStrategy();
	}

	this.moveTasks = function(columns) {
		var changed = true;
		while (changed) {
			changed = false;
			columns.forEach(function(column) {
				column.tasks.forEach(function(task) {
					if (task.finished()) {
						var nextColumn = this.findNextColumn(task, columns);
						if (nextColumn != column) {
							changed = true;
							column.moveTaskTo(task, nextColumn);
						}
					}
				}.bind(this));
			}.bind(this));
		}
	}
	
	this.removeDoneTasks = function() {
		if (this.time % 60 == 0) this.board.removeDoneTasks();
	}

	this.findNextColumn = function(task, columns) {
		var column = task.column;
		var index = columns.indexOf(column);
		while (column && task.finished(column) && (!columns[index + 1] || columns[index + 1].availableSpace(task))) {
			column = columns[++index];
		}
		if (!column) {
			// move to done just before removing from the board
			column = columns[columns.length - 1];
		}
		return column;
	}

	this.doWork = function(columns) {
		columns.forEach(function(column) {
			var i = 0;
			var amountOfWorkPerTask = column.tasks.length > 0 ? column.capacityLeft / column.tasks.length : 0;
			amountOfWorkPerTask = amountOfWorkPerTask > (120/this.ticksPerHour) ? (120/this.ticksPerHour) : amountOfWorkPerTask;
			while (column.capacityLeft > 0 && i < column.tasks.length) {
				var task = column.tasks[i++];
				var actuallyWorked = task.workOn(column.name, amountOfWorkPerTask);
				column.capacityLeft -= actuallyWorked;
			}
		}.bind(this));
	}
}

function GUI(simulation) {
	this.simulation = simulation;
	
	this.fps = 10;
	this.lastUpdated = Date.now();
	
	$('#timescale').slider({
		min: 50,
		max: 100000,
		scale: 'logarithmic',
		step: 5,
		value: 100
	}).on("slide", function(event) {
		simulation.hourLengthInSeconds = 100 / event.value;
	}).on("slideStop", function(event) {
		simulation.hourLengthInSeconds = 100 / event.value;
	});

	$(".stop").click(function() {
		simulation.stop();
	});
	$(".pause").click(function() {
		simulation.pause();
	});
	$(".play").click(function() {
		simulation.play();
	});
	
	this.getLimitForColumn = function (columnName) {
		var input = $("#" + columnName + "Header input");
		var result = Number.POSITIVE_INFINITY;
		if (input.length) {
			result = !parseInt(input.val()) ? Number.POSITIVE_INFINITY : Math.abs(parseInt(input.val()));
		}
		return result;
	}
	
	this.update = function(board, stats) {
		var now = Date.now();
		if (now - this.lastUpdated < 1000/this.fps) return;
		this.lastUpdated = now;
		updateTime(this.simulation.time);
		updateStats(stats);
		updateBoard(board);
	}

	function updateTime(time) {
		function pad(n) {
		    return (n < 10) ? ("0" + n) : n;
		}
		$("#day").text(pad(Math.floor(time / (8 * 60)) + 1));
		$("#hour").text(pad(Math.floor(time/60) % 8  + 9) + ":" + pad(time % 60));
	}
	
	function updateStats(stats) {
		var wipAvg = stats.getWipAvg();
		var leadTimeAvg = stats.getLeadTimeAvg();
		$('#stats-wip').text(wipAvg.toFixed(1));
		$('#stats-throughput').text(stats.getThroughputAvg().toFixed(1));
		$('#stats-lead-time').text(leadTimeAvg.toFixed(1));
		$('#stats-wip-lead-time').text((wipAvg / leadTimeAvg).toFixed(1));
	}

	function updateBoard(board) {
		$($('.tasks td').get().reverse()).each(function() {
			var columnVisual = $(this);
			var id = columnVisual.attr("id");
			columnVisual.children().each(function() {
				var taskVisual = $(this);
				var taskId = taskVisual.attr("id");
				var task = board.tasks[taskId];
				if (task) {
					taskVisual.find('.progress-bar').width((100 * task[task.column.name] / task[task.column.name + 'Original']).toFixed(1) + '%');
				}
				if (!task) {
					taskVisual.remove();
				} else if (task.column && task.column.name != id) {
					taskVisual.detach().appendTo(task.column.name);
				}

			});
		});
		for (var key in board.tasks) {
			if (!board.tasks.hasOwnProperty(key)) {
				continue;
			}
			var task = board.tasks[key];
			if ($("#" + task.id).length == 0) {
				var newTask = $("<div class='task' id='" + task.id + "'><div>" + task.id + "</div><div class='progress'><div class='progress-bar progress-bar-info' style='width:100%'/></div></div>");
				$('#' + task.column.name).append(newTask);
			}
		}
	}
}


Array.prototype.average = function(){
	var total = 0;
	for (var i = 0; i < this.length; i++) {
		total += this[i];
	}
	return total / this.length;
}

function Board(ticksPerHour) {
	this.columns = null;
	this.tasks = {};
	this.ticksPerHour = ticksPerHour;
	
	createColumns(this);
	
	this.lastColumn = function() {
		return this.columns[this.columns.length - 1];
	}
	
	this.addTask = function(task) {
		this.columns[0].addTask(task);
		this.tasks[task.id] = task;
	}
	
	this.removeDoneTasks = function() {
		var lastColumn = this.columns[this.columns.length - 1];
		lastColumn.tasks.forEach(function(task) {
			task.column = null;
			delete this.tasks[task.id];
		}.bind(this));
		lastColumn.tasks = [];
	}
	
	this.resetColumnsCapacity = function() {
		this.columns.forEach(function(column) {
			column.resetCapacity(this.ticksPerHour);
		}.bind(this));
	}
	
	this.getCurrentWip = function() {
		return Object.keys(this.tasks).length - this.getDoneTasksCount();
	}
	
	this.getDoneTasksCount = function() {
		return this.lastColumn().tasks.length;
	}
	
	this.updateColumnsLimitsFrom = function(gui) {
		var updateColumnLimit = function(column) {
			if (!column) return;
			column.limit = gui.getLimitForColumn(column.name);
		}

		this.columns.forEach(function(column) {
			updateColumnLimit(column);
			updateColumnLimit(column.parent);
		});

	}
	
	function createColumns(board) {
		board.columns = [];
		var columns = board.columns;
		columns.push(new Column("input"));
		Array.prototype.push.apply(columns, createColumnWithChildren("analysis", 2*60).children);
		Array.prototype.push.apply(columns, createColumnWithChildren("development", 5*60).children);
		Array.prototype.push.apply(columns, createColumnWithChildren("qa", 3*60).children);
		Array.prototype.push.apply(columns, createColumnWithChildren("deployment", 60).children);
	}

	function createColumnWithChildren(name, capacity) {
		var parentColumn = new Column(name + "WithQueue");
		var column = new Column(name, capacity);
		column.parent = parentColumn;
		var done = new Column(name + "Done");
		done.parent = parentColumn;
		parentColumn.children.push(column);
		parentColumn.children.push(done);
		return parentColumn;
	}
}

function Task(taskId, time) {
	this.id = "Task" + taskId;
	this.created = time;
	this.analysis = 2*60;
	this.development = 7*60;
	this.qa = 4*60;
	this.deployment = 60;
	this.analysisOriginal = 2*60;
	this.developmentOriginal = 7*60;
	this.qaOriginal = 4*60;
	this.deploymentOriginal = 60;
	this.column = null;
	
	this.finished = function (column) {
		if (!column) {
			column = this.column;
		}
		return this[column.name] <= 0 || !this[column.name];
	}
	
	this.workOn = function(workType, amount) {
		if (this[workType] && this[workType] > 0) {
			this[workType] -= amount;
			return amount;
		}
		return 0;
	}
}

function Column(name, capacity) {
	if (!capacity) capacity = Number.POSITIVE_INFINITY;
	this.name = name;
	this.limit = Number.POSITIVE_INFINITY;
	this.capacity = capacity;
	this.capacityLeft = capacity;
	this.tasks = [];
	this.children = [];
	this.parent = null;
	
	this.resetCapacity = function(ticksPerHour) {
		this.capacityLeft = this.capacity / ticksPerHour;
	}
	
	this.addTask = function(task) {
		this.tasks.push(task);
		task.column = this;
	}
	
	this.moveTaskTo = function(task, nextColumn) {
		this.tasks.splice(this.tasks.indexOf(task), 1);
		task.column = nextColumn;
		if (nextColumn) {
			nextColumn.tasks.push(task);
		}
	}
	
	this.availableSpace = function(task) {
		var limit = this.limit;
		var numberOfTasks = this.tasks.length;
		if (this.children.length > 0) {
			//checking for parent column of task
			var indexOfTasksColumn = this.children.indexOf(task.column);
			if (indexOfTasksColumn < 0) {
				this.children.forEach(function(subColumn) {
					numberOfTasks += subColumn.tasks.length;
				});
			}
		}
		return limit - numberOfTasks > 0 && (!this.parent || this.parent.availableSpace(task));
	}
}

function Stats() {
	this.leadTimes = [];
	this.wipCount = [];
	this.tasksFinished = [];
	this.dataPointsToRemember = 8  * 20; // hours * days
	
	this.getWipAvg = function() {
		return this.wipCount.average();
	}
	
	this.getThroughputAvg = function() {
		return this.tasksFinished.average() * 8;
	}
	
	this.getLeadTimeAvg = function() {
		return ([].concat.apply([], this.leadTimes)).average() / (8 * 60);
	}
	
	this.recalculateStats = function(board, time) {
		if (time % 60 != 0) return;
		var position = (time / 60) % this.dataPointsToRemember;
		var lastColumn = board.lastColumn();
		var leadTimes = [];
		this.leadTimes[position] = leadTimes;
		lastColumn.tasks.forEach(function(task) {
			leadTimes.push(time - task.created);
		});
		this.tasksFinished[position] = board.getDoneTasksCount();
		this.wipCount[position] = board.getCurrentWip();
	}
}

