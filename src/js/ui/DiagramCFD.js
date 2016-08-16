function DiagramCFD(simulation) {
    this.simulation = simulation;
    $$(".simulation-cfd").CanvasJSChart($.extend(true, {}, commonDiagramProperties, {
        toolTip: {
            contentFormatter: function (e) {
                var content = "Day: <strong>" + (e.entries[0].dataPoint.x + 1) + "</strong><br/>";
                for (var i = e.entries.length - 1; i >= 0; i--) {
                    content += e.entries[i].dataSeries.name + ": <strong>" + e.entries[i].dataPoint.y + "</strong><br/>";
                }
                return content;
            },
        },
        axisX: {
            labelFormatter: function (e) {
                return e.value + 1;
            }
        },
        axisY: {
            includeZero: false,
        },
        rangeChanged: function (e) {
            var indexOfLowestElement = Math.floor(e.axisX.viewportMinimum);
            e.chart.options.axisY.minimum = e.chart.options.data[0].dataPoints[indexOfLowestElement].y;
            e.chart.render();
        },
        data: [],
    }));
    $$(".simulation-cfd-tab").bind('isVisible', function () {
        this.updateConfiguration();
        this.update();
    }.bind(this));
    var colors = ['silver', 'mediumaquamarine', 'lightskyblue', 'lightpink', 'lightgray', 'lightcoral', 'lightblue', 'burlywood', 'antiquewhite'];
    this.updateConfiguration = function () {
        var groups = [];
        var group = [];
        var checkboxes = $$(".simulation-cfd-settings input[type='checkbox']", false);
        for (var i = 0; i < checkboxes.length; i++) {
            var checkbox = checkboxes[i];
            var checked = checkbox.checked;
            if (checked) {
                group = [];
                groups.push(group);
            }
            group.push([checkbox.parentElement, this.simulation.board.columns[i]]);
        }
        for (var i = 0; i < groups.length; i++) {
            for (var j = 0; j < groups[i].length; j++) {
                $(groups[i][j][0]).css("backgroundColor", colors[i]);
            }
        }
        var model = [];
        for (var i = 0; i < groups.length; i++) {
            var columnsToSum = [];
            var name = "group " + i;
            var fromActiveColumn = false;
            var fromColumn = false;
            var fromCoumnsActive = [];
            for (var j = 0; j < groups[i].length; j++) {
                var column = groups[i][j][1];
                columnsToSum.push(column);
                if (!fromColumn) {
                    name = column.label;
                    fromColumn = true;
                }
                if (!fromActiveColumn && !column.isQueue() && fromCoumnsActive.length == 0) {
                    name = column.label;
                    fromActiveColumn = true;
                }
                if (!column.isQueue()) {
                    fromCoumnsActive.push(column);
                }
                if (fromCoumnsActive.length > 1) {
                    name = "";
                    for (var k = 0; k < fromCoumnsActive.length; k++) {
                        name += fromCoumnsActive[k].shortLabel + " ";
                    }
                }
            }
            model[groups.length - 1 - i] = {
                type: "stackedArea",
                dataPoints: [],
                name: name.trim(),
                showInLegend: true,
                color: colors[i],
                columnsToSum: columnsToSum
            };
        }
        $$(".simulation-cfd").CanvasJSChart().options.data = model;
        this.lastUpdatedDay = -1;
        this.update();
    };

    this.lastUpdatedDay = 0;
    this.update = function () {
        var time = this.simulation.time;
        var stats = this.simulation.stats;
        var tab = $$(".simulation-cfd-tab:visible", false);
        if (tab.length == 0) {
            return;
        }
        var currentDay = Math.floor(time / (60 * 8));
        if (currentDay <= this.lastUpdatedDay) return;
        this.lastUpdatedDay = currentDay;
        var model = $$(".simulation-cfd").CanvasJSChart().options.data;
        for (var i = 0; i < model.length; i++) {
            var columnsToSum = model[i].columnsToSum;
            for (var j = model[i].dataPoints.length; j < stats.cfdData[columnsToSum[0].name].length; j++) {
                var sum = 0;
                for (var k = 0; k < columnsToSum.length; k++) {
                    sum += stats.cfdData[columnsToSum[k].name][j].y;
                }
                model[i].dataPoints[j] = {x: stats.cfdData[columnsToSum[0].name].x, y: sum};
            }
        }
        $$(".simulation-cfd").CanvasJSChart().render();
    }
    this.redraw = function () {
        this.lastUpdatedDay = -1;
        this.updateConfiguration();
        this.update();
    }

    this.renderCheckboxes = function () {
        $$(".simulation-cfd-settings-checkboxes").empty();
        var html = "";
        var previousParent = null;
        for (var i = 0; i < this.simulation.board.columns.length; i++) {
            var column = this.simulation.board.columns[i];
            html += "<div><input type='checkbox' ";
            if (column.index == 0) {
                html += "disabled checked";
            } else if (!column.parent || column.parent != previousParent) {
                previousParent = column.parent;
                html += "checked";
            }
            html += "/> " + column.label + "</div>";
        }
        $$(".simulation-cfd-settings-checkboxes").append(html);
        $$(".simulation-cfd-settings-checkboxes input[type='checkbox']").change(this.updateConfiguration.bind(this));
        $$(".simulation-cfd-settings-checkboxes div:not(:first-child)").click(function (event) {
            var checkbox = $(event.target).find("input[type='checkbox']")[0];
            if (!checkbox) return;
            checkbox.checked = !checkbox.checked;
            this.updateConfiguration();
        }.bind(this));
    }
}