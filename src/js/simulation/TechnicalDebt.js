function TechnicalDebt() {
    this.amount = 0;

    this.productivityRatio = function() {
        return Math.max(0.001, 1 - this.amount / 100000);
    }

    this.increase = function(amount) {
        this.amount += amount;
    }
    this.decrease = function(amount) {
        this.amount -= amount;
    }
}
