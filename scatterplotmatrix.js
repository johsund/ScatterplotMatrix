/*globals define*/
define( ["jquery", "text!./style.css", "./d3.v3.min"], function ( $, cssContent ) {
	'use strict';
	$( "<style>" ).html( cssContent ).appendTo( "head" );
	return {
		initialProperties: {
			qHyperCubeDef: {
				qDimensions: [],
				qMeasures: [],
				qInitialDataFetch: [{
					qWidth: 6,
					qHeight: 1500
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
					min: 4,
					max: 4
				},
				sorting: {
					uses: "sorting"
				},
				settings: {
					uses: "settings"
				}
			}
		},
		snapshot: {
			canTakeSnapshot: true
		},
		paint: function ( $element, layout ) {
			//console.log($element);
			//console.log(layout);
			
			var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
			
			var measureLabels = layout.qHyperCube.qMeasureInfo.map(function(d)
			{
			return d.qFallbackTitle;
			}
			);
			
			var dimLabel = layout.qHyperCube.qDimensionInfo[1].qFallbackTitle;
			
			var data = qMatrix.map(function(d) {
			return {
				//"Dim0":d[0].qText,
				"Dim1":d[1].qText,
				"Metric1":d[2].qNum,
				"Metric2":d[3].qNum,
				"Metric3":d[4].qNum,
				"Metric4":d[5].qNum				
			}
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
			
			viz(data, measureLabels, dimLabel, width, height, id);
			
		}
	};
} );

var viz = function(data, labels, dim, width, height, id) {



 var domainByTrait = {},
     traits = d3.keys(data[0]).filter(function(d) { return d !== "Dim1"; }),
     n = traits.length;
	 
	 //console.log(n);
	 //console.log(traits);

 traits.forEach(function(trait) {
   domainByTrait[trait] = d3.extent(data, function(d) { return d[trait]; });
 });
 
 //console.log(domainByTrait);
 
 
 var width =  width,//if(width<height) {return width;} else {return height;},
    size = width/n,
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

var color = d3.scale.category10();
 
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
  cell.filter(function(d) { return d.i === d.j; }).append("text")
      .attr("x", padding)
      .attr("y", padding)
      .attr("dy", ".71em")
      .text(function(d) { return labels[d.i]; });

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
        .attr("r", 4)
        .style("fill", function(d) { return color(d.Dim1); });
  }

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
	// console.log(brush.extent());
	
	console.log(brush);
	var e = brush.extent();
	svg.selectAll("circle").filter(function(d) {
		//console.log(d);
		return e[0][0] < d.Metric4;
	})
	.attr("r",10);
		
	// $.each(data, function(i,obj) {
		
		// //console.log(obj);
		// if(e[0][0] < obj.Metric4 && obj.Metric4 < e[1][0] && e[0][1] > obj.Metric1 && obj.Metric1 < e[1][1]) {
			// console.log("Success");
			// console.log(obj);
		// }
	// });

	
	
	//	}
	//});
    
	
	if (brush.empty()) svg.selectAll(".hidden").classed("hidden", false);
  }

  d3.select(self.frameElement).style("height", size * n + padding + 20 + "px");


function cross(a, b) {
  var c = [], n = a.length, m = b.length, i, j;
  for (i = -1; ++i < n;) for (j = -1; ++j < m;) c.push({x: a[i], i: i, y: b[j], j: j});
  return c;
}

};
