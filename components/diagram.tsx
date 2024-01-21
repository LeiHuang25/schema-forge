import React, { useEffect, useRef } from 'react';
//import * as joint from 'jointjs';
//import { dia, ui, shapes } from '@clientio/rappid';
import * as $rdf from 'rdflib';
import * as rdfHelpers from '@/components/rdfHelpers';
import { createDiskAndLink } from '@/components/graph';
import * as d3 from 'd3';

function removeTooltip() {
    const oldTooltip = document.getElementById("tooltip");
      if (oldTooltip) {
          oldTooltip.remove();
      }
}

type DiagramProps = {
  selectedClass?: string;
  store: $rdf.IndexedFormula | null;
  setTableData: (data: { [key: string]: string }) => void;
}


    const Diagram = ({ selectedClass, store, setTableData }: DiagramProps) => {
        let currentDisk = null;
        let createdRelatedDisks: string[] = [];
        let createdDiskById = {};
        let lastClickedClass: string | null = null;

        const canvas = useRef(null);

    useEffect(() => {
      //1

    //creer des element svg
    const width = 800;
    const height = 600;
    const svg = d3.select('#canvas')
      .append('svg')
      .attr('width',width)
      .attr('height',height);
    const container = svg.append('g');
    const data = [
      { x: 50, y: 50 },
      { x: 100, y: 100 },
      { x: 150, y: 150 },
    ];

    const circles = container.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d: { x: number; y: number }) => d.x)
      .attr("cy", (d: { x: number; y: number }) => d.y)
      .attr("r", 10)
      .attr("fill", "white");

    //zoom
    const zoom = d3.zoom()
      .scaleExtent([0.4,3])
      .on('zoom',function(){
        svg.attr("transform", d3.event.transform);
      });

    svg.call(zoom);

    //Panning
    const pan = d3.pan()
      .on('start',start)
      .on('pan',panning)
      .on('end',end);

    svg.call(pan);

    function start(this: SVGCircleElement){
      d3.select(this).classed('active',true);
    }

    function panning(this: SVGCircleElement,event: d3.DragEvent<SVGCircleElement,{x: number; y: number}>,d:{ x: number; y: number}){
      d3.select(this).attr('cx', d.x = event.x).attr("cy", d.y = event.y);
    }

    function end(this: SVGCircleElement){
      d3.select(this).classed('active',false);
    }

    if (selectedClass) {
      //2
      const disk = container.append('circle')
      .attr('cx',width / 2)
      .attr('cy',height / 2)
      .attr('r',50)
      .style('fill','white')
      .style('cursor','pointer');

      disk.on('click',function(){
        const clickedDiskId = this.id;
        const clickedClass = createdDiskById[clickedDiskId];
        removeTooltip();
        container.selectAll('circle').remove();

      const showTooltip = (event,data) => {
        const tooltip = d3.select("body")
          .append("div")
          .attr("id", "tooltip")
          .style("position", "fixed")
          .style("left", `${event.clientX + 10}px`)
          .style("top", `${event.clientY + 10}px`);

        //tailwind
        tooltip.classed("bg-white bg-opacity-90 rounded-lg shadow-lg p-4 border border-gray-300", true);

        const table = tooltip.append("table")
          .classed("min-w-full", true);
        const tbody = table.append("tbody");

        Object.keys(data).forEach(key => {
          const tr = tbody.append("tr")
            .classed("hover:bg-gray-100", true);

          const tdKey = tr.append("td")
            .classed("py-1 px-2 text-left", true)
            .text(key);

          const tdValue = tr.append("td")
            .classed("py-1 px-2 text-left", true)
            .text(data[key]);
        });
      };
        if (clickedClass) {
          const classNode = $rdf.namedNode(clickedClass);
          const tableData1 = rdfHelpers.getDirectProperties(store, classNode);
          const tableData2 = rdfHelpers.getDataProperties(store, classNode);
          const tableData = Object.assign({}, tableData1, tableData2);
          setTableData(tableData);

          if (lastClickedClass === clickedClass) {
            showTooltip(d3.event, tableData);
          }

          if (!createdRelatedDisks.includes(clickedDiskId)) {
          // Mark this disk as "expanded"
            createdRelatedDisks.push(clickedDiskId);

            const clickedNode = $rdf.namedNode(clickedClass);
            const outgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
            const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, clickedNode);

            outgoingConnectedClasses.forEach(({ target, propertyUri }, index) => {
                createDiskAndLink(
                  graph,
                  target,
                  propertyUri,
                  'outgoing',
                  createdDiskById,
                  createdRelatedDisks,
                  cellView,
                  index,
                  store,
                  clickedDiskId
                );
            });

            incomingConnectedClasses.forEach(({ target, propertyUri }, index) => {
              createDiskAndLink(
                graph,
                target,
                propertyUri,
                'incoming',
                createdDiskById,
                createdRelatedDisks,
                cellView,
                index,
                store,
                clickedDiskId
              );
            });
          };
          lastClickedClass = clickedClass;
        }
      });
    }
    return () => {
      svg.remove();
    };
  }, [selectedClass, store, setTableData]);

  return (
    <div id="paper" ref={canvas}/>
  );
};

export default Diagram;


/* 1
      const graph = new dia.Graph();
      const paper = new dia.Paper({
        model: graph,
        gridSize: 1,
      //   background: {
      //     color: '#F8F9FA',
      // },
      frozen: true,
      async: true,
      sorting: dia.Paper.sorting.APPROX,
      cellViewNamespace: shapes
  });    //initialisation graph

      const scroller = new ui.PaperScroller({
        paper,
        autoResizePaper: true,
        cursor: 'grab',

    });   //scroller

    canvas.current.appendChild(scroller.el);
    scroller.lock();
    scroller.render().center();

    paper.on('blank:mousewheel', (evt, ox, oy, delta) => {
      evt.preventDefault();
      scroller.zoom(delta * 0.2, { min: 0.4, max: 3, grid: 0.2, ox, oy });
    });

    paper.on('blank:pointerdown', (event, x, y) => {
      removeTooltip();
      scroller.startPanning(event);
    });

    // Clear existing cells and previously created related disks
    graph.clear();
    createdRelatedDisks = [];*/


  /* 2
        const disk = new shapes.standard.Circle({
        size: { width: 100, height: 100 },
        attrs: {
          label: {
            text: rdfHelpers.getLabelFromURI(store, selectedClass),
            fontSize: 14
          }
        }
      });
      graph.addCell(disk);
      paper.unfreeze();
      currentDisk = disk;
      createdDiskById[disk.id] = selectedClass;

      const paperWidth = paper.options.width as number;
      const paperHeight = paper.options.height as number;
      disk.position((paperWidth - disk.attributes.size.width) / 2, (paperHeight - disk.attributes.size.height) / 2);
    
      const showTooltip = (e: MouseEvent, data: { [key: string]: string }) => {      
        const tooltip = document.createElement("div");
        tooltip.id = "tooltip";
        tooltip.style.position = "fixed";
        tooltip.style.left = `${e.clientX + 10}px`;
        tooltip.style.top = `${e.clientY + 10}px`;

        // Tailwind styling
        tooltip.classList.add("bg-white", "bg-opacity-90", "rounded-lg", "shadow-lg", "p-4", "border", "border-gray-300");
        // Creating a table for a more structured look
        const table = document.createElement("table");
        table.classList.add("min-w-full");

        const tbody = document.createElement("tbody");

        Object.keys(data).forEach((key) => {
          const tr = document.createElement("tr");
          tr.classList.add("hover:bg-gray-100");

          const tdKey = document.createElement("td");
          tdKey.classList.add("py-1", "px-2", "text-left");
          tdKey.textContent = key;

          const tdValue = document.createElement("td");
          tdValue.classList.add("py-1", "px-2", "text-left");
          tdValue.textContent = data[key];

          tr.appendChild(tdKey);
          tr.appendChild(tdValue);
          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tooltip.appendChild(table);
        document.body.appendChild(tooltip);
      };

    paper.on('cell:pointerdown', function(cellView, evt) {
        const clickedDiskId = cellView.model.id;
        const clickedClass = createdDiskById[clickedDiskId];
        removeTooltip();
        graph.removeCells(graph.getElements().filter(element => element.attributes.type === 'standard.Rectangle'));
        */