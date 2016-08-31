function Stats(simulation, configuration) {

    function DataSet(stats, interval, avgMultiplier, eventsAsArrays) {
        this.events = [];
        this.avg = null;
        this.avgHistory = [];
        this.interval = interval || 1;
        this.avgMultiplier = avgMultiplier || 1;
        this.stats = stats;
        this.updateHistoryFrom = 0;
        this.eventsAsArrays = eventsAsArrays;

        this.getAvg = function (index, forceRecalculate) {
            index = index == undefined ? this.events.length - 1 : index;
            if (forceRecalculate || !this.avg) {
                var subArray = this.events.slice(Math.max(0, index - (this.stats.dataPointsToRemember / this.interval)), index);
                if (this.eventsAsArrays) {
                    subArray = [].concat.apply([], subArray);
                }
                this.avg = subArray.average() * this.avgMultiplier;
            }
            return this.avg;
        }

        this.getAvgHistory = function () {
            for (var i = this.updateHistoryFrom; i < this.events.length; i++) {
                this.avgHistory.push({x: i * this.interval, y: this.getAvg(i, true)});
            }
            this.updateHistoryFrom = this.events.length;
            return this.avgHistory;
        }

        this.recalculateAvg = function () {
            this.avgHistory = [];
            this.updateHistoryFrom = 0;
        }

        this.addEvent = function (event) {
            this.events.push(event);
            this.avg = null;
        }
    }

    this.configuration = configuration;
    this.dataPointsToRemember = 8 * this.configuration.get("stats.noOfDaysForMovingAverage"); // hours * days
    this.cfdData = {};

    this.wip = new DataSet(this);
    this.throughput = new DataSet(this, 1, 8);
    this.availablePeople = new DataSet(this);
    this.busyPeople = new DataSet(this);
    this.capacityUtilisation = new DataSet(this);
    this.leadTime = new DataSet(this, 1, 1 / (8 * 60), true);
    this.touchTimePercent = new DataSet(this, 1, 1, true);
    this.costOfDelay = new DataSet(this, 8);
    this.valueDelivered = new DataSet(this, 8);
    this.valueDropped = new DataSet(this, 8);

    this.leadTimesHistory = [];

    for (var i = 0; i < simulation.board.columns.length; i++) {
        this.cfdData[simulation.board.columns[i].name] = [];
    }

    this.changeNoOfDaysForCountingAverages = function (newNoOfDays) {
        newNoOfDays = parseInt(newNoOfDays);
        if (Number.isNaN(newNoOfDays) || newNoOfDays <= 0) return;
        this.dataPointsToRemember = newNoOfDays * 8;
        this.wip.recalculateAvg();
        this.throughput.recalculateAvg();
        this.capacityUtilisation.recalculateAvg();
        this.leadTime.recalculateAvg();
        this.touchTimePercent.recalculateAvg();
        this.costOfDelay.recalculateAvg();
        this.valueDelivered.recalculateAvg();
        this.valueDropped.recalculateAvg();
    }
    this.configuration.onChange("stats.noOfDaysForMovingAverage", this.changeNoOfDaysForCountingAverages.bind(this));

    this.recalculateStats = function (simulation) {
        this.calculateAvailablePeople(simulation);
        this.calculateWip(simulation);
        if (simulation.time % 60 != 0) return;
        this.updateCfdData(simulation.board, simulation.time);

        var lastColumn = simulation.board.lastColumn();
        var leadTimes = [];
        var touchTimes = [];
        lastColumn.tasks.forEach(function (task) {
            var leadTime = task.getLeadTime();
            var touchTime = task.getTouchCount() * (60 / simulation.ticksPerHour);
            leadTimes.push(leadTime);
            touchTimes.push(100 * touchTime / leadTime);
        });
        this.leadTime.addEvent(leadTimes);
        this.touchTimePercent.addEvent(touchTimes);

        this.wip.addEvent(this.currentWip / simulation.ticksPerHour);
        this.currentWip = 0;
        this.throughput.addEvent(simulation.board.getDoneTasksCount(simulation.time - 60, simulation.time));

        this.availablePeople.addEvent(this.notWorkingCountSummed / simulation.ticksPerHour);
        this.busyPeople.addEvent(this.busyCountSummed / simulation.ticksPerHour);
        var lastPos = this.busyPeople.events.length - 1;
        this.capacityUtilisation.addEvent(100 * this.busyPeople.events[lastPos] / (this.busyPeople.events[lastPos] + this.availablePeople.events[lastPos]));
        this.notWorkingCountSummed = 0;
        this.busyCountSummed = 0;

        if (simulation.time % (60 * 8) == 0) {
            var cod = simulation.board.getCostOfDelay();
            this.costOfDelay.addEvent(cod);
            var tasksDone = simulation.board.getDoneTasks();
            var valueDelivered = 0;
            for (var i = 0; i < tasksDone.length; i++) {
                valueDelivered += tasksDone[i].value.remainingValue(simulation.time);
            }
            this.valueDelivered.addEvent(valueDelivered);

            var tasksDropped = simulation.board.droppedTasks;
            var valueDroppedSummed = 0;
            for (var i = 0; i < tasksDropped.length; i++) {
                valueDroppedSummed += tasksDropped[i].value.totalValue();
            }
            this.valueDropped.addEvent(valueDroppedSummed);
        }
        this.updateHistory(simulation.time);

    }

    this.notWorkingCountSummed = 0;
    this.busyCountSummed = 0;
    this.calculateAvailablePeople = function (simulation) {
        var notWorkingCount = simulation.team.getNotWorking().length;
        var teamSize = simulation.team.members.length;
        this.notWorkingCountSummed += notWorkingCount;
        this.busyCountSummed += teamSize - notWorkingCount;
    }

    this.currentWip = 0;
    this.calculateWip = function (simulation) {
        var currentWip = simulation.board.getCurrentWip();
        this.currentWip += currentWip;
    }

    this.updateHistory = function (time) {
        var tasks = simulation.board.getDoneTasks(simulation.time - 60, simulation.time);
        for (var i = 0; i < tasks.length; i++) {
            this.leadTimesHistory.push({x: time, y: tasks[i].getLeadTime() / 60 / 8});
        }
    }

    this.updateCfdData = function (board, time) {
        if (time % (60 * 8) != 0) return;
        var day = (time / 60 / 8);
        for (var i = 0; i < board.columns.length - 1; i++) {
            this.cfdData[board.columns[i].name].push({x: day, y: board.columns[i].tasks.length});
        }
        var lastColumnName = board.columns[board.columns.length - 1].name;
        var lastColumn = this.cfdData[lastColumnName];
        var lastDoneCount = lastColumn[lastColumn.length - 1] ? lastColumn[lastColumn.length - 1].y : 0;
        lastColumn.push({x: day, y: (board.columns[board.columns.length - 1].tasks.length + lastDoneCount)});
    }
}