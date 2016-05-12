$(document).ready(function() {

	var hourLengthInSeconds = 1;
	var time;
	var taskCounter;
	
	var tasks;
	var timeoutHandler = setTimeout(hourPassed, hourLengthInSeconds * 1000);
	var dataPoints;
	var dataPointsToRemember = 4 * 20;
	var gui = new GUI();
	var board;
	initBasics();

	function initBasics() {
		time = 0;
		taskCounter = 1;
		board = new Board()
		tasks = {};
		dataPoints = {};
		dataPoints['leadTimes'] = [];
		dataPoints['wipCount'] = [];
		dataPoints['tasksFinished'] = [];
		gui.update(board.columns, tasks);
	}

	function hourPassed() {
		updateColumnsLimits(board.columns);
		resetColumnsCapacity(board.columns);
		addNewTasks(board);
		doWork(board.columns);
		moveTasks(board.columns);
		recalculateStats();
		gui.update(board.columns, tasks);
		timeoutHandler = setTimeout(hourPassed, hourLengthInSeconds * 1000);
		time++;
	}

	function addNewTasks(board) {
		var createTask = function() {
			var task = new Task(taskCounter++, time);
			tasks[task.id] = task;
			return task;
		}
		
		var scrumStrategy = function(board) {
			if (time / 8 % 10 == 0) {
				for (var i = 0; i < 55; i++) {
					board.addTask(createTask());
				}
			}
		}
		var stableFlow = function(board) {
			if (time % 2 == 0 || time % 3 == 0) {
				board.addTask(createTask());
			}
		}
		var stableRandomFlow = function(board) {
			if (Math.random() < 0.7) {
				board.addTask(createTask());
			}
		}

		//stableFlow(board);
		//stableRandomFlow(board);
		scrumStrategy(board);
	}

	function moveTasks(columns) {
		removeDoneTasks(columns);
		var changed = true;
		while (changed) {
			changed = false;
			columns.forEach(function(column) {
				column.tasks.forEach(function(task) {
					if (task.finished()) {
						var nextColumn = findNextColumn(task, columns);
						if (nextColumn != column) {
							changed = true;
							column.moveTaskTo(task, nextColumn);
						}

					}
				});
			});
		}
	}

	function removeDoneTasks(columns) {
		var lastColumn = columns[columns.length - 1];
		lastColumn.tasks.forEach(function(task) {
			task.column = null;
			delete tasks[task.id];
		})
		lastColumn.tasks = [];
	}

	function findNextColumn(task, columns) {
		var column = task.column;
		var index = columns.indexOf(column);
		while (column && task.finished(column) && availableSpace(task, columns[index + 1])) {
			column = columns[++index];
		}
		if (!column) {
			// move to done just before removing from the board
			column = columns[columns.length - 1];
		}
		return column;
	}

	function availableSpace(task, column) {
		if (!column) return 1;
		var limit = column.limit;
		var numberOfTasks = column.tasks.length;
		if (column.children.length > 0) {
			//checking for parent column of task
			var indexOfTasksColumn = column.children.indexOf(task.column);
			if (indexOfTasksColumn < 0) {
				column.children.forEach(function(subColumn) {
					numberOfTasks += subColumn.tasks.length;
				});
			}
		}
		return limit - numberOfTasks > 0 && availableSpace(task, column.parent);
	}



	function doWork(columns) {
		columns.forEach(function(column) {
			var i = 0;
			var amountOfWorkPerTask = column.tasks.length > 0 ? Math.ceil(column.capacityLeft / column.tasks.length) : 0;
			amountOfWorkPerTask = amountOfWorkPerTask > 200 ? 200 : amountOfWorkPerTask;
			while (column.capacityLeft > 0 && i < column.tasks.length) {
				var task = column.tasks[i++];
				var actuallyWorked = task.workOn(column.name, amountOfWorkPerTask);
				column.capacityLeft -= actuallyWorked;
			}
		});
	}

	function resetColumnsCapacity(columns) {
		columns.forEach(function(column) {
			column.resetCapacity();
		});
	}

	function updateColumnsLimits(columns) {
		var updateColumnLimit = function(column) {
			if (!column) return;
			column.limit = gui.getLimitForColumn(column.name);
		}

		columns.forEach(function(column) {
			updateColumnLimit(column);
			updateColumnLimit(column.parent);
		});

	}

	function recalculateStats() {
		var position = time % dataPointsToRemember;
		var lastColumn = board.lastColumn();
		var leadTimes = [];
		dataPoints['leadTimes'][position] = leadTimes;
		lastColumn.tasks.forEach(function(task) {
			leadTimes.push(time - task.created);
		});
		dataPoints['tasksFinished'][position] = lastColumn.tasks.length;
		dataPoints['wipCount'][position] = Object.keys(tasks).length - lastColumn.tasks.length;
	}
	
	function GUI() {
		$('#timescale').slider({
			min: 50,
			max: 100000,
			scale: 'logarithmic',
			step: 5,
			value: 100
		}).on("slide", function(event) {
			hourLengthInSeconds = 100 / event.value;
		}).on("slideStop", function(event) {
			hourLengthInSeconds = 100 / event.value;
		});

		$(".stop").click(function() {
			clearTimeout(timeoutHandler);
			timeoutHandler = null;
			initBasics();
		});
		$(".pause").click(function() {
			clearTimeout(timeoutHandler);
			timeoutHandler = null;
		});
		$(".play").click(function() {
			if (!timeoutHandler)
				timeoutHandler = setTimeout(hourPassed, hourLengthInSeconds * 1000);
		});
		
		this.getLimitForColumn = function (columnName) {
			var input = $("#" + columnName + "Header input");
			var result = Number.POSITIVE_INFINITY;
			if (input.length) {
				result = !parseInt(input.val()) ? Number.POSITIVE_INFINITY : Math.abs(parseInt(input.val()));
			}
			return result;
		}
		
		this.update = function(columns, tasks) {
			if (hourLengthInSeconds < 0.01 && time % 4 != 0) return;
			updateTime(time);
			updateStats(columns);
			updateBoard();
		}

		function updateTime(time) {
			$("#day").text(Math.floor(time / 8) + 1);
			$("#hour").text((time % 8 + 9) + ":00");
		}
		
		function updateStats(columns) {
			if (dataPoints['leadTimes'].length == dataPointsToRemember) {
				var wipAvg = dataPoints['wipCount'].average();
				$('#stats-wip').text(wipAvg.toFixed(1));
				var throughputAvg = dataPoints['tasksFinished'].average() * 8;
				$('#stats-throughput').text(throughputAvg.toFixed(1));
				var leadTimeAvg = ([].concat.apply([], dataPoints['leadTimes'])).average() / 8;
				$('#stats-lead-time').text(leadTimeAvg.toFixed(1));
				$('#stats-wip-lead-time').text((wipAvg / leadTimeAvg).toFixed(1));

			}
		}

		function updateBoard() {
			$($('.tasks td').get().reverse()).each(function() {
				var columnVisual = $(this);
				var id = columnVisual.attr("id");
				columnVisual.children().each(function() {
					var taskVisual = $(this);
					var taskId = taskVisual.attr("id");
					var task = tasks[taskId];
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
			for (var key in tasks) {
				if (!tasks.hasOwnProperty(key)) {
					continue;
				}
				var task = tasks[key];
				if ($("#" + task.id).length == 0) {
					var newTask = $("<div class='task' id='" + task.id + "'><div>" + task.id + "</div><div class='progress'><div class='progress-bar progress-bar-info' style='width:100%'/></div></div>");
					$('#' + task.column.name).append(newTask);
				}
			}
		}
	}
});

Array.prototype.average = function(){
	var total = 0;
	for (var i = 0; i < this.length; i++) {
		total += this[i];
	}
	return total / this.length;
}

function Board() {
	this.columns = null;
	
	createColumns(this);
	
	this.lastColumn = function() {
		return this.columns[this.columns.length - 1];
	}
	
	this.addTask = function(task) {
		this.columns[0].addTask(task);
	}
	
	function createColumns(board) {
		board.columns = [];
		var columns = board.columns;
		columns.push(new Column("input"));
		Array.prototype.push.apply(columns, createColumnWithChildren("analysis", 200).children);
		Array.prototype.push.apply(columns, createColumnWithChildren("development", 500).children);
		Array.prototype.push.apply(columns, createColumnWithChildren("qa", 300).children);
		Array.prototype.push.apply(columns, createColumnWithChildren("deployment", 100).children);
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
	this.analysis = 200;
	this.development = 700;
	this.qa = 400;
	this.deployment = 100;
	this.analysisOriginal = 200;
	this.developmentOriginal = 700;
	this.qaOriginal = 400;
	this.deploymentOriginal = 100;
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
	
	this.resetCapacity = function() {
		this.capacityLeft = this.capacity;
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
}