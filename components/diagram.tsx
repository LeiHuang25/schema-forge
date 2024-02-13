import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as $rdf from 'rdflib';
import { createDiskAndLink } from '@/components/graph';
import * as rdfHelpers from '@/components/rdfHelpers';

const Diagram = ({ selectedClass, store, setTableData }) => {
    const svgRef = useRef(null);
    const mainClassRef = useRef(null); // 添加一个ref来引用主类的元素

    useEffect(() => {
        const svg = d3.select(svgRef.current)
            .attr('width', 500)
            .attr('height', 500);

        const group = svg.append('g');

        group.append('rect')
            .attr('width', 800)
            .attr('height', 600)
            .attr('fill', 'lightgray');

        const zoom = d3.zoom()
            .scaleExtent([0.4, 3])
            .on('zoom', (event) => {
                group.attr('transform', event.transform);
            });

        svg.call(zoom);

        return () => {
            svg.selectAll('*').remove(); 
            svg.remove(); 
        };
    }, []);

    useEffect(() => {
        if (selectedClass) {
            const startX = 100; 
            const startY = 100; 
            const circleRadius = 50; 
            const svg = d3.select(svgRef.current);
            const group = svg.select('g');

            const disk = group.append('circle')
                .attr('class', 'class-circle')
                .attr('classId', selectedClass)
                .attr('cx', startX)
                .attr('cy', startY)
                .attr('r', circleRadius)
                .style('fill', 'white')
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .call(d3.drag().on('drag', dragged))
                .on('contextmenu', (event) => displayContextMenu(event, selectedClass));

            mainClassRef.current = disk.node();

            const label = rdfHelpers.getLabelFromURI(store, selectedClass);
            group.append('text')
                .attr('class', 'class-text')
                .attr('classId', selectedClass)
                .attr('x', startX)
                .attr('y', startY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .style('fill', 'black')
                .text(label);

            function dragged(event) {
                const newX = event.x;
                const newY = event.y;

                disk.attr('cx', newX)
                    .attr('cy', newY);

                d3.selectAll('text[classId="' + selectedClass + '"]')
                    .attr('x', newX)
                    .attr('y', newY);

                // 更新与主类相关的连线位置
                updateMainClassRelatedLines(newX, newY);
            }
        }
    }, [selectedClass]);

    function updateMainClassRelatedLines(newX, newY) {
        // 遍历所有与主类相关的连线，更新它们的位置
        d3.selectAll('.link').each(function() {
            const line = d3.select(this);
            const sourceX = newX;
            const sourceY = newY;
            const targetX = +line.attr('x2');
            const targetY = +line.attr('y2');
            const midX = (sourceX + targetX) / 2;
            const midY = (sourceY + targetY) / 2;
            const linkPath = `M${sourceX},${sourceY} L${targetX},${targetY}`;
            line.attr('d', linkPath);
            // 更新连接线上文字的位置
            line.select('.link-text').attr('x', midX).attr('y', midY);
        });
    }

    function displayContextMenu(event, classId) {
        event.preventDefault();
        const x = event.clientX;
        const y = event.clientY;

        const contextMenu = document.createElement("div");
        contextMenu.id = "context-menu";
        contextMenu.style.position = "absolute";
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.backgroundColor = "white";
        contextMenu.style.border = "1px solid #ccc";
        contextMenu.style.padding = "5px";

        const menuItems = [
            { action: 'expandSubclasses', content: 'Expand/Hide Subclasses' },
            { action: 'expandRelations', content: 'Expand/Hide Relations' },
            { action: 'removeClass', content: 'Remove Class' }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement("div");
            menuItem.textContent = item.content;
            menuItem.style.cursor = "pointer";
            menuItem.addEventListener("click", () => handleMenuItemClick(item.action, classId));
            contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(contextMenu);

        document.addEventListener("click", closeContextMenu);

        function closeContextMenu(event) {
            if (!contextMenu.contains(event.target)) {
                contextMenu.remove();
                document.removeEventListener("click", closeContextMenu);
            }
        }
    }

    function handleMenuItemClick(action, classId) {
        try {
            console.log("Menu item clicked:", action);
            if (action === 'expandSubclasses') {
                if (store) {
                    console.log("Expanding subclasses...");
                    expandSubclasses(classId); 
                    console.log("Subclasses expanded successfully.");
                } else {
                    console.error('RDF store is not available.');
                }
            } else if (action === 'expandRelations') {
                if (store) {
                    console.log("Expanding relations...");
                    expandRelations(classId); 
                    console.log("Relations expanded successfully.");
                } else {
                    console.error('RDF store is not available.');
                }
            } else if (action === 'removeClass') {
                removeSelectedClass(classId);
            }
        } catch (error) {
            console.error('Error handling menu item click:', error);
        }
    }

    function expandRelations(classId) {
        try {
            console.log("Expanding relation for:", classId);
            if (!classId || !store) {
                console.error('No class selected or RDF store is not available.');
                return;
            }
            const clickedNode = $rdf.namedNode(classId);
            console.log(clickedNode);
            const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, clickedNode);
            console.log(incomingConnectedClasses);

            incomingConnectedClasses.forEach(({ target, propertyUri }) => {
              const selectedCircle =d3.select(`circle[classId="${classId}"]`)   ;
              console.log(selectedCircle);
              const cxValue = +selectedCircle.attr('cx');
              const cyValue = +selectedCircle.attr('cy');
              console.log(cxValue,cyValue);

                createDiskAndLink(
                    d3.select(svgRef.current),
                    target,
                    propertyUri,
                    'incoming',
                    target.value,
                    { x: cxValue, y: cyValue},  
                    store,
                    mainClassRef
                );
            });
        } catch (error) {
            console.error('Error expanding relations:', error);
        }
    }

    function expandSubclasses(classId) {
        try {
            console.log("Expanding subclasses for:", classId);
            if (!classId || !store) {
                console.error('No class selected or RDF store is not available.');
                return;
            }
            const clickedNode = $rdf.namedNode(classId);
            console.log(clickedNode);
            const outgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
            console.log(outgoingConnectedClasses);
            outgoingConnectedClasses.forEach(({ target, propertyUri }) => {
              const selectedCircle =d3.select(`circle[classId="${classId}"]`)  ;
              const cxValue = +selectedCircle.attr('cx');
              const cyValue = +selectedCircle.attr('cy');

                createDiskAndLink(
                    d3.select(svgRef.current),
                    target,
                    propertyUri,
                    'outgoing',
                    target.value,
                    { x: cxValue, y: cyValue}, 
                    store,
                    mainClassRef
                );
            });
        } catch (error) {
            console.error('Error expanding subclasses:', error);
        }
    }

    function removeSelectedClass(classId) {
        const svg = d3.select(svgRef.current);
        const selectedCircle = svg.select('circle[classId="' + classId + '"]');
        selectedCircle.remove(); 
        const selectedText = svg.select('text[classId="' + classId + '"]');
        selectedText.remove(); 
    }

    return (
        <svg ref={svgRef}></svg>
    );
};

export default Diagram;
