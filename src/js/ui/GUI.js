function GUI(hookSelectorParam, simulation, configuration) {
    hookSelector = hookSelectorParam;
    this.configuration = configuration;
    this.simulation = simulation;
    this.fps = 4;
    this.lastUpdated = Date.now();
    this.animate = true;

    var controls = new Controls(this.simulation, this);
    this.cfdDiagram = new DiagramCFD(this.simulation);
    this.littlesDiagram = new DiagramLittles(this.simulation);
    this.codDiagram = new DiagramCOD(this.simulation);
    this.scatterplotDiagram = new DiagramScatterplot(this.simulation);

    this.colors = ['blue', 'chocolate', 'darkturquoise', 'royalblue', 'hotpink', 'green', 'goldenrod', 'aqua', 'cadetblue'];

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
            var activities = configuration.getActiveStates();
            team.forEach(function(memberType) {
                var keys = Object.keys(memberType.productivity);
                keys.forEach(function(key) {
                    if (activities.indexOf(key) == -1) {
                        delete memberType.productivity[key];
                    }
                });
                activities.forEach(function(activity) {
                    if (memberType.productivity[activity] === undefined) {
                        memberType.productivity[activity] = 50;
                    }
                });
            });
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
            }
        }
        var html = "<tr><th></th><th>Name</th><th>Headcount</th>";
        for (var i = 0; i < activeColumns.length; i++) {
            var column = activeColumns[i];
            html += "<th>" + column.label + "</th>";
        }
        html += "<th></th></tr>";
        var team = this.configuration.get("team");
        for (var i = 0; i < team.length; i++) {
            var row = team[i];
            var color = this.colors[i % this.colors.length];
            var personSpan = "<span class='glyphicon glyphicon-user person' style='color: " + color + "'/>";
            html += "<tr><td>" + personSpan + "</td>"
            html += "<td><input type='text' value='" + row.name + "'></input></td>";
            html += "<td><input type='text' value='" + row.count + "'></input></td>";
            for (var j = 0; j < activeColumns.length; j++) {
                var column = activeColumns[j];
                html += "<td><input type='text' value='" + row.productivity[column.name] + "'></input></td>";
            }
            html += "<td><span class='glyphicon glyphicon-remove team-member-remove' aria-hidden='true'></span></td>"
            html += "</tr>";
        }
        $$(".who-works-where").append(html);
        var recolorPersonIcons = function(colors) {
            $$(".who-works-where span.person", false).each(function(index, span) {
                var color = colors[index % colors.length];
                $(span).css("color", color);
            });
        }
        var removeListener = function (event) {
            $(this).parent().parent().remove();
            recolorPersonIcons(event.data.colors);
        };
        $$(".team-member-remove").click(this, removeListener);
        $$(".team-member-add").click(function () {
            var personSpan = "<span class='glyphicon glyphicon-user person'/>";
            var html = "<tr><td>" + personSpan + "</td>"
            html += "<td><input type='text' ></input></td>";
            html += "<td><input type='text' value='1'></input></td>";
            for (var j = 0; j < activeColumns.length; j++) {
                html += "<td><input type='text' value='50'></input></td>";
            }
            html += "<td><span class='glyphicon glyphicon-remove team-member-remove' aria-hidden='true'></span></td>"
            html += "</tr>";
            var rows = $$(".who-works-where tr", false);
            var newRow = $(html);
            $(rows[rows.length - 1]).after(newRow);
            newRow.find(".team-member-remove").click(this, removeListener);
            recolorPersonIcons(this.colors);
        }.bind(this));
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
        this.updateTeam();
        if (this.wasRunningWhenSettingsOpened) {
            this.play();
        }
    }
    this.updateTeam = function() {
        var newTeamConfig = this.getTeamConfigurationFromInputs();
        this.configuration.set("team", newTeamConfig);
        this.updateURL();
    }

    $$(".simulation-settings-team-tab").bind('isHidden', this.updateTeam.bind(this));

    this.getTeamConfigurationFromInputs = function() {
        var activities = this.configuration.getActiveStates();
        var result = [];
        $$(".who-works-where tr:not(:first-child)", false).each(function(index, tr) {
            var memberType = {productivity: {}};
            result.push(memberType);
            $(tr).find("input").each(function(index, input) {
                switch (index) {
                    case 0: memberType.name = input.value; break;
                    case 1: memberType.count = parseInt(input.value) || 0; break;
                    default: memberType.productivity[activities[index - 2]] = parseInt(input.value) || 0;
                }

            });
        });
        return result;
    }

    $$(".simulation-settings-modal").on("show.bs.modal", this.settingsOpened.bind(this));
    $$(".simulation-settings-modal").on("hide.bs.modal", this.settingsClosed.bind(this));

    this.taskDetails = null;
    function taskMouseover(event) {
        var div = $$('.task-details');
        var $taskDiv = $(event.currentTarget);
        var position = $taskDiv.position();
        var top = position.top;
        var left = position.left;
        div.css({
            position: 'absolute',
            top: top,
            left: left,
            minWidth: $taskDiv.css("width"),
        });
        div.show();
        var task = $taskDiv.data("taskReference");
        this.taskDetails = task;
        this.updateTaskDetails(task);
    }
    this.updateTaskDetails = function(task) {
        if (!task) return;
        var div = $$('.task-details');
        var $taskDiv = $$("." + task.id, false);
        if ($taskDiv.length == 0) {
            div.hide();
            this.taskDetails = null;
            return;
        }
        var detailsDivPosition = div.position();
        var taskDivPosition = $taskDiv.position();
        if (detailsDivPosition.top != taskDivPosition.top || detailsDivPosition.left != taskDivPosition.left) {
            div.hide();
            this.taskDetails = null;
            return;
        }
        div.find("[data-task-detail=name]").html(task.label);
        var created = "D: " + (Math.floor(task.created / 60 / 8) + 1) + ", t: " + Math.floor(task.created / 60 % 8 + 9) +
            ":" + (task.created % 60 < 10 ? "0": "") + (task.created % 60);
        div.find("[data-task-detail=since]").html(created);
        var activities = this.configuration.getActiveStates();
        var work = div.find(".task-details-work");
        work.html("");
        activities.forEach(function (activity) {
            work.append("<p>" + this.simulation.board.getColumnByName(activity).label + ": <span>" + Math.max(0, task.size[activity]).toFixed(0) + "/" + task.originalSize[activity].toFixed(0)) + "</span></p>";
        }.bind(this));
        var people = div.find(".task-details-people");
        people.html(task.peopleAssigned.length > 0 ? "<p>People assigned:</p>" : "");
        task.peopleAssigned.forEach(function(person) {
            people.append('<p><span class="glyphicon glyphicon-user person" style="color: ' + this.colors[person.typeIndex] +
                '"></span> ' + person.name + (person.tasksWorkingOn.length > 1 ? ' (' + (100 / person.tasksWorkingOn.length).toFixed(0) + '%)' : '') + '</p>');
        }.bind(this));
    }
    function taskMouseleave() {
        var div = $$('.task-details');
        this.taskDetails = null;
        div.hide();
    }

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
        this.updateTaskDetails(this.taskDetails);
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
        var allVisualColumns = $($$('.tasks td', false).get().reverse()).toArray();
        allVisualColumns.forEach(function (columnVisual) {
            var columnVisualId = columnVisual.className;
            columnVisual = $(columnVisual);
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
        }.bind(this));
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
    };

    this.createTaskDiv = function (task) {
        var html = "<div class='task " + task.id + (this.animate ? " task-animation" : "") + "'>" + task.label + " <div class='task-status'>" + this.createStatusSpan(task.peopleAssigned) + "</div><div class='progress'><div class='progress-bar progress-bar-info' style='width:100%'/></div></div>";
        return $(html).data("taskReference", task).mouseover(taskMouseover.bind(this)).mouseleave(taskMouseleave);
    }

    this.createStatusSpan = function (peopleWorkingOn) {
        if (peopleWorkingOn.length == 0) {
            return "<span class='glyphicon glyphicon-hourglass waiting'/>";
        }
        var html = "";
        peopleWorkingOn.forEach(function (person) {
            var color = this.colors[person.typeIndex % this.colors.length];
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
    }
}