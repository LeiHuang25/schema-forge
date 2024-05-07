import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DragBehavior } from 'd3';
import * as $rdf from 'rdflib';
import { createDiskAndLink } from '@/components/graph';
import * as rdfHelpers from '@/components/rdfHelpers';
import { Modal } from 'react-bootstrap';
import 'styles/browser.css';




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
    const [showDataTypeModal, setShowDataTypeModal] = useState(false);
    const [showOutgoingModal, setShowOutgoingModal] = useState(false);
    const [showIncomingModal, setShowIncomingModal] = useState(false);
    const [attributeDetails, setAttributeDetails] = useState<{ label: string, comment: string | null }>({ label: '', comment: null });
    const [OutgoingDetails, setOutgoingDetails] = useState<{ relation: string, comment: string | null }>({ relation: '', comment: null });
    const [IncomingDetails, setIncomingDetails] = useState<{ relation: string, comment: string | null }>({ relation: '', comment: null });
    const [currentClassId, setCurrentClassId] = useState(null);
    const [OutgoingClassId, setOutgoingClassId] = useState(null);
    const [IncomingClassId, setIncomingClassId] = useState(null);
    const [resetBottomPanel, setResetBottomPanel] = useState(true);


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
        const svg = d3.select(svgRef.current);
 
        svg.selectAll('*').remove(); 

        svg.attr('width', '100%')
           .attr('height', '100%');

        svg.append('rect')
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
        setResetBottomPanel(false);
      
    }, [store]);  
    
   

    useEffect(() => {
        if (selectedClass) {
            console.log(store)
            const startX = 100;
            const startY = 100;
            const circleRadius = 50;
            const svg = d3.select(svgRef.current);
            const group = svg.select('g');

            const existingCircle = group.selectAll('circle')
            .filter(function() { return d3.select(this).attr('nodeId') === selectedClass; });

            if (existingCircle.empty()) {
                svg.on('contextmenu', function(event) {
                    event.preventDefault(); 
                    const clickedElement =event.target;
            
                    const elementType = clickedElement.tagName.toLowerCase();
                    if (elementType === 'svg' || elementType === 'rect') {
                        d3.select('.custom-context-menu').remove();
            
                // Create a custom menu bar
                const menu = d3.select('body')
                    .append('div')
                    .attr('class', 'custom-context-menu')
                    .style('position', 'absolute')
                    .style('left', `${event.pageX}px`)
                    .style('top', `${event.pageY}px`)
                    .style('background', 'white')
                    .style('padding', '10px')
                    .style('border-radius', '5px')
                    .style('box-shadow', '0 2px 5px rgba(0,0,0,0.2)');
            
                // Add options to menu 
                menu.append('div')
                .text('Add New Class')
                .style('cursor', 'pointer')
                .on('click', function() {
                    const circle = window.prompt('Enter the name of the new circle:');
                    if (!circle) return; // If the user cancels the input or the input is empty, no subsequent operations are performed
            
                    const circleName = `https://schemaForge.net/pattern/${circle.trim().replace(/\s+/g, '-')}`;
                    const exists = group.selectAll('.class-circle')
                        .filter(function() { return d3.select(this).attr('nodeId') === circleName; })
                        .size() > 0;
            
                    if (exists) {
                        alert('This class already exists.');
                        return; 
                    } else {
                        const confirmAdd = window.confirm(`The class "${circle}" does not exist. Do you want to add it?`);
                        if (!confirmAdd) return; 
            
                        // Get click location
                        const coords = d3.pointer(event);
            
                        // Add new circle at clicked location
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
                            .call((d3.drag().on('drag', dragged) as any))
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
                                    setSelectedClassDetails(classDetails as ClassDetails | null);                                }
                            });
                        // Add circle label
                        group.append('text')
                            .attr('class', 'node-label')
                            .attr('nodeId', circleName)
                            .attr('classId', circleName)
                            .attr('x', coords[0])
                            .attr('y', coords[1]) 
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', 'central')
                            .style('fill', 'black')
                            .text(circle)
                            .attr('text-anchor', 'middle') 
                            .attr('dominant-baseline', 'middle');
                            
            
                        // Update RDF store
                        const classNode = $rdf.namedNode(circleName);
                        store?.add(classNode, $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'));
                        store?.add(classNode,$rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label'),circle);
                        const owlThingNode = $rdf.namedNode('http://www.w3.org/2002/07/owl#Thing');
                        store?.add(classNode, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), owlThingNode);  
                        console.log(`Added new circle named '${circleName}' at position (${coords[0]}, ${coords[1]})`);
                    }
            
                    // Remove menu 
                    d3.select('.custom-context-menu').remove();
                });
            
                // Remove menu  when clicking elsewhere on page
                d3.select('body').on('click.custom-menu', function() {
                    d3.select('.custom-context-menu').remove();
                    d3.select('body').on('click.custom-menu', null); 
                });
            }});
            const dragged = function(this: any, event: MouseEvent) {
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
            };
            
            

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
                        setSelectedClassDetails(classDetails as ClassDetails | null);
                    }
                    const anySelected = svg.selectAll('circle.class-circle.selected').size() > 0;

                    if (!anySelected) {
                        setResetBottomPanel(false);
                    }
                    else{ setResetBottomPanel(true);}
                });
               
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
                 .text(label);



        }}
    }, [selectedClass]);
    const getClassDetails = (selectedClass: any, store: any) => {    
        const classNode = $rdf.namedNode(selectedClass);
        const tableData=rdfHelpers.getDirectProperties(store, classNode);
        const tableData1=rdfHelpers.getDataProperties(store, classNode);
        const inferreda=rdfHelpers.getInferredDataProperties(store,classNode);
       
        const attributeEntries = Object.entries(tableData1);
        // Build attributed string
  
        const attribute = Object.entries(inferreda).map(([key, value]) => {
            return [key, value];
        });        
        // Build attributed string
        
        // Get the selected circle element
        const selectedCircle = d3.select(`circle[nodeId="${selectedClass}"]`);
        
        // Check if circle is selected
        const isSelected = selectedCircle.classed('selected');
        const nodeId = selectedCircle.attr('nodeId');
        const lastIndex = nodeId.lastIndexOf('/');
        const name = lastIndex !== -1 ? nodeId.substring(lastIndex + 1) : nodeId;
        const superclass = rdfHelpers.getSuperClasses(store, classNode);
        const subclass = rdfHelpers.getSubClasses(store, classNode);
        //outgoing , incoming relation
        const Incoming = rdfHelpers.getIncomingConnectedClasses(store, classNode);
        const Outgoing = rdfHelpers.getOutgoingConnectedClasses(store, classNode);


        const InferredIncoming=rdfHelpers.getInferredIncoming(store,classNode);
        const InferredOutgoing=rdfHelpers.getInferredOutgoing(store,classNode);
        
       
        const superlist = superclass?superclass.superClass: "None";
        const Index = superlist.lastIndexOf('/');
        const supername = Index !== -1 ? superlist.substring(Index + 1) : superlist;
        console.log(supername)
        

        const sublist = subclass.map((subclass:any)=> subclass.subClass);
        const subname = sublist.length > 0 ? sublist.map((item:any) => item.substring(item.lastIndexOf('/') + 1)) : ["None"];

       
        const DirectOutgoing = Outgoing.map((item:any) => {
            if (item.target&&item.propertyUri) {
                const property = item.propertyUri.substring(item.propertyUri.lastIndexOf("/") + 1);
                const targetValue = item.target.value.substring(item.target.value.lastIndexOf("/") + 1);
                const target=item.target.value;
                const commentaire=item.comment;
                return { property, targetValue,target,commentaire };
            } else {
                return null;
            }
        });
        const DirectIncoming = Incoming.map((item:any) => {
            if (item.target&&item.propertyUri) {
                const property = item.propertyUri.substring(item.propertyUri.lastIndexOf("/") + 1);
                const targetValue = item.target.value.substring(item.target.value.lastIndexOf("/") + 1);
                const target = item.target.value;
                const commentaire=item.comment;
                return { property, targetValue,target,commentaire };
            } else {
                return null;
            }
        });

        const InferredO = InferredOutgoing.map((item:any) => {
            if (item.target&&item.propertyUri) {
                const property = item.propertyUri.substring(item.propertyUri.lastIndexOf("/") + 1);
                const targetValue = item.target.value.substring(item.target.value.lastIndexOf("/") + 1);
                const target=item.target.value;
                const commentaire=item.comment;
                return { property, targetValue,target,commentaire };
            } else {
                return null;
            }
        }).filter(item => item !== null);
        const InferredI= InferredIncoming.map((item:any) => {
            if (item.target&&item.propertyUri) {
                const property = item.propertyUri.substring(item.propertyUri.lastIndexOf("/") + 1);
                const targetValue = item.target.value.substring(item.target.value.lastIndexOf("/") + 1);
                const target = item.target.value;
                const commentaire=item.comment;
                return { property, targetValue,target,commentaire};
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
                attributes: attributeEntries,
                relations: tableData,
                DirectOutgoing:DirectOutgoing,
                DirectIncoming:DirectIncoming,
                InferredOutgoing:InferredO,
                InferredIncoming:InferredI,
                InferredAttr:attribute,
            };
        } else {
            return null;
        }
        
      };
      


      const handleCircleClick = (nodeId:any,property:any,type:any) => {
        // Remove the "selected" class of all circles and set their borders to the default width
        d3.selectAll('.class-circle').classed('selected', false).style('stroke-width', 2);
    
        // Get SVG and group elements
        const svg = d3.select(svgRef.current);
        const group = svg.select('g');
        const dragged = function(this: any, event: MouseEvent) {
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
        };
        
    
        // Checks if a circle with the specified nodeId exists
        const existingCircle = group.select(`circle[nodeId="${nodeId}"]`);
        const existingproperty=group.select(`text.link-text[data-name="${property}"]`)
        if (existingCircle.empty()) {
            // Get the lower position of the lowest circle on the canvas
            const biggestx = getLowestCircleYPosition(group);
    
            // create a new circle
            const newX = biggestx+150; // horizontal position
            const newY = 100; // vertical position, relative to below the lowest circle
    
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
                .call((d3.drag().on('drag', dragged)as any))
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
                        setSelectedClassDetails(classDetails as ClassDetails | null);
                    }
                    const anySelected = svg.selectAll('circle.class-circle.selected').size() > 0;

                    if (!anySelected) {
                        setResetBottomPanel(false);
                    }
                    else{ setResetBottomPanel(true);}
                });
    
    
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
                .call((d3.drag().on('drag', dragged) as any))
                .text(label);
                

            updateRelationsForNewCircle(newCircle,type);
    
            // Set the details of the newly selected circle
            const classDetails = getClassDetails(nodeId, store);
            setSelectedClassDetails(classDetails as ClassDetails | null);
            
        } else if((!existingCircle.empty()&&existingproperty.empty())){
            updateRelationsForNewCircle(existingCircle,type);
    
            // Set the details of the newly selected circle
            const classDetails = getClassDetails(nodeId, store);
            setSelectedClassDetails(classDetails as ClassDetails | null);}
        else{
            // If the circle already exists, set it to selected state
            existingCircle.classed('selected', true).style('stroke-width', 4);
            // Get and set the details of the newly selected circle
            const classDetails = getClassDetails(nodeId, store);
            setSelectedClassDetails(classDetails as ClassDetails | null);
        }
        
    };
    
    // Get the lower position of the lowest circle on the canvas
    function getLowestCircleYPosition(group:any) {
        const circles = group.selectAll('.class-circle');
        let biggestx = 0;
        circles.each(function (this:any) {
            const cx = +d3.select(this).attr('cx');
            if (cx >biggestx) {
                biggestx = cx;
            }
        });
        return biggestx;
    }
    

    function updateRelationsForNewCircle(newCircle:any,type:any) {
        console.log(newCircle);
        const svg = d3.select(svgRef.current);
        const group = svg.select('g');

        // Get all circles on canvas
        const existingCircles = group.selectAll('.class-circle');

        // Iterate over each existing circle
        existingCircles.each(function () {
            const existingCircle = d3.select(this);
            const existingNodeId = existingCircle.attr('nodeId');

            // Check if there is a outgoing relation
            const clickedNode = $rdf.namedNode(existingNodeId);
            const outgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
            outgoingConnectedClasses.forEach(({ target, propertyUri }: { target: any, propertyUri: string }) => {
                if (target&&target.value === newCircle.attr('nodeId')&&type=='outgoing') {
                if (store){
                console.log('outgoing')
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
                        setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal,setResetBottomPanel    
                    );}

            }})
            
            // Check if there is a incoming relation
            
            const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, clickedNode);
            incomingConnectedClasses.forEach(({ target, propertyUri }: { target: any, propertyUri: string }) => {
                if (target&&target.value === newCircle.attr('nodeId')&&type=='incoming') {
                console.log('incoming')
                console.log(existingNodeId)
                const selectedCircle = d3.select(`circle[nodeId="${existingNodeId}"]`);
                console.log(selectedCircle);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
                if(store){
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
                        setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal,setResetBottomPanel        
                    );}

            }})

            // Check if there is a subclass

            const SubClasses = rdfHelpers.getSubClasses(store, clickedNode);
            SubClasses.forEach(({ target, propertyUri }: { target: any, propertyUri: string }) => {
                if (target&&target.value === newCircle.attr('nodeId')) {
                console.log('subclass')
                console.log(existingNodeId)
                const selectedCircle = d3.select(`circle[nodeId="${existingNodeId}"]`);
                console.log(selectedCircle);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
                    if(store){
                    createDiskAndLink(
                        d3.select(svgRef.current).select('g'),
                        target,
                        propertyUri,
                        'subclass',
                        target.value,
                        { x: cxValue, y: cyValue },
                        store,
                        mainClassRef,
                        existingNodeId,
                        1,
                        setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal,setResetBottomPanel        

                    );}
            }})
        })
            newCircle.classed('selected', true).style('stroke-width', 4);

            // Get and set the details of the newly selected circle
            const classDetails = getClassDetails(newCircle.attr('nodeId'), store);
            setSelectedClassDetails(classDetails as ClassDetails | null);
    }

    
    
    function calculateDecalage(x1:any, y1:any, x2:any, y2:any, r:any) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy);
        const sin = dy/dr;
        const cos = dx/dr;

        const x = (r * cos);
        const y = (r * sin);
        return [x, y];
    }
    function updateMainClassRelatedLines(newX:any, newY:any, nodeId:any) {
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
  


    function displayContextMenu(event:any, classId:any) {
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
            { action: 'expandIncomingRelations', content: 'Expand/Hide incoming Relations' },
            { action: 'expandOutgoingRelations', content: 'Expand/Hide outgoing Relations' },
            { action: 'removeClass', content: 'Remove Class' },
            { action: 'addSubclass', content: 'Add New Subclass' },
            { action: 'addIncomingRelation', content : 'Add New Incoming Relation'},
            { action: 'addOutgoingRelation', content : 'Add New Outgoing Relation'},
            { action: 'addAttribute', content : 'Add New Attribute'}
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement("div");
            menuItem.textContent = item.content;
            menuItem.style.cursor = "pointer";
            menuItem.addEventListener("click", () => {
                handleMenuItemClick(item.action, classId);
                contextMenu.remove();
            });
            contextMenu.appendChild(menuItem);
        });
    
        document.body.appendChild(contextMenu);
    
        setTimeout(() => {
            document.addEventListener("click", function onClickOutside(event) {
            
                    contextMenu.remove();
                    document.removeEventListener("click", onClickOutside);

            });
        }, 0);
    }
    

    function handleMenuItemClick(action:any, classId:any) {
        try {
            console.log("Menu item clicked:", action);
            if (action === 'expandSubclasses') {
                if (store) {
                    // check if sub exists
                    const SubExists = checkSubExists(classId);
                    console.log(SubExists);
                    if (SubExists) {
                        if(checkSubHide(classId)){
                            expandHavingSubs(classId);
                        }
                        else{
                        console.log("sub already exists, hiding...");
                        hideSubs(classId);
                        }
                    }
                    else {
                        console.log("Expanding subs...");
                        expandSubclasses(classId);
                        console.log("subs expanded successfully.");
                    }
                } else {
                    console.error('RDF store is not available.');
                }
            } else if (action === 'expandIncomingRelations') {
                if (store) {
                    // check if relation exists
                    const IncomingRelationExists = checkIncomingRelationExists(classId);
                    console.log(IncomingRelationExists);
                    if (IncomingRelationExists) {
                        console.log(checkIncomingRelationHide(classId))
                        if(checkIncomingRelationHide(classId)){
                            expandHavingIncomingRelations(classId);
                        }
                        else{
                        console.log("Relation already exists, hiding...");
                        hideIncomingRelations(classId);}
                    }
                    else {
                        console.log("Expanding incoming relations...");
                        expandIncomingRelations(classId);
                        console.log("Incoming Relations expanded successfully.");
                    }
                } else {
                    console.error('RDF store is not available.');
                }
            } else if (action === 'expandOutgoingRelations') {
                if (store) {
                    console.log(classId);
                    // check if relation exists
                    const OutgoingRelationExists = checkOutgoingRelationExists(classId);
                    console.log(OutgoingRelationExists);
                    if (OutgoingRelationExists) {
                        if(checkOutgoingRelationHide(classId)){
                            expandHavingOutgoingRelations(classId);
                        }
                        else{
                        console.log("Outgoing Relation already exists, hiding...");
                        hideOutgoingRelations(classId);}
                    }
                    else {
                        console.log("Expanding Outgoing relations...");
                        expandOutgoingRelations(classId);
                        console.log("Outgoing Relations expanded successfully.");
                    }
                } else {
                    console.error('RDF store is not available.');
                }
            } else if (action === 'removeClass') {
                removeSelectedClass(classId);
            } else if (action === 'addSubclass') {
                addNewSubclass(classId);
            }
            else if (action === 'addIncomingRelation') {
                addNewIncomingRelation(classId);
            }
            else if (action === 'addOutgoingRelation') {
                addNewOutgoingRelation(classId);
            }
            else if (action === 'addAttribute') {
                addNewAttribute(classId);
            }
        } catch (error) {
            console.error('Error handling menu item click:', error);
        }
    }
    const svg = d3.select(svgRef.current);
    function checkSubExists(classId:any) {
        const clickedNode = $rdf.namedNode(classId);
        const SubClasses = rdfHelpers.getSubClasses(store, clickedNode);
        let subExists = false;
      
        SubClasses.forEach(({ subClass }:any) => {
            const nodeId = subClass;
            const textlink = svg.selectAll(`.link-text[nodeId="${classId}"][startId="${nodeId}"]`);
            if (!textlink.empty()) {
                subExists = true;
                return; // Terminate the loop
            }
        });
        return subExists;
    }


    function checkSubHide(classId:any) {
    const clickedNode = $rdf.namedNode(classId);
    const SubClasses = rdfHelpers.getSubClasses(store, clickedNode);
    let subHide = false;
    
    SubClasses.forEach(({ subClass }:any) => {
        const nodeId = subClass;
        const textlink = svg.selectAll(`.link-text[nodeId="${classId}"][startId="${nodeId}"]`);
    
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
    function hideSubs(classId:any) {
        const hiddenNodes: { [key: string]: any } = {};
        hideRelatedSubs(classId);
        function hideRelatedSubs(nodeId:any) {
            // Get the connection line information related to the current node
            const SubClasses = rdfHelpers.getSubClasses(store, $rdf.namedNode(nodeId));
            SubClasses.forEach(({ subClass }:any) => {
                if (!subClass) {
                    return;
                }
                const connectedNodeId = subClass;
                // If the node is already hidden, skip
                if (hiddenNodes[connectedNodeId.toString()]) {
                    return;
                }

                if (hasOtherConnectionsExcept(connectedNodeId, nodeId)) {
                    // hide the link
                    svg.selectAll(`.link[nodeId="${nodeId}"]`).style('display', 'none');
                    // hide the text on the link
                    svg.selectAll(`.link-text[nodeId="${nodeId}"]`).style('display', 'none');
                }else {
                    // hide the link
                    svg.selectAll(`.link[startId="${connectedNodeId}"]`).style('display', 'none');
                    // hide the text on the link
                    svg.selectAll(`.link-text[startId="${connectedNodeId}"]`).style('display', 'none');

                    // Hide circle
                    svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    // mark the current node as hided
                    hiddenNodes[connectedNodeId] = true;
                }
                
            });
        }
        
        function hasOtherConnectionsExcept(nodeId:any, excludeNodeId:any) {
            // Get all line elements
            const links = svg.selectAll('.link');
            let otherConnectionsExist = false;
            links.each(function() {
                const link = d3.select(this);
                const startId = link.attr('startId');
                const endId = link.attr('nodeId');
                if ((startId === nodeId || endId === nodeId) && startId !== excludeNodeId && endId !== excludeNodeId) {
                    otherConnectionsExist = true;
                }
            });
            return otherConnectionsExist;
        }

    }

    function expandHavingSubs(classId:any) {
    const expandedNodes: { [key: string]: any } = {};
    expandRelatedSubs(classId);
    
    function expandRelatedSubs(nodeId:any) {
        // Get the connection line information related to the current node
        const SubClasses = rdfHelpers.getSubClasses(store, $rdf.namedNode(nodeId));
        
        SubClasses.forEach(({ subClass }:any) => {

            if (!subClass) {
                return;
            }
            const connectedNodeId = subClass;

            // If the node is already expanded, skip
            if (expandedNodes[connectedNodeId.toString()]) {
                return;
            }
            // Expand connecting lines
            svg.selectAll(`.link[startId="${connectedNodeId}"]`).style('display', 'block');
            // Expand the text on the connecting line
            svg.selectAll(`.link-text[startId="${connectedNodeId}"]`).style('display', 'block');
            // expand circle
            svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
            svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
            // Mark current node as expanded
            expandedNodes[connectedNodeId] = true;

        });
    }
    
    
    
    }

    function checkIncomingRelationExists(classId:any) {
    const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
    let relationExists = false;
    
    incomingConnectedClasses.forEach(({ target }:any) => {
        const nodeId = target.value;
        const textlink = svg.selectAll(`.link-text[nodeId="${classId}"][startId="${nodeId}"]`);
        if (!textlink.empty()) {
            relationExists = true;
            return; // Terminate the loop
        }
    });
    
    return relationExists;
    }
    function checkIncomingRelationHide(classId:any) {
    const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
    let relationHide = false;
    
    incomingConnectedClasses.forEach(({ target }:any) => {
        const nodeId = target.value;
        const textlink = svg.selectAll(`.link-text[nodeId="${classId}"][startId="${nodeId}"]`);
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

    function expandHavingIncomingRelations(classId:any) {
        const expandedNodes: { [key: string]: any } = {};      
        expandRelatedIncoming(classId);
        function expandRelatedIncoming(nodeId:any) {
            // Get the connection line information related to the current node
            const IncomingClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
            IncomingClasses.forEach(({ target }:any) => {
                
                if (!target) {
                    return;
                }
                const connectedNodeId = target.value;
                // If the node is already expanded, skip
                if (expandedNodes[connectedNodeId.toString()]) {
                    return;
                }
                // Expand connecting lines
                svg.selectAll(`.link[startId="${connectedNodeId}"]`).style('display', 'block');
                // Expand the text on the connecting line
                svg.selectAll(`.link-text[startId="${connectedNodeId}"]`).style('display', 'block');
                // expand circle
                svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
                svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
                    // Mark current node as expanded
                expandedNodes[connectedNodeId] = true;

                svg.selectAll('circle').each(function(){
                    const circle = d3.select(this);
                    const nodeId = circle.attr('nodeId');
            
                    if (circle.style('display') === 'block') {
                      svg.selectAll(`.link[startId="${nodeId}"], .link[nodeId="${nodeId}"]`).style('display', 'block');
                      svg.selectAll(`.link-text[startId="${nodeId}"], .link-text[nodeId="${nodeId}"]`).style('display', 'block');
                    }
                  })

            });
            
        }

    }

    function hideIncomingRelations(classId:any) {
        const hiddenNodes: { [key: string]: any } = {};
        hideRelatedIncoming(classId);
        
        function hideRelatedIncoming(nodeId:any) {
            // Get the connection line information related to the current node
            const IncomingClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
            console.log(IncomingClasses);
            IncomingClasses.forEach(({ target }:any) => {
                if (!target) {
                    return;
                }
                const connectedNodeId = target.value;
                console.log(connectedNodeId);
                // If the node is already hidden, skip
                if (hiddenNodes[connectedNodeId.toString()]) {
                    return;
                }

                if (hasOtherConnectionsExcept(connectedNodeId, nodeId)) {
                    // hide the link
                    svg.selectAll(`.link[nodeId="${nodeId}"][marker-start="url(#arrowhead-incoming)"]`).style('display', 'none');
                    // hide the text on the link
                    svg.selectAll(`.link-text[nodeId="${nodeId}"]`).style('display', 'none');
                } else{
                    // hide the link
                    svg.selectAll(`.link[startId="${connectedNodeId}"][marker-start="url(#arrowhead-incoming)"]`).style('display', 'none');
                    // hide the text on the link
                    svg.selectAll(`.link-text[startId="${connectedNodeId}"]`).style('display', 'none');
                    // hide the circle
                    svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    // mark the current node as hided
                    hiddenNodes[connectedNodeId] = true;
                }
                svg.selectAll('circle').each(function(){
                    const circle = d3.select(this);
                    const nodeId = circle.attr('nodeId');
        
                    if (circle.style('display') === 'none') {
                      svg.selectAll(`.link[startId="${nodeId}"], .link[nodeId="${nodeId}"]`).style('display', 'none');
                      svg.selectAll(`.link-text[startId="${nodeId}"], .link-text[nodeId="${nodeId}"]`).style('display', 'none');
                    }
                })
            });
        }

        function hasOtherConnectionsExcept(nodeId:any, excludeNodeId:any) {
            // Get all line elements
            const links = svg.selectAll('.link');
            let otherConnectionsExist = false;
            links.each(function() {
                const link = d3.select(this);
                const startId = link.attr('startId');
                const endId = link.attr('nodeId');
                if ((startId === nodeId || endId === nodeId) && startId !== excludeNodeId && endId !== excludeNodeId) {
                    otherConnectionsExist = true;
                }
            });
            return otherConnectionsExist;
        }

    }
    function checkOutgoingRelationExists(classId:any) {
    const OutgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
    let relationExists = false;
    
    OutgoingConnectedClasses.forEach(({ target }:any) => {
        if(!target){return ;}
        const nodeId = target.value;
        const textlink = svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${classId}"]`);
        if (!textlink.empty()) {
            relationExists = true;
            return; // Terminate the loop
        }
    });
    
    return relationExists;
    }
    function checkOutgoingRelationHide(classId:any) {
    const OutgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
    let relationHide = false;
    
    OutgoingConnectedClasses.forEach(({ target }:any) => {
        if(!target){return;}
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

    function expandHavingOutgoingRelations(classId:any) {
        const expandedNodes: { [key: string]: any } = {};
        expandRelatedOutgoing(classId);
        function expandRelatedOutgoing(nodeId:any) {
            // Get the connection line information related to the current node
            const OutgoingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
            OutgoingClasses.forEach(({ target }:any) => {
                if (!target) {
                return;
            }
                const connectedNodeId = target.value;
                // If the node is already expanded, skip
                if (expandedNodes[connectedNodeId.toString()]) {
                    return;
                }
                // Expand connecting lines
                svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
                // Expand the text on the connecting line
                svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
                // expand circle
                svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
                svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
                    // Mark current node as expanded
                expandedNodes[connectedNodeId] = true;

                svg.selectAll('circle').each(function(){
                    const circle = d3.select(this);
                    const nodeId = circle.attr('nodeId');
            
                    if (circle.style('display') === 'block') {
                      svg.selectAll(`.link[startId="${nodeId}"], .link[nodeId="${nodeId}"]`).style('display', 'block');
                      svg.selectAll(`.link-text[startId="${nodeId}"], .link-text[nodeId="${nodeId}"]`).style('display', 'block');
                    }
                  })
            });
        }
    }

    function hideOutgoingRelations(classId:any) {
        const hiddenNodes: { [key: string]: any } = {};
        hideRelatedOutgoing(classId);
        
        function hideRelatedOutgoing(nodeId:any) {
            // Get the connection line information related to the current node
            const OutgoingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
            OutgoingClasses.forEach(({ target }:any) => {
                if (!target) {
                    return;
                }
                const connectedNodeId = target.value;
                // If the node is already hidden, skip
                if (hiddenNodes[connectedNodeId.toString()]) {
                    return;
                }

                if (hasOtherConnectionsExcept(connectedNodeId, nodeId)) {
                    // hide the link
                    svg.selectAll(`.link[startId="${nodeId}"]`).style('display', 'none');
                    // hide the text on the link
                    svg.selectAll(`.link-text[startId="${nodeId}"]`).style('display', 'none');
                }else {
                    // hide the link
                    svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    // hide the text on the link
                    svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    // hide the circle
                    svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'none');
                    // mark the current node as hided
                    hiddenNodes[connectedNodeId] = true;
                }

                svg.selectAll('circle').each(function(){
                    const circle = d3.select(this);
                    const nodeId = circle.attr('nodeId');
        
                    if (circle.style('display') === 'none') {
                      svg.selectAll(`.link[startId="${nodeId}"], .link[nodeId="${nodeId}"]`).style('display', 'none');
                      svg.selectAll(`.link-text[startId="${nodeId}"], .link-text[nodeId="${nodeId}"]`).style('display', 'none');
                    }
                  })
            });
        }
    
        function hasOtherConnectionsExcept(nodeId:any, excludeNodeId:any) {
            // Get all line elements
            const links = svg.selectAll('.link');
            let otherConnectionsExist = false;
            links.each(function() {
                const link = d3.select(this);
                const startId = link.attr('startId');
                const endId = link.attr('nodeId');
                if ((startId === nodeId || endId === nodeId) && startId !== excludeNodeId && endId !== excludeNodeId) {
                    otherConnectionsExist = true;
                }
            });
            return otherConnectionsExist;
        }

    }



    function expandSubclasses(classId:any) {
        try {
            console.log("Expanding subclasses for:", classId);
            if (!classId || !store) {
                console.error('No class selected or RDF store is not available.');
                return;
            }
            
            const clickedNode = $rdf.namedNode(classId);
            console.log(clickedNode);
            const SubClasses = rdfHelpers.getSubClasses(store, clickedNode);
            console.log(store);
            console.log(SubClasses);
        
            const expandedValues = new Set();
            expandedValues.add(classId);
            let count=0;

            SubClasses.forEach(({ subClass }:any) => {
                const targetValue = subClass;
                if (expandedValues.has(targetValue)) {
                    console.log(`Subclass with target value ${targetValue} has already been expanded.`);
                    return;
                }
                const lastSlashIndex = subClass.lastIndexOf('/');
                const target = lastSlashIndex !== -1 ? subClass.substring(lastSlashIndex + 1) : subClass;
                const prope ='subClassof';
                
                console.log(target,prope,targetValue,classId)
                const selectedCircle = d3.select(`circle[nodeId="${classId}"]`);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
                expandedValues.add(targetValue);
                createDiskAndLink(
                    d3.select(svgRef.current).select('g'),
                    $rdf.namedNode(targetValue),
                    prope,
                    'subclass',
                    targetValue,
                    { x: cxValue, y: cyValue },
                    store,
                    mainClassRef,
                    classId,
                    count,
                    setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal,setResetBottomPanel

                );
                count=count+1;
            });
        } catch (error) {
            console.error('Error expanding subclasses:', error);
        }
    }

    function expandIncomingRelations(classId:any) {
        try {
            console.log("Expanding Incoming relation for:", classId);
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
    
            incomingConnectedClasses.forEach(({ target, propertyUri }: { target: any, propertyUri: string }) => {
                if(!target){return ;}
                const selectedCircle = d3.select(`circle[nodeId="${classId}"]`);
                console.log(target)
                console.log(selectedCircle);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
                console.log(cxValue, cyValue);
    
                if (!seenValues.has(target.value)&&target) {
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
                        setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal,setResetBottomPanel
                        );
                    count=count+1;
                } else {
                    console.log(`Skipping duplicate target value: ${target.value}`);
                }
            });
        } catch (error) {
            console.error('Error expanding incoming relations:', error);
        }
    }
    
    function expandOutgoingRelations(classId:any) {
        try {
            console.log("Expanding Outgoing relations for:", classId);
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
            expandedValues.add(classId);
            let count=0;

            outgoingConnectedClasses.forEach(({ target, propertyUri }: { target: any, propertyUri: string }) => {
                if(!target){return ;}
                const targetValue = target.value;
                if (expandedValues.has(targetValue)) {
                    console.log(`Subclass with target value ${targetValue} has already been expanded.`);
                    return;
                }

                const selectedCircle = d3.select(`circle[nodeId="${classId}"]`);
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
                    setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal,setResetBottomPanel
                );
                count=count+1;
            });
        } catch (error) {
            console.error('Error expanding outgoing relations:', error);
        }
    }


function removeSelectedClass(nodeId: string) {
  // Select circles, text, connectors, and text on connectors to delete
  const selectedCircle = svg.select(`circle[nodeId="${nodeId}"]`);
  const selectedText = svg.select(`text[nodeId="${nodeId}"]`);
  const relatedLinks = svg.selectAll(`.link[nodeId="${nodeId}"], .link[startId="${nodeId}"]`);
  const relatedTexts = svg.selectAll(`.link-text[nodeId="${nodeId}"], .link-text[startId="${nodeId}"]`);
  const Links = svg.selectAll(`.link[startId="${nodeId}"]`);
  // Remove selected circles, text, connectors, and text on connectors
  selectedCircle.remove();
  selectedText.remove();
  relatedLinks.remove();
  relatedTexts.remove();
  Links.each(function() {
    const line = d3.select(this);
    const lineNodeId = line.attr('nodeId');
    console.log(lineNodeId)
    const isConnected = svg.selectAll(`.link[startId="${lineNodeId}"], .link[nodeId="${lineNodeId}"]`).size() > 0;
    if(!isConnected){
    removeSelectedClass(lineNodeId);}})
}
    function addNewSubclass(classId:any) {
        // Create a popup for subclass name input
        const subclassInput = prompt("Enter the name of the new subclass:");
        if (!subclassInput) {
            console.log("Subclass input is empty.");
            return; // Early return if input is empty
        }
    
        const newClassUri = `https://schemaForge.net/pattern/${subclassInput.trim().replace(/\s+/g, '-')}`;
        rdfHelpers.createClass(store, newClassUri,classId, setStore); 
        expandSubclasses(classId);
    }
    function addNewOutgoingRelation(classId:any) {
        const relationInput = prompt("Enter the relationship between the new subclass and the original class:");
        if (!relationInput){return;}
        const Comment = prompt("Enter the comment for the new outging Relation:");
        const relationUri = `https://schemaForge.net/pattern/${relationInput.replace(/\s+/g, '-')}`;
         setOutgoingClassId(classId);
         setOutgoingDetails({ relation:relationUri,comment:Comment });
         setShowOutgoingModal(true);
    }
    const handleOutgoingSelect = (e:any) => {
        if( OutgoingDetails.relation&&OutgoingClassId){
        const newClassUri = e.target.value;
        setShowOutgoingModal(false); // Close the modal box for data type selection
        console.log('create')
        rdfHelpers.createOutgoingRelation(store, newClassUri, OutgoingDetails.relation,OutgoingClassId, setStore,OutgoingDetails.comment);
        expandOutgoingRelations(OutgoingClassId);
    }else return ;};
    
    function addNewIncomingRelation(classId:any) {
        const relationInput = prompt("Enter the relationship between the new subclass and the original class:");
        if (!relationInput){return;}
        const Comment = prompt("Enter the comment for the new Incoming Relation:");
        const relationUri = `https://schemaForge.net/pattern/${relationInput.replace(/\s+/g, '-')}`;
         // Set the tag and comment status (if needed) and then show the modal with the data type
         setIncomingClassId(classId);
         setIncomingDetails({ relation:relationUri,comment:Comment });
         setShowIncomingModal(true);
    }
    const handleIncomingSelect = (e:any) => {
        if( IncomingDetails.relation&&IncomingClassId){
        const newClassUri = e.target.value;
        setShowIncomingModal(false); 
        rdfHelpers.createIncomingRelation(store, newClassUri, IncomingDetails.relation,IncomingClassId, setStore,IncomingDetails.comment);
        expandIncomingRelations(IncomingClassId);
    }else return ;}
    
    
    function addNewAttribute(classId:any) {
        const attributeLabel = window.prompt("Enter the label of the new attribute:");
        if (!attributeLabel) {
            console.log("Attribute label input is empty.");
            return;
        }
        const attributeComment = window.prompt("Enter the comment for the new attribute:");
    
        setCurrentClassId(classId);
        setAttributeDetails({ label: attributeLabel, comment: attributeComment }); 
        setShowDataTypeModal(true);
    }
    const handleDataTypeSelect = (e:any) => {
        const dataType = e.target.value;
        setShowDataTypeModal(false); 
    
        // Use attributeDetails, dataType and selectedClassId here to perform subsequent operations
        const newAttributeUri = `https://schemaForge.net/pattern/${attributeDetails.label.trim().replace(/\s+/g, '-')}`;
        rdfHelpers.createDataProperty(store, newAttributeUri, attributeDetails.label, attributeDetails.comment, currentClassId, dataType);
        console.log("New attribute added successfully with data type: " + dataType);
    };
    
    
    
    return (
        <div style={{ height: '100vh', overflowY: 'auto' }}>
        <div style={{ height: '65vh', overflowY: 'auto', position: 'relative' }}>
            <svg ref={svgRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}></svg>
                    {
                        showDataTypeModal && (
                        <Modal className="modal-dialog-centered" show={showDataTypeModal} onHide={() => setShowDataTypeModal(false)}>
                        <Modal.Header closeButton>
                        <Modal.Title className="custom-modal-title">Choose Data Type</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                        <select className="centered-select" onChange={(e) => handleDataTypeSelect(e)}>
                            {rdfHelpers.dataTypes.map((type,index) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                        </Modal.Body>
                        </Modal>
                        )
                    }
                    {
                        showOutgoingModal && (
                        <Modal  className="modal-dialog-centered" show={showOutgoingModal} onHide={() => setShowOutgoingModal(false)}>
                        <Modal.Header closeButton>
                        <Modal.Title className="custom-modal-title">Choose Class</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                        <select className="centered-select" onChange={(e) => handleOutgoingSelect(e)}>
                            {rdfHelpers.getAllClasses(store).map((uri:any,index:any) => (
                        <option key={index} value={uri}>{rdfHelpers.getLabelFromURI(store, uri)}</option>
                            ))}
                        </select>
                        </Modal.Body>
                        </Modal>
                        )
                    }
                    {
                        showIncomingModal && (
                        <Modal className="modal-dialog-centered" show={showIncomingModal} onHide={() => setShowIncomingModal(false)}>
                        <Modal.Header closeButton>
                        <Modal.Title className="custom-modal-title">Choose Class</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                        <select className="centered-select" onChange={(e) => handleIncomingSelect(e)}>
                            {rdfHelpers.getAllClasses(store).map((uri:any,index:any) => (
                        <option key={index} value={uri}>{rdfHelpers.getLabelFromURI(store, uri)}</option>
                            ))}
                        </select>
                        </Modal.Body>
                        </Modal>
                        )
                    }

                </div>
                <div style={{ height: '100%', width: '100%' }}>
                <BottomPanel 
    selectedClassDetails={selectedClassDetails} 
    onCircleClick={handleCircleClick} 
    reset={resetBottomPanel}
/>

                </div>
            </div>
    );
};

const BottomPanel = ({ selectedClassDetails, onCircleClick ,reset}: { selectedClassDetails: any, onCircleClick: any, reset: boolean }) => {
    return (
        <div className="bottom-panel" style={{ height: '100%', width: '100%', overflowY: 'auto' }}>
            {(reset&&selectedClassDetails)?  (
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid black' }}>Property</th>
                            <th style={{ border: '1px solid black' }}>Expected Type</th>
                            <th style={{ border: '1px solid black' }}>Description</th>
                        </tr>
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid black' }}>Properties from {selectedClassDetails.name}</td>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Direct Attributes */}
                        {selectedClassDetails.attributes.map(([propertyName, details]: [any, { type: any; comment: any; }], index: any) => (
                            <tr key={index}>
                                <td style={{ border: '1px solid black' }}>{propertyName}</td>
                                <td style={{ border: '1px solid black' }}>{details.type || ''}</td>
                                <td style={{ border: '1px solid black' }}>{details.comment || ''}</td>
                            </tr>
                        ))}

                        {/* Direct Relations */}
                        {selectedClassDetails.DirectOutgoing.map((item:any, index:any) => (
                        item && (
                            <tr key={`outgoing-${index}`} onClick={() => onCircleClick(item.target, item.property,'outgoing')} style={{ cursor: 'pointer', border: '1px solid black' }}>
                                <td style={{ border: '1px solid black' }}>{item.property}</td>
                                <td style={{ border: '1px solid black' }}>{item.targetValue}</td>
                                <td style={{ border: '1px solid black' }}>{item.commentaire}</td>
                            </tr>
                        )
                        ))}

                        {selectedClassDetails.DirectIncoming.map((item:any, index:any) => (
                            item && (
                                <tr key={`incoming-${index}`} onClick={() => onCircleClick(item.target, item.property,'incoming')} style={{ cursor: 'pointer', border: '1px solid black' }}>
                                    <td style={{ border: '1px solid black' }}>{item.property}</td>
                                    <td style={{ border: '1px solid black' }}>{item.targetValue}</td>
                                    <td style={{ border: '1px solid black' }}>{item.commentaire}</td>
                                </tr>
                            )
                        ))}
                        <tr>
                        <td colSpan={3} style={{ border: '1px solid black', textAlign: 'center' }}>
                           *********
                        </td>
                        </tr>
                        <tr>
                        <td colSpan={3} style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid black' }}>Properties from {selectedClassDetails.superclass}</td>
                        </tr>
                        {/* Inferred Attributes */}
                        {selectedClassDetails.InferredAttr.map(([propertyName, details]: [any, { type: any; comment: any; }], index: any) => (
                            <tr key={index}>
                                <td style={{ border: '1px solid black' }}>{propertyName}</td>
                                <td style={{ border: '1px solid black' }}>{details.type || ''}</td>
                                <td style={{ border: '1px solid black' }}>{details.comment || ''}</td>
                            </tr>
                            
                        ))}
                        {/* Inferred Relations */}
                        <tr>
                        </tr>
                        {selectedClassDetails.InferredOutgoing.map((item:any, index:any) => (
                            item && (
                            <tr key={`inferred-outgoing-${index}`} onClick={() => onCircleClick(item.target, item.property,'outgoing')} style={{ cursor: 'pointer', border: '1px solid black' }}>
                                <td style={{ border: '1px solid black' }}>{item.property}</td>
                                <td style={{ border: '1px solid black' }}>{item.targetValue}</td>
                                <td style={{ border: '1px solid black' }}>{item.commentaire}</td>
                            </tr>
                             )
                        ))}
                        {selectedClassDetails.InferredIncoming.map((item:any, index:any) => (
                            item && (
                            <tr key={`inferred-incoming-${index}`} onClick={() => onCircleClick(item.target, item.property,'incoming')} style={{ cursor: 'pointer', border: '1px solid black' }}>
                                <td style={{ border: '1px solid black' }}>{item.property|| ''}</td>
                                <td style={{ border: '1px solid black' }}>{item.targetValue|| ''}</td>
                                <td style={{ border: '1px solid black' }}>{item.commentaire|| ''}</td>
                            </tr>
                             ) 
                        ))}
                       <tr>
                        <td colSpan={3} style={{ border: '1px solid black', textAlign: 'center' }}>
                           *********
                        </td>
                         </tr>
                     
                    </tbody>
                </table>
            ):(
                <div style={{ textAlign: 'center', padding: '20px' }}>No details available</div>
            )}
        </div>
    );
};






export default Diagram;
