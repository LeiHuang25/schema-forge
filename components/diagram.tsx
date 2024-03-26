import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as $rdf from 'rdflib';
import { createDiskAndLink } from '@/components/graph';
import * as rdfHelpers from '@/components/rdfHelpers';
import { rdfs } from 'ldkit/namespaces';
import { time } from 'console';

const Diagram = ({ selectedClass, store, setTableData }) => {
    const svgRef = useRef(null);
    const mainClassRef = useRef(null);
    const [selectedClassDetails, setSelectedClassDetails] = useState(null);

    useEffect(() => {
        const svg = d3.select(svgRef.current)
            .attr('width', '100%')
            .attr('height', '100%');

        // Add background
        const background = svg.append('rect')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('fill', 'lightgrey')
            .attr('pointer-events', 'all');
        
            const group = svg.append('g').attr('class', 'disk-and-label');

        group.append('rect')
            .attr('width', '100%')
            .attr('height', '100%')
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
                .attr('nodeId', selectedClass)
                .attr('classId', selectedClass)
                .attr('cx', startX)
                .attr('cy', startY)
                .attr('r', circleRadius)
                .style('fill', 'white')
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .call(d3.drag().on('drag', dragged))
                .on('contextmenu', (event) => displayContextMenu(event, selectedClass))
                .on('click', function () {
                    const isSelected = d3.select(this).classed('selected');
                    // If already selected, uncheck the state, otherwise set to the selected state
                    if (isSelected) {
                        d3.select(this).classed('selected', false).style('stroke-width', 2);
                    } else {
                        // Uncheck all other circles
                        svg.selectAll('circle').classed('selected', false).style('stroke-width', 2);
                        // Set the current circle to the selected state
                        d3.select(this).classed('selected', true).style('stroke-width', 4);
                        const classDetails = getClassDetails(this.getAttribute('nodeId'), store);
                        setSelectedClassDetails(classDetails);
                    }
                });

            mainClassRef.current = disk.node();

            const label = rdfHelpers.getLabelFromURI(store, selectedClass);
            group.append('text')
                .attr('class', 'node-label')
                .attr('nodeId', selectedClass)
                .attr('classId', selectedClass)
                .attr('x', startX)
                .attr('y', startY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .style('fill', 'black')
                .call(d3.drag().on('drag', dragged))
                .text(label);

            function dragged(event) {
                const newX = event.x;
                const newY = event.y;

                disk.attr('cx', newX)
                    .attr('cy', newY);

                d3.selectAll('text[classId="' + selectedClass + '"]')
                    .attr('x', newX)
                    .attr('y', newY);

                updateMainClassRelatedLines(newX, newY,selectedClass);
            }
        }
    }, [selectedClass]);
    const getClassDetails = (selectedClass, store) => {
        const classNode = $rdf.namedNode(selectedClass);
        const tableData=rdfHelpers.getDirectProperties(store, classNode);
        const tableData1=rdfHelpers.getDataProperties(store, classNode);
       
        const attributeEntries = Object.entries(tableData1);
        // Build attributed string
        const attributeString = attributeEntries.map(([key, value]) => `${key}(${value})`).join(', ');
        
        // Get the selected circle element
        const selectedCircle = d3.select(`circle[nodeId="${selectedClass}"]`);
        
        // Check if circle is selected
        const isSelected = selectedCircle.classed('selected');
        const nodeId = selectedCircle.attr('nodeId');
        const lastIndex = nodeId.lastIndexOf('/');
        const name = lastIndex !== -1 ? nodeId.substring(lastIndex + 1) : nodeId;
        const superclass = rdfHelpers.getSuperClasses(store, classNode);
        const subclass = rdfHelpers.getOutgoingConnectedClasses(store, classNode);
        const relation = rdfHelpers.getIncomingConnectedClasses(store, classNode);
        const InferredSubClass=rdfHelpers.getIndirectlyConnectedClasses(store,classNode);
        const Inferredrelation=rdfHelpers.getIndirectlyIncomingClasses(store,classNode);
       
        const superlist = superclass.map(superclass => superclass.superClass);
        const supername = superlist.map(item => item.substring(item.lastIndexOf('/') + 1));
       
        const subname = subclass.map(item => {
            if (item.target) {
                return item.target.value.substring(item.target.value.lastIndexOf("/") + 1);
            } else {
                return ''; 
            }
        });
        const DirectOutgoing = subclass.map(item => {
            if (item.target) {
                const property = item.propertyUri.substring(item.propertyUri.lastIndexOf("/") + 1);
                const targetValue = item.target.value.substring(item.target.value.lastIndexOf("/") + 1);
                const target=item.target.value;
                return { property, targetValue,target };
            } else {
                return null;
            }
        });
        const DirectIncoming = relation.map(item => {
            if (item.target) {
                const property = item.propertyUri.substring(item.propertyUri.lastIndexOf("/") + 1);
                const targetValue = item.target.value.substring(item.target.value.lastIndexOf("/") + 1);
                const target = item.target.value;
                return { property, targetValue,target };
            } else {
                return null;
            }
        });
        const InferredOutgoing = InferredSubClass.map(item => {
            if (item && item.value) {
                const targetValue = item.value.substring(item.value.lastIndexOf("/") + 1);
                return { targetValue, target: item.value };
            } else {
                return null;
            }
        }).filter(item => item !== null);
        const InferredIncoming = Inferredrelation.map(item => {
            if (item && item.value) {
                const targetValue = item.value.substring(item.value.lastIndexOf("/") + 1);
                return { targetValue, target: item.value };
            } else {
                return null;
            }
        }).filter(item => item !== null);
        const outgoingTargets = InferredOutgoing.map(item => item.target);
  // Extract target properties from InferredIncoming and merge into an array
        const incomingTargets = InferredIncoming.map(item => item.target);
  
  // Merge two arrays
        const allTargets = [...outgoingTargets, ...incomingTargets];
  
        function combineAndBuildAttributes(store,...nodess) {
            // Initialize an empty object to store the merged properties
            const combinedData = {};
        
            // Traverse all nodes, obtain the data attributes of each node and merge them into combinedData
            nodess.forEach(nodes => {
              nodes.forEach(node => {
                const classNode = $rdf.namedNode(node);
                const data = rdfHelpers.getDataProperties(store, classNode);
                Object.assign(combinedData, data);
  
            })});
        
            // Traverse the merged attributes and construct the attribute string
            const combinedAttributes = Object.entries(combinedData).map(([key, value]) => `${key}(${value})`).join(', ');
        
            return combinedAttributes;
        }
        const InferredAttr=combineAndBuildAttributes(store,allTargets);
        
        // If the circle is selected, return relevant information
        if (isSelected) {
            // Return class details such as name, properties, relationships, etc.
            return {
                name: name,
                superclass: supername,
                subclass: subname,
                attributes: attributeString,
                relations: tableData,
                DirectOutgoing:DirectOutgoing,
                DirectIncoming:DirectIncoming,
                InferredOutgoing:InferredOutgoing,
                InferredIncoming:InferredIncoming,
                InferredAttr:InferredAttr,
            };
        } else {
            return null;
        }
        
      };
      


      const handleCircleClick = (nodeId) => {
        // Remove the "selected" class of all circles and set their borders to the default width
        d3.selectAll('.class-circle').classed('selected', false).style('stroke-width', 2);
    
        // Get SVG and group elements
        const svg = d3.select(svgRef.current);
        const group = svg.select('g');
    
        // Checks if a circle with the specified nodeId exists
        const existingCircle = group.select(`circle[nodeId="${nodeId}"]`);
        if (existingCircle.empty()) {
            // Get the lower position of the lowest circle on the canvas
            const lowestY = getLowestCircleYPosition(group);
    
            // create a new circle
            const newX = 100; // horizontal position
            const newY = lowestY + 100; // vertical position, relative to below the lowest circle
    
            // Create new circle
            const newCircle = group.append('circle')
                .attr('class', 'class-circle')
                .attr('nodeId', nodeId)
                .attr('classId', nodeId)
                .attr('cx', newX)
                .attr('cy', newY)
                .attr('r', 50)
                .style('fill', 'white')
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .call(d3.drag().on('drag', dragged))
                .on('contextmenu', (event) => displayContextMenu(event, nodeId))
                .on('click', function () {
                    const isSelected = d3.select(this).classed('selected');
                    // If already selected, uncheck the state, otherwise set to the selected state
                    if (isSelected) {
                        d3.select(this).classed('selected', false).style('stroke-width', 2);
                    } else {
                        // Uncheck all other circles
                        svg.selectAll('circle').classed('selected', false).style('stroke-width', 2);
                        // Set the current circle to the selected state
                        d3.select(this).classed('selected', true).style('stroke-width', 4);
                        const classDetails = getClassDetails(this.getAttribute('nodeId'), store);
                        setSelectedClassDetails(classDetails);
                    }
                });
    
            mainClassRef.current = newCircle.node();
    
            // Add label for new circle
            const label = rdfHelpers.getLabelFromURI(store, nodeId);
            group.append('text')
                .attr('class', 'node-label')
                .attr('nodeId', nodeId)
                .attr('classId', nodeId)
                .attr('x', newX)
                .attr('y', newY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .style('fill', 'black')
                .call(d3.drag().on('drag', dragged))
                .text(label);

            updateRelationsForNewCircle(newCircle);
    
            // Set the details of the newly selected circle
            const classDetails = getClassDetails(nodeId, store);
            setSelectedClassDetails(classDetails);
        } else {
            // If the circle already exists, set it to selected state
            existingCircle.classed('selected', true).style('stroke-width', 4);
    
            // Get and set the details of the newly selected circle
            const classDetails = getClassDetails(nodeId, store);
            setSelectedClassDetails(classDetails);
        }
    };
    
    // Get the lower position of the lowest circle on the canvas
    function getLowestCircleYPosition(group) {
        const circles = group.selectAll('.class-circle');
        let lowestY = 0;
        circles.each(function () {
            const cy = +d3.select(this).attr('cy');
            if (cy > lowestY) {
                lowestY = cy;
            }
        });
        return lowestY;
    }
    
    function dragged(event) {
        const newX = event.x;
        const newY = event.y;
    
        d3.select(this)
            .attr('cx', newX)
            .attr('cy', newY);
    
        const svg = d3.select(svgRef.current);
        const nodeId = this.getAttribute('nodeId');
        svg.selectAll(`text[classId="${nodeId}"]`)
            .attr('x', newX)
            .attr('y', newY);
    
        updateMainClassRelatedLines(newX, newY, nodeId);
    }
    function updateRelationsForNewCircle(newCircle) {
        console.log(newCircle);
        const svg = d3.select(svgRef.current);
        const group = svg.select('g');
        
        // Get all circles on canvas
        const existingCircles = group.selectAll('.class-circle');
        
        // Iterate over each existing circle
        existingCircles.each(function () {
            const existingCircle = d3.select(this);
            const existingNodeId = existingCircle.attr('nodeId');
            
            // Check if there is a subclass relationship
            const clickedNode = $rdf.namedNode(existingNodeId);
            const outgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
            outgoingConnectedClasses.forEach(({ target, propertyUri }) => {
                if (target&&target.value === newCircle.attr('nodeId')) {
                console.log('subclass')
                const selectedCircle = d3.select(`circle[nodeId="${existingNodeId}"]`);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
                console.log(target,propertyUri);
                console.log(target.value);
                    createDiskAndLink(
                        d3.select(svgRef.current).select('g'),
                        target,
                        propertyUri,
                        'outgoing',
                        target.value,
                        { x: cxValue, y: cyValue },
                        store,
                        mainClassRef,
                        existingNodeId,
                        1,
                        setSelectedClassDetails
    
                    );

            }})
            
            // Check if there is a relationship
            
            const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, clickedNode);
            incomingConnectedClasses.forEach(({ target, propertyUri }) => {
                if (target&&target.value === newCircle.attr('nodeId')) {
                console.log('subclass')
                console.log(existingNodeId)
                const selectedCircle = d3.select(`circle[nodeId="${existingNodeId}"]`);
                console.log(selectedCircle);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
               
                    createDiskAndLink(
                        d3.select(svgRef.current).select('g'),
                        target,
                        propertyUri,
                        'incoming',
                        target.value,
                        { x: cxValue, y: cyValue },
                        store,
                        mainClassRef,
                        existingNodeId,
                        1,
                        setSelectedClassDetails
    
                    );

            }})})
            newCircle.classed('selected', true).style('stroke-width', 4);

            // Get and set the details of the newly selected circle
            const classDetails = getClassDetails(newCircle.attr('nodeId'), store);
            setSelectedClassDetails(classDetails);
    }

    
    
    

    function updateMainClassRelatedLines(newX, newY, nodeId) {
        d3.selectAll('.link-text').each(function() {
            const text = d3.select(this);
            const textNodeId = text.attr('nodeId');
            const textStartId = text.attr('startId');
            
            d3.selectAll('.link').each(function() {
                const line = d3.select(this);
                const startId = line.attr('startId');
                const endId = line.attr('nodeId');

                if (startId === nodeId || endId === nodeId) {
                    const circleRadius = 50;
                    const relatedCircle = d3.select(`circle[nodeId="${startId === nodeId ? endId : startId}"]`);
                    const circleX = +relatedCircle.attr('cx');
                    const circleY = +relatedCircle.attr('cy');

                    const Intersection = calculateDecalage(newX, newY, circleX, circleY, circleRadius);

                    const updatedLinkPath = `M${newX + Intersection[0]},${newY + Intersection[1]} L${circleX - Intersection[0]},${circleY - Intersection[1]}`;
                    line.attr('d', updatedLinkPath);

                    if (endId === textNodeId && startId === textStartId) {
                        const midX = (parseInt(newX) + parseInt(circleX)) / 2;
                        const midY = (parseInt(newY) + parseInt(circleY)) / 2;
                        line.attr('d', updatedLinkPath);
                        text.attr('x', midX).attr('y', midY);
                    }
                }
            });
        });

        const svg = d3.select(svgRef.current);
        const group = svg.select('g');

        // Get the positions of all circles
        const circles = group.selectAll('circle').nodes();
        circles.forEach(circle => {
            const otherCircle = d3.select(circle);
            const otherNodeId = otherCircle.attr('nodeId');
            const otherCircleX = +otherCircle.attr('cx');
            const otherCircleY = +otherCircle.attr('cy');

            // Calculate the distance between the selected circle and the current circle
            const distance = Math.sqrt((newX - otherCircleX) ** 2 + (newY - otherCircleY) ** 2);

            // Hide connecting lines and text if the distance is too close
            if (distance < 100 && otherNodeId !== nodeId) {
                group.selectAll(`.link[startId="${otherNodeId}"][nodeId="${nodeId}"], .link[startId="${nodeId}"][nodeId="${otherNodeId}"]`)
                    .style('display', 'none');
                group.selectAll(`.link-text[startId="${otherNodeId}"][nodeId="${nodeId}"], .link-text[startId="${nodeId}"][nodeId="${otherNodeId}"]`)
                    .style('display', 'none');
            } else {
                group.selectAll(`.link[startId="${otherNodeId}"][nodeId="${nodeId}"], .link[startId="${nodeId}"][nodeId="${otherNodeId}"]`)
                    .style('display', 'block');
                group.selectAll(`.link-text[startId="${otherNodeId}"][nodeId="${nodeId}"], .link-text[startId="${nodeId}"][nodeId="${otherNodeId}"]`)
                    .style('display', 'block');
            }
        });
    }

    function calculateDecalage(x1, y1, x2, y2, r) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy);
        const sin = dy/dr;
        const cos = dx/dr;

        const x = (r * cos);
        const y = (r * sin);
        return [x, y];
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
            { action: 'removeClass', content: 'Remove Class' },
            { action: 'addSubclass', content: 'Add New Subclass' },
            { action: 'addRelation', content : 'Add New Relation'},
            { action: 'addAttribute', content : 'Add New Attribute'}
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement("div");
            menuItem.textContent = item.content;
            menuItem.style.cursor = "pointer";
            menuItem.addEventListener("click", () => {handleMenuItemClick(item.action, classId);
                contextMenu.remove();});
            contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(contextMenu);

    }
    

    function handleMenuItemClick(action, classId) {
        try {
            console.log("Menu item clicked:", action);
            if (action === 'expandSubclasses') {
                if (store) {
                    // check if sub exists
                    const SubExists = checkSubExists(classId);
                    console.log(SubExists);
                    if (SubExists) {
                        if(checkSubHide(classId)){
                            const hiddenNodes = hideRelations(classId);
                            ExpandHavingSubs(hiddenNodes)
                        }
                        else{
                        console.log("sub already exists, hiding...");
                        hideSubs(classId);}
                    }
                    else {
                        console.log("Expanding subs...");
                        expandSubclasses(classId); 
                        console.log("subs expanded successfully.");
                    }
                } else {
                    console.error('RDF store is not available.');
                }
            } else if (action === 'expandRelations') {
                if (store) {
                    // check if relation exists
                    const relationExists = checkRelationExists(classId);
                    console.log(relationExists);
                    if (relationExists) {
                        if(checkRelationHide(classId)){
                            ExpandHavingRelations(classId)
                        }
                        else{
                        console.log("Relation already exists, hiding...");
                        hideRelations(classId);}
                    }
                    else {
                        console.log("Expanding relations...");
                        expandRelations(classId);
                        console.log("Relations expanded successfully.");
                    }
                } else {
                    console.error('RDF store is not available.');
                }
            } else if (action === 'removeClass') {
                removeSelectedClass(classId);
            } else if (action === 'addSubclass') {
                addNewSubclass(classId);
            }
        } catch (error) {
            console.error('Error handling menu item click:', error);
        }
    }
    const svg = d3.select(svgRef.current);
    function checkSubExists(classId, svg, store) {
        const clickedNode = $rdf.namedNode(classId);
        const outgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
        let subExists = false;
      
        outgoingConnectedClasses.forEach(({ target }) => {
            const nodeId = target.value;
            const textlink = svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${classId}"]`);
            if (!textlink.empty()) {
                subExists = true;
                return; // Terminate the loop
            }
        });
        return subExists;
      }
    
    
    function checkSubHide(classId) {
        const clickedNode = $rdf.namedNode(classId);
        const outgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
        let subHide = false;
    
        outgoingConnectedClasses.forEach(({ target }) => {
            const nodeId = target.value;
            const textlink = svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${classId}"]`);
    
            textlink.each(function() {
                const text = d3.select(this);
                if (text.style('display') === 'none') {
                    subHide = true;
                    return false; // terminate the loop
                }
            });
        });
    
        return subHide;
    }
    function ExpandHavingSubs(classId) {
        const expandedNodes = {}; // store the already expanded node IDs
        expandRelatedSubs(classId);
        
        function expandRelatedSubs(nodeId) {
            // get the connected classes information related to the current node
            const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
            
            connectedClasses.forEach(({ target }) => {
                const connectedNodeId = target.value; 
                // if the node has already been expanded, skip it
                if (expandedNodes[connectedNodeId]) {
                    return;
                }
                // expand the link
                svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
                // expand the link text
                svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
                // expand the circle
                svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
                svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
                // mark the current node as expanded
                expandedNodes[connectedNodeId] = true;
                // get the child nodes related to the current node and expand them recursively
                expandRelatedSubs(connectedNodeId);
                expandRelatedElements(connectedNodeId);
            });
        }
        
        function expandRelatedElements(nodeId) {
            // get the connected classes information related to the current node
            const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
            
            connectedClasses.forEach(({ target }) => {
                const connectedNodeId = target.value; //  get the connected node ID
                //  if the node has already been expanded, skip it
                if (expandedNodes[connectedNodeId]) {
                    return;
                }
                // expand the link
                svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
                // expand the link text
                svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
                // expand the circle
                svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
                svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
                // mark the current node as expanded
                expandedNodes[connectedNodeId] = true;
                // get the child nodes related to the current node and expand them recursively
                expandRelatedElements(connectedNodeId);
            });
        }
    }
    
    
    function hideSubs(classId) {
      const hiddenNodes = {}; //store the already hidden node IDs
      hideRelatedSubs(classId);
      function hideRelatedSubs(nodeId) {
          // get the connected classes information related to the current node
          const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
          
          connectedClasses.forEach(({ target }) => {
            if (!target) {
                return;
            }
              const connectedNodeId = target.value;
              
              // if the node has already been hidden, skip it
              if (hiddenNodes[connectedNodeId]) {
                  return;
              }
              // hide the link
              
              svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'none');
              // hide the text on the link
              svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'none');
              // hide the circle
              if (connectedNodeId != selectedClass){
              svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'none');
              svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'none');
      
              // mark the current node as hided
              hiddenNodes[connectedNodeId] = true;
      
              // get the child nodes related to the current node and hide them recursively
              hideRelatedSubs(connectedNodeId);
              hideRelatedElements(connectedNodeId);
          }
        });
      }
    
      function hideRelatedElements(nodeId) {
          // get the connected classes information related to the current node
          console.log("hide relations")
          const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
          
          connectedClasses.forEach(({ target }) => {
            if (!target) {
                return;
            }

              const connectedNodeId = target.value;
              
              // if the node has already been hidden, skip it
              if (hiddenNodes[connectedNodeId]) {
                  return;
              }
              // hide the link
              
              svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'none');
              // hide the text on the link
              svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'none');
              // hide the circle
             if (connectedNodeId != selectedClass){
              svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'none');
              svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'none');
      
              // mark the current node as hided
              hiddenNodes[connectedNodeId] = true;
      
              // get the child nodes related to the current node and hide them recursively
              hideRelatedElements(connectedNodeId);
          }
        });
      }
    }
    
    function checkRelationExists(classId) {
        const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
        let relationExists = false;
    
        incomingConnectedClasses.forEach(({ target }) => {
            const nodeId = target.value;
            const textlink = svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${classId}"]`);
            if (!textlink.empty()) {
                relationExists = true;
                return; // Terminate the loop
            }
        });
    
        return relationExists;
    }
    function checkRelationHide(classId) {
        const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
        let relationHide = false;
    
        incomingConnectedClasses.forEach(({ target }) => {
            const nodeId = target.value;
            const textlink = svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${classId}"]`);
            textlink.each(function() {
                const text = d3.select(this);
                if (text.style('display') === 'none') {
                    relationHide = true;
                    return false; // terminate the loop
                }
            });
        });
    
        return relationHide;
    }
    
    function hideRelations(classId) {
        const hiddenNodes = {}; // store the already hidden node IDs
    
        hideRelatedElements(classId);
    
        function hideRelatedElements(nodeId) {
            // get the connected classes information related to the current node
            const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
            console.log(connectedClasses);
    
            connectedClasses.forEach(({ target }) => {
                if (!target) {
                    return;
                }
    
                const connectedNodeId = target.value;
                console.log(connectedNodeId);
    
                // if the node has already been hidden, skip it
                if (hiddenNodes[connectedNodeId]) {
                    return;
                }
    
                // hide the link
                svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'none');
                // hide the text on the link
                svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'none');
                // hide the circle
                if (connectedNodeId !== selectedClass) {
                    svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'none');
    
                    // mark the current node as hided
                    hiddenNodes[connectedNodeId] = true;
    
                    // get the child nodes related to the current node and hide them recursively
                    hideRelatedElements(connectedNodeId);
                    hideRelatedSubs(connectedNodeId);
                }
            });
        }
    
        function hideRelatedSubs(nodeId) {
            // get the connected classes information related to the current node
            const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
            connectedClasses.forEach(({ target }) => {
                if (!target) {
                    return;
                }
    
                const connectedNodeId = target.value;
                console.log(connectedNodeId);
    
                // if the node has already been hidden, skip it
                if (hiddenNodes[connectedNodeId]) {
                    return;
                }
    
                // hide the link
                svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'none');
                // hide the text on the link
                svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'none');
                // hide the circle
                if (connectedNodeId !== selectedClass) {
                    svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    // mark the current node as hided
                    hiddenNodes[connectedNodeId] = true;
                    // get the child nodes related to the current node and hide them recursively
                    hideRelatedElements(connectedNodeId);
                }
            });
        }
    }
    
    function ExpandHavingRelations(classId) {
      const expandedNodes = {}; // store the already expanded node IDs
      expandRelatedElements(classId);
      function expandRelatedElements(nodeId) {
          // get the connected classes information related to the current node
          const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
          connectedClasses.forEach(({ target }) => {
              const connectedNodeId = target.value;
              // if the node has already been expanded, skip it
              if (expandedNodes[connectedNodeId]) {
                  return;
              }
              // expand the link
              svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
              // expand the link text
              svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
              // expand the circle
              svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
              svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
                  // mark the current node as expanded
              expandedNodes[connectedNodeId] = true;
              // get the child nodes related to the current node and expand them recursively
              expandRelatedElements(connectedNodeId);
              expandRelatedSubs(connectedNodeId);
          });
      }
      function expandRelatedSubs(nodeId) {
        // get the connected classes information related to the current node
        const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
        connectedClasses.forEach(({ target }) => {
            const connectedNodeId = target.value;
            // if the node has already been expanded, skip it
            if (expandedNodes[connectedNodeId]) {
                return;
            }
            // expand the link
            svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
            // expand the link text
            svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
            // expand the circle
            svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
            svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
                // mark the current node as expanded
            expandedNodes[connectedNodeId] = true;
            // get the child nodes related to the current node and expand them recursively
            expandRelatedElements(connectedNodeId);
        });
    }
    }
    
    

    function expandRelations(classId) {
        try {
            console.log("Expanding relation for:", classId);
            if (!classId || !store) {
                console.error('No class selected or RDF store is not available.');
                return;
            }
    
            const seenValues = new Set();
            seenValues.add(selectedClass)
    
            const clickedNode = $rdf.namedNode(classId);
            console.log(clickedNode);
            const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, clickedNode);
            console.log(incomingConnectedClasses);
            let count=0;
    
            incomingConnectedClasses.forEach(({ target, propertyUri }) => {
                const selectedCircle = d3.select(`circle[classId="${classId}"]`);
                console.log(selectedCircle);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
                console.log(cxValue, cyValue);
    
                if (!seenValues.has(target.value)) {
                    seenValues.add(target.value);
                    createDiskAndLink(
                        d3.select(svgRef.current).select('g'),
                        target,
                        propertyUri,
                        'incoming',
                        target.value,
                        { x: cxValue, y: cyValue },
                        store,
                        mainClassRef,
                        classId,
                        count,
                        setSelectedClassDetails
                    );
                    count=count+1;
                } else {
                    console.log(`Skipping duplicate target value: ${target.value}`);
                }
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
        
            const expandedValues = new Set();
            expandedValues.add(selectedClass);
            let count=0;

            outgoingConnectedClasses.forEach(({ target, propertyUri }) => {
                const targetValue = target.value;
                if (expandedValues.has(targetValue)) {
                    console.log(`Subclass with target value ${targetValue} has already been expanded.`);
                    return;
                }

                const selectedCircle = d3.select(`circle[classId="${classId}"]`);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
                expandedValues.add(targetValue);
                createDiskAndLink(
                    d3.select(svgRef.current).select('g'),
                    target,
                    propertyUri,
                    'outgoing',
                    targetValue,
                    { x: cxValue, y: cyValue },
                    store,
                    mainClassRef,
                    classId,
                    count,
                    setSelectedClassDetails

                );
                count=count+1;
            });
        } catch (error) {
            console.error('Error expanding subclasses:', error);
        }
    }


    function removeSelectedClass(classId) {
        const svg = d3.select(svgRef.current);
        const selectedCircle = svg.select(`circle[nodeId="${classId}"]`);
        const selectedText = svg.select(`text[nodeId="${classId}"]`);
        const relatedLinks = svg.selectAll(`.link[nodeId="${classId}"], .link[startId="${classId}"]`);
        const relatedTexts = svg.selectAll(`.link-text[nodeId="${classId}"], .link-text[startId="${classId}"]`);
        const Links = svg.selectAll(`.link[startId="${classId}"]`);
        Links.each(function() {
            const line = d3.select(this);
            const lineNodeId = line.attr('nodeId');
            removeSelectedClass(lineNodeId);})

  // remove the selected class and its related elements
            selectedCircle.remove();
            selectedText.remove();
            relatedLinks.remove();
            relatedTexts.remove();
    }

    function addNewSubclass(classId){
        // 创建弹出框
        const subclassInput = prompt("Enter the name of the new subclass:");
        if (subclassInput !== null && subclassInput !== "") {
            const relationInput = prompt("Enter the relationship between the new subclass and the original class:");
            if (relationInput !== null && relationInput !== "") {
                // 在这里执行将新子类添加到原来的类中的操作
                console.log("New subclass:", subclassInput);
                console.log("Relationship:", relationInput);

                // 获取原始类圆圈的位置
                const selectedCircle = d3.select(`circle[classId="${classId}"]`);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');

                // 计算新子类圆圈的位置（在原始类圆圈的正下方）
                const newCyValue = cyValue + 100;

                // Generate a URI for the new subclass
                const subclassUri = `http://example.com/${subclassInput.replace(/\s+/g, '-')}`;

                // Add statements to the RDF store to represent the new subclass and its relationship to the original class
                const subclassNode = $rdf.namedNode(subclassUri);
                const classNode = $rdf.namedNode(classId);
                const relationshipNode = $rdf.namedNode(relationInput);

                // Add subclass type statement
                store.add(subclassNode, $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'));

                // Add subclass relationship statement
                store.add(subclassNode, relationshipNode, classNode);

                // Update the canvas to display the new subclass
                const subclassLabel = $rdf.lit(subclassInput);

                createDiskAndLink(
                    d3.select(svgRef.current).select('g'),
                    subclassNode,
                    subclassUri,
                    'outgoing',
                    subclassInput,
                    { x: cxValue, y: cyValue },
                    store,
                    mainClassRef,
                    classId,
                    0,
                    setSelectedClassDetails

                );
            } else {
                console.log("Relationship input is empty.");
            }
        } else {
            console.log("Subclass input is empty.");
        }
    }

    return (
        <div style={{ height: '100vh', overflowY: 'auto' }}>
            <div>
                <div style={{ width: '100%', height: '65vh', position: 'relative' }}>
                    <svg ref={svgRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}></svg>
                </div>
                <div style={{ height: 350, width: '100%' }}>
                <BottomPanel 
    selectedClassDetails={selectedClassDetails} 
    onCircleClick={handleCircleClick} 
/>

                </div>
            </div>
        </div>
    );
};

const BottomPanel = ({ selectedClassDetails, onCircleClick }) => {
    return (
        <div className="bottom-panel" style={{ height:'100%',minHeight: 350, width: '100%', overflowY: 'auto' }}>
            {selectedClassDetails && (
                <div>
                    <h1 style={{ fontWeight: 'bold', fontSize: '24px' }}>{selectedClassDetails.name}</h1>
                    <p>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Superclasses:{' '}</span>
                        <span style={{ fontWeight: 'italic', color: 'brown', fontSize: '15px' }}>{selectedClassDetails.superclass}</span>
                    </p>
                    <p>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Subclasses:{' '}</span>
                        <span style={{ fontWeight: 'italic', color: 'brown', fontSize: '15px' }}>{selectedClassDetails.subclass.length > 0 ? selectedClassDetails.subclass.join(', ') : 'None'}</span>
                    </p>
                    <p>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Direct Attributes:{' '}</span>
                        <span style={{ fontWeight: 'italic', color: 'brown', fontSize: '15px' }}>{JSON.stringify(selectedClassDetails.attributes)}</span>
                    </p>
                    <p>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Direct Relations:{' '}</span>
                        <br />
                        <span style={{ margin: '0 20px' }}></span>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Outgoing:{' '}</span>
                        <span style={{ fontWeight: 'italic', color: 'brown', fontSize: '15px' }}>
                            {Array.isArray(selectedClassDetails.DirectOutgoing) && selectedClassDetails.DirectOutgoing.length > 0 ? (
                                selectedClassDetails.DirectOutgoing.map((item, index, array) => (
                                    <React.Fragment key={index}>
                                        <span 
                                            style={{ 
                                                fontWeight: 'italic', 
                                                color: 'brown', 
                                                fontSize: '15px', 
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                console.log('Clicked:', item);
                                                if (item && item.property && item.targetValue ) {
                                                    console.log('Property:', item.property);
                                                    console.log('Target Value:', item.targetValue);
                                                    onCircleClick(item.target);
                                                }
                                            }}
                                        >
                                            {item && item.property && item.targetValue  ? `${item.property} -> ${item.targetValue}` : 'Unknown'}
                                        </span>
                                        {index !== array.length - 1 ? ', ' : ''}
                                    </React.Fragment>
                                ))
                            ) : 'None'}
                        </span>
                        <br />
                        <span style={{ margin: '0 20px' }}></span>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Incoming:{' '}</span>
                        <span style={{ fontWeight: 'italic', color: 'brown', fontSize: '15px' }}>
                            {selectedClassDetails.DirectIncoming && selectedClassDetails.DirectIncoming.length > 0 ? (
                                selectedClassDetails.DirectIncoming
                                    .filter(item => item && item.property)
                                    .map((item, index, array) => (
                                        <React.Fragment key={index}>
                                            <span 
                                                style={{ 
                                                    fontWeight: 'italic', 
                                                    color: 'brown', 
                                                    fontSize: '15px', 
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => {
                                                    console.log('Clicked:', item);
                                                    if (item) {
                                                        console.log('Property:', item.property);
                                                        console.log('Target Value:', item.targetValue);
                                                        onCircleClick(item.target);
                                                    }
                                                }}
                                            >
                                                {item && item.property && item.targetValue ? `${item.property} -> ${item.targetValue}` : 'Unknown'}
                                            </span>
                                            {index !== array.length - 1 ? ', ' : ''}
                                        </React.Fragment>
                                    ))
                            ) : 'None'}
                        </span>
                    </p>
                    <p>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Inferred Relations:{' '}</span>
                        <br />
                        <span style={{ margin: '0 20px' }}></span>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Outgoing:{' '}</span>
                        <span style={{ fontWeight: 'italic', color: 'brown', fontSize: '15px' }}>
                            {Array.isArray(selectedClassDetails.InferredOutgoing) && selectedClassDetails.InferredOutgoing.length > 0 ? (
                                selectedClassDetails.InferredOutgoing.map((item, index, array) => (
                                    <React.Fragment key={index}>
                                        <span 
                                            style={{ 
                                                fontWeight: 'italic', 
                                                color: 'brown', 
                                                fontSize: '15px', 
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                console.log('Clicked:', item);
                                                if (item && item.targetValue ) {
                                                    console.log('Target Value:', item.targetValue);
                                                    onCircleClick(item.target);
                                                }
                                            }}
                                        >
                                            {item  && item.targetValue ? ` ${item.targetValue}` : 'Unknown'}
                                        </span>
                                        {index !== array.length - 1 ? ', ' : ''}
                                    </React.Fragment>
                                ))
                            ) : 'None'}
                        </span>
                        <br />
                        <span style={{ margin: '0 20px' }}></span>
                        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Incoming:{' '}</span>
                        <span style={{ fontWeight: 'italic', color: 'brown', fontSize: '15px' }}>
                        {selectedClassDetails.InferredIncoming && selectedClassDetails.InferredIncoming.length > 0 ? (
                                selectedClassDetails.InferredIncoming
                                    .filter(item => item )
                                    .map((item, index, array) => (
                                        <React.Fragment key={index}>
                                            <span 
                                                style={{ 
                                                    fontWeight: 'italic', 
                                                    color: 'brown', 
                                                    fontSize: '15px', 
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => {
                                                    console.log('Clicked:', item);
                                                    if (item) {
                                                        console.log('Target Value:', item.targetValue);
                                                        onCircleClick(item.target);
                                                    }
                                                }}
                                            >
                                                {item  && item.targetValue ? ` ${item.targetValue}` : 'Unknown'}
                                            </span>
                                            {index !== array.length - 1 ? ', ' : ''}
                                        </React.Fragment>
                                    ))
                            ) : 'None'}
                        </span>
                    </p>
                    <div style={{ paddingBottom: '50px' }}>
                    <p>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Inferred Attributes:{' '}</span>
                        <span style={{ fontWeight: 'italic', color: 'brown', fontSize: '15px' }}>{JSON.stringify(selectedClassDetails.InferredAttr)}</span>
                    </p>
                    </div>
                    <p>''</p>
                </div>
            )}
        </div>
    );
};




export default Diagram;
