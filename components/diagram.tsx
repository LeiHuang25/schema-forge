import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DragBehavior } from 'd3';
import * as $rdf from 'rdflib';
import { createDiskAndLink } from '@/components/graph';
import * as rdfHelpers from '@/components/rdfHelpers';
import { rdfs } from 'ldkit/namespaces';
import { time } from 'console';

interface ClassDetails {
    name: string;
    superclass: any;
    subclass: any;
    attributes: string;
    relations: { [key: string]: string | number };
    DirectOutgoing: any;
    DirectIncoming: any;
    InferredOutgoing: ({ targetValue: any; target: any } | null)[];
    InferredIncoming: ({ targetValue: any; target: any } | null)[];
    InferredAttr: string;
}

const Diagram = ({ selectedClass, store, setTableData,setStore }:{
    selectedClass: string | undefined,
    store?: $rdf.IndexedFormula | null,
    setTableData: React.Dispatch<React.SetStateAction<any>>,
    setStore: React.Dispatch<React.SetStateAction<$rdf.IndexedFormula | null>>;
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const groupRef = useRef<SVGGElement>(null);
    const mainClassRef = useRef(null);
    const [selectedClassDetails, setSelectedClassDetails] = useState<ClassDetails | null>(null);

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


        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.4, 3])
            .on('zoom', (event) => {
                group.attr('transform', event.transform);
            });

        svg.call(zoom as any);


        return () => {
            svg.selectAll('*').remove();
            svg.remove();
        };
    }, []);
   

    useEffect(() => {
        console.log(store)
        if (selectedClass) {
            console.log(store)
            const startX = 100;
            const startY = 100;
            const circleRadius = 50;
            const svg = d3.select(svgRef.current);
            const group = svg.select('g');

            group.select('rect').on('click', function(event) {
                console.log('add new class')
                // 阻止事件冒泡，避免点击圆圈时也触发此事件
                event.stopPropagation();

                // 询问用户是否要添加新圆圈
                const addCircle = window.confirm('Do you want to add a new circle?');
                if (addCircle) {
                    const circle = window.prompt('Enter the name of the new circle:');
                    if (circle !== null){
                        const circleName = `https://schemaForge.net/pattern/${circle.trim().replace(/\s+/g, '-')}`;
                        const lastSlashIndex = circleName.lastIndexOf('/');
                        const label = lastSlashIndex !== -1 ? circleName.substring(lastSlashIndex + 1) : circleName;
                        const exists = group.selectAll('.class-circle')
                            .filter(function() { return d3.select(this).attr('nodeId') === circleName; })
                            .size() > 0;

                        if (!exists&&circleName) {
                            // 获取点击位置
                            const coords = d3.pointer(event);

                            const dragBehavior = d3.drag<SVGCircleElement, unknown>().on('drag', dragged);

                            // 在点击位置添加新圆圈
                            const newCircle = group.append('circle')
                                .attr('class', 'class-circle')
                                .attr('nodeId', circleName)
                                .attr('classId', circleName)
                                .attr('cx', coords[0])
                                .attr('cy', coords[1])
                                .attr('r', 50)
                                .style('fill', 'white')
                                .style('stroke', 'black')
                                .style('stroke-width', 2)
                                .call(dragBehavior)
                                .on('contextmenu', (event) => displayContextMenu(event, circleName))
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
                                        if (classDetails !== null) {
                                            setSelectedClassDetails(classDetails);
                                        } else {
                                            setSelectedClassDetails(null);
                                        }
                                    }
                                });
                            group.append('text')
                                .attr('class', 'node-label')
                                .attr('nodeId', circleName)
                                .attr('classId', circleName)
                                .attr('x', coords[0])
                                .attr('y', coords[1])
                                .attr('text-anchor', 'middle')
                                .attr('dominant-baseline', 'central')
                                .style('fill', 'black')
                                .call(d3.drag<SVGTextElement, unknown>().on('drag', dragged))
                                .text(label);

                            if (store) {
                                const classNode = $rdf.namedNode(circleName);
                                console.log(store)
                                store.add(classNode, $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'));
                            }

                            console.log(`Added new circle named '${circleName}' at position (${coords[0]}, ${coords[1]})`);
                        }
                    }
                }
            });

            const dragBehavior: DragBehavior<SVGCircleElement, unknown, unknown> = d3.drag<SVGCircleElement, unknown>()
                .on('drag', dragged);

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
                .call(dragBehavior)
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
        }
    }, [selectedClass]);
    const getClassDetails = (selectedClass, store) => {
        const classNode = $rdf.namedNode(selectedClass);
        const tableData=rdfHelpers.getDirectProperties(store, classNode);
        const tableData1=rdfHelpers.getDataProperties(store, classNode);
        const inferreda=rdfHelpers.getInferredDataProperties(store,classNode);
       
        const attributeEntries = Object.entries(tableData1);
        // Build attributed string
        const attributeString = attributeEntries.map(([key, value]) => `${key}(${value})`).join(', ');
  
        const attribute = Object.entries(inferreda);
        // Build attributed string
        const InferredAttr = attribute.map(([key, value]) => `${key}(${value})`).join(', ');
        
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
        const InferredSubClass=rdfHelpers.getInferredSubclasses(store,classNode);
        const Inferredrelation=rdfHelpers.getInferredRelation(store,classNode);
        
       
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
    function updateMainClassRelatedLines(newX, newY, nodeId) {
        console.log('erreur')
        // Traverse all connecting lines
        d3.selectAll('.link-text').each(function() {
          const text = d3.select(this);
          const textNodeId = text.attr('nodeId');
          const textStartId = text.attr('startId');
    
        
        d3.selectAll('.link').each(function() {
            const line = d3.select(this);
            const startId = line.attr('startId');
            const endId = line.attr('nodeId');
    
            // Checks whether the start or end point of the connecting line matches the selected circle
            if (startId === nodeId || endId === nodeId) {
                // Get the path properties of the connection line
                const relatedCircle = d3.select(`circle[nodeId="${startId === nodeId ? endId : startId}"]`);
                const circleX = +relatedCircle.attr('cx');
                const circleY = +relatedCircle.attr('cy');
                const circleRadius = +relatedCircle.attr('r');
                const intersection = calculateDecalage(newX, newY, circleX, circleY, circleRadius);
    
                // Update the path of the connecting line
                const updatedLinkPath = `M${newX + intersection[0]},${newY + intersection[1]} L${circleX - intersection[0]},${circleY - intersection[1]}`;
                line.attr('d', updatedLinkPath);
    
                // Update the position of the text on the connecting line
                if (endId === textNodeId && startId === textStartId) {
                  const midX = (newX + circleX) / 2;
                  const midY = (newY + circleY) / 2;
                  text.attr('x', midX).attr('y', midY);
              }
            }
        });
    })}
  


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
            else if (action === 'addRelation') {
                console.log(classId)
                addNewRelation(classId);
            }
            else if (action === 'addAttribute') {
                addNewAttribute(classId);
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
            seenValues.add(classId)
            console.log(selectedClass,classId)
    
            const clickedNode = $rdf.namedNode(classId);
            console.log(clickedNode);
            const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, clickedNode);
            console.log(incomingConnectedClasses);
            let count=0;
    
            incomingConnectedClasses.forEach(({ target, propertyUri }) => {
                const selectedCircle = d3.select(`circle[classId="${classId}"]`);
                console.log(target)
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
                        setStore,
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
            console.log(store);
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
                    setStore,
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

    function addNewSubclass(classId) {
        // Create a popup for subclass name input
        const subclassInput = prompt("Enter the name of the new subclass:");
        if (!subclassInput) {
            console.log("Subclass input is empty.");
            return; // Early return if input is empty
        }
        const relationInput = prompt("Enter the relationship between the new subclass and the original class:");
        // 根据用户输入创建新类的 URI
        const newClassUri = `https://schemaForge.net/pattern/${subclassInput.trim().replace(/\s+/g, '-')}`;
        const relationUri = `https://schemaForge.net/pattern/${relationInput.replace(/\s+/g, '-')}`;
        rdfHelpers.createClass(store, newClassUri, relationUri,classId, setStore); // 假设这个函数正确处理创建类和设置其超类
        expandSubclasses(classId);
    }
    function addNewRelation(classId) {
        // Create a popup for subclass name input
        const subclassInput = prompt("Enter the name of the new subclass:");
        if (!subclassInput) {
            console.log("Subclass input is empty.");
            return; // Early return if input is empty
        }
        const relationInput = prompt("Enter the relationship between the new subclass and the original class:");
        // 根据用户输入创建新类的 URI
        const newClassUri = `https://schemaForge.net/pattern/${subclassInput.trim().replace(/\s+/g, '-')}`;
        const relationUri = `https://schemaForge.net/pattern/${relationInput.replace(/\s+/g, '-')}`;
        rdfHelpers.createRelation(store, newClassUri, relationUri,classId, setStore); // 假设这个函数正确处理创建类和设置其超类
        expandRelations(classId);
    }
    function addNewAttribute(classId) {
        const attributeLabel = prompt("Enter the label of the new attribute:");
        if (!attributeLabel) {
            console.log("Attribute label input is empty.");
            return; 
        }
        const attributeComment = prompt("Enter the comment for the new attribute:");
        if (!attributeComment) {
            console.log("Attribute comment input is empty.");
            return;
        }
        const attributeRange = prompt("Enter the data type (range) for the new attribute (e.g., xsd:string):");
        if (!attributeRange) {
            console.log("Attribute range input is empty.");
            return;
        }
        const newAttributeUri = `https://schemaForge.net/pattern/${attributeLabel.trim().replace(/\s+/g, '-')}`;
        rdfHelpers.createDataProperty(store,newAttributeUri,attributeLabel,attributeComment,classId, `http://www.w3.org/2001/XMLSchema#${attributeRange.trim()}`);
        console.log("New attribute added successfully.");
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
