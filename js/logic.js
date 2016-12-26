
//Gloabl Width and height used for the paper.
var windowWidth = window.innerWidth;
var windowHeight = window.innerHeight;


//Initial Parameters for the zoom functionality.
var gridsize = 1;
var currentScale = 1;
var targetElement = $("#paper")[0];

// Canvas where shapes are dropped
var graph = new joint.dia.Graph,
    paper = new joint.dia.Paper({
        el: $('#paper'),
        model: graph,
        height: windowHeight,
        width: windowWidth,
        gridsize: gridsize,
        snapLinks: true,
        linkPinning: false,
        defaultLink: new joint.shapes.logic.Wire,
        validateConnection: function (vs, ms, vt, mt, e, vl) {
            if (e === 'target') {
                // target requires an input port to connect
                if (!mt || !mt.getAttribute('class') || mt.getAttribute('class').indexOf('input') < 0) return false;
                // check whether the port is being already used
                var portUsed = _.find(this.model.getLinks(), function (link) {
                    return (link.id !== vl.model.id &&
                        link.get('target').id === vt.model.id &&
                        link.get('target').port === mt.getAttribute('port'));
                });
                return !portUsed;
            } else { // e === 'source'
                // source requires an output port to connect
                return ms && ms.getAttribute('class') && ms.getAttribute('class').indexOf('output') >= 0;
            }
        }
    });
/*
More zoom functionality can be added: read more here: 
https://github.com/ariutta/svg-pan-zoom
*/
setGrid(paper, gridsize * 15, '#808080');
panAndZoom = svgPanZoom(targetElement.childNodes[0], {
    viewportSelector: targetElement.childNodes[0].childNodes[0],
    fit: false,
    zoomScaleSensitivity: 0.1,
    panEnabled: false,
    center: false,
    onZoom: function (scale) {
        currentScale = scale;
        setGrid(paper, gridsize * 15 * currentScale, '#808080');
    },
    beforePan: function (oldpan, newpan) {
        setGrid(paper, gridsize * 15 * currentScale, '#808080', newpan);
    },
});
panAndZoom.disableDblClickZoom();
//min is set to 0.3
panAndZoom.setMinZoom(0.3);

// paper.on('blank:pointerdown', function (evt, x, y) {
//     panAndZoom.enablePan();
// });
// paper.on('cell:pointerup blank:pointerup', function(cellView, event) {
//     panAndZoom.disablePan();
// });


// Canvas from which you take shapes
var sideGraph = new joint.dia.Graph,
    sidePaper = new joint.dia.Paper({
        el: $('#stencil'),
        model: sideGraph,
        interactive: false
    });
//console.log(sidePaper['el']['clientWidth']);

// zoom the viewport by 50%
paper.scale(1.0, 1.0);

function toggleLive(model, signal) {
    // add 'live' class to the element if there is a positive signal
    V(paper.findViewByModel(model).el).toggleClass('live', signal > 0);
}

function broadcastSignal(gate, signal) {
    // broadcast signal to all output ports
    _.defer(_.invoke, graph.getConnectedLinks(gate, { outbound: true }), 'set', 'signal', signal);
}

function initializeSignal() {
    var signal = Math.random();
    // > 0 wire with a positive signal is alive
    // < 0 wire with a negative signal means, there is no signal 
    // 0 none of the above - reset value
    // cancel all signals stores in wires
    _.invoke(graph.getLinks(), 'set', 'signal', 0);
    // remove all 'live' classes
    $('.live').each(function () {
        V(this).removeClass('live');
    });
    _.each(graph.getElements(), function (element) {
        // broadcast a new signal from every input in the graph
        (element instanceof joint.shapes.logic.Input) && broadcastSignal(element, signal);
    });
    return signal;
}

var highlightedCellView = [];
//remove on double click
paper.on('cell:pointerdblclick', function (cellview, evt, x, y) {
    //cellview.highlight();
    cellview.model.remove({ disconnectLinks: true });
    if (graph.getElements().length == 0) {
        graph.clear();
    }
});
//highlight on click
paper.on('cell:pointerclick', function (cellView) {
    cellView.highlight();
    highlightedCellView.push(cellView);
    //To get element type and it's id, use this
    //console.log(cellView.model.attributes.type + " -> " + cellView.model.attributes.id);
});
//unhighlight on paper click
paper.on('blank:pointerclick', function (cellview) {
    for (var index = 0; index < highlightedCellView.length; index++) {
        highlightedCellView[index].unhighlight();
    }
});

// Every logic gate needs to know how to handle a situation, when a signal comes to their ports.
joint.shapes.logic.Gate.prototype.onSignal = function (signal, handler) {
    handler.call(this, signal);
}
// The repeater delays a signal handling by 400ms
joint.shapes.logic.Repeater.prototype.onSignal = function (signal, handler) {
    _.delay(handler, 400, signal);
}
// Output element just marks itself as alive.
joint.shapes.logic.Output.prototype.onSignal = function (signal) {
    toggleLive(this, signal);
}

//fixed gates on the right.
var repeater = new joint.shapes.logic.Repeater({ position: { x: 40, y: 10 } });
var not = new joint.shapes.logic.Not({ position: { x: 40, y: 160 } });
var or = new joint.shapes.logic.Or({ position: { x: 40, y: 60 } });
var and = new joint.shapes.logic.And({ position: { x: 40, y: 110 } });
var nand = new joint.shapes.logic.Nand({ position: { x: 40, y: 210 } });
var nor = new joint.shapes.logic.Nor({ position: { x: 40, y: 260 } });
var xor = new joint.shapes.logic.Xor({ position: { x: 40, y: 310 } });
var xnor = new joint.shapes.logic.Xnor({ position: { x: 40, y: 360 } });
var gateLists = [repeater, not, or, and, nand, nor, xor, xnor];
//programatically show the list of gates to select tag.
function listGates() {
    var list = document.getElementById("listOfGates");
    var output;
    for (var index = 2; index < gateLists.length; index++) {
        output += '<option>';
        output += gateLists[index].get('type');
        output += '</option>';
    }
    list.innerHTML = output;
}

//Toggle gear icon. Additional functionality can be put here.
$("#customGate").click(function (event) {
    if (!$("#menu").is(":visible")) {
        var tag = '<div class="row" id="menu"><div class="col-lg-12" style="height: 40px; background:#E3E0CE;">Test</div></div>';
        $("#sidebar").before(tag);
        $("#customGate").removeClass("glyphicon glyphicon-cog").addClass("glyphicon glyphicon-remove-circle");
    } else {
        removeElementsCSSMenu();
    }
});
paper.on('blank:pointerclick', function (cellview) {
    removeElementsCSSMenu()
});
sidePaper.on('blank:pointerclick', function (cellview) {
    removeElementsCSSMenu()
});
function removeElementsCSSMenu() {
    $("#customGate").removeClass("glyphicon glyphicon-remove-circle").addClass("glyphicon glyphicon-cog");
    $("#menu").remove();
}

/*
    Function used to add custom gates to the paper.
    For example, to add 6 input gates, you can first 
    create the class in JointJS (search for joint.shapes.logic = {};)
    Once the class is created there, then an instance can be created here.
*/
function addGate() {
    var userSelectedIndex = document.getElementById('listOfGates').selectedIndex;
    var userSelectedText = document.getElementById('listOfGates').options;

    var numberofgates = document.getElementById("numberOfGate").value;

    if (userSelectedText[userSelectedIndex].text === gateLists[2].get('type') && numberofgates == 3) {
        var orThree = new joint.shapes.logic.OrThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(orThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[2].get('type') && numberofgates == 4) {
        var orFour = new joint.shapes.logic.OrFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(orFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[2].get('type') && numberofgates == 5) {
        var orFive = new joint.shapes.logic.OrFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(orFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[3].get('type') && numberofgates == 3) {
        var andThree = new joint.shapes.logic.AndThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(andThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[3].get('type') && numberofgates == 4) {
        var andFour = new joint.shapes.logic.AndFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(andFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[3].get('type') && numberofgates == 5) {
        var andFive = new joint.shapes.logic.AndFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(andFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[4].get('type') && numberofgates == 3) {
        var nandThree = new joint.shapes.logic.NandThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(nandThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[4].get('type') && numberofgates == 4) {
        var nandFour = new joint.shapes.logic.NandFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(nandFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[4].get('type') && numberofgates == 5) {
        var nandFive = new joint.shapes.logic.NandFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(nandFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[5].get('type') && numberofgates == 3) {
        var norThree = new joint.shapes.logic.NorThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(norThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[5].get('type') && numberofgates == 4) {
        var norFour = new joint.shapes.logic.NorFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(norFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[5].get('type') && numberofgates == 5) {
        var norFive = new joint.shapes.logic.NorFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(norFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[6].get('type') && numberofgates == 3) {
        var xorThree = new joint.shapes.logic.XorThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(xorThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[6].get('type') && numberofgates == 4) {
        var xorFour = new joint.shapes.logic.XorFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(xorFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[6].get('type') && numberofgates == 5) {
        var xorFive = new joint.shapes.logic.XorFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(xorFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[7].get('type') && numberofgates == 3) {
        var xnorThree = new joint.shapes.logic.XnorThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(xnorThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[7].get('type') && numberofgates == 4) {
        var xnorFour = new joint.shapes.logic.XnorFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(xnorFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[7].get('type') && numberofgates == 5) {
        var xnorFive = new joint.shapes.logic.XnorFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) } });
        graph.addCell(xnorFive);
    }
}

//Function to randomly generate position for gates.
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}
sideGraph.addCells(gateLists);

//dragging element from right sidebar to canvas
sidePaper.on('cell:pointerdown', function (cellView, e, x, y) {
    $('body').append('<div id="flyPaper" style="background:none;position:fixed;z-index:100;opacity:.2;pointer-event:none;"></div>');
    var flyGraph = new joint.dia.Graph,
        flyPaper = new joint.dia.Paper({
            el: $('#flyPaper'),
            model: flyGraph,
            interactive: false
        }),
        flyShape = cellView.model.clone(),
        pos = cellView.model.position(),
        offset = {
            x: x - pos.x,
            y: y - pos.y
        };
    flyShape.position(0, 0);
    flyGraph.addCell(flyShape);
    $("#flyPaper").offset({
        left: e.pageX - offset.x,
        top: e.pageY - offset.y
    });
    $('body').on('mousemove.fly', function (e) {
        $("#flyPaper").offset({
            left: e.pageX - offset.x,
            top: e.pageY - offset.y
        });
    });
    $('body').on('mouseup.fly', function (e) {
        var x = e.pageX,
            y = e.pageY,
            target = paper.$el.offset();
        // Dropped over paper ?
        if (x > target.left && x < target.left + paper.$el.width() && y > target.top && y < target.top + paper.$el.height()) {
            var s = flyShape.clone();
            s.position(x - target.left - offset.x, y - target.top - offset.y);
            graph.addCell(s);
        }
        $('body').off('mousemove.fly').off('mouseup.fly');
        flyShape.remove();
        $('#flyPaper').remove();
    });
});

//To detect two or more gates are connected, use this.
paper.on('link:connect', function (evt, cellView, magnet, arrowhead) {
    //console.log("the link......:   ");
});
//To detect any change in source and target, use this.
graph.on('change:source change:target', function (link) {
    //code goes here
});
//Listen to any change, remove, or add and set the graph to local broswer storage.
graph.on('change remove add', function (cellView) {
    localStorage.setItem('graph', JSON.stringify(graph.toJSON()));
});
//check if the 'graph' exists and if so, then bring the elements to the paper
var result = ""
if (localStorage.getItem('graph') != null) {
    var graphFromLocalStorage = localStorage.getItem('graph');
    graph.fromJSON(JSON.parse(graphFromLocalStorage));
    result = JSON.parse(graphFromLocalStorage);
}

//function to implement zoom functionality here. This called above.
function setGrid(paper, size, color, offset) {
    // Set grid size on the JointJS paper object (joint.dia.Paper instance)
    paper.options.gridsize = gridsize;
    // Draw a grid into the HTML 5 canvas and convert it to a data URI image
    var canvas = $('<canvas/>', { width: size, height: size });
    canvas[0].width = size;
    canvas[0].height = size;
    var context = canvas[0].getContext('2d');
    context.beginPath();
    context.rect(1, 1, 1, 1);
    context.fillStyle = color || '#AAAAAA';
    context.fill();
    // Finally, set the grid background image of the paper container element.
    var gridBackgroundImage = canvas[0].toDataURL('image/png');
    $(paper.el.childNodes[0]).css('background-image', 'url("' + gridBackgroundImage + '")');
    if (typeof (offset) != 'undefined') {
        $(paper.el.childNodes[0]).css('background-position', offset.x + 'px ' + offset.y + 'px');
    }
}

//all graph elements
var elements = graph.getElements();
//Recursive function to get all the elements starting from the last element.
function getLastElementFunc(result, lastElement, i, zero, links) {
    if (lastElement == "logic.OrThree" && zero < i) {
        if (zero > 0) {
            result += links[zero].type + "+";
            zero++;
            return getLastElementFunc(result, lastElement, i, zero, links);
        } else {
            result += "F = " + links[zero].type + "+";
            zero++;
            return getLastElementFunc(result, lastElement, i, zero, links);
        }
    }
    else {
        return result;
    }
}

/*
//This object has linkID and link Source ID.
var lastElementLinks = []
var linkArray = [];
var funResult; 
var lastElement;
var result = "";
var zero = 0;

for (var i = 0; i < elements.length; i++) {
    //if the element is the last element.
    if (graph.isSink(elements[i])) {
        lastElement = elements[i]
        lastElementName = elements[i].attributes.type;
        //get connected links of the last element
        for (var j = 0; j < graph.getConnectedLinks(elements[i]).length; j++) {
            var gateElement = {
                id: "",
                source: "",
                type: ""
            }
            gateElement.id = graph.getConnectedLinks(elements[i])[j].id;
            gateElement.source = graph.getConnectedLinks(elements[i])[j].attributes.source.id;
            lastElementLinks.push(gateElement);
        }
    }//end of if 
}
//set type of the source for the last links
for (var i = 0; i < lastElementLinks.length; i++) {
    lastElementLinks[i]["type"] = graph.getCell(lastElementLinks[i]["source"]).attributes.type
}
if (lastElementLinks != "")  {
    funResult = getLastElementFunc(result, lastElementName, lastElementLinks.length, zero, lastElementLinks);
    console.log(funResult);
}


*/
/*
    The following is one approach to get a function or more from the graph.
    Make sure the graph has elements.
    This gets the predecessors of the last element and then it will check if 
    the element is a root, which means it is not a source of any other elements
    then it will check the gate type and add a function.
*/

/*
var predecessors = graph.getPredecessors(lastElement);
for (var index = 0; index < predecessors.length; index++) {
    if (graph.isSource(predecessors[index])) {
    //root
        if (predecessors[index].attributes.type == "logic.Or") {
            var or = "(a1+a2)";
            funResult = funResult.replace("logic.Or", or);
        }else if (predecessors[index].attributes.type == "logic.OrThree"){
            var OrThree = "(a3+a4+a5)";
            funResult = funResult.replace("logic.OrThree", OrThree);
        }else if (predecessors[index].attributes.type == "logic.OrFour"){
            var OrFour = "(a6+a7+a8+a9)";
            funResult = funResult.replace("logic.OrFour", OrFour);
        }else if (predecessors[index].attributes.type == "logic.OrFive"){
            var OrFive = "(a10+a11+a12)";
            funResult = funResult.replace("logic.OrFive", OrFive);
        }else if (predecessors[index].attributes.type == "logic.Nand"){
            var Nand = "(b1'+b2')";
            funResult = funResult.replace("logic.Nand", Nand);
        }
    }else {
    //not root
        //console.log(predecessors[index].attributes.type + " is not a root!")
    }
}
*/

//This function can be used to go through all the elemnts in the graph.
/*
graph.dfs(graph.getElements(),function(elementModel, distance){
    for (var index = 0; index < elementModel.length; index++) {
        var element = elementModel[index];
        console.log(element.attributes.type);
    }
    console.log(elementModel);
},{inbound: true});
console.log(graph.dfs(graph.getSinks()[0]));
*/

/*
    Truth Table
    Given an array of elements, this can get the truth table. 
    This is useful once we have a function and determine how many elements we have.
*/
/*
var row = [], values = ["a", "b", "c"];
for (var i = (Math.pow(2, values.length) - 1) ; i >= 0 ; i--) {
  for (var j = (values.length - 1) ; j >= 0 ; j--) {
    row[j] = (i & Math.pow(2,j)) ? true : false
  }
  console.log(row);
}
*/