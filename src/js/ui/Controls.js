function Controls(simulation, gui) {
    this.simulation = simulation;
    this.gui = gui;
    this.showAllBoard = false;

    this.adjustTempo = function (sliderValue) {
        this.simulation.hourLengthInSeconds = 100 / sliderValue;
        if (this.simulation.hourLengthInSeconds < 0.3) {
            if (this.gui.animate) {
                this.turnOffAnimations();
            }
            this.gui.animate = false;
        } else {
            if (!this.gui.animate) {
                this.turnOnAnimations();
            }
            this.gui.animate = true;
        }
    }
    $$('.timescale').slider({
        min: 50,
        max: 100000,
        scale: 'logarithmic',
        step: 5,
        value: 100,
        tooltip: 'hide',
    }).on("slide", function (event) {
        this.adjustTempo(event.value);
    }.bind(this)).on("slideStop", function (event) {
        this.adjustTempo(event.value);
        ga('send', {
            hitType: 'event',
            eventCategory: 'Control',
            eventAction: 'speed',
            eventLabel: 'Speed Changed',
            eventValue: simulation.hourLengthInSeconds
        });
    }.bind(this));

    this.turnOffAnimations = function () {
        $$(".task").removeClass("task-animation");
    }
    this.turnOnAnimations = function () {
        $$(".task").addClass("task-animation");
    }

    $$(".stop").click(function () {
        this.gui.stop();
        ga('send', {
            hitType: 'event',
            eventCategory: 'Control',
            eventAction: 'stop',
            eventLabel: 'Stopped',
        });
    }.bind(this));
    $$(".pause").click(function () {
        this.gui.pause();
    }.bind(this));
    $$(".play").click(function () {
        this.gui.play();
    }.bind(this));
    $$(".show").click(function () {
        if (this.showAllBoard) {
            $(".board-wrapper").css("max-height", 300);
            this.showAllBoard = false;
        } else {
            $(".board-wrapper").css("max-height", 800);
            this.showAllBoard = true;
        }
    }.bind(this));
}