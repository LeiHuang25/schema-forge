import * as d3 from 'd3';
import * as $rdf from 'rdflib';
import * as rdfHelpers from '@/components/rdfHelpers';
import { start } from 'repl';
import { has } from 'lodash';
import { Lancelot } from 'next/font/google';

// define the type of direction
type Direction = 'incoming' | 'outgoing';


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
  setSelectedClassDetails: (classDetails: any) => void
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
        link = svg.append('path').attr('marker-start', 'url(#arrowhead-incoming)').attr('marker-end', 'url(#arrowhead-outgoing)');
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
       labelText.attr('x', newX).attr('y', newY);
  
    });
    
      };

  function updateMainClassRelatedLines(newX, newY, nodeId) {
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
          // Returns class details such as name, properties, relationships, etc.
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
  const labelText = relatedDisk
    .append('text')
    .attr('class', 'node-label')
    .attr('x', diskX)
    .attr('y', diskY)
    .attr('nodeId', nodeId)
    .text(label)
    .style('font-size', '14px')
    .style("text-anchor", "middle")
    .style("alignment-baseline", "middle");

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

  // Set arrows based on direction

if (direction === 'outgoing') {
  link.attr('marker-end', 'url(#arrowhead-outgoing)');
} else if (direction === 'incoming') {
  link.attr('marker-start', 'url(#arrowhead-incoming)').attr('marker-end', 'url(#arrowhead-outgoing)');
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
    labelText.attr('x', newX).attr('y', newY);
    
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
    const markerEnd = 'url(#arrowhead-outgoing)';
    link.attr('marker-end', markerEnd);
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
      { action: 'expandRelations', content: 'Expand/Hide Relations' },
      { action: 'removeClass', content: 'Remove Class' },
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
    document.addEventListener('click', closeContextMenu);

    function closeContextMenu(event) {
      if (!contextMenu.contains(event.target)) {
        contextMenu.remove();
        document.removeEventListener('click', closeContextMenu);
      }
    }
  }

  // Menu item click handler function
  function handleMenuItemClick(action, newNode: $rdf.NamedNode, store: $rdf.Store) {
    try {
      console.log('Menu item clicked:', action);
      if (action === 'expandSubclasses') {
        if (store) {
          console.log(nodeId)
          const SubExists = checkSubExists(nodeId,svg,store);
          console.log(checkRelationHide(nodeId))
                    if (SubExists) {
                        if(checkSubHide(nodeId)){
                            ExpandHavingSubs(nodeId)
                        }
                        else{
                        console.log("sub already exists, hiding...");
                        hideSubs(nodeId,newNode);}
                    }

          else{console.log('Expanding subclasses...');
          expandSubclasses(svg, newNode, store);
          console.log('Subclasses expanded successfully.');}
        } else {
          console.error('RDF store is not available.');
        }
      } else if (action === 'expandRelations') {
        if (store) {
          const relationExists = checkRelationExists(nodeId);
          console.log(checkRelationHide(nodeId))
          if (relationExists) {
              if(checkRelationHide(nodeId)){
                  ExpandHavingRelations(nodeId)
              }
              else{
              console.log("Relation already exists, hiding...");
              hideRelations(nodeId,newNode);}
          }
          else {
          console.log('Expanding relations...');
          expandRelations(svg, newNode, store);
          console.log('Relations expanded successfully.');}
        } else {
          console.error('RDF store is not available.');
        }
      } else if (action === 'removeClass') {
        removeSelectedClass(nodeId); // Pass in nodeId
      }
    } catch (error) {
      console.error('Error handling menu item click:', error);
    }
  }
  function checkSubExists(classId) {
    const OutgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
    let count = 0;

    OutgoingConnectedClasses.forEach(({ target }) => {
        const x = target.value;
        const textlink = svg.selectAll(`.link-text[nodeId="${x}"][startId="${classId}"]`);
        if (!textlink.empty()) {
            count++;
        }
    });

    return count === OutgoingConnectedClasses.length;
}

function checkSubHide(classId) {
    const clickedNode = $rdf.namedNode(classId);
    const outgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
    let count = 0;

    outgoingConnectedClasses.forEach(({ target }) => {
        const x = target.value;
        const textlink = svg.selectAll(`.link-text[nodeId="${x}"][startId="${classId}"]`);

        textlink.each(function() {
            const text = d3.select(this);
            if (text.style('display') === 'none') {
              count++;
            }
        });
    });

    return count === outgoingConnectedClasses.length;
}

function hideSubs(classId, newNode) {
    const hiddenNodes = {}; // Used to store hidden node IDs
    hideRelatedSubs(classId);

    function hideRelatedSubs(classId) {
        // Get the connection line information related to the current node
        const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
        connectedClasses.forEach(({ target }) => {
            if (!target) {
                return;
            }
            if (!isLineMatch(target.value, classId)){
              return;
            }
            const x = target.value;
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
            hideRelatedElements(x,newNode);
        }});
    }

    function hideRelatedElements(classId, newNode) {
        const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
        connectedClasses.forEach(({ target }) => {
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
            hideRelatedElements(x, newNode);
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

function ExpandHavingSubs(classId) {
  const expandedNodes = {}; // Used to store expanded node IDs
  expandRelatedSubs(classId);
  
  function expandRelatedSubs(nodeId) {
      // Get the connection line information related to the current node
      const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
      
      connectedClasses.forEach(({ target }) => {
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
          expandRelatedSubs(connectedNodeId);
          expandRelatedElements(connectedNodeId);
      });
  }
  
  function expandRelatedElements(nodeId) {
      // Get the connection line information related to the current node
      const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
      
      connectedClasses.forEach(({ target }) => {
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
          expandRelatedElements(connectedNodeId);
      });
  }
}



function checkRelationExists(classId) {
    const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
    let count = 0;

    incomingConnectedClasses.forEach(({ target }) => {
        const x = target.value;
        const textlink = svg.selectAll(`.link-text[nodeId="${x}"][startId="${classId}"]`);
        if (!textlink.empty()) {
            count++;
        }
    });

    return count === incomingConnectedClasses.length;
}
function checkRelationHide(classId) {
  const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
  let allHidden = true;
  console.log(incomingConnectedClasses)

  incomingConnectedClasses.forEach(({ target }) => {
      const x = target.value;
      const textlink = svg.selectAll(`.link[nodeId="${x}"][startId="${classId}"]`);
      textlink.each(function() {
          const text = d3.select(this);
          if (text.style('display') !== 'none') {
              allHidden = false;
              return; // Terminate the loop if any relation is not hidden
          }
      });
  });

  return allHidden;
}


function hideRelations(classId, newNode) {
  const hiddenNodes = {}; // Used to store hidden node IDs
  hideRelatedElements(classId);

  function hideRelatedElements(classId) {
      // Get the connection line information related to the current node
      const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
      connectedClasses.forEach(({ target }) => {
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
              hideRelatedElements(x);
              hideRelatedSubs(x, newNode);
          }
      });
  }

  function hideRelatedSubs(classId, newNode) {
      const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
      connectedClasses.forEach(({ target }) => {
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



function ExpandHavingRelations(classId) {
  const expandedNodes = {}; // Used to store expanded node IDs
  expandRelatedElements(classId);
  function expandRelatedElements(nodeId) {
      // Get the connection line information related to the current node
      const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
      connectedClasses.forEach(({ target }) => {
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
          expandRelatedElements(connectedNodeId);
          expandRelatedSubs(connectedNodeId);
      });
  }
  function expandRelatedSubs(nodeId) {
    // Get the connection line information related to the current node
    const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
    connectedClasses.forEach(({ target }) => {
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
        expandRelatedElements(connectedNodeId);
    });
}
}

  // extended relationship
  function expandRelations(svg, newNode: $rdf.NamedNode, store: $rdf.Store) {
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
        const mainClassPosition = mainClassRef.current.getBoundingClientRect();
        createDiskAndLink(svg, target, propertyUri, 'incoming', target.value,{ x: circleCX, y: circleCY },  store,mainClassRef,nodeId,count,setSelectedClassDetails);
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
        const outgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
        console.log(outgoingConnectedClasses);
        let count = 0;
        outgoingConnectedClasses.forEach(({ target, propertyUri }) => {
            if (target && target.value) { // Add checks for target and target.value
                console.log(target, propertyUri);
                const mainClassPosition = mainClassRef.current.getBoundingClientRect();
                createDiskAndLink(svg, target, propertyUri, 'outgoing', target.value, { x: circleCX, y: circleCY }, store, mainClassRef, nodeId, count, setSelectedClassDetails);
                count = count + 1;
            } else {
                console.warn('Skipping target with null value:', target);
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

};

export default { createDiskAndLink };