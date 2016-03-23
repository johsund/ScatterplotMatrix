/*globals define*/
define( ["jquery", "text!./css/style.css", "js/qlik", "./vendor/d3.v3.min", "./js/themes"], function ( $, cssContent, qlik ) {
	'use strict';
	$( "<style>" ).html( cssContent ).appendTo( "head" );
	return {
		initialProperties: {
			qHyperCubeDef: {
				qDimensions: [],
				qMeasures: [],
				qInitialDataFetch: [{
					qWidth: 11,
					qHeight: 900
				}]
			}
		},
		definition: {
			type: "items",
			component: "accordion",
			items: {
				dimensions: {
					uses: "dimensions",
					min: 2,
					max: 2
				},
				measures: {
					uses: "measures",
					min: 2,
					max: 9
				},
				sorting: {
					uses: "sorting"
				},
				settings: {
					uses: "settings",
					items:{
					  ThemeDropDown: {
							type: "string",
							component: "dropdown",
							label: "Theme",
							ref: "theme",
							options: chart_theme,
							defaultValue: 1
						},
						extras:{
							type: "items",
							label: "Extra Settings",
							items: {
							scrollaftermax: {
								type: "integer",
								label: "Circle size (px)",
								ref: "circleSize",
								defaultValue: 4
							},
							showfulltitles: {
								type: "boolean",
								label: "Show minimal titles",
								ref: "minimaltitles",
								defaultValue: true
							},
							showlegend: {
								type: "boolean",
								label: "Show legend",
								ref: "showlegend",
								defaultValue: true
							}							
							}
						}					
					}
				}
			}
		},
		snapshot: {
			canTakeSnapshot: true
		},
		paint: function ( $element, layout ) {
			
			var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
			
			var measureLabels = layout.qHyperCube.qMeasureInfo.map(function(d)
			{
			return d.qFallbackTitle;
			}
			);
			
			var measureLength = layout.qHyperCube.qMeasureInfo.length;
			
			var dimLabel = layout.qHyperCube.qDimensionInfo[1].qFallbackTitle;
			
			var data = qMatrix.map(function(d) {
				var i;
				var mydata = {};
				mydata["Dim0"] = d[0].qText;
				mydata["Dim1"] = d[1].qText;				
				for	(i = 2; i < d.length; i++) {mydata["Metric" + (i - 2)] = d[i].qNum;}
				return mydata;			

			});
			
			var width = $element.width();
			var height = $element.height();
			var id = "container_" + layout.qInfo.qId;
			
			if(document.getElementById(id)) {
			$("#" + id).empty();
			}
			else {
			$element.append($('<div />').attr("id", id).width(width).height(height));
			}
			
			viz(data, measureLabels, dimLabel, width, height, id, layout, qlik);
			
		}
	};
} );

var viz = function(data, labels, dim, width, height, id, layout, qlik) {

var app = qlik.currApp();

 var domainByTrait = {},
     traits = d3.keys(data[0]).filter(function(d) { return d !== "Dim1" && d !== "Dim0"; }),
     n = traits.length;
	 
	 //console.log(n);
	 //console.log(traits);

 traits.forEach(function(trait) {
   domainByTrait[trait] = d3.extent(data, function(d) { return d[trait]; });
 });
 
 //console.log(domainByTrait);
 
 
 var width =  Math.min(width, height),//if(width<height) {return width;} else {return height;},
    size = (Math.min(width, height)-40)/n,
    padding = 20;

var x = d3.scale.linear()
    .range([padding / 2, size - padding / 2]);

var y = d3.scale.linear()
    .range([size - padding / 2, padding / 2]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(6);

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(6);

var color = d3.scale.ordinal()
			.range(layout.theme); //category20();
 
  //var size = width / n;
 
  xAxis.tickSize(size * n);
  yAxis.tickSize(-size * n);

  var brush = d3.svg.brush()
      .x(x)
      .y(y)
      .on("brushstart", brushstart)
      .on("brush", brushmove)
      .on("brushend", brushend);

  var svg = d3.select("#" + id).append("svg")
      .attr("width", size * n + padding)
      .attr("height", size * n + padding)
    .append("g")
      .attr("transform", "translate(" + padding + "," + padding / 2 + ")");

  svg.selectAll(".x.axis")
      .data(traits)
    .enter().append("g")
      .attr("class", "x axis")
      .attr("transform", function(d, i) { return "translate(" + (n - i - 1) * size + ",0)"; })
      .each(function(d) { x.domain(domainByTrait[d]); d3.select(this).call(xAxis); });

  svg.selectAll(".y.axis")
      .data(traits)
    .enter().append("g")
      .attr("class", "y axis")
      .attr("transform", function(d, i) { return "translate(0," + i * size + ")"; })
      .each(function(d) { y.domain(domainByTrait[d]); d3.select(this).call(yAxis); });

  var cell = svg.selectAll(".cell")
      .data(cross(traits, traits))
    .enter().append("g")
      .attr("class", "cell")
      .attr("transform", function(d) { return "translate(" + (n - d.i - 1) * size + "," + d.j * size + ")"; })
      .each(plot);

  // Titles for the diagonal.
  cell.filter(function(d) { if(layout.minimaltitles) {return d.i === d.j;} else {return 1 === 1};}).append("text")
      .attr("x", padding)
      .attr("y", padding)
      .attr("dy", ".71em")
      .text(function(d) { if(layout.minimaltitles) {return labels[d.i];} else {return labels[d.i] + " vs. " + labels[d.j];}});

  cell.call(brush);

  function plot(p) {
    var cell = d3.select(this);

    x.domain(domainByTrait[p.x]);
    y.domain(domainByTrait[p.y]);

    cell.append("rect")
        .attr("class", "frame")
        .attr("x", padding / 2)
        .attr("y", padding / 2)
        .attr("width", size - padding)
        .attr("height", size - padding);

    cell.selectAll("circle")
        .data(data)
      .enter().append("circle")
        .attr("cx", function(d) { return x(d[p.x]); })
        .attr("cy", function(d) { return y(d[p.y]); })
        .attr("r", layout.circleSize)
		.attr("class", "visible")
        .style("fill", function(d) { return color(d.Dim1); })
		.on("mouseover", function(d, i) { console.log(labels);})
		.append("svg:title")
			.text(function(d) {return d.Dim0;});		

  }
  
	//Trying to figure out the popups
	// svg.selectAll("circle")
		// .on("mouseover", function(d, i) { console.log(labels);})
		// .append("svg:title")
			// .text(function(d) {return d.Dim0;});

  //Legend
if(layout.showlegend) {  

	svg.append("rect")
		.attr("x", width-135)
		.attr("y", -3)
		.attr("width", 103)
		.attr("height", 20 * color.domain().length + 4)
		.style("fill", "white")
		.style("paddingTop", "5px")
		.style("stroke-width", 2)
		.style("stroke", "black")
		.style("stroke-opacity", 0.7);

  var legend = svg.selectAll(".legend")
      .data(color.domain())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
      .attr("x", width - 52)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

  legend.append("text")
      .attr("x", width - 58)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
} 
  // end Legend
  
  var brushCell;

  // Clear the previously-active brush, if any.
  function brushstart(p) {
    if (brushCell !== this) {
      d3.select(brushCell).call(brush.clear());
      x.domain(domainByTrait[p.x]);
      y.domain(domainByTrait[p.y]);
      brushCell = this;
    }
	
  }

  // Highlight the selected circles.
  function brushmove(p) {
    var e = brush.extent();
	
	//var valuesList = [];
	
    svg.selectAll("circle").classed("hidden", function(d) {
		
      return e[0][0] > d[p.x] || d[p.x] > e[1][0]
          || e[0][1] > d[p.y] || d[p.y] > e[1][1];
    });
  }

  // If the brush is empty, select all circles.
  function brushend() {
	
	var testArray = [];
	testArray = svg.selectAll("[class=visible]");
		//console.log(testArray);
	var secondArray = [];
	
	$.each(testArray[0], function(i, obj) {
			secondArray.push(testArray[0][i].textContent);
	});
	
	secondArray = jQuery.unique(secondArray);

	//Trigger selection&cancel buttons
	var selBoxName = "selectBox_" + id;
	var confSelName = "confirmSelect_" + id;	
	var canSelName = "cancelSelect_" + id;	

	//console.log(id);
	
	if (document.getElementById(selBoxName)) {
	}
	else {
		//console.log("triggered");
				
		$("#" + id).append("<div id='"+selBoxName+"' style='display:block;position:absolute;top:20px;right:20px;height:30px;width:90px;z-index:10000;border:1px;'></div>");
		
		 $("#" + selBoxName).append(
		"<button id='"+confSelName+"' style='float:left;display:inline-block;' tid='selection-toolbar.refresh' qva-activate='buttonAction($event, button)' q-title-translation='Tooltip.ConfirmSelections' ng-disabled='buttonIsDisabled(button)' class='sel-toolbar-btn sel-toolbar-confirm' ng-class='[button.buttonClass, button.isIcon ? 'sel-toolbar-icon' : '', button.isActive(this) ? 'menu-active' : '']' title='Confirm selection'>" +
			"<span class='sel-toolbar-span-icon icon-tick' ng-class='button.iconClass'></span>" +
		"</button>"
		);
		$("#"+confSelName).click(function(){
			if(layout.qHyperCube.qDimensionInfo[0].qDimensionType=="N") {
				
				var lookupArray = [];
				var linkArray = [];
				
				$.each(layout.qHyperCube.qDataPages[0].qMatrix, function(index) {
					if($.inArray(layout.qHyperCube.qDataPages[0].qMatrix[index][0].qElemNumber, lookupArray) === -1 ){
						lookupArray.push(layout.qHyperCube.qDataPages[0].qMatrix[index][0].qElemNumber);
						linkArray.push(layout.qHyperCube.qDataPages[0].qMatrix[index][0].qText);
					}
				});
				
				var selectionValues = [];
				$.each(selvalues, function(index, value) {
					//console.log(value);
					var a = linkArray.indexOf(value);
					//console.log(a);
					if(a >=0) {
						selectionValues.push(lookupArray[a]);
					}
				});
				//console.log(selectionValues);
				app.field(layout.qHyperCube.qDimensionInfo[0].qGroupFieldDefs[0]).selectValues(selectionValues, false, false);
			}
			else {
				//console.log(secondArray);
				app.field(layout.qHyperCube.qDimensionInfo[0].qGroupFieldDefs[0]).selectValues(secondArray, false, false);
			}
		});
	}
	
	if (document.getElementById(canSelName)) {
	}
	else {
		$("#" + selBoxName).append(
		"<button id='"+canSelName+"' style='float:left;display:inline-block;' tid='selection-toolbar.undo' qva-activate='buttonAction($event, button)' q-title-translation='Tooltip.CancelSelections' ng-disabled='buttonIsDisabled(button)' class='sel-toolbar-btn sel-toolbar-cancel' ng-class='[button.buttonClass, button.isIcon ? 'sel-toolbar-icon' : '', button.isActive(this) ? 'menu-active' : '']' title='Cancel selection'>" +
			"<span class='sel-toolbar-span-icon icon-cancel' ng-class='button.iconClass'></span>" +
		"</button>"
		);
		$("#" + canSelName).click(function(){
			//selvalues = [];			
			qlik.resize();

		});
	}		
	
	
	if (brush.empty()) svg.selectAll(".hidden").classed("hidden", false);
  }

  d3.select(self.frameElement).style("height", size * n + padding + 20 + "px");


function cross(a, b) {
  var c = [], n = a.length, m = b.length, i, j;
  for (i = -1; ++i < n;) for (j = -1; ++j < m;) c.push({x: a[i], i: i, y: b[j], j: j});
  return c;
}

};
