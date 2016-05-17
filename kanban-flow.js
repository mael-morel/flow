$(document).ready(function() {
	new Simulation().play();
});

function Simulation() {
	this.hourLengthInSeconds = 1;
	this.ticksPerHour = 12;
	this.time;
	this.taskCounter;
	this.timeoutHandler;
	this.gui = new GUI(this);
	this.board;
	this.stats;
	this.team;
	this.maxTasksOnOnePerson = 2;
	this.maxPeopleOnOneTask = 2;
	
	this.initBasics = function() {
		this.time = 0;
		this.taskCounter = 1;
		this.team = new Team();
		this.board = new Board(this.ticksPerHour);
		this.stats = new Stats();
		this.gui.update(this.board, this.stats, true);
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
		this.gui.update(this.board, this.stats, true);
		clearTimeout(this.timeoutHandler);
		this.timeoutHandler = null;
	}

	this.tick = function() {
		this.timeoutHandler = null;
		this.board.updateColumnsLimitsFrom(this.gui);
		this.addNewTasks(this.board);
		this.assignTeamMembersToTasks(this.team, this.board);
		this.doWork();
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
		/*
		1. Najpierw szukamy zadan do pracy exlusive w kolumnie specjalizacji (zaczynajac od prawej)
		2. Jesli zostaly zadania do pracy w tej kolumnie, szukamy osob nie pracujacych z innymi nad innym zadaniem w kolumnie, wybierajac tych z najmniejsza liczba zadan w toku
		3. Jesli zostali ludzie do pracy w specjalizacji, probojemy ich dodawac do juz pracujacych, wybierajac zadania z najmniejsza liczba ludzi
		4. Jesli zostali ludzie do pracy, bierzemy sie za nastepna specjalizacje i powtarzamy kroki
		5. Po przejsciu wszystkich kolumn, jesli zostali ludzie do pracy (ktorzy nie pracuja nad zadnym zadaniem), probojemy dopasowac ich do innych kolumn zgodnie z pow. algorytmem
		*/
	this.assignTeamMembersToTasks = function(team, board) {
		var columns = this.board.columns;
		for (var columnIndex = columns.length - 1; columnIndex>=0; columnIndex--) {
			var column = columns[columnIndex];
			var notWorkingPpl = this.team.getNotWorking(column.name);
			var tasksWithNoAssignee = column.getNotAssignedTasks();
			var i;
			for (i=0; i<notWorkingPpl.length && i<tasksWithNoAssignee.length; i++) {
				notWorkingPpl[i].assignTo(tasksWithNoAssignee[i]);
			}
			var workingPpl = this.team.getSpecialistsWorkingInColumnOrderedByTaskCount(column);
			var j = 0;
			var filterPpl = function() {
				return workingPpl.filter(function(person) {
					return person.tasksWorkingOn.length < this.maxTasksOnOnePerson;
				}.bind(this));
			}.bind(this);
			workingPpl = filterPpl();
			for (; i < tasksWithNoAssignee.length && workingPpl.length > 0; i++) {
				if (workingPpl[j].tasksWorkingOn.length > workingPpl[(j + 1) % workingPpl.length].tasksWorkingOn.length) {
					j = (j + 1) % workingPpl.length;
				}
				workingPpl[j].assignTo(tasksWithNoAssignee[i]);
				workingPpl = filterPpl();
			}
		}
	}

	this.doWork = function() {	
		this.team.members.forEach(function(person) {
			person.work(this.ticksPerHour);
		}.bind(this));
	}
}

function Team() {
	this.members = [];
	
	this.members.push(new Person("analysis", 1));
	this.members.push(new Person("analysis", 2));
	this.members.push(new Person("development", 1));
	this.members.push(new Person("development", 2));
	this.members.push(new Person("development", 3));
	this.members.push(new Person("development", 4));
	this.members.push(new Person("development", 5));
	this.members.push(new Person("qa", 1));
	this.members.push(new Person("qa", 2));
	this.members.push(new Person("qa", 3));
	this.members.push(new Person("deployment", 1));
	
	this.getNotWorking = function(specialisation) {
		var result = [];
		this.members.forEach(function(person) {
			if (person.tasksWorkingOn.length == 0 && person.specialisation == specialisation) {
				result.push(person);
			}
		});
		return result;
	}
	
	this.getSpecialistsWorkingInColumnOrderedByTaskCount = function(column) {
		var result = [];
		column.tasks.forEach(function(task) {
			task.peopleAssigned.forEach(function(person) {
				if (person.specialisation == column.name) {
					if (result.indexOf(person) == -1) {
						result.push(person);
					}
				}
			});
		});
		result.sort(function(a, b) {
			return a.tasksWorkingOn.length > b.tasksWorkingOn.length;
		});
		return result;
	}
}

function Person(specialisation, id) {
	this.specialisation = specialisation;
	this.tasksWorkingOn = [];
	this.productivityPerHour = 60;
	this.id = id;
	
	this.assignTo = function(task) {
		this.tasksWorkingOn.push(task);
		task.peopleAssigned.push(this);
	}
	
	this.work = function(ticksPerHour) {
		if (this.tasksWorkingOn.length == 0) return;
		var workPerTask = this.productivityPerHour / this.tasksWorkingOn.length / ticksPerHour;
		this.tasksWorkingOn.forEach(function(task) {
			if (task.column.name != specialisation) {
				task.work(workPerTask / 2);
			} else {
				task.work(workPerTask);
			}
			if (task.finished()) {
				task.unassignPeople();
			}
		});
	}
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
		Array.prototype.push.apply(columns, createColumnWithChildren("analysis").children);
		Array.prototype.push.apply(columns, createColumnWithChildren("development").children);
		Array.prototype.push.apply(columns, createColumnWithChildren("qa").children);
		Array.prototype.push.apply(columns, createColumnWithChildren("deployment").children);
		board.columns[board.columns.length - 1].ignoreLimit = true;
	}

	function createColumnWithChildren(name, capacity) {
		var parentColumn = new Column(name + "WithQueue");
		var column = new Column(name, false);
		column.parent = parentColumn;
		var done = new Column(name + "Done", true);
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
	this.peopleAssigned = [];
	
	this.finished = function (column) {
		if (!column) {
			column = this.column;
		}
		return this[column.name] <= 0 || !this[column.name];
	}
	
	this.work = function(amount) {
		this[this.column.name] -= amount;
	}
	
	this.unassignPeople = function() {
		this.peopleAssigned.forEach(function(person) {
			person.tasksWorkingOn.splice(person.tasksWorkingOn.indexOf(this), 1);
		}.bind(this));
		this.peopleAssigned = [];
	}
}

function Column(name, queue) {
	this.name = name;
	this.limit = Number.POSITIVE_INFINITY;
	this.tasks = [];
	this.children = [];
	this.parent = null;
	this.ignoreLimit = false;
	this.queue = queue;
	
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
		return queue;
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
		if (this.ignoreLimit) return true;
		var limit = this.limit;
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
}

function Stats() {
	this.leadTimes = [];
	this.wipCount = [];
	this.tasksFinished = [];
	this.dataPointsToRemember = 8  * 20; // hours * days
	this.wipAvg = null;
	this.throughputAvg = null;
	this.leadTimeAvg = null;
	
	this.getWipAvg = function() {
		this.wipAvg = this.wipAvg || this.wipCount.average();
		return this.wipAvg;
	}
	
	this.getThroughputAvg = function() {
		this.throughputAvg = this.throughputAvg || this.tasksFinished.average() * 8;
		return this.throughputAvg;
	}
	
	this.getLeadTimeAvg = function() {
		this.leadTimeAvg = this.leadTimeAvg ||  ([].concat.apply([], this.leadTimes)).average() / (8 * 60);
		return this.leadTimeAvg;
	}
	
	this.recalculateStats = function(board, time) {
		if (time % 60 != 0) return;
		this.wipAvg = null;
		this.throughputAvg = null;
		this.leadTimeAvg = null;
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
	
	this.update = function(board, stats, force) {
		var now = Date.now();
		if (!force && now - this.lastUpdated < 1000/this.fps) return;
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
				var task = taskVisual.data("taskReference");
				if (task.column) {
					taskVisual.find('.progress-bar').width((100 * task[task.column.name] / task[task.column.name + 'Original']).toFixed(1) + '%');
					taskVisual.find('.task-status').html(createStatusSpan(task.peopleAssigned));
				}
				if (!board.tasks[task.id]) {
					taskVisual.remove();
				} else if (task.column && task.column.name != id) {
					taskVisual.remove();
					var newTaskInstance = createTaskDiv(task);
					$("#" + task.column.name).append(newTaskInstance);
					taskVisual = newTaskInstance;
				}
			});
		});
		for (var key in board.tasks) {
			if (!board.tasks.hasOwnProperty(key)) {
				continue;
			}
			var task = board.tasks[key];
			if ($("." + task.id).length == 0) {
				var newTask = createTaskDiv(task);
				$('#' + task.column.name).append(newTask);
			}
		}
	}
	
	function createTaskDiv(task) {
		var html = "<div class='task " + task.id + "'><div class='task-status'>" + createStatusSpan(task.peopleAssigned)+ "</div><div>" + task.id + "</div><div class='progress'><div class='progress-bar progress-bar-info' style='width:100%'/></div></div>";
		return $(html).data("taskReference", task);
	}
	function createStatusSpan(peopleWorkingOn) {
		if (peopleWorkingOn.length == 0) {
			return "<span class='glyphicon glyphicon-hourglass waiting'/>";
		}
		var html = "";
		peopleWorkingOn.forEach(function (person) {
			html += "<span class='glyphicon glyphicon-user person " +person.specialisation + "'/>";
		});
		return html;
	}
}


Array.prototype.average = function(){
	var total = 0;
	for (var i = 0; i < this.length; i++) {
		total += this[i];
	}
	return total / this.length;
}