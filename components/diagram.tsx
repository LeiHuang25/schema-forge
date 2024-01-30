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
  let createdDiskById: { [key: string]: string } = {};
  let lastClickedClass: string | null = null;

  const canvas = useRef(null);

  useEffect(() => {


    //creer des element
    let zoom:d3.ZoomBehavior<SVGSVGElement, unknown>;
    let graph: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = d3.select('your-selector');

    let isPanning = false; //pour voir si il est en traine de panning
    let startTransform: d3.ZoomTransform | undefined;   //stocker l'etat de start panning

    if (graph) {
      //1
      const paper = graph.append('g');

      const scroller = d3.select('body').append('div').classed('paper-scroller',true);

      //zoom
      zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.4, 3])
        .on('zoom',(event) => {
          paper.attr('transform', event.transform);
      });

      graph.call(zoom);

      graph.on('wheel',(event) => {
        event.preventDefault();
        const delta = event.deltaY *0.005;
        const scale = d3.zoomTransform(graph!.node()).k;
        const newScale = scale + delta;
        graph.transition().duration(200).call(zoom.scaleTo,newScale);
      });

      //Panning
      graph.on('mousedown',(event) => {
        isPanning = true;
        startTransform = d3.zoomTransform(graph!.node());
        graph.on('mousemove',Mousemove);
        graph.on('mouseup',Mouseup);
      });

      graph.selectAll('*').remove();
    }

    function Mousemove(event: MouseEvent){
      const pointer = d3.pointer(event);

      if (isPanning && startTransform && graph) {
        const currentTransform = d3.zoomTransform(graph!.node());
        const dx = pointer[0] - startTransform.invertX(0);
        const dy = pointer[1] - startTransform.invertY(0);
        graph!.call(zoom.transform, d3.zoomIdentity.translate(dx,dy).scale(currentTransform.k));
      }
    }

    function Mouseup() {
      isPanning = false;
      graph!.on('mousemove',null);
      graph!.on('mouseup',null);
    }

    let paper2: d3.Selection<SVGGElement, unknown, HTMLElement, any> | null = d3.select('#your-selector');
    if (selectedClass) {
      //2
      const disk = paper2.append('circle')
      .attr('cx',100)
      .attr('cy',100)
      .attr('r',50)
      .style('fill','white');

      disk.on('click',function(){
        const clickedDiskId = this.id;
        const clickedClass = createdDiskById[clickedDiskId];
        removeTooltip();
        graph.selectAll('circle').remove();

        const showTooltip = (event: React.MouseEvent<HTMLElement>,data: { [key: string]: string }) => {
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

        if (clickedClass && store) {
          const classNode = $rdf.namedNode(clickedClass);
          const tableData1 = rdfHelpers.getDirectProperties(store, classNode) as { [key: string]: string };
          const tableData2 = rdfHelpers.getDataProperties(store, classNode) as { [key: string]: string };
          const tableData = Object.assign({}, tableData1, tableData2);
          setTableData(tableData);

          if (lastClickedClass === clickedClass) {
            showTooltip((d3 as any).event as React.MouseEvent<HTMLElement>, tableData);
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
                clickedDiskId,
                target,
                propertyUri,
                'outgoing',
                createdDiskById,
                createdRelatedDisks
              );
            });

            incomingConnectedClasses.forEach(({ target, propertyUri }, index) => {
              createDiskAndLink(
                graph,
                clickedDiskId,
                target,
                propertyUri,
                'incoming',
                createdDiskById,
                createdRelatedDisks,
              );
            });
          };
          lastClickedClass = clickedClass;
        }
      });
    }
    return () => {
      graph.remove();
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