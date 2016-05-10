$(document).ready(function() {

	var hourLengthInSeconds = 1;
	var hour;
	var taskCounter;
	var columns;
	var tasks;
	initBasics();
	updateTime(hour);
	var timeoutHandler = setTimeout(hourPassed, hourLengthInSeconds * 1000);
	var dataPoints;
	var dataPointsToRemember = 4 * 20;


	function initBasics() {
		hour = 0;
		taskCounter = 1;
		updateTime(hour);
		columns = createColumns();
		tasks = {};
		dataPoints = {};
		dataPoints['leadTimes'] = [];
		dataPoints['wipCount'] = [];
		dataPoints['tasksFinished'] = [];
	}

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
		updateUI(columns, tasks)
	});
	$(".pause").click(function() {
		clearTimeout(timeoutHandler);
		timeoutHandler = null;
	});
	$(".play").click(function() {
		if (!timeoutHandler)
			timeoutHandler = setTimeout(hourPassed, hourLengthInSeconds * 1000);
	});

	function hourPassed() {

		updateColumnsLimits(columns);
		resetColumnsCapacity(columns);
		addNewTasks(columns[0]);
		doWork(columns);
		moveTasks(columns);
		recalculateStats();
		updateUI(columns, tasks);
		timeoutHandler = setTimeout(hourPassed, hourLengthInSeconds * 1000);
		hour++;
	}

	function updateTime(hour) {
		$("#day").text(Math.floor(hour / 8) + 1);
		$("#hour").text((hour % 8 + 9) + ":00");
	}

	function addNewTasks(column) {
		var scrumStrategy = function() {
			if (hour / 8 % 10 == 0) {
				for (var i = 0; i < 55; i++) {
					createTask(column);
				}
			}
		}
		var stableFlow = function() {
			if (hour % 2 == 0 || hour % 3 == 0) {
				createTask(column);
			}
		}
		var stableRandomFlow = function() {
			if (Math.random() < 0.7) {
				createTask(column);
			}
		}

		//stableFlow();
		//stableRandomFlow();
		scrumStrategy();
	}



	function createTask(column) {
		var task = {};
		task.id = "Task" + (taskCounter++);
		task.created = hour;
		task.analysis = 2;
		task.development = 7;
		task.qa = 4;
		task.deployment = 1;
		task.column = column;
		column.tasks.push(task);
		tasks[task.id] = task;
		return task;
	}

	function moveTasks(columns) {
		removeDoneTasks(columns);
		var changed = true;
		while (changed) {
			changed = false;
			columns.forEach(function(column) {
				column.tasks.forEach(function(task) {
					if (finished(task)) {
						var nextColumn = findNextColumn(task, columns);
						if (nextColumn != column) {
							changed = true;
							column.tasks.splice(column.tasks.indexOf(task), 1);
							task.column = nextColumn;
							if (nextColumn) {
								nextColumn.tasks.push(task);
							}
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
		while (column && finished(task, column) && availableSpace(task, columns[index + 1])) {
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

	function finished(task, column) {
		if (!column) {
			column = task.column;
		}
		return task[column.name] <= 0.1 || !task[column.name];
	}

	function doWork(columns) {
		columns.forEach(function(column) {
			var i = 0;
			var amountOfWorkPerTask = column.tasks.length > 0 ? (column.capacityLeft / column.tasks.length) : 0;
			amountOfWorkPerTask = amountOfWorkPerTask > 2 ? 2 : amountOfWorkPerTask;
			while (column.capacityLeft > 0 && i < column.tasks.length) {
				var task = column.tasks[i++];
				if (task[column.name] && task[column.name] > 0) {
					task[column.name] = task[column.name] - amountOfWorkPerTask;
					column.capacityLeft -= amountOfWorkPerTask;
				}
			}
		});
	}

	function resetColumnsCapacity(columns) {
		columns.forEach(function(column) {
			column.capacityLeft = column.capacity;
		});
	}

	function createColumns() {
		var columns = [];
		columns.push(createColumn("input"));
		Array.prototype.push.apply(columns, createColumnWithChildren("analysis", 2).children);
		Array.prototype.push.apply(columns, createColumnWithChildren("development", 5).children);
		Array.prototype.push.apply(columns, createColumnWithChildren("qa", 3).children);
		Array.prototype.push.apply(columns, createColumnWithChildren("deployment", 1).children);
		return columns;
	}

	function createColumnWithChildren(name, capacity) {
		var parentColumn = createColumn(name + "WithQueue");
		var column = createColumn(name, capacity);
		column.parent = parentColumn;
		var done = createColumn(name + "Done");
		done.parent = parentColumn;
		parentColumn.children.push(column);
		parentColumn.children.push(done);
		return parentColumn;
	}

	function createColumn(name, capacity) {
		if (!capacity) capacity = Number.POSITIVE_INFINITY;
		var column = {};
		column.name = name;
		column.limit = Number.POSITIVE_INFINITY;
		column.capacity = capacity;
		column.capacityLeft = capacity;
		column.tasks = [];
		column.children = [];
		column.parent = null;
		return column;
	}

	function updateColumnsLimits(columns) {
		var updateColumnLimit = function(column) {
			if (!column) return;
			var input = $("#" + column.name + "Header input");
			if (input.length) {
				column.limit = input.val();
			}
		}

		columns.forEach(function(column) {
			updateColumnLimit(column);
			updateColumnLimit(column.parent);
		});

	}

	function recalculateStats() {
		var position = hour % dataPointsToRemember;
		var lastColumn = columns[columns.length - 1];
		var leadTimes = [];
		dataPoints['leadTimes'][position] = leadTimes;
		lastColumn.tasks.forEach(function(task) {
			leadTimes.push(hour - task.created);
		});
		dataPoints['tasksFinished'][position] = lastColumn.tasks.length;
		dataPoints['wipCount'][position] = Object.keys(tasks).length - lastColumn.tasks.length;
	}

	function updateUI(columns, tasks) {
		if (hourLengthInSeconds < 0.01 && hour % 4 != 0) return;

		updateTime(hour);
		updateStats(columns);
		updateBoard();


	}

	function updateStats(columns) {

		if (dataPoints['leadTimes'].length == dataPointsToRemember) {
			var wipAvg = average(dataPoints['wipCount']);
			$('#stats-wip').text(wipAvg.toFixed(1));
			var throughputAvg = average(dataPoints['tasksFinished']) * 8;
			$('#stats-throughput').text(throughputAvg.toFixed(1));
			var leadTimeAvg = average([].concat.apply([], dataPoints['leadTimes'])) / 8;
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
				var newTask = $("<div class='task' id='" + task.id + "'>" + task.id + "</div>");
				$('#' + task.column.name).append(newTask);
			}
		}
	}

	function average(array) {
		var total = 0;
		for (var i = 0; i < array.length; i++) {
			total += array[i];
		}
		return total / array.length;
	}

});
