function Value(start, durationInDays, valuePerDay) {
    this.start = start;
    this.end = this.start + durationInDays * 8 * 60;
    this.valuePerDay = valuePerDay;
    this.task = null;

    this.costOfDelay = function (now, avgLeadTime) {
        var effort = 0;
        if (this.task.column.isFirstColumn()) {
            effort = avgLeadTime * 8 * 60 || this.task.getRemainingWork();
        } else {
            effort = this.task.getRemainingWork();
        }
        if (now + effort > this.start && now + effort < this.end) {
            return valuePerDay;
        }
        return 0;
    }

    this.remainingValue = function (now) {
        return Math.max(0, Math.floor((this.end - Math.max(now, this.start)) / 8)) * this.valuePerDay;
    }

    this.currentDailyValue = function (now) {
        if (now > this.start && now < this.end) {
            return valuePerDay;
        }
        return 0;
    }

    this.totalValue = function () {
        return Math.floor((this.end - this.start) / 8) * this.valuePerDay
    }
}