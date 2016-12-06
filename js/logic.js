
var windowWidth = window.innerWidth;
var windowHeight = window.innerHeight;

/* Zoom Functionality and Grid Style */

//Initial Parameters
var gridsize = 1;
var currentScale = 1;


var targetElement = $("#paper")[0];

// Canvas where shapes are dropped
var graph = new joint.dia.Graph,
  paper = new joint.dia.Paper({
    el: $('#paper'),
    model: graph,
    height: windowHeight,
    width: windowWidth-188,
    gridsize: gridsize,
    snapLinks: true,
    linkPinning: false,
    defaultLink: new joint.shapes.logic.Wire,

    validateConnection: function(vs, ms, vt, mt, e, vl) {

        if (e === 'target') {

            // target requires an input port to connect
            if (!mt || !mt.getAttribute('class') || mt.getAttribute('class').indexOf('input') < 0) return false;

            // check whether the port is being already used
            var portUsed = _.find(this.model.getLinks(), function(link) {

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

setGrid(paper, gridsize*15, '#808080');

panAndZoom = svgPanZoom(targetElement.childNodes[0],{
    viewportSelector: targetElement.childNodes[0].childNodes[0],
    fit: false,
    zoomScaleSensitivity: 0.1,
    panEnabled: false,
    onZoom: function(scale){
        currentScale = scale;
        setGrid(paper, gridsize*15*currentScale, '#808080');
    },
    beforePan: function(oldpan, newpan){
        setGrid(paper, gridsize*15*currentScale, '#808080', newpan);
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

paper.on('blank:pointerdblclick', function(evt, x, y){
    console.log("Test!");
});


// Canvas from which you take shapes
var sideGraph = new joint.dia.Graph,
  sidePaper = new joint.dia.Paper({
    el: $('#stencil'),
    model: sideGraph,
    interactive: false
  });
  //console.log(sidePaper['el']['clientWidth']);

// zoom the viewport by 50%
paper.scale(1.0,1.0);

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
    $('.live').each(function() {
        V(this).removeClass('live');
    });

    _.each(graph.getElements(), function(element) {
        // broadcast a new signal from every input in the graph
        (element instanceof joint.shapes.logic.Input) && broadcastSignal(element, signal);
    });

    return signal;
}
var highlightedCellView = [];
//remove on double click
paper.on('cell:pointerdblclick', function(cellview, evt, x, y) { 
    //cellview.highlight();
    cellview.model.remove({disconnectLinks: true});
    if (graph.getElements().length==0){
        graph.clear();
    }
});
//highlight on click
paper.on('cell:pointerclick', function(cellView) {
    cellView.highlight();
    highlightedCellView.push(cellView);
});
//unhighlight on paper click
paper.on('blank:pointerclick', function(cellview){
    for (var index = 0; index < highlightedCellView.length; index++) {
        highlightedCellView[index].unhighlight();
    }
});

// Every logic gate needs to know how to handle a situation, when a signal comes to their ports.
joint.shapes.logic.Gate.prototype.onSignal = function(signal, handler) {
    handler.call(this, signal);
}
// The repeater delays a signal handling by 400ms
joint.shapes.logic.Repeater.prototype.onSignal = function(signal, handler) {
    _.delay(handler, 400, signal);
}
// Output element just marks itself as alive.
joint.shapes.logic.Output.prototype.onSignal = function(signal) {
    toggleLive(this, signal);
}

    var repeater = new joint.shapes.logic.Repeater({ position: { x: 40, y: 10 }});
    var not = new joint.shapes.logic.Not({ position: { x: 40, y: 160 }});
    var or = new joint.shapes.logic.Or({ position: { x: 40, y: 60 }});
    var and = new joint.shapes.logic.And({ position: { x: 40, y: 110 }});
    var nand = new joint.shapes.logic.Nand({ position: { x: 40, y: 210 }});
    var nor = new joint.shapes.logic.Nor({ position: { x: 40, y: 260 }});
    var xor = new joint.shapes.logic.Xor({ position: { x: 40, y: 310 }});
    var xnor = new joint.shapes.logic.Xnor({ position: { x: 40, y: 360 }});

    var gateLists = [repeater, not, or, and, nand, nor, xor, xnor];

function listGates(){
    var list = document.getElementById("listOfGates");
    var output;
    for (var index = 2; index < gateLists.length; index++) {
        output += '<option>';
        output += gateLists[index].get('type');
        output += '</option>';
    }
    list.innerHTML = output;
}
$("#customGate").click(function(event){
    if(!$("#menu").is(":visible")){
        var tag = '<div class="row" id="menu"><div class="col-lg-12" style="height: 40px; background:#E3E0CE;">Test</div></div>';
        $( "#sidebar" ).before( tag );
        $("#customGate").removeClass("glyphicon glyphicon-cog").addClass("glyphicon glyphicon-remove-circle"); 
    }else{
       removeElementsCSSMenu();
    }
});

paper.on('blank:pointerclick', function(cellview){
    removeElementsCSSMenu()
});
sidePaper.on('blank:pointerclick', function(cellview){
    removeElementsCSSMenu()
});


function removeElementsCSSMenu(){
    $("#customGate").removeClass("glyphicon glyphicon-remove-circle").addClass("glyphicon glyphicon-cog"); 
    $("#menu").remove();
}




function addGate(){
    var userSelectedIndex = document.getElementById('listOfGates').selectedIndex;
    var userSelectedText = document.getElementById('listOfGates').options;

    var numberofgates = document.getElementById("numberOfGate").value;

    if (userSelectedText[userSelectedIndex].text === gateLists[2].get('type') && numberofgates==3){
        var orThree = new joint.shapes.logic.OrThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(orThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[2].get('type') && numberofgates==4){
        var orFour = new joint.shapes.logic.OrFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(orFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[2].get('type') && numberofgates==5){
        var orFive = new joint.shapes.logic.OrFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(orFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[3].get('type') && numberofgates==3){
         var andThree = new joint.shapes.logic.AndThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(andThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[3].get('type') && numberofgates==4){
         var andFour = new joint.shapes.logic.AndFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(andFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[3].get('type') && numberofgates==5){
         var andFive = new joint.shapes.logic.AndFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(andFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[4].get('type') &&  numberofgates==3){
        var nandThree = new joint.shapes.logic.NandThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(nandThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[4].get('type') &&  numberofgates==4){
        var nandFour = new joint.shapes.logic.NandFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(nandFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[4].get('type') &&  numberofgates==5){
        var nandFive = new joint.shapes.logic.NandFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(nandFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[5].get('type') &&  numberofgates==3){
        var norThree = new joint.shapes.logic.NorThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(norThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[5].get('type') &&  numberofgates==4){
        var norFour = new joint.shapes.logic.NorFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(norFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[5].get('type') &&  numberofgates==5){
        var norFive = new joint.shapes.logic.NorFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(norFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[6].get('type') &&  numberofgates==3){
        var xorThree = new joint.shapes.logic.XorThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(xorThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[6].get('type') &&  numberofgates==4){
        var xorFour = new joint.shapes.logic.XorFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(xorFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[6].get('type') &&  numberofgates==5){
        var xorFive = new joint.shapes.logic.XorFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(xorFive);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[7].get('type') &&  numberofgates==3){
        var xnorThree = new joint.shapes.logic.XnorThree({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(xnorThree);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[7].get('type') &&  numberofgates==4){
        var xnorFour = new joint.shapes.logic.XnorFour({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(xnorFour);
    } else if (userSelectedText[userSelectedIndex].text === gateLists[7].get('type') &&  numberofgates==5){
        var xnorFive = new joint.shapes.logic.XnorFive({ position: { x: getRandomArbitrary(50, 200), y: getRandomArbitrary(0, 100) }});
        graph.addCell(xnorFive);
    }
    

  

}
       
        // //console.log(myAnd.operation(1,1,1));
        // console.log(andThree);
        // andThree.ports.in1 = 1;
        // andThree.ports.in2 = 1;
        // andThree.ports.in3 = 1;
        // //console.log(myAnd.operation);
        // console.log(andThree.operation(andThree.ports["in1"],andThree.ports["in2"],andThree.ports["in3"]));
        //graph.addCell(andThree);

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

sideGraph.addCells(gateLists);

sidePaper.on('cell:pointerdown', function(cellView, e, x, y) {
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
  $('body').on('mousemove.fly', function(e) {
    $("#flyPaper").offset({
      left: e.pageX - offset.x,
      top: e.pageY - offset.y
    });
  });
  $('body').on('mouseup.fly', function(e) {
    var x = e.pageX,
      y = e.pageY,
      target = paper.$el.offset();
    
    // Dropped over paper ?
    if (x > target.left && x < target.left + paper.$el.width() && y > target.top && y < target.top + paper.$el.height()) {
      var s = flyShape.clone();
      s.position(x - target.left - offset.x, y - target.top - offset.y);
      graph.addCell(s);
      
      //console.log(graph.getLinks());
      //console.log(graph.getElements());
      //console.log(graph.getConnectedLinks(graph.getElements()[0]));
      //console.log(s);
    }
    $('body').off('mousemove.fly').off('mouseup.fly');
    flyShape.remove();
    $('#flyPaper').remove();
  });
});


paper.on('link:connect', function(evt, cellView, magnet, arrowhead) { 
    console.log("the link......:   ");
    // console.log(graph.getElements());
    // console.log(graph.getConnectedLinks(graph.getElements()[0]));
    // console.log(graph.getLinks());
    //  console.log("sourceMagnet: "+evt["sourceMagnet"].output);
    //  console.log(evt);
    // console.log(magnet);


    // for (var i=0; i<=graph.getElements().length; i++){
    //     console.log(graph.getConnectedLinks(graph.getElements()[i]));
    // }
});

graph.on('change:source change:target', function(link) {
    if (link.get('source').id && link.get('target').id) {
        // console.log("Source: "+link.get('source').id);
        // console.log("Target: "+link.get('target').id);
        // both ends of the link are connected.
    }
});





graph.on('change remove add', function(cellView){
    localStorage.setItem('graph', JSON.stringify(graph.toJSON()));
});




var graphFromLocalStorage = localStorage.getItem('graph');
graph.fromJSON(JSON.parse(graphFromLocalStorage));
var result = JSON.parse(graphFromLocalStorage);
/*
console.log(graph.getConnectedLinks());

var objects = [];
var object = {
    source: {
        id: '',
        type: '',
    },
    target: {
        id: '',
        type: '',
    }
}

for(var i=0; i<result["cells"].length;i++){

    var source = result["cells"][i].source;
    var target = result["cells"][i].target;

    var type = result["cells"][i].type;
    var id = result["cells"][i].id;

    if(type!="logic.Wire"){
        object.source.type = type;
        object.target.type = type;
    }


    if(typeof source !== 'undefined' && typeof target !== 'undefined'){

        object.source.id = source.id;
        object.target.id = target.id;

        objects.push(object);

        console.log('Source: '+source.id+' id: '+source.port+ ' Type: '+type);
        console.log('Target: '+target.id+' id: '+target.port);   
    }

    //console.log(`Type: ${result["cells"][i]["type"]}\nid: ${result["cells"][i]["id"]}\n `);
}

console.log(objects);
*/


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
    if(typeof(offset) != 'undefined'){  
        $(paper.el.childNodes[0]).css('background-position', offset.x + 'px ' + offset.y + 'px');
    }
}





/*
var graph = new joint.dia.Graph();

var paper = new joint.dia.Paper({

    el: $('#paper'),
    model: graph,
    width: 1000, height: 600, gridSize: 5,
    snapLinks: true,
    linkPinning: false,
    defaultLink: new joint.shapes.logic.Wire,

    validateConnection: function(vs, ms, vt, mt, e, vl) {

        if (e === 'target') {

            // target requires an input port to connect
            if (!mt || !mt.getAttribute('class') || mt.getAttribute('class').indexOf('input') < 0) return false;

            // check whether the port is being already used
            var portUsed = _.find(this.model.getLinks(), function(link) {

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

// zoom the viewport by 50%
paper.scale(1.5,1.5);

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
    $('.live').each(function() {
        V(this).removeClass('live');
    });

    _.each(graph.getElements(), function(element) {
        // broadcast a new signal from every input in the graph
        (element instanceof joint.shapes.logic.Input) && broadcastSignal(element, signal);
    });

    return signal;
}

// Every logic gate needs to know how to handle a situation, when a signal comes to their ports.
joint.shapes.logic.Gate.prototype.onSignal = function(signal, handler) {
    handler.call(this, signal);
}
// The repeater delays a signal handling by 400ms
joint.shapes.logic.Repeater.prototype.onSignal = function(signal, handler) {
    _.delay(handler, 400, signal);
}
// Output element just marks itself as alive.
joint.shapes.logic.Output.prototype.onSignal = function(signal) {
    toggleLive(this, signal);
}

// diagramm setup

var gates = {
    repeater: new joint.shapes.logic.Repeater({ position: { x: 410, y: 25 }}),
    or: new joint.shapes.logic.Or({ position: { x: 550, y: 50 }}),
    and: new joint.shapes.logic.And({ position: { x: 550, y: 150 }}),
    not: new joint.shapes.logic.Not({ position: { x: 90, y: 140 }}),
    nand: new joint.shapes.logic.Nand({ position: { x: 550, y: 250 }}),
    nor: new joint.shapes.logic.Nor({ position: { x: 270, y: 190 }}),
    xor: new joint.shapes.logic.Xor({ position: { x: 550, y: 200 }}),
    xnor: new joint.shapes.logic.Xnor({ position: { x: 550, y: 100 }}),
    input: new joint.shapes.logic.Input({ position: { x: 5, y: 45 }}),
    output: new joint.shapes.logic.Output({ position: { x: 440, y: 290 }})
};


var wires = [
    { source: { id: gates.input.id, port: 'out' }, target: { id: gates.not.id, port: 'in' }},
    { source: { id: gates.not.id, port: 'out' }, target: { id: gates.nor.id, port: 'in1' }},
    { source: { id: gates.nor.id, port: 'out' }, target: { id: gates.repeater.id, port: 'in' }},
    { source: { id: gates.nor.id, port: 'out' }, target: { id: gates.output.id, port: 'in' }},
    { source: { id: gates.repeater.id, port: 'out' }, target: { id: gates.nor.id, port: 'in2'},
      vertices: [{ x: 215, y: 100 }]
    }
];

// add gates and wires to the graph
graph.addCells(_.toArray(gates));
_.each(wires, function(attributes) {
    graph.addCell(paper.getDefaultLink().set(attributes));
});

graph.on('change:source change:target', function(model, end) {

    var e = 'target' in model.changed ? 'target' : 'source';

    if ((model.previous(e).id && !model.get(e).id) || (!model.previous(e).id && model.get(e).id)) {
        // if source/target has been connected to a port or disconnected from a port reinitialize signals
        current = initializeSignal();
    }
});

graph.on('change:signal', function(wire, signal) {

    toggleLive(wire, signal);

    var magnitude = Math.abs(signal);

    // if a new signal has been generated stop transmitting the old one
    if (magnitude !== current) return;

    var gate = graph.getCell(wire.get('target').id);

    if (gate) {

        gate.onSignal(signal, function() {

            // get an array of signals on all input ports
            var inputs = _.chain(graph.getConnectedLinks(gate, { inbound: true }))
                .groupBy(function(wire) {
                    return wire.get('target').port;
                })
                .map(function(wires) {
                    return Math.max.apply(this, _.invoke(wires, 'get', 'signal')) > 0;
                })
                .value();

            // calculate the output signal
            var output = magnitude * (gate.operation.apply(gate, inputs) ? 1 : -1);
            
            broadcastSignal(gate, output);
        });
   }
});

// initialize signal and keep its value

var current = initializeSignal();

*/

