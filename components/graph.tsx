import * as d3 from 'd3';
import * as $rdf from 'rdflib';
import * as rdfHelpers from '@/components/rdfHelpers';
import { start } from 'repl';
import { has } from 'lodash';
import { Lancelot } from 'next/font/google';

// define the type of direction
type Direction = 'incoming' | 'outgoing' | 'subclass';


// import the function to expand subclasses
export const createDiskAndLink = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  newNode: $rdf.NamedNode,
  property: string,
  direction: Direction,
  nodeId: string,
  mainClassPosition: { x: number, y: number },
  store: $rdf.Store,
  mainClassRef: React.MutableRefObject<SVGElement | null>,
  classId:string,
  count:number,
  setStore:React.Dispatch<React.SetStateAction<any>>,
  setSelectedClassDetails: (classDetails: any) => void,
  setAttributeDetails: React.Dispatch<React.SetStateAction<any>>,
  setShowDataTypeModal: React.Dispatch<React.SetStateAction<boolean>>,
  setCurrentClassId:React.Dispatch<React.SetStateAction<any>>,
  setOutgoingClassId:React.Dispatch<React.SetStateAction<any>>,
  setOutgoingDetails:React.Dispatch<React.SetStateAction<any>>,
  setShowOutgoingModal:React.Dispatch<React.SetStateAction<boolean>>,
  setIncomingClassId:React.Dispatch<React.SetStateAction<any>>,
  setIncomingDetails:React.Dispatch<React.SetStateAction<any>>,
  setShowIncomingModal:React.Dispatch<React.SetStateAction<boolean>>

  
): void => {

  if (svg.selectAll(`circle[nodeId="${nodeId}"]`).size() > 0){
    const sourceX = mainClassPosition.x;
    const sourceY = mainClassPosition.y;
    const relatedDisk = svg.selectAll(`circle[nodeId="${nodeId}"]`);
    const labelText = svg.selectAll(`text.node-label[nodeId="${nodeId}"]`);

    // extract the part after the last slash as the attribute
    const lastSlashIndex = property.lastIndexOf('/');
    const propertyName = lastSlashIndex !== -1 ? property.substring(lastSlashIndex + 1) : property;

    // set the direction
    let link;
    if (direction === 'outgoing') {
        link = svg.append('path').attr('marker-end', 'url(#arrowhead-outgoing)');
    } else if (direction === 'incoming') {
        link = svg.append('path').attr('marker-start', 'url(#arrowhead-incoming)');
    } else if (direction ==='subclass') {
      link = svg.append('path').attr('marker-start', 'url(#arrowhead-subclass)');
    }

    // creat the link and set the position of the class as the end
    const relatedCircle = svg.select(`circle[nodeId="${nodeId}"]`);
    const targetX = +relatedCircle.attr('cx');
    const targetY = +relatedCircle.attr('cy');
    link.attr('class', 'link')
        .style('stroke', '#333333')
        .style('stroke-width', 2)
        .attr('nodeId', nodeId)
        .attr('startId', classId)
        .attr('d', `M${sourceX},${sourceY} L${targetX},${targetY}`);
        // calculate the middle point of the link
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    

// create the text of the link
    const text = svg.append('text')
      .attr('class', 'link-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text(` ${propertyName}`)
      .attr('nodeId', nodeId)
      .attr('startId', classId)
      .style('font-size', '14px')
      .attr('x', midX)
      .attr('y', midY);
      updateLink(sourceX, sourceY, targetX, targetY, link,text);


      // Create arrow element
  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-outgoing') // Define the ID of the arrow
    .attr('viewBox', '-20 -20 40 40') // Define the arrow's window
    .attr('refX', 0) // The offset of the arrow relative to the end point
    .attr('refY', 0)
    .attr('orient', 'auto') // Arrow direction automatically adjusted
    .attr('markerWidth', 30) // Arrow width
    .attr('markerHeight', 30) // the height of the arrow
    .attr('markerUnits', 'userSpaceOnUse') // Utiliser les coordonnées utilisateur pour refX et refY
    .append('path')
    .attr('nodeId', nodeId)
    .attr('d', 'M-10,-5L0,0L-10,5') // Arrow path, from end point to start point
    .style('fill', 'blue'); // Set arrow color


  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-incoming') // Define the ID of the arrow
    .attr('viewBox', '-20 -20 40 40') // Define the arrow's window
    .attr('refX', 0) // The offset of the arrow relative to the end point
    .attr('refY', 0)
    .attr('orient', 'auto') // Arrow direction automatically adjusted
    .attr('markerWidth', 30) // Arrow width
    .attr('markerHeight', 30) // the height of the arrow
    .attr('markerUnits', 'userSpaceOnUse') // Utiliser les coordonnées utilisateur pour refX et refY
    .append('path')
    .attr('nodeId', nodeId)
    .attr('d', 'M10,5L0,0L10,-5') // Define the path of the arrow
    .style('fill', 'red'); // Set arrow color

  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-subclass') // Define the ID of the arrow
    .attr('viewBox', '-20 -20 40 40') // Define the arrow's window
    .attr('refX', 0) // The offset of the arrow relative to the end point
    .attr('refY', 0)
    .attr('orient', 'auto') // Arrow direction automatically adjusted
    .attr('markerWidth', 30) // Arrow width
    .attr('markerHeight', 30) // the height of the arrow
    .attr('markerUnits', 'userSpaceOnUse') // Utiliser les coordonnées utilisateur pour refX et refY
    .append('path')
    .attr('nodeId', nodeId)
    .attr('d', 'M10,5L0,0L10,-5') // Define the path of the arrow
    .style('fill', 'yellow'); // Set arrow color

    // add the drag event to the circle and the text
    relatedDisk.call(d3.drag().on('drag', dragged));
    labelText.call(d3.drag().on('drag', dragged));

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


    // define the drag event
    function dragged(event) {
      const newX = event.x;
      const newY = event.y;
      const nodeId = d3.select(this).attr('nodeId');
      const selectedLines = d3.selectAll('.link[nodeId="' + nodeId + '"]');
      svg.selectAll('.link').each(function(){
        const line = d3.select(this);
        const startId = line.attr('startId');
        const endId = line.attr('nodeId');
  
        // Checks whether the start and end points of the connecting line are associated with the currently dragged circle
        if (startId === nodeId || endId === nodeId) {
          // Get the position of another circle
          const otherCircleId = startId === nodeId ? endId : startId;
          const otherCircle = svg.select(`circle[nodeId="${otherCircleId}"]`);
          const otherCircleX = +otherCircle.attr('cx');
          const otherCircleY = +otherCircle.attr('cy');
  
          // Calculate the distance between the current circle and another circle
          const distance = Math.sqrt((newX - otherCircleX) ** 2 + (newY - otherCircleY) ** 2);
  
          // If the distance is less than the threshold, hide the connection line; otherwise, show the connection line
          if (distance < 100) {
            line.style('opacity', 0);
          } else {
            line.style('opacity', 1);
          }
        }
      });
      svg.selectAll('.link-text').each(function(){
        const text = d3.select(this);
        const startId = text.attr('startId');
        const endId = text.attr('nodeId');
  
        // Checks whether the start and end points of the connecting line are associated with the currently dragged circle
        if (startId === nodeId || endId === nodeId) {
          // Get the position of another circle
          const otherCircleId = startId === nodeId ? endId : startId;
          const otherCircle = svg.select(`circle[nodeId="${otherCircleId}"]`);
          const otherCircleX = +otherCircle.attr('cx');
          const otherCircleY = +otherCircle.attr('cy');
  
          // Calculate the distance between the current circle and another circle
          const distance = Math.sqrt((newX - otherCircleX) ** 2 + (newY - otherCircleY) ** 2);
  
          // If the distance is less than the threshold, hide the connection line; otherwise, show the connection line
          if (distance < 100) {
            text.style('opacity', 0);
          } else {
            text.style('opacity', 1);
          }
        }
      });
      selectedLines.each(function() {
        const selectedLine = d3.select(this);
        const startId = selectedLine.attr('startId');
        const relatedCircle = d3.select(`circle[nodeId="${startId}"]`);
        if (relatedCircle.empty()) {
            console.log("Can't find the circle for line with nodeId: " + nodeId);
            return;
        }
        const circleX = +relatedCircle.attr('cx');
        const circleY = +relatedCircle.attr('cy');
        const labelText = svg.selectAll(`.node-label[nodeId="${nodeId}"]`);
        const linkText=svg.selectAll(`.link-text[startId="${startId}"][nodeId="${nodeId}"]`);
        updateMainClassRelatedLines(newX, newY,nodeId);
        updateLink(circleX, circleY, newX, newY, selectedLine,linkText);
         // update the position of the circle
       relatedDisk.attr('cx', newX).attr('cy', newY);
       labelText.attr('x', newX).attr('y', newY).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle');
  
    });
    
      };
      function updateMainClassRelatedLines(newX, newY, nodeId) {
        d3.selectAll('.link').each(function() {
            const line = d3.select(this);
            const startId = line.attr('startId');
            const endId = line.attr('nodeId');
    
            let sourceX, sourceY, targetX, targetY;
    
            if (startId === nodeId) {
                // If the currently dragged circle is the starting point of the connection
                const otherCircle = d3.select(`circle[nodeId="${endId}"]`);
                sourceX = newX;
                sourceY = newY;
                targetX = +otherCircle.attr('cx');
                targetY = +otherCircle.attr('cy');
            } else if (endId === nodeId) {
                // If the currently dragged circle is the end point of the line
                const otherCircle = d3.select(`circle[nodeId="${startId}"]`);
                sourceX = +otherCircle.attr('cx');
                sourceY = +otherCircle.attr('cy');
                targetX = newX;
                targetY = newY;
            } else {
                // If the currently dragged circle is neither the starting point nor the end point, the connection will not be updated.
                return;
            }
    
            // Update connection location
            const intersection = calculateDecalage(sourceX, sourceY, targetX, targetY, 50);
            line.attr('d', `M${sourceX+intersection[0]},${sourceY+intersection[1]} L${targetX-intersection[0]},${targetY-intersection[1]}`);
    
            // Update position of wire text
            const midX = (sourceX + targetX) / 2;
            const midY = (sourceY + targetY) / 2;
            d3.selectAll(`.link-text[startId="${startId}"][nodeId="${endId}"]`)
              .attr('x', midX)
              .attr('y', midY);
        });
    }
    
      
  // Update the position of the connection line
  function updateLink(startX, startY, endX, endY, line,linkText) {
    const intersection = calculateDecalage(startX, startY, endX, endY, 50);
    const linkPath = `M${startX+ intersection[0]},${startY+ intersection[1]} L${endX- intersection[0]},${endY-intersection[1]}`;
    line.attr('d', linkPath);
    // Update the position of the text on the connecting line
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    linkText.attr('x', midX).attr('y', midY);
  }}

  



  //Calculate the position of the new circle
  else{
  const select=svg.select(`circle[nodeId="${classId}"]`)
  console.log(select.attr('cx'),select.attr('cy'))
  
  // Calculate the position of a circle based on polar coordinates
  const diskX = +select.attr('cx')+150;
  const diskY =+select.attr('cy')+120*count;
  const diskRadius = 50;


  // Create new circle
  const relatedDisk = svg.append('g').attr('class', 'disk-and-label');

  relatedDisk
    .append('circle')
    .attr('cx', diskX)
    .attr('cy', diskY)
    .attr('r', diskRadius)
    .style('fill', 'white')
    .style('stroke', 'black')
    .style('stroke-width', 2)
    .attr('nodeId', nodeId)
    // Add drag and drop functionality
    .call(d3.drag().on('drag', dragged))
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
      })
    .classed('class-circle', true)
    // right click event
    .on('contextmenu', (event) => displayContextMenu(event, newNode, store)); // Change classId to newNode and pass it into store


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
      const subclass = rdfHelpers.getSubClasses(store, classNode);
      //outgoing , incoming relation
      const Incoming = rdfHelpers.getIncomingConnectedClasses(store, classNode);
      const Outgoing = rdfHelpers.getOutgoingConnectedClasses(store, classNode);


      const InferredSubClass=rdfHelpers.getInferredSubclasses(store,classNode);
      const Inferredrelation=rdfHelpers.getInferredRelation(store,classNode);
      
     
      const superlist = superclass.map(superclass => superclass.superClass);
      const supername = superlist.length > 0 ? superlist.map(item => item.substring(item.lastIndexOf('/') + 1)) : ["None"];

      const sublist = subclass.map(subclass => subclass.subClass);
      const subname = sublist.length > 0 ? sublist.map(item => item.substring(item.lastIndexOf('/') + 1)) : ["None"];

      const DirectOutgoing = Outgoing.map(item => {
          if (item.target) {
              const property = item.propertyUri.substring(item.propertyUri.lastIndexOf("/") + 1);
              const targetValue = item.target.value.substring(item.target.value.lastIndexOf("/") + 1);
              const target=item.target.value;
              return { property, targetValue,target };
          } else {
              return null;
          }
      });
      const DirectIncoming = Incoming.map(item => {
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
    
    
  // Add text near circle
  
  const label = rdfHelpers.getLabelFromURI(store, nodeId);
  console.log(label)
  const lastSlash = nodeId.lastIndexOf('/');
  const target = lastSlash !== -1 ? nodeId.substring(lastSlash + 1) : nodeId;
  const labelText = relatedDisk
    .append('text')
    .attr('class', 'node-label')
    .attr('x', diskX)
    .attr('y', diskY)
    .attr('nodeId', nodeId)
    .attr('text-anchor', 'middle') // 水平居中
    .attr('dominant-baseline', 'middle') // 垂直居中
    .text(target)
    .style('font-size', '14px');

  // Set the source and target points of the link
  const sourceX = mainClassPosition.x;
  const sourceY = mainClassPosition.y;
  console.log(sourceX)
  const targetX = +relatedDisk.select('circle').attr('cx');
  const targetY = +relatedDisk.select('circle').attr('cy');

  // Calculate the midpoint coordinates of the link path
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Extract the part after the last slash in the path as an attribute
  const lastSlashIndex = property.lastIndexOf('/');
  const propertyName = lastSlashIndex !== -1 ? property.substring(lastSlashIndex + 1) : property;
 

  // Create connecting lines
  const link = svg
    .append('path')
    .attr('class', 'link')
    .style('stroke', '#333333')
    .style('stroke-width', 2)
    .style('opacity', 1)
    .attr('nodeId', nodeId)
    .attr('startId',classId)
    .attr('d', `M${sourceX},${sourceY} L${targetX},${targetY}`);

  // Create text that connects lines
  const text = svg
    .append('text')
    .attr('class', 'link-text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .text(` ${propertyName}`)
    .attr('nodeId', nodeId)
    .attr('startId',classId)
    .style('font-size', '14px')
    .attr('x', midX)
    .attr('y', midY)
    .style('opacity', 1);

  // calculate the intersection of the link and the circle
  const Intersection = calculateDecalage(sourceX, sourceY, targetX, targetY, diskRadius);
  
  // Update the position of the connector line and the position of the text on the connector line
  updateLink(sourceX,sourceY,Intersection);
  

  // Create arrow element
  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-outgoing') // Define the ID of the arrow
    .attr('viewBox', '-20 -20 40 40') // Define the arrow's window
    .attr('refX', 0) // The offset of the arrow relative to the end point
    .attr('refY', 0)
    .attr('orient', 'auto') // Arrow direction automatically adjusted
    .attr('markerWidth', 30) // Arrow width
    .attr('markerHeight', 30) // the height of the arrow
    .attr('markerUnits', 'userSpaceOnUse') // Utiliser les coordonnées utilisateur pour refX et refY
    .append('path')
    .attr('nodeId', nodeId)
    .attr('d', 'M-10,-5L0,0L-10,5') // Arrow path, from end point to start point
    .style('fill', 'blue'); // Set arrow color
    

  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-incoming') // Define the ID of the arrow
    .attr('viewBox', '-20 -20 40 40') // Define the arrow's window
    .attr('refX', 0) // The offset of the arrow relative to the end point
    .attr('refY', 0)
    .attr('orient', 'auto') // Arrow direction automatically adjusted
    .attr('markerWidth', 30) // Arrow width
    .attr('markerHeight', 30) // the height of the arrow
    .attr('markerUnits', 'userSpaceOnUse') // Utiliser les coordonnées utilisateur pour refX et refY
    .append('path')
    .attr('nodeId', nodeId)
    .attr('d', 'M10,5L0,0L10,-5') // Define the path of the arrow
    .style('fill', 'red'); // Set arrow color

  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-subclass') // Define the ID of the arrow
    .attr('viewBox', '-20 -20 40 40') // Define the arrow's window
    .attr('refX', 0) // The offset of the arrow relative to the end point
    .attr('refY', 0)
    .attr('orient', 'auto') // Arrow direction automatically adjusted
    .attr('markerWidth', 30) // Arrow width
    .attr('markerHeight', 30) // the height of the arrow
    .attr('markerUnits', 'userSpaceOnUse') // Utiliser les coordonnées utilisateur pour refX et refY
    .append('path')
    .attr('nodeId', nodeId)
    .attr('d', 'M10,5L0,0L10,-5') // Define the path of the arrow
    .style('fill', 'yellow'); // Set arrow color

  // Set arrows based on direction

if (direction === 'outgoing') {
  link.attr('marker-end', 'url(#arrowhead-outgoing)');
} else if (direction === 'incoming') {
  link.attr('marker-start', 'url(#arrowhead-incoming)');
}else if (direction ==='subclass') {
  link.attr('marker-start', 'url(#arrowhead-subclass)');
}
  // Fonction pour calculer l'intersection entre la ligne de liaison et le cercle
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

  // Drag event handler function
  function dragged(event) {
    const newX = event.x;
    const newY = event.y;
    const nodeId = d3.select(this).attr('nodeId');
    const selectedLine = d3.select('.link[nodeId="' + nodeId + '"]');
    const startId = selectedLine.attr('startId');
    let circleX, circleY;

    const relatedCircle = d3.select(`circle[nodeId="${startId}"]`);
    if (relatedCircle.empty()) {
        circleX = sourceX;
        circleY = sourceY;
    } else {
        circleX = +relatedCircle.attr('cx');
        circleY = +relatedCircle.attr('cy');
    }
    
    // calculate the intersection of the link and the circle
    const Intersection = calculateDecalage(circleX, circleY, newX, newY, diskRadius);

    // Update related connecting lines and text positions
    updateMainClassRelatedLines(newX, newY,nodeId);

    // Update the circle's position
    relatedDisk.select('circle').attr('cx', newX).attr('cy', newY);

    // Update the position of the connector line and the position of the text on the connector line
    updateLink(circleX,circleY,Intersection);

    // Update the position of related text
    labelText.attr('x', newX).attr('y', newY).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle');
    
    // Traverse all connecting lines and make the arrows transparent if the connection distance is too close
    svg.selectAll('.link').each(function(){
      const line = d3.select(this);
      const startId = line.attr('startId');
      const endId = line.attr('nodeId');

      // Checks whether the start and end points of the connecting line are associated with the currently dragged circle
      if (startId === nodeId || endId === nodeId) {
        // Get the position of another circle
        const otherCircleId = startId === nodeId ? endId : startId;
        const otherCircle = svg.select(`circle[nodeId="${otherCircleId}"]`);
        const otherCircleX = +otherCircle.attr('cx');
        const otherCircleY = +otherCircle.attr('cy');

        // Calculate the distance between the current circle and another circle
        const distance = Math.sqrt((newX - otherCircleX) ** 2 + (newY - otherCircleY) ** 2);

        // If the distance is less than the threshold, hide the connection line; otherwise, show the connection line
        if (distance < 100) {
          line.style('opacity', 0);
        } else {
          line.style('opacity', 1);
        }
      }
    });
    svg.selectAll('.link-text').each(function(){
      const text = d3.select(this);
      const startId = text.attr('startId');
      const endId = text.attr('nodeId');

      // Checks whether the start and end points of the connecting line are associated with the currently dragged circle
      if (startId === nodeId || endId === nodeId) {
        // Get the position of another circle
        const otherCircleId = startId === nodeId ? endId : startId;
        const otherCircle = svg.select(`circle[nodeId="${otherCircleId}"]`);
        const otherCircleX = +otherCircle.attr('cx');
        const otherCircleY = +otherCircle.attr('cy');

        // Calculate the distance between the current circle and another circle
        const distance = Math.sqrt((newX - otherCircleX) ** 2 + (newY - otherCircleY) ** 2);

        // If the distance is less than the threshold, hide the connection line; otherwise, show the connection line
        if (distance < 100) {
          text.style('opacity', 0);
        } else {
          text.style('opacity', 1);
        }
      }
    });
  }
  
  function updateMainClassRelatedLines(newX, newY, nodeId) {
    d3.selectAll('.link').each(function() {
        const line = d3.select(this);
        const startId = line.attr('startId');
        const endId = line.attr('nodeId');

        let sourceX, sourceY, targetX, targetY;

        if (startId === nodeId) {
            // If the currently dragged circle is the starting point of the connection
            const otherCircle = d3.select(`circle[nodeId="${endId}"]`);
            sourceX = newX;
            sourceY = newY;
            targetX = +otherCircle.attr('cx');
            targetY = +otherCircle.attr('cy');
        } else if (endId === nodeId) {
            // If the currently dragged circle is the end point of the line
            const otherCircle = d3.select(`circle[nodeId="${startId}"]`);
            sourceX = +otherCircle.attr('cx');
            sourceY = +otherCircle.attr('cy');
            targetX = newX;
            targetY = newY;
        } else {
            // If the currently dragged circle is neither the starting point nor the end point, the connection will not be updated.
            return;
        }

        // Update connection location
        const intersection = calculateDecalage(sourceX, sourceY, targetX, targetY, 50);
        line.attr('d', `M${sourceX+intersection[0]},${sourceY+intersection[1]} L${targetX-intersection[0]},${targetY-intersection[1]}`);

        // Update position of wire text
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;
        d3.selectAll(`.link-text[startId="${startId}"][nodeId="${endId}"]`)
          .attr('x', midX)
          .attr('y', midY);
    });
}

  



  

  // Update the position of the connection line
  function updateLink(sourceX,sourceY,Intersection) {
    const targetX = +relatedDisk.select('circle').attr('cx');
    const targetY = +relatedDisk.select('circle').attr('cy');
    const linkPath = `M${sourceX + Intersection[0]},${sourceY + Intersection[1]} L${targetX - Intersection[0]},${targetY - Intersection[1]}`;
    link.attr('d', linkPath);

    // Update the position of the text on the connecting line
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    text.attr('x', midX).attr('y', midY);
    
    /*
    const markerEnd = 'url(#arrowhead-subclass)';
    link.attr('marker-end', markerEnd); */
  }}

  // Right click event handler function
  function displayContextMenu(event, newNode: $rdf.NamedNode, store: $rdf.Store) {
    event.preventDefault();
    const x = event.clientX;
    const y = event.clientY;
    
    // Create a right-click menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.backgroundColor = '#f9f9f9';
    contextMenu.style.border = '1px solid #ccc';
    contextMenu.style.padding = '5px';

    // Define menu items
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


    // Add menu item
    menuItems.forEach((item) => {
      const menuItem = document.createElement('div');
      menuItem.textContent = item.content;
      menuItem.style.cursor = 'pointer';
      menuItem.addEventListener('click', () => handleMenuItemClick(item.action, newNode, store));
      contextMenu.appendChild(menuItem);
    });

    // Append context menu to the document body
    document.body.appendChild(contextMenu);

    // Close the context menu when clicking outside of it
    setTimeout(() => {
      document.addEventListener("click", function onClickOutside(event) {
              contextMenu.remove();
              document.removeEventListener("click", onClickOutside);
          
      });
  }, 0);
  }

  // Menu item click handler function
  function handleMenuItemClick(action, newNode: $rdf.NamedNode, store: $rdf.Store) {
    try {
      console.log("Menu item clicked:", action);
      if (action === 'expandSubclasses') {
          if (store) {
              // check if sub exists
              const SubExists = checkSubExists(nodeId);
              console.log(SubExists);
              if (SubExists) {
                  if(checkSubHide(nodeId)){
                      expandHavingSubs(nodeId);
                  }
                  else{
                  console.log("sub already exists, hiding...");
                  hideSubs(nodeId,newNode);}
              }
              else {
                  console.log("Expanding subs...");
                  expandSubclasses(svg,newNode,store);
                  console.log("subs expanded successfully.");
              }
          } else {
              console.error('RDF store is not available.');
          }
      } else if (action === 'expandIncomingRelations') {
          if (store) {
            const IncomingRelationExists = checkIncomingRelationExists(nodeId);
            console.log(checkIncomingRelationHide(nodeId))
            if (IncomingRelationExists){
              if(checkIncomingRelationHide(nodeId)){
                expandHavingIncomingRelations(nodeId)
              }else{
                console.log("Relation already exists, hiding...");
                hideIncomingRelations(nodeId,newNode);
              }
            }else{
              console.log("Expanding incoming relations...");
              expandIncomingRelations(svg,newNode,store);
              console.log("Incoming Relations expanded successfully.");
            }
          } else {
              console.error('RDF store is not available.');
          }
      } else if (action === 'expandOutgoingRelations') {
        if (store) {
          const OutgoingRelationExists = checkOutgoingRelationExists(nodeId);
          console.log(checkOutgoingRelationHide(nodeId))
          if (OutgoingRelationExists){
            if(checkOutgoingRelationHide(nodeId)){
              expandHavingOutgoingRelations(nodeId)
            }else{
              console.log("Relation already exists, hiding...");
              hideOutgoingRelations(nodeId,newNode);
            }
          }else{
            console.log("Expanding incoming relations...");
            expandOutgoingRelations(svg,newNode,store);
            console.log("Outgoing Relations expanded successfully.");
          }
        } else {
            console.error('RDF store is not available.');
        }
      } else if (action === 'removeClass') {
          removeSelectedClass(nodeId);
      } else if (action === 'addSubclass') {
          addNewSubclass(nodeId);
      }
      else if (action === 'addIncomingRelation') {
          addNewIncomingRelation(nodeId);
      }
      else if (action === 'addOutgoingRelation') {
          addNewOutgoingRelation(nodeId);
      }
      else if (action === 'addAttribute') {
          addNewAttribute(nodeId);
      }
  } catch (error) {
      console.error('Error handling menu item click:', error);
  }
}
function checkSubExists(classId) {
  const clickedNode = $rdf.namedNode(classId);
  const SubClasses = rdfHelpers.getSubClasses(store, clickedNode);
  let subExists = false;

  SubClasses.forEach(({ subClass }) => {
      const nodeId = subClass;
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
  const SubClasses = rdfHelpers.getSubClasses(store, clickedNode);
  let subHide = false;

  SubClasses.forEach(({ subClass }) => {
      const nodeId = subClass;
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
function hideSubs(classId, newNode) {
  const hiddenNodes = {}; // Used to store hidden node IDs
  hideRelatedSubs(classId);

  function hideRelatedSubs(classId) {
      // Get the connection line information related to the current node
      const SubClasses = rdfHelpers.getSubClasses(store, $rdf.namedNode(classId));
      SubClasses.forEach(({ subClass }) => {
          if (!subClass) {
              return;
          }
          if (!isLineMatch(subClass, classId)){
            return;
          }
          const x = subClass;
          if (x!= newNode.value){
          // If the node is already hidden, skip
          if (hiddenNodes[x]) {
              return;
          }
          const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
          // Hide connecting lines and related elements
          if (!hasOtherConnections && x !== newNode.value) {
              hideElement(x);
          }
          if (hasOtherConnections && x !== newNode.value) {
            svg.selectAll(`.link[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
            svg.selectAll(`.link-text[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
            }
          // Mark current node as hidden
          hiddenNodes[x] = true;
          // Get the child nodes related to the current node and hide them recursively
          hideRelatedSubs(x);
          hideRelatedIncoming(x,newNode);
          hideRelatedOutgoing(x, newNode);
      }});
  }

  function hideRelatedIncoming(classId, newNode) {
      const IncomingClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
      IncomingClasses.forEach(({ target }) => {
          if (!target) {
              return;
          }
          if (!isLineMatch(target.value, classId)){
            return;
          }
          const x = target.value;
          if (x!=newNode.value){
          // If the node is already hidden, skip
          if (hiddenNodes[x]) {
              return;
          }
          // Determine whether there are other connections besides the specified node
          const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
          // Hide connecting lines and related elements
          if (!hasOtherConnections && x !== newNode.value) {
              hideElement(x);
          }
          if (hasOtherConnections && x !== newNode.value) {
            console.log(hasOtherConnections)
            svg.selectAll(`.link[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
            svg.selectAll(`.link-text[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
            }
          // Mark current node as hidden
          hiddenNodes[x] = true;
          // Get the child nodes related to the current node and hide them recursively
          hideRelatedIncoming(x, newNode);
      }});
  }

  function hideRelatedOutgoing(classId, newNode) {
    const OutgoingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
    OutgoingClasses.forEach(({ target }) => {
        if (!target) {
            return;
        }
        if (!isLineMatch(target.value, classId)){
          return;
        }
        const x = target.value;
        if (x!=newNode.value){
        // If the node is already hidden, skip
        if (hiddenNodes[x]) {
            return;
        }
        // Determine whether there are other connections besides the specified node
        const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
        // Hide connecting lines and related elements
        if (!hasOtherConnections && x !== newNode.value) {
            hideElement(x);
        }
        if (hasOtherConnections && x !== newNode.value) {
          console.log(hasOtherConnections)
          svg.selectAll(`.link[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
          svg.selectAll(`.link-text[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
          }
        // Mark current node as hidden
        hiddenNodes[x] = true;
        // Get the child nodes related to the current node and hide them recursively
        hideRelatedOutgoing(x, newNode);
    }});
}

  function hasOtherConnectionsExcept(nodeId, newNode) {
      // Get all line elements
      const lines = svg.selectAll('.link').filter(function() {
          return d3.select(this).style('display') !== 'none';
      });

      let otherConnectionsExist = false;

      // Traverse all line elements
      lines.each(function() {
          const line = d3.select(this);
          const lineNodeId = line.attr('nodeId');
          const lineStartId = line.attr('startId');

          // Determine whether the starting node or ending node of the line is the given nodeId
          if ((lineNodeId === nodeId || lineStartId === nodeId) && 
              lineNodeId !== newNode.value && lineStartId !== newNode.value) {
              otherConnectionsExist = true;
          }
      });

      return otherConnectionsExist;
  }
  function isLineMatch(nodeId, startId) {
    const lines = svg.selectAll('.link');
    for (let i = 0; i < lines.size(); i++) {
        const line = lines.nodes()[i];
        const lineNodeId = line.getAttribute('nodeId');
        const lineStartId = line.getAttribute('startId');
        if (lineNodeId === nodeId && lineStartId === startId) {
            return true; // Matching straight line found
        }
    }
    return false; // No matching line found
}

  function hideElement(nodeId) {
      // Hide connecting lines
      svg.selectAll(`.link[nodeId="${nodeId}"]`).style('display', 'none');
      // Hide text on connecting lines
      svg.selectAll(`.link-text[nodeId="${nodeId}"]`).style('display', 'none');
      // Hide circle
      svg.selectAll(`circle[nodeId="${nodeId}"]`).style('display', 'none');
      svg.selectAll(`text[nodeId="${nodeId}"]`).style('display', 'none');
  }
}

function expandHavingSubs(classId) {
  const expandedNodes = {}; // Used to store expanded node IDs
  expandRelatedSubs(classId);
  
  function expandRelatedSubs(nodeId) {
      // Get the connection line information related to the current node
      const SubClasses = rdfHelpers.getSubClasses(store, $rdf.namedNode(nodeId));
      
      SubClasses.forEach(({ subClass }) => {
        if (!subClass) {
          return;
      }
          const connectedNodeId = subClass; 
          // If the node is already expanded, skip
          if (expandedNodes[connectedNodeId]) {
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
          // Get the child nodes related to the current node and expand them recursively
          expandRelatedSubs(connectedNodeId);
          expandRelatedOutgoing(connectedNodeId);
          expandRelatedIncoming(connectedNodeId);
      });
  }
  
  function expandRelatedOutgoing(nodeId) {
      // Get the connection line information related to the current node
      const OutgoingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
      
      OutgoingClasses.forEach(({ target }) => {
        if (!target) {
          return;
      }
          const connectedNodeId = target.value; // Modify the variable name connectedNodeId
          // If the node is already expanded, skip
          if (expandedNodes[connectedNodeId]) {
              return;
          }
          // Expand connection line
          svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // Expand the text on the connecting line
          svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // expand circle
          svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
          svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // Mark current node as expanded
          expandedNodes[connectedNodeId] = true;
          // Get the child nodes related to the current node and expand them recursively
          expandRelatedOutgoing(connectedNodeId);
      });
  }
  function expandRelatedIncoming(nodeId) {
    // Get the connection line information related to the current node
    const IncomingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
    
    IncomingClasses.forEach(({ target }) => {
      if (!target) {
        return;
    }
        const connectedNodeId = target.value; 
        // If the node is already expanded, skip
        if (expandedNodes[connectedNodeId]) {
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
        // Get the child nodes related to the current node and expand them recursively
        expandRelatedIncoming(connectedNodeId);
    });
}
}

function checkIncomingRelationExists(classId) {
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
function checkIncomingRelationHide(classId) {
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

function expandHavingIncomingRelations(classId) {
  const expandedNodes = {}; // Used to store expanded node IDs
  expandRelatedIncoming(classId);
  function expandRelatedIncoming(nodeId) {
      // Get the connection line information related to the current node
      const IncomingClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
      IncomingClasses.forEach(({ target }) => {
        if (!target) {
          return;
      }
          const connectedNodeId = target.value;
          // If the node is already expanded, skip
          if (expandedNodes[connectedNodeId]) {
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
          // Get the child nodes related to the current node and expand them recursively
          expandRelatedIncoming(connectedNodeId);
          expandRelatedOutgoing(connectedNodeId);
          expandRelatedSubs(connectedNodeId);
      });
  }
  function expandRelatedOutgoing(nodeId) {
    // Get the connection line information related to the current node
    const OutgoingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
    OutgoingClasses.forEach(({ target }) => {
      if (!target) {
        return;
      }
      const connectedNodeId = target.value;
      // If the node is already expanded, skip
      if (expandedNodes[connectedNodeId]) {
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
      // Get the child nodes related to the current node and expand them recursively
      expandRelatedOutgoing(connectedNodeId);
    });
  }

  function expandRelatedSubs(nodeId) {
    // Get the connection line information related to the current node
    const SubClasses = rdfHelpers.getSubClasses(store, $rdf.namedNode(nodeId));
    SubClasses.forEach(({ subClass }) => {
      if (!subClass) {
        return;
    }
        const connectedNodeId = subClass;
        // If the node is already expanded, skip
        if (expandedNodes[connectedNodeId]) {
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
        // Get the child nodes related to the current node and expand them recursively
        expandRelatedSubs(connectedNodeId);
    });
  }
}

function hideIncomingRelations(classId, newNode) {
  const hiddenNodes = {}; // Used to store hidden node IDs
  hideRelatedIncoming(classId);

  function hideRelatedIncoming(classId) {
      // Get the connection line information related to the current node
      const IncomingClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
      IncomingClasses.forEach(({ target }) => {
          if (!target) {
              return;
          }
          if (!isLineMatch(target.value, classId)){
            return;
          }
          const x = target.value;
          if (x !== newNode.value) {
              // If the node is already hidden, skip
              if (hiddenNodes[x]) {
                  return;
              }
              const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
              // Hide connecting lines and related elements
              if (!hasOtherConnections && x !== newNode.value) {
                  hideElement(x);
              }
              if (hasOtherConnections && x !== newNode.value) {
                svg.selectAll(`.link[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
                svg.selectAll(`.link-text[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
                }
              hiddenNodes[x] = true;
              // Get the child nodes related to the current node and hide them recursively
              hideRelatedIncoming(x);
              hideRelatedOutgoing(x, newNode);
              hideRelatedSubs(x, newNode);
          }
      });
  }

  function hideRelatedOutgoing(classId, newNode) {
      const OutgoingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
      OutgoingClasses.forEach(({ target }) => {
          if (!target) {
              return;
          }
          if (!isLineMatch(target.value, classId)){
            return;
          }
          const x = target.value;
          if (x !== newNode.value) {
              // If the node is already hidden, skip
              if (hiddenNodes[x]) {
                  return;
              }
              const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
              // Hide connecting lines and related elements
              if (!hasOtherConnections && x !== newNode.value) {
                console.log(x)
                  hideElement(x);
              }
              if (hasOtherConnections && x !== newNode.value) {
              svg.selectAll(`.link[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
              svg.selectAll(`.link-text[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
              }
              hiddenNodes[x] = true;
              // Get the child nodes related to the current node and hide them recursively
              hideRelatedOutgoing(x, newNode);
          }
      });
  }
  function hideRelatedSubs(classId, newNode) {
    const SubClasses = rdfHelpers.getSubClasses(store, $rdf.namedNode(classId));
    SubClasses.forEach(({ subClass }) => {
        if (!subClass) {
            return;
        }
        if (!isLineMatch(subClass, classId)){
          return;
        }
        const x =subClass;
        if (x !== newNode.value) {
            // If the node is already hidden, skip
            if (hiddenNodes[x]) {
                return;
            }
            const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
            // Hide connecting lines and related elements
            if (!hasOtherConnections && x !== newNode.value) {
              console.log(x)
                hideElement(x);
            }
            if (hasOtherConnections && x !== newNode.value) {
            svg.selectAll(`.link[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
            svg.selectAll(`.link-text[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
            }
            hiddenNodes[x] = true;
            // Get the child nodes related to the current node and hide them recursively
            hideRelatedSubs(x, newNode);
        }
    });
}

  function isLineMatch(nodeId, startId) {
    const lines = svg.selectAll('.link');
    for (let i = 0; i < lines.size(); i++) {
        const line = lines.nodes()[i];
        const lineNodeId = line.getAttribute('nodeId');
        const lineStartId = line.getAttribute('startId');
        if (lineNodeId === nodeId && lineStartId === startId) {
            return true; // Matching straight line found
        }
    }
    return false; // No matching line found
}

  function hasOtherConnectionsExcept(nodeId, newNode) {
      // Get all line elements
      const lines = svg.selectAll('.link').filter(function() {
          return d3.select(this).style('display') !== 'none';
      });

      let otherConnectionsExist = false;

      // Traverse all line elements
      lines.each(function() {
          const line = d3.select(this);
          const lineNodeId = line.attr('nodeId');
          const lineStartId = line.attr('startId');

          // Determine whether the starting node or ending node of the line is the given nodeId
          if ((lineNodeId === nodeId || lineStartId === nodeId) && 
              lineNodeId !== newNode.value && lineStartId !== newNode.value) {
              otherConnectionsExist = true;
          }
      });

      return otherConnectionsExist;
  }

  function hideElement(nodeId) {
      // Hide connecting lines
      svg.selectAll(`.link[nodeId="${nodeId}"]`).style('display', 'none');
      // Hide text on connecting lines
      svg.selectAll(`.link-text[nodeId="${nodeId}"]`).style('display', 'none');
      // Hide circle
      svg.selectAll(`circle[nodeId="${nodeId}"]`).style('display', 'none');
      svg.selectAll(`text[nodeId="${nodeId}"]`).style('display', 'none');
  }
}

function checkOutgoingRelationExists(classId) {
  const OutgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
  let relationExists = false;

  OutgoingConnectedClasses.forEach(({ target }) => {
      const nodeId = target.value;
      const textlink = svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${classId}"]`);
      if (!textlink.empty()) {
          relationExists = true;
          return; // Terminate the loop
      }
  });

  return relationExists;
}
function checkOutgoingRelationHide(classId) {
  const OutgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
  let relationHide = false;

  OutgoingConnectedClasses.forEach(({ target }) => {
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

function expandHavingOutgoingRelations(classId) {
  const expandedNodes = {}; // Used to store expanded node IDs
  expandRelatedOutgoing(classId);
  function expandRelatedOutgoing(nodeId) {
      // Get the connection line information related to the current node
      const OutgoingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
      OutgoingClasses.forEach(({ target }) => {
        if (!target) {
          return;
      }
          const connectedNodeId = target.value;
          // If the node is already expanded, skip
          if (expandedNodes[connectedNodeId]) {
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
          // Get the child nodes related to the current node and expand them recursively
          expandRelatedOutgoing(connectedNodeId);
          expandRelatedIncoming(connectedNodeId);
          expandRelatedSubs(connectedNodeId);
      });
  }
  function expandRelatedIncoming(nodeId) {
    // Get the connection line information related to the current node
    const IncomingClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
    IncomingClasses.forEach(({ target }) => {
      if (!target) {
        return;
      }
      const connectedNodeId = target.value;
      // If the node is already expanded, skip
      if (expandedNodes[connectedNodeId]) {
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
      // Get the child nodes related to the current node and expand them recursively
      expandRelatedIncoming(connectedNodeId);
    });
  }

  function expandRelatedSubs(nodeId) {
    // Get the connection line information related to the current node
    const SubClasses = rdfHelpers.getSubClasses(store, $rdf.namedNode(nodeId));
    SubClasses.forEach(({ subClass }) => {
      if (!subClass) {
        return;
    }
        const connectedNodeId = subClass;
        // If the node is already expanded, skip
        if (expandedNodes[connectedNodeId]) {
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
        // Get the child nodes related to the current node and expand them recursively
        expandRelatedSubs(connectedNodeId);
    });
  }
}

function hideOutgoingRelations(classId, newNode) {
  const hiddenNodes = {}; // Used to store hidden node IDs
  hideRelatedOutgoing(classId);

  function hideRelatedOutgoing(classId) {
      // Get the connection line information related to the current node
      const OutgoingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
      OutgoingClasses.forEach(({ target }) => {
          if (!target) {
              return;
          }
          if (!isLineMatch(target.value, classId)){
            return;
          }
          const x = target.value;
          if (x !== newNode.value) {
              // If the node is already hidden, skip
              if (hiddenNodes[x]) {
                  return;
              }
              const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
              // Hide connecting lines and related elements
              if (!hasOtherConnections && x !== newNode.value) {
                  hideElement(x);
              }
              if (hasOtherConnections && x !== newNode.value) {
                svg.selectAll(`.link[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
                svg.selectAll(`.link-text[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
                }
              hiddenNodes[x] = true;
              // Get the child nodes related to the current node and hide them recursively
              hideRelatedOutgoing(x);
              hideRelatedIncoming(x, newNode);
              hideRelatedSubs(x, newNode);
          }
      });
  }

  function hideRelatedIncoming(classId, newNode) {
      const IncomingClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
      IncomingClasses.forEach(({ target }) => {
          if (!target) {
              return;
          }
          if (!isLineMatch(target.value, classId)){
            return;
          }
          const x = target.value;
          if (x !== newNode.value) {
              // If the node is already hidden, skip
              if (hiddenNodes[x]) {
                  return;
              }
              const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
              // Hide connecting lines and related elements
              if (!hasOtherConnections && x !== newNode.value) {
                console.log(x)
                  hideElement(x);
              }
              if (hasOtherConnections && x !== newNode.value) {
              svg.selectAll(`.link[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
              svg.selectAll(`.link-text[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
              }
              hiddenNodes[x] = true;
              // Get the child nodes related to the current node and hide them recursively
              hideRelatedIncoming(x, newNode);
          }
      });
  }
  function hideRelatedSubs(classId, newNode) {
    const SubClasses = rdfHelpers.getSubClasses(store, $rdf.namedNode(classId));
    SubClasses.forEach(({ subClass }) => {
        if (!subClass) {
            return;
        }
        if (!isLineMatch(subClass, classId)){
          return;
        }
        const x = subClass;
        if (x !== newNode.value) {
            // If the node is already hidden, skip
            if (hiddenNodes[x]) {
                return;
            }
            const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
            // Hide connecting lines and related elements
            if (!hasOtherConnections && x !== newNode.value) {
              console.log(x)
                hideElement(x);
            }
            if (hasOtherConnections && x !== newNode.value) {
            svg.selectAll(`.link[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
            svg.selectAll(`.link-text[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
            }
            hiddenNodes[x] = true;
            // Get the child nodes related to the current node and hide them recursively
            hideRelatedSubs(x, newNode);
        }
    });
}

  function isLineMatch(nodeId, startId) {
    const lines = svg.selectAll('.link');
    for (let i = 0; i < lines.size(); i++) {
        const line = lines.nodes()[i];
        const lineNodeId = line.getAttribute('nodeId');
        const lineStartId = line.getAttribute('startId');
        if (lineNodeId === nodeId && lineStartId === startId) {
            return true; // Matching straight line found
        }
    }
    return false; // No matching line found
}

  function hasOtherConnectionsExcept(nodeId, newNode) {
      // Get all line elements
      const lines = svg.selectAll('.link').filter(function() {
          return d3.select(this).style('display') !== 'none';
      });

      let otherConnectionsExist = false;

      // Traverse all line elements
      lines.each(function() {
          const line = d3.select(this);
          const lineNodeId = line.attr('nodeId');
          const lineStartId = line.attr('startId');

          // Determine whether the starting node or ending node of the line is the given nodeId
          if ((lineNodeId === nodeId || lineStartId === nodeId) && 
              lineNodeId !== newNode.value && lineStartId !== newNode.value) {
              otherConnectionsExist = true;
          }
      });

      return otherConnectionsExist;
  }

  function hideElement(nodeId) {
      // Hide connecting lines
      svg.selectAll(`.link[nodeId="${nodeId}"]`).style('display', 'none');
      // Hide text on connecting lines
      svg.selectAll(`.link-text[nodeId="${nodeId}"]`).style('display', 'none');
      // Hide circle
      svg.selectAll(`circle[nodeId="${nodeId}"]`).style('display', 'none');
      svg.selectAll(`text[nodeId="${nodeId}"]`).style('display', 'none');
  }
}

  // extended relationship
  function expandIncomingRelations(svg, newNode: $rdf.NamedNode, store: $rdf.Store) {
    try {
      console.log('Expanding relation for:', newNode.value);
      const selectedCircle = svg.select(`circle[nodeId="${nodeId}"]`);
      const circleCX = +selectedCircle.attr('cx');
      const circleCY = +selectedCircle.attr('cy');

console.log('圆圈的位置:', circleCX, circleCY);

      if (!newNode || !store) {
        console.error('No node selected or RDF store is not available.');
        return;
      }
    
      const clickedNode = $rdf.namedNode(newNode.value);
      console.log(clickedNode);
      const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, clickedNode);
      console.log(incomingConnectedClasses);
      let count =0;


      incomingConnectedClasses.forEach(({ target, propertyUri }) => {
        createDiskAndLink(svg, target, propertyUri, 'incoming', target.value,{ x: circleCX, y: circleCY },  store,mainClassRef,nodeId,count,setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal);
        count=count+1;
      });
    } catch (error) {
      console.error('Error expanding relations:', error);
    }
  }
  function expandOutgoingRelations(svg, newNode: $rdf.NamedNode, store: $rdf.Store) {
    try {
      console.log('Expanding relation for:', newNode.value);
      const selectedCircle = svg.select(`circle[nodeId="${nodeId}"]`);
      const circleCX = +selectedCircle.attr('cx');
      const circleCY = +selectedCircle.attr('cy');

console.log('圆圈的位置:', circleCX, circleCY);

      if (!newNode || !store) {
        console.error('No node selected or RDF store is not available.');
        return;
      }
    
      const clickedNode = $rdf.namedNode(newNode.value);
      console.log(clickedNode);
      const OutgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
      console.log(OutgoingConnectedClasses);
      let count =0;


      OutgoingConnectedClasses.forEach(({ target, propertyUri }) => {
        createDiskAndLink(svg, target, propertyUri, 'outgoing', target.value,{ x: circleCX, y: circleCY },  store,mainClassRef,nodeId,count,setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal);
        count=count+1;
      });
    } catch (error) {
      console.error('Error expanding relations:', error);
    }
  }


  // Extend subclass
  function expandSubclasses(svg, newNode: $rdf.NamedNode, store: $rdf.Store) {
    try {
        console.log('Expanding relation for:', newNode.value);
        const selectedCircle = svg.select(`circle[nodeId="${nodeId}"]`);
        const circleCX = +selectedCircle.attr('cx');
        const circleCY = +selectedCircle.attr('cy');

        if (!newNode || !store) {
            console.error('No node selected or RDF store is not available.');
            return;
        }
        
        const clickedNode = $rdf.namedNode(newNode.value);
        console.log(clickedNode);
        const SubClasses = rdfHelpers.getSubClasses(store, clickedNode);
        let count = 0;
        SubClasses.forEach(({ subClass }) => {
            if (subClass) { // Add checks for target and target.value
                const lastSlashIndex = subClass.lastIndexOf('/');
                const target = lastSlashIndex !== -1 ? subClass.substring(lastSlashIndex + 1) : subClass;
                const prope ='subClassof';
                createDiskAndLink(svg, target, prope, 'subclass', subClass, { x: circleCX, y: circleCY }, store, mainClassRef, nodeId, count,setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal);
                count = count + 1;
            } else {
                console.warn('Skipping target with null value:', subClass);
            }
        });
    } catch (error) {
        console.error('Error expanding subclasses:', error);
    }
}



  // Delete selected classes
function removeSelectedClass(nodeId: string) {
  // Select circles, text, connectors, and text on connectors to delete
  const selectedCircle = svg.select(`circle[nodeId="${nodeId}"]`);
  const selectedText = svg.select(`text[nodeId="${nodeId}"]`);
  const relatedLinks = svg.selectAll(`.link[nodeId="${nodeId}"], .link[startId="${nodeId}"]`);
  const relatedTexts = svg.selectAll(`.link-text[nodeId="${nodeId}"], .link-text[startId="${nodeId}"]`);
  const Links = svg.selectAll(`.link[startId="${nodeId}"]`);
  Links.each(function() {
    const line = d3.select(this);
    const lineNodeId = line.attr('nodeId');
    removeSelectedClass(lineNodeId);})

  // Remove selected circles, text, connectors, and text on connectors
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

  const newClassUri = `https://schemaForge.net/pattern/${subclassInput.trim().replace(/\s+/g, '-')}`;
  rdfHelpers.createClass(store, newClassUri,classId, setStore); // Assuming this function correctly handles creating the class and setting its superclass
  expandSubclasses(svg,$rdf.namedNode(classId),store);
}
function addNewOutgoingRelation(classId) {
       
  const relationInput = prompt("Enter the relationship between the new subclass and the original class:");
  const relationUri = `https://schemaForge.net/pattern/${relationInput.replace(/\s+/g, '-')}`;
   // Set the tag and comment status (if needed) and then show the modal with the data type
   setOutgoingClassId(classId);
   setOutgoingDetails({ relation:relationUri });
   setShowOutgoingModal(true);
}


function addNewIncomingRelation(classId) {
  const relationInput = prompt("Enter the relationship between the new subclass and the original class:");
  const relationUri = `https://schemaForge.net/pattern/${relationInput.replace(/\s+/g, '-')}`;
   // Set the tag and comment status (if needed) and then show the modal with the data type
   setIncomingClassId(classId);
   setIncomingDetails({ relation:relationUri });
   setShowIncomingModal(true);
}


function addNewAttribute(classId) {
  const attributeLabel = window.prompt("Enter the label of the new attribute:");
  if (!attributeLabel) {
      console.log("Attribute label input is empty.");
      return;
  }
  const attributeComment = window.prompt("Enter the comment for the new attribute:");
  if (!attributeComment) {
      console.log("Attribute comment input is empty.");
      return;
  }

  // Set the tag and comment status (if needed) and then show the modal with the data type
  setCurrentClassId(classId);
  setAttributeDetails({ label: attributeLabel, comment: attributeComment }); 
  setShowDataTypeModal(true);
}


};

export default { createDiskAndLink };