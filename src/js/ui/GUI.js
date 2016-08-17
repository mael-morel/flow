function GUI(hookSelectorParam, simulation, configuration) {
    hookSelector = hookSelectorParam;
    this.configuration = configuration;
    this.simulation = simulation;
    this.fps = 4;
    this.lastUpdated = Date.now();
    this.renderTasks = true;
    this.animate = true;

    var controls = new Controls(this.simulation, this);
    this.cfdDiagram = new DiagramCFD(this.simulation);
    this.littlesDiagram = new DiagramLittles(this.simulation);
    this.codDiagram = new DiagramCOD(this.simulation);
    this.scatterplotDiagram = new DiagramScatterplot(this.simulation);

    this.colors = ['blue', 'chocolate', 'darkturquoise', 'royalblue', 'hotpink', 'green', 'goldenrod', 'aqua', 'cadetblue'];
    this.colorsForColumns = function () {
        var result = {};
        var columnDefs = this.configuration.get("columns.definitions");
        for (var i = 0; i < columnDefs.length; i++) {
            result[columnDefs[i].name] = this.colors[i % this.colors.length];
        }
        return result;
    }.bind(this)();

    this.rendered = false;
    this.init = function () {
        if (!this.rendered) {
            this.renderBoard();
            this.cfdDiagram.renderCheckboxes();
            this.renderHeadcountConfigInputs();
            this.renderTaskStrategies();
            this.renderBoardConfig();
            this.rendered = true;
        }
        this.bind();
        this.registerConfigurationOnChangeListeners();
        this.update(this.simulation.board, this.simulation.stats, true);
        this.updateColumnsAvailabilityCheckboxes();
        this.initialiseBacklogStrategies();
    }

    this.renderBoardConfig = function () {
        $$(".board-config tbody").sortable({
            items: ".sortit",
            cursor: "pointer"
        });
        var columns = this.simulation.board.columns;
        var html = "";
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            html += (i == 0 || i == columns.length - 1 ? "<tr><td>" : "<tr class='sortit'><td>");
            html += (i == 0 || i == columns.length - 1 ? "" : "<span class='glyphicon glyphicon-menu-hamburger' aria-hidden='true'></span>") + "</td><td>";
            html += (i == 0 || i == columns.length - 1 ? "" : "<input data-type='group' type='text' placeholder='Group name' value='" + (column.parent ? column.parent.boardLabel : "") + "'/>");
            html += "</td><td><input data-type='label' type='text' placeholder='Column name' value='" + column.boardLabel + "'/></td>";
            html += "<td><input data-type='cfdLabel' type='text' placeholder='Long name' value='" + column.label + "'/></td><td>"
            html += (i == 0 || i == columns.length - 1 ? "" : "<input data-type='queue' type='checkbox' " + (column.isQueue() ? "checked" : "" ) + "/>");
            html += "</td><td>" + (i == 0 || i == columns.length - 1 ? "" : "<span class='glyphicon glyphicon-remove board-column-remove' aria-hidden='true'></span>");
            html += "</td></tr>";
        }
        $$(".board-config tr").after(html);
        var removeListener = function () {
            $(this).parent().parent().remove();
        };
        $$(".board-column-remove").click(removeListener);
        $$(".board-config-add-column").click(function () {
            var html = "<tr class='sortit'><td><span class='glyphicon glyphicon-menu-hamburger' aria-hidden='true'></span></td><td><input data-type='group' type='text' placeholder='Group name'></td><td><input data-type='label' type='text' placeholder='Column name'></td><td><input data-type='cfdLabel' type='text' placeholder='Long name'></td><td><input data-type='queue' type='checkbox'></td><td><span class='glyphicon glyphicon-remove board-column-remove' aria-hidden='true'></span></td></tr>"
            var rows = $$(".board-config tr", false);
            var newRow = $(html);
            $(rows[rows.length - 1]).before(newRow);
            newRow.find(".board-column-remove").click(removeListener);
        });

        $$(".board-config-save").click(function () {
            var newConfig = [];
            var groups = [];
            var groupIndex = 0;
            $$(".board-config tr:visible", false).each(function (index, row) {
                if (index == 0) return;
                $row = $(row);
                var column = {};
                newConfig.push(column);
                $row.find("input").each(function (index, input) {
                    var $input = $(input);
                    var value;
                    if (input.type == 'checkbox') {
                        value = input.checked;
                    } else {
                        value = input.value;
                    }
                    var type = $input.data("type");
                    if (type == "group" && value != "") {
                        if (groups.length == 0 || groups[groups.length - 1].label != value) {
                            var group = {};
                            group['label'] = value;
                            group.children = [];
                            group.name = "colgrp" + groupIndex;
                            groupIndex++;
                            groups.push(group);
                        }
                        var group = groups[groups.length - 1];
                        group.children.push(column);
                    }
                    column[type] = value;
                });
                if (!column.cfdLabel || column.cfdLabel == "") {
                    column.cfdLabel = (column.group ? column.group + " " : "") + column.label;
                }
                delete column['group'];
            });
            newConfig[newConfig.length - 1]["ignoreLimit"] = true;
            newConfig[newConfig.length - 1]["queue"] = true;
            newConfig[0]["queue"] = true;
            for (var i = 0; i < newConfig.length; i++) {
                newConfig[i].name = "col" + i;
            }
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var childrenNames = [];
                for (var j = 0; j < group.children.length; j++) {
                    childrenNames.push(group.children[j].name);
                }
                group.children = childrenNames;
                newConfig.push(group);
            }
            this.configuration.pauseListeners();
            this.configuration.set("columns.definitions", newConfig);

            var columnsWithUpdatedLimits = [];
            this.configuration.set("columns.limits", {});
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                this.configuration.set("columns.limits." + group.name, 3);
                columnsWithUpdatedLimits.push(group.name);
                for (var j = 0; j < group.children.length; j++) {
                    var columnName = group.children[j];
                    this.configuration.set("columns.limits." + columnName, null);
                    columnsWithUpdatedLimits.push(columnName);
                }
            }
            for (var i = 1; i < newConfig.length; i++) {
                var column = newConfig[i];
                if (columnsWithUpdatedLimits.indexOf(column.name) == -1) {
                    this.configuration.set("columns.limits." + column.name, 3);
                }
            }

            var clearColsFrom = function (obj) {
                var keys = Object.keys(obj);
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i].startsWith("col")) {
                        delete obj[keys[i]];
                    }
                }
            }
            var team = this.configuration.get("team");
            clearColsFrom(team);
            var constant = this.configuration.get("tasks.sizeStrategy.configs.constant");
            clearColsFrom(constant);
            var normal = this.configuration.get("tasks.sizeStrategy.configs.normal");
            clearColsFrom(normal);
            var tshirt = this.configuration.get("tasks.sizeStrategy.configs.tshirt");
            clearColsFrom(tshirt);
            var activeCount = 0;
            for (var i = 1; i < newConfig.length; i++) {
                var column = newConfig[i];
                if (column.queue === false) {
                    activeCount++;
                    team[column.name] = {headcount: 2, columns: [column.name]};
                    constant[column.name] = 2;
                    normal[column.name] = 2;
                    normal[column.name + "-variation"] = 1;
                }
            }
            for (var i = 1; i < newConfig.length && activeCount > 0; i++) {
                var column = newConfig[i];
                if (!column.queue) {
                    tshirt[column.name] = 100 / activeCount;
                }
            }
            this.updateURL();
            window.top.location.reload();
        }.bind(this));
    }

    this.renderBoard = function () {
        $$(".board tr").empty();
        var columns = this.simulation.board.columns;
        var firstRowHeader = [];
        var secondRowHeader = [];
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            if (column.parent) {
                if (firstRowHeader.indexOf(column.parent) < 0) {
                    firstRowHeader.push(column.parent);
                }
                secondRowHeader.push(column);
            } else {
                firstRowHeader.push(column);
            }
        }
        for (var i = 0; i < firstRowHeader.length; i++) {
            var column = firstRowHeader[i];
            var html = "<th ";
            if (column.children.length > 0) {
                html += "colspan='" + column.children.length + "' ";
            } else {
                html += "rowspan='2' ";
            }
            html += ">" + column.boardLabel;
            if (!column.ignoreLimit) {
                html += " <input type='text' data-model='columns.limits." + column.name + "'/>";
            }
            html += "</th>";
            $$(".board tr:nth-child(1)").append(html);
        }
        for (var i = 0; i < secondRowHeader.length; i++) {
            var column = secondRowHeader[i];
            var html = "<th>";
            html += column.boardLabel;
            if (!column.ignoreLimit) {
                html += " <input type='text' data-model='columns.limits." + column.name + "'/>";
            }
            html += "</th>";
            $$(".board tr:nth-child(2)").append(html);
        }
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            var html = "<td class='" + column.name + "' ></td>";
            $$(".board tr:nth-child(3)").append(html);
        }
    }

    this.renderHeadcountConfigInputs = function () {
        var columns = this.simulation.board.columns;
        var activeColumns = [];
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            if (!column.isQueue()) {
                activeColumns.push(column);
                var html = "<tr><td>" + column.label + " headcount</td><td><input type='text' maxlength='3' data-model='team." + column.name + ".headcount'/></td></tr>";
                $$(".simulation-settings-team-headcount").append(html);
            }
        }
        var html = "<tr><td></td>";
        for (var i = 0; i < activeColumns.length; i++) {
            var column = activeColumns[i];
            html += "<td>" + column.label + "</td>";
        }
        html += "</tr>";
        for (var i = 0; i < activeColumns.length; i++) {
            var row = activeColumns[i];
            html += "<tr><td>" + row.label + "</td>";
            for (var j = 0; j < activeColumns.length; j++) {
                var column = activeColumns[j];
                html += "<td><input type='checkbox' data-column-permissions-column='" + column.name + "' data-column-permissions-specialist='" + row.name + "'/></td>";
            }
            html += "</tr>";
        }
        $$(".who-works-where").append(html);
    }

    this.renderTaskStrategies = function () {
        var columns = this.simulation.board.columns;
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            if (!column.isQueue()) {
                var html = "<tr data-for-option='constant'><td>" + column.label + "</td><td colspan='2'><input type='text' data-model='tasks.sizeStrategy.configs.constant." + column.name + "'/> hours</td></tr>";
                html += "<tr data-for-option='normal'><td>" + column.label + " mean:</td><td colspan='2'><input type='text' data-model='tasks.sizeStrategy.configs.normal." + column.name + "'/> hours</td></tr><tr data-for-option='normal'><td>" + column.label + " variation:</td><td colspan='2'><input type='text' data-model='tasks.sizeStrategy.configs.normal." + column.name + "-variation'/></td></tr>";
                html += "<tr data-for-option='tshirt'><td>" + column.label + "</td><td colspan='2'><input type='text' data-model='tasks.sizeStrategy.configs.tshirt." + column.name + "'/> %</td></tr>";
                $$(".task-size-strategies").append(html);
            }
        }
    }

    this.stop = function () {
        this.simulation.stop();
        this.cfdDiagram.redraw();
        this.littlesDiagram.redraw();
        this.codDiagram.redraw(true);
        this.scatterplotDiagram.redraw();
        this.update(this.simulation.board, this.simulation.stats, true);
    }
    this.pause = function () {
        this.simulation.pause();
        this.update(this.simulation.board, this.simulation.stats, true);
        ga('send', {
            hitType: 'event',
            eventCategory: 'Control',
            eventAction: 'pause',
            eventLabel: 'Paused',
        });
    }
    this.play = function () {
        this.simulation.play();
        ga('send', {
            hitType: 'event',
            eventCategory: 'Control',
            eventAction: 'start',
            eventLabel: 'Started',
        });
    }

    $$(".simulation-help").click(function () {
        window.top.location = "https://mgajdzik.com/kanban-flow-simulator/help/";
    });

    this.updateURL = function () {
        var url = "" + window.top.location;
        url = url.replace(/simulation-config=[a-zA-Z=0-9]*/, "");
        if (url.indexOf("#") == -1) url = url + "#";
        url = url + "simulation-config=";
        url = url + btoa(JSON.stringify(this.configuration.data));
        window.top.location = url;
    }

    this.updateColumnsAvailabilityCheckboxes = function () {
        this.configuration.pauseListeners();
        var specialisations = this.configuration.getActiveStates();
        for (var i = 0; i < specialisations.length; i++) {
            var checkboxes = $$(".who-works-where input[type=checkbox][data-column-permissions-specialist=" + specialisations[i] + "]");
            var checkboxesToCheck = this.configuration.get("team." + specialisations[i] + ".columns");
            for (var j = 0; j < checkboxes.length; j++) {
                var checkbox = $(checkboxes[j]);
                if (checkboxesToCheck.indexOf(checkbox.data("columnPermissionsColumn")) >= 0) {
                    checkbox.attr('checked', 'checked');
                } else {
                    checkbox.removeAttr('checked');
                }

            }
        }
        this.configuration.activateListeners();
    }
    this.updateComponentsDependingOnRunningAverage = function () {
        this.littlesDiagram.redraw();
        this.littlesDiagram.redraw(true);
        this.updateStats();
    }

    this.registerConfigurationOnChangeListeners = function () {
        this.configuration.afterChange("stats.noOfDaysForMovingAverage", this.updateComponentsDependingOnRunningAverage.bind(this));
        this.configuration.onChange("tasks.arrivalStrategy.current", this.arrivalStrategyChanged.bind(this));
        this.configuration.onChange("tasks.sizeStrategy.current", this.sizeStrategyChanged.bind(this));
    }

    this.arrivalStrategyChanged = function (newValue) {
        $$(".backlog-settings-temporal [data-for-option]").hide();
        $$(".backlog-settings-temporal [data-for-option='" + newValue + "']").show();
    }

    this.sizeStrategyChanged = function (newValue) {
        $$(".backlog-settings-task-size [data-for-option]").hide();
        $$(".backlog-settings-task-size [data-for-option='" + newValue + "']").show();
    }

    this.initialiseBacklogStrategies = function () {
        this.arrivalStrategyChanged(this.configuration.get("tasks.arrivalStrategy.current"));
        this.sizeStrategyChanged(this.configuration.get("tasks.sizeStrategy.current"));
    }

    var bottomMenuSelectedTab = 0;
    $$(".bottom-menu .nav li").click(function () {
        var navElement = $(this);
        if (navElement.hasClass('active')) return;
        $$(".bottom-menu .nav li:nth-child(" + (bottomMenuSelectedTab + 1) + ")").toggleClass("active", false);
        $$(".bottom-menu>div:nth-of-type(" + (bottomMenuSelectedTab + 1) + ")").hide(0, function () {
            $(this).trigger('isHidden');
        });
        bottomMenuSelectedTab = navElement.index();
        $$(".bottom-menu .nav li:nth-child(" + (bottomMenuSelectedTab + 1) + ")").toggleClass("active", true);
        $$(".bottom-menu>div:nth-of-type(" + (bottomMenuSelectedTab + 1) + ")").show(0, function () {
            $(this).trigger('isVisible');
        });
    });
    var settingsSelectedTab = 0;
    $$(".simulation-settings-modal .modal-body .nav li").click(function () {
        var navElement = $(this);
        if (navElement.hasClass('active')) return;
        $$(".simulation-settings-modal .modal-body .nav li:nth-child(" + (settingsSelectedTab + 1) + ")").toggleClass("active", false);
        $$(".simulation-settings-modal .modal-body>div:nth-of-type(" + (settingsSelectedTab + 1) + ")").hide(0, function () {
            $(this).trigger('isHidden');
        });
        settingsSelectedTab = navElement.index();
        $$(".simulation-settings-modal .modal-body .nav li:nth-child(" + (settingsSelectedTab + 1) + ")").toggleClass("active", true);
        $$(".simulation-settings-modal .modal-body>div:nth-of-type(" + (settingsSelectedTab + 1) + ")").show(0, function () {
            $(this).trigger('isVisible');
        });
    });

    $$(".bottom-menu>div:not(:nth-of-type(1))").hide();
    $$(".simulation-settings-modal .modal-body>div:not(:nth-of-type(1))").hide();

    this.settingsOpened = function () {
        this.wasRunningWhenSettingsOpened = false;
        if (this.simulation.isRunning()) {
            this.wasRunningWhenSettingsOpened = true;
            this.pause();
        }
    }
    this.settingsClosed = function () {
        if (this.wasRunningWhenSettingsOpened) {
            this.play();
        }
    }

    $$(".simulation-settings-modal").on("show.bs.modal", this.settingsOpened.bind(this));
    $$(".simulation-settings-modal").on("hide.bs.modal", this.settingsClosed.bind(this));

    $$(".tasksDivOverlay").click(function () {
        var divOverlay = $$('.tasksDivOverlay');
        divOverlay.hide();
        this.renderTasks = !this.renderTasks;
        if (this.renderTasks) {
            $$(".tasks-count", false).remove();
        }
        $$(".board-wrapper").toggleClass("board-wrapper-max-height");
        this.updateBoard();

    }.bind(this));

    $$(".tasks").mouseover(function () {
        var divOverlay = $$('.tasksDivOverlay');
        var bottomWidth = $(this).css('width');
        var bottomHeight = $(this).css('height');
        var rowPos = $(this).position();
        bottomTop = rowPos.top;
        bottomLeft = rowPos.left;
        divOverlay.css({
            position: 'absolute',
            top: bottomTop,
            right: '0px',
            width: '100%',
            height: bottomHeight
        });
        divOverlay.show();
    });
    $$('.tasksDivOverlay').mouseleave(function () {
        var divOverlay = $$('.tasksDivOverlay');
        divOverlay.hide();
    });

    this.update = function (board, stats, force) {
        var now = Date.now();
        if (!force && now - this.lastUpdated < 1000 / this.fps) return;
        this.lastUpdated = now;
        this.updateTime();
        this.updateStats();
        this.updateBoard();
        this.cfdDiagram.update();
        this.littlesDiagram.update();
        this.codDiagram.update(force);
        this.scatterplotDiagram.update(force);
    }

    this.updateTime = function () {
        function pad(n) {
            return (n < 10) ? ("0" + n) : n;
        }

        var time = this.simulation.time;
        $$(".day").text(pad(Math.floor(time / (8 * 60)) + 1));
        $$(".hour").text(pad(Math.floor(time / 60) % 8 + 9) + ":" + pad(time % 60));
    }

    this.updateStats = function () {
        var stats = this.simulation.stats;
        var wipAvg = stats.wip.getAvg();
        var leadTimeAvg = stats.leadTime.getAvg();
        $$('.stats-wip').text(wipAvg ? wipAvg.toFixed(1) : '-');
        $$('.stats-throughput').text(stats.throughput.getAvg() ? stats.throughput.getAvg().toFixed(1) : '-');
        $$('.stats-lead-time').text(leadTimeAvg ? leadTimeAvg.toFixed(1) : '-');
        $$('.stats-wip-lead-time').text(wipAvg && leadTimeAvg ? (wipAvg / leadTimeAvg).toFixed(1) : '-');
        $$('.stats-utilisation').text(stats.capacityUtilisation.getAvg() ? stats.capacityUtilisation.getAvg().toFixed(1) : '-');
    }

    this.updateBoard = function () {
        var board = this.simulation.board;
        var renderTasks = this.renderTasks;
        var allVisualColumns = $($$('.tasks td', false).get().reverse()).toArray();
        allVisualColumns.forEach(function (columnVisual) {
            var columnVisualId = columnVisual.className;
            columnVisual = $(columnVisual);
            if (!renderTasks) {
                columnVisual.html("<span class='tasks-count'>" + board.getColumnByName(columnVisualId).tasks.length + "</span>");
            } else {
                columnVisual.children().each(function (index, taskElement) {
                    var $task = $(taskElement);
                    var task = $task.data("taskReference");
                    if (task.column) {
                        $task.find('.progress-bar').width((100 * task.size[task.column.name] / task.originalSize[task.column.name]).toFixed(1) + '%');
                        $task.find('.task-status').html(this.createStatusSpan(task.peopleAssigned));
                    }
                    if (!board.tasks[task.id]) {
                        $task.remove();
                    } else if (task.column && task.column.name != columnVisualId) {
                        $task.remove();
                        var newTaskInstance = this.createTaskDiv(task);
                        $$(".tasks td." + task.column.name, false).append(newTaskInstance);
                        $task = newTaskInstance;
                    }
                }.bind(this));
            }
        }.bind(this));
        if (renderTasks) {
            for (var key in board.tasks) {
                if (!board.tasks.hasOwnProperty(key)) {
                    continue;
                }
                var task = board.tasks[key];
                if ($$("." + task.id, false).length == 0) {
                    var newTask = this.createTaskDiv(task);
                    $$('.tasks td.' + task.column.name, false).append(newTask);
                }
            }
        }
    };

    this.createTaskDiv = function (task) {
        var html = "<div class='task " + task.id + (this.animate ? " task-animation" : "") + "'>" + task.label + " <div class='task-status'>" + this.createStatusSpan(task.peopleAssigned) + "</div><div class='progress'><div class='progress-bar progress-bar-info' style='width:100%'/></div></div>";
        return $(html).data("taskReference", task);
    }

    this.createStatusSpan = function (peopleWorkingOn) {
        if (peopleWorkingOn.length == 0) {
            return "<span class='glyphicon glyphicon-hourglass waiting'/>";
        }
        var html = "";
        peopleWorkingOn.forEach(function (person) {
            var color = this.colorsForColumns[person.specialisation];
            html += "<span class='glyphicon glyphicon-user person' style='color: " + color + "'/>";
        }.bind(this));
        return html;
    }

    this.bind = function () {
        var bindedElements = $$("[data-model]:not([data-binded])", false);
        for (var i = 0; i < bindedElements.length; i++) {
            var $input = $(bindedElements[i]);
            var key = $input.data("model");
            if (bindedElements[i].type == "checkbox") {
                if (this.configuration.get(key)) {
                    $input.attr("checked", "checked");
                } else {
                    $input.removeAttr('checked');
                }
            } else {
                $input.val(this.configuration.get(key));
            }
            $input.change(function (event) {
                var newValue = event.target.type == "checkbox" ? event.target.checked : event.target.value;
                if (typeof newValue == "string" && !isNaN(parseFloat(newValue))) {
                    newValue = parseFloat(newValue);
                }
                var property = $(event.target).data("model");
                this.configuration.set(property, newValue);
                this.updateURL();
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Configuration change',
                    eventAction: property,
                });
            }.bind(this));
            $input.data("binded", true);
        }
        $$(".who-works-where input[type=checkbox]", false).change(function (event) {
            var checkbox = event.target;
            var checked = event.target.checked;
            var column = $(event.target).data("columnPermissionsColumn");
            var specialisation = $(event.target).data("columnPermissionsSpecialist");
            var collumnsAllowedToWorkIn = this.configuration.get("team." + specialisation + ".columns");
            var newArray;
            if (checked) {
                newArray = collumnsAllowedToWorkIn.slice();
                newArray.push(column);
            } else {
                newArray = collumnsAllowedToWorkIn.slice();
                newArray.splice(collumnsAllowedToWorkIn.indexOf(column), 1);
            }
            this.configuration.set("team." + specialisation + ".columns", newArray);
            this.updateURL();
            ga('send', {
                hitType: 'event',
                eventCategory: 'Configuration change',
                eventAction: "team." + specialisation + ".columns",
            });
        }.bind(this));
    }
}