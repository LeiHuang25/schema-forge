import * as d3 from 'd3';
import * as $rdf from 'rdflib';
import * as rdfHelpers from '@/components/rdfHelpers';
import { start } from 'repl';
import { has } from 'lodash';
import { Lancelot } from 'next/font/google';
import { comment } from 'postcss';
import { startTransition } from 'react';

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
  setShowIncomingModal:React.Dispatch<React.SetStateAction<boolean>>,
  setResetBottomPanel:React.Dispatch<React.SetStateAction<any>>

  
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
        .attr('d', `M${sourceX},${sourceY} L${targetX},${targetY}`);
        // calculate the middle point of the link
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    if (direction === 'outgoing') {
      link .attr('nodeId', nodeId)
      .attr('startId', classId);
  } else if (direction === 'incoming') {
      link   .attr('nodeId', classId)
      .attr('startId', nodeId);
  } else if (direction ==='subclass') {
    link   .attr('nodeId', classId)
    .attr('startId', nodeId);
  }
  console.log(`Attributes set: nodeId=${link.attr('nodeId')}, startId=${link.attr('startId')}`);

// create the text of the link
    const text = svg.append('text')
      .attr('class', 'link-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text(` ${propertyName}`)
      .attr('data-name', `${propertyName}`) 
      .style('font-size', '14px')
      .attr('x', midX)
      .attr('y', midY);
      updateLink(sourceX, sourceY, targetX, targetY, link,text);
      if (direction === 'outgoing') {
        text .attr('nodeId', nodeId)
        .attr('startId', classId);
    } else if (direction === 'incoming') {
        text   .attr('nodeId', classId)
        .attr('startId', nodeId);
    } else if (direction ==='subclass') {
      text   .attr('nodeId', classId)
      .attr('startId', nodeId);
    }

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
    .style('fill', 'blue'); // Set arrow color

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

    d3.selectAll('text.link-text').on('click', function(event) {
      event.stopPropagation();  // 阻止事件冒泡
      const clickedText = d3.select(this);
      const startId = clickedText.attr('startId');
      const nodeId = clickedText.attr('nodeId');
    
      // 寻找所有与当前点击的 text 元素 startId 或 nodeId 相匹配的重叠 text 元素
      const relatedElements = d3.selectAll('text.link-text, path.link').filter(function() {
        const element = d3.select(this);
        return ((element.attr('startId') === startId && element.attr('nodeId') === nodeId) ||
                (element.attr('startId') === nodeId && element.attr('nodeId') === startId)) &&
                element !== clickedText.node(); // 排除当前点击的文本
      });
    
      // 隐藏其他相关元素
      relatedElements.each(function() {
        const element = d3.select(this);
        if (element.node().tagName === 'text') {
          element.style('visibility', 'hidden'); // 隐藏相关文本
        } else if (element.node().tagName === 'path') {
          element.style('visibility', 'hidden'); // 隐藏相关直线
        }
      });
    
      // 显示当前点击的文本
      clickedText.style('visibility', 'visible');
    
      // 创建选择列表
      const menu = d3.select('body').append('div')
          .attr('class', 'custom-context-menu')
          .style('position', 'absolute')
          .style('left', `${event.pageX}px`)
          .style('top', `${event.pageY}px`)
          .style('background', 'white')
          .style('padding', '10px')
          .style('border-radius', '5px')
          .style('box-shadow', '0 2px 5px rgba(0,0,0,0.2)');
    
      // 添加文本选项
      const relatedTexts = relatedElements.filter(function() {
        return d3.select(this).node().tagName === 'text';
      });
      relatedTexts.each(function() {
        const text = d3.select(this);
        const newText = text.text();
        menu.append('div')
            .text(newText)
            .style('cursor', 'pointer')
            .on('click', function() {
              clickedText.style('visibility', 'hidden'); // 隐藏当前文本
              var startId = text.attr('startId');
              var nodeId =text.attr('nodeId');
              var relatedLine = d3.select('path.link[startId="' + startId + '"][nodeId="' + nodeId + '"]');
              text.style('visibility', 'visible'); // 显示被选中的文本
              relatedLine.style('visibility', 'visible');
              menu.remove(); // 关闭菜单
            });
      });
    
      // 点击其他位置关闭菜单
      d3.select('body').on('click.menu', function() {
        menu.remove();
        d3.select('body').on('click.menu', null); // 移除此事件监听
      });
    });
    
    

// 假设你已经创建了路径元素并且它们包含了正确的属性
d3.selectAll('path.link').each(function() {
  var currentPath = d3.select(this);
  var startId = currentPath.attr('startId');
  var nodeId = currentPath.attr('nodeId');


  // 寻找反向路径
  var reversePath = d3.selectAll('path.link:not([style="visibility: hidden;"])').filter(function() {
    var otherPath = d3.select(this);
    return otherPath.attr('startId') === nodeId && otherPath.attr('nodeId') === startId;
});

  if (reversePath.size() > 0) {
    // 存在双向关系
    // 判断并处理箭头
    if (currentPath.attr('marker-end') && reversePath.attr('marker-start')) {
      reversePath.style('visibility', 'hidden'); // 隐藏反向箭头的路径

      // 获取反向路径的 startId 和 nodeId
      var reverseStartId = reversePath.attr('startId');
      var reverseNodeId = reversePath.attr('nodeId');
  
      // 隐藏与当前路径和反向路径相对应的文本
      d3.selectAll('text.link-text').filter(function() {
          var text = d3.select(this);
          return  (text.attr('nodeId') === reverseNodeId && text.attr('startId') === reverseStartId);
      }).style('visibility', 'hidden');
  }
  
    
  }
});


  

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
      const nodeId = d3.select(this).attr('nodeId');  // This node is being dragged
  
      // Update the dragged circle's position
      d3.select(`circle[nodeId="${nodeId}"]`).attr('cx', newX).attr('cy', newY);
      d3.select(`text[nodeId="${nodeId}"]`).attr('x', newX).attr('y', newY);
      
      // Update all related elements' positions
      svg.selectAll('.link').each(function() {
          const line = d3.select(this);
          const startId = line.attr('startId');
          const endId = line.attr('nodeId');
  
          // This will determine the correct end to update based on the direction of the link
          if (startId === nodeId || endId === nodeId) {
              const otherNodeId = startId === nodeId ? endId : startId;
              const otherCircle = d3.select(`circle[nodeId="${otherNodeId}"]`);
              const otherCircleX = +otherCircle.attr('cx');
              const otherCircleY = +otherCircle.attr('cy');
              const markerStart = line.attr('marker-start');
              const markerEnd = line.attr('marker-end');
  
              if (markerEnd) {
                if (startId === nodeId) {
                  line.attr('d', `M${newX},${newY} L${otherCircleX},${otherCircleY}`);
                } else {
                  line.attr('d', `M${otherCircleX},${otherCircleY} L${newX},${newY}`);
                }
              } else if (markerStart) {
                if (startId === nodeId) {
                  line.attr('d', `M${otherCircleX},${otherCircleY} L${newX},${newY}`);
                } else {
                  line.attr('d', `M${newX},${newY} L${otherCircleX},${otherCircleY}`);
                }
              }
  
              const distance = Math.sqrt((newX - otherCircleX) ** 2 + (newY - otherCircleY) ** 2);
              line.style('opacity', distance < 100 ? 0 : 1);
          }
      });
  
      svg.selectAll('.link-text').each(function() {
          const text = d3.select(this);
          const startId = text.attr('startId');
          const endId = text.attr('nodeId');
  
          if (startId === nodeId || endId === nodeId) {
              const otherNodeId = startId === nodeId ? endId : startId;
              const otherCircle = d3.select(`circle[nodeId="${otherNodeId}"]`);
              const otherCircleX = +otherCircle.attr('cx');
              const otherCircleY = +otherCircle.attr('cy');
  
              const midX = (newX + otherCircleX) / 2;
              const midY = (newY + otherCircleY) / 2;
              text.attr('x', midX).attr('y', midY);
  
              const distance = Math.sqrt((newX - otherCircleX) ** 2 + (newY - otherCircleY) ** 2);
              text.style('opacity', distance < 100 ? 0 : 1);
          }
      });
  
      // Call updateMainClassRelatedLines to handle specific additional updates
      updateMainClassRelatedLines(newX, newY, nodeId);
  }
  
  
  function updateMainClassRelatedLines(newX, newY, nodeId) {
    d3.selectAll('.link').each(function() {
        const line = d3.select(this);
        const startId = line.attr('startId');
        const endId = line.attr('nodeId');
        const markerStart = line.attr('marker-start');
        const markerEnd = line.attr('marker-end');

        let sourceX, sourceY, targetX, targetY;

        if (startId === nodeId) {
            // if the circle dragging is the start of the line
            const otherCircle = d3.select(`circle[nodeId="${endId}"]`);
            sourceX = newX;
            sourceY = newY;
            targetX = +otherCircle.attr('cx');
            targetY = +otherCircle.attr('cy');
        } else if (endId === nodeId) {
            // if the circle dragging is the end of the line
            const otherCircle = d3.select(`circle[nodeId="${startId}"]`);
            sourceX = +otherCircle.attr('cx');
            sourceY = +otherCircle.attr('cy');
            targetX = newX;
            targetY = newY;
        } else {
            // neither start or end,then dont update
            return;
        }

        // update the line
        const intersection = calculateDecalage(sourceX, sourceY, targetX, targetY, 50);
        if(markerEnd){
        line.attr('d', `M${sourceX+intersection[0]},${sourceY+intersection[1]} L${targetX-intersection[0]},${targetY-intersection[1]}`)}
        else if(markerStart){
          line.attr('d', `M${targetX-intersection[0]},${targetY-intersection[1]} L${sourceX+intersection[0]},${sourceY+intersection[1]}`)
        }

        //update the text of the line
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
        const anySelected = svg.selectAll('circle.class-circle.selected').size() > 0;

                    if (!anySelected) {
                        setResetBottomPanel(false);
                    }
                    else{ setResetBottomPanel(true);}
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
      
     
      const superlist = superclass.map(superclass => superclass.superClass);
      const supername = superlist.length > 0 ? superlist.map(item => item.substring(item.lastIndexOf('/') + 1)) : ["None"];

      const sublist = subclass.map(subclass => subclass.subClass);
      const subname = sublist.length > 0 ? sublist.map(item => item.substring(item.lastIndexOf('/') + 1)) : ["None"];

     
      const DirectOutgoing = Outgoing.map(item => {
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
      const DirectIncoming = Incoming.map(item => {
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

      const InferredO = InferredOutgoing.map(item => {
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
      const InferredI= InferredIncoming.map(item => {
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
    .attr('d', `M${sourceX},${sourceY} L${targetX},${targetY}`);
    if (direction === 'outgoing') {
      link .attr('nodeId', nodeId)
      .attr('startId', classId);
  } else if (direction === 'incoming') {
      link   .attr('nodeId', classId)
      .attr('startId', nodeId);
  } else if (direction ==='subclass') {
    link   .attr('nodeId', classId)
    .attr('startId', nodeId);
  }

  // Create text that connects lines
  const text = svg
    .append('text')
    .attr('class', 'link-text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .text(` ${propertyName}`)
    .style('font-size', '14px')
    .attr('x', midX)
    .attr('y', midY)
    .style('opacity', 1);
    if (direction === 'outgoing') {
      text .attr('nodeId', nodeId)
      .attr('startId', classId);
  } else if (direction === 'incoming') {
      text   .attr('nodeId', classId)
      .attr('startId', nodeId);
  } else if (direction ==='subclass') {
    text   .attr('nodeId', classId)
    .attr('startId', nodeId);
  }
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
    .style('fill', 'blue'); // Set arrow color

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

d3.selectAll('line').each(function() {
  var line = d3.select(this);
  var startId = line.attr('startId');
  var nodeId = line.attr('nodeId');  // 替换endId为nodeId

  // 检查是否存在相同起点和终点的直线
  var overlappingLines = d3.selectAll('line').filter(function() {
      return d3.select(this).attr('startId') === nodeId && d3.select(this).attr('nodeId') === startId;
  });

  if (overlappingLines.size() > 1) {  // 检查是否有多于一条直线
      // 标记为有多重关系
      overlappingLines.classed('has-multiple-relations', true);

      overlappingLines.select('text').on('contextmenu', function(event, d) {
          event.preventDefault();
          // 创建并显示关系列表菜单
          var menu = d3.select('body').append('div')
              .attr('class', 'custom-context-menu')
              .style('position', 'absolute')
              .style('left', `${event.pageX}px`)
              .style('top', `${event.pageY}px`)
              .style('background', 'white')
              .style('padding', '10px')
              .style('border-radius', '5px')
              .style('box-shadow', '0 2px 5px rgba(0,0,0,0.2)');

          overlappingLines.each(function() {
              var currentText = d3.select(this).select('text').text();
              menu.append('div')
                  .text(currentText)
                  .on('click', function() {
                      // 更新直线表示为选中的关系
                      d3.select(event.target).text(currentText);
                      // 关闭菜单
                      menu.remove();
                  });
          });
      });
  }
});

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
      const nodeId = d3.select(this).attr('nodeId');  // This node is being dragged
  
      // Update the dragged circle's position
      d3.select(`circle[nodeId="${nodeId}"]`).attr('cx', newX).attr('cy', newY);
      d3.select(`text[nodeId="${nodeId}"]`).attr('x', newX).attr('y', newY);
      
      // Update all related elements' positions
      svg.selectAll('.link').each(function() {
          const line = d3.select(this);
          const startId = line.attr('startId');
          const endId = line.attr('nodeId');
  
          // This will determine the correct end to update based on the direction of the link
          if (startId === nodeId || endId === nodeId) {
              const otherNodeId = startId === nodeId ? endId : startId;
              const otherCircle = d3.select(`circle[nodeId="${otherNodeId}"]`);
              const otherCircleX = +otherCircle.attr('cx');
              const otherCircleY = +otherCircle.attr('cy');
              const markerStart = line.attr('marker-start');
              const markerEnd = line.attr('marker-end');
  
              if (markerEnd) {
                if (startId === nodeId) {
                  line.attr('d', `M${newX},${newY} L${otherCircleX},${otherCircleY}`);
                } else {
                  line.attr('d', `M${otherCircleX},${otherCircleY} L${newX},${newY}`);
                }
              } else if (markerStart) {
                if (startId === nodeId) {
                  line.attr('d', `M${otherCircleX},${otherCircleY} L${newX},${newY}`);
                } else {
                  line.attr('d', `M${newX},${newY} L${otherCircleX},${otherCircleY}`);
                }
              }
  
              const distance = Math.sqrt((newX - otherCircleX) ** 2 + (newY - otherCircleY) ** 2);
              line.style('opacity', distance < 100 ? 0 : 1);
          }
      });
  
      svg.selectAll('.link-text').each(function() {
          const text = d3.select(this);
          const startId = text.attr('startId');
          const endId = text.attr('nodeId');
  
          if (startId === nodeId || endId === nodeId) {
              const otherNodeId = startId === nodeId ? endId : startId;
              const otherCircle = d3.select(`circle[nodeId="${otherNodeId}"]`);
              const otherCircleX = +otherCircle.attr('cx');
              const otherCircleY = +otherCircle.attr('cy');
  
              const midX = (newX + otherCircleX) / 2;
              const midY = (newY + otherCircleY) / 2;
              text.attr('x', midX).attr('y', midY);
  
              const distance = Math.sqrt((newX - otherCircleX) ** 2 + (newY - otherCircleY) ** 2);
              text.style('opacity', distance < 100 ? 0 : 1);
          }
      });
  
      // Call updateMainClassRelatedLines to handle specific additional updates
      updateMainClassRelatedLines(newX, newY, nodeId);
  }
  
  
  function updateMainClassRelatedLines(newX, newY, nodeId) {
    d3.selectAll('.link').each(function() {
        const line = d3.select(this);
        const startId = line.attr('startId');
        const endId = line.attr('nodeId');
        const markerStart = line.attr('marker-start');
        const markerEnd = line.attr('marker-end');

        let sourceX, sourceY, targetX, targetY;

        if (startId === nodeId) {
            // if the circle dragging is the start of the line
            const otherCircle = d3.select(`circle[nodeId="${endId}"]`);
            sourceX = newX;
            sourceY = newY;
            targetX = +otherCircle.attr('cx');
            targetY = +otherCircle.attr('cy');
        } else if (endId === nodeId) {
            // if the circle dragging is the end of the line
            const otherCircle = d3.select(`circle[nodeId="${startId}"]`);
            sourceX = +otherCircle.attr('cx');
            sourceY = +otherCircle.attr('cy');
            targetX = newX;
            targetY = newY;
        } else {
            // neither start or end,then dont update
            return;
        }

        // update the line
        const intersection = calculateDecalage(sourceX, sourceY, targetX, targetY, 50);
        if(markerEnd){
        line.attr('d', `M${sourceX+intersection[0]},${sourceY+intersection[1]} L${targetX-intersection[0]},${targetY-intersection[1]}`)}
        else if(markerStart){
          line.attr('d', `M${targetX-intersection[0]},${targetY-intersection[1]} L${sourceX+intersection[0]},${sourceY+intersection[1]}`)
        }

        //update the text of the line
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
                  hideSubs(nodeId);}
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
            console.log(nodeId);
            console.log(newNode);
            console.log(checkIncomingRelationExists(nodeId));
            console.log(checkIncomingRelationHide(nodeId));
            if (IncomingRelationExists){
              if(checkIncomingRelationHide(nodeId)){
                expandHavingIncomingRelations(nodeId)
              }else{
                console.log("Relation already exists, hiding...");
                hideIncomingRelations(nodeId);
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
              hideOutgoingRelations(nodeId);
            }
          }else{
            console.log("Expanding incoming relations...");
            console.log(newNode)
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
  let subExists = true;

  SubClasses.forEach(({ subClass }) => {
      const nodeId = subClass;
      const textlink = svg.selectAll(`.link-text[nodeId="${classId}"][startId="${nodeId}"]`);
      if (textlink.empty()) {
          subExists = false;
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
function hideSubs(classId) {
  const hiddenNodes = {}; // Used to store hidden node IDs
  hideRelatedSubs(classId);

  function hideRelatedSubs(nodeId) {
      // Get the connection line information related to the current node
      const SubClasses = rdfHelpers.getSubClasses(store, $rdf.namedNode(nodeId));
      SubClasses.forEach(({ subClass }) => {
          if (!subClass) {
              return;
          }

          const connectedNodeId = subClass;
          // If the node is already hidden, skip
          if (hiddenNodes[connectedNodeId]) {
              return;
          }
          if (hasOtherConnectionsExcept(connectedNodeId, nodeId)) {
            // hide the link
            svg.selectAll(`.link[nodeId="${nodeId}"][startId="${connectedNodeId}"]`).style('display', 'none');
            // hide the text on the link
            svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${connectedNodeId}"]`).style('display', 'none');
          }else{
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

  function hasOtherConnectionsExcept(nodeId, excludeNodeId) {
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
          svg.selectAll(`.link[nodeId="${nodeId}"]`).style('display', 'block');
          // Expand the text on the connecting line
          svg.selectAll(`.link-text[nodeId="${nodeId}"]`).style('display', 'block');
          // expand circle
          svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
          svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // Mark current node as expanded
          expandedNodes[connectedNodeId] = true;
      });
  }

}

function checkIncomingRelationExists(classId) {
  const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(classId));
  let relationExists = true;

  incomingConnectedClasses.forEach(({ target }) => {
      const nodeId = target.value;
      const textlink = svg.selectAll(`.link-text[nodeId="${classId}"][startId="${nodeId}"]`);
      if (textlink.empty()) {
          relationExists = false;
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
      console.log(nodeId);
      const textlink = svg.selectAll(`.link[nodeId="${classId}"][startId="${nodeId}"]`);

      console.log(textlink);
      textlink.each(function() {
          const text = d3.select(this);
          console.log(text);
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

function hideIncomingRelations(classId) {
  const hiddenNodes = {}; // Used to store hidden node IDs
  hideRelatedIncoming(classId);

  function hideRelatedIncoming(nodeId) {
      // Get the connection line information related to the current node
      const IncomingClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
      console.log(IncomingClasses)
      IncomingClasses.forEach(({ target }) => {
          if (!target) {
              return;
          }

          const connectedNodeId = target.value;

          // If the node is already hidden, skip
          if (hiddenNodes[connectedNodeId]) {
              return;
          }

          if (hasOtherConnectionsExcept(connectedNodeId, nodeId)) {
            // hide the link
            svg.selectAll(`.link[nodeId="${nodeId}"][startId="${connectedNodeId}"]`).style('display', 'none');
            // hide the text on the link
            svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${connectedNodeId}"]`).style('display', 'none');
          }else {
            // hide the link
            svg.selectAll(`.link[nodeId="${nodeId}"][startId="${connectedNodeId}"]`).style('display', 'none');
            // hide the text on the link
            svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${connectedNodeId}"]`).style('display', 'none');
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

  function hasOtherConnectionsExcept(nodeId, excludeNodeId) {
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
function checkOutgoingRelationExists(classId) {
  const OutgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
  let relationExists = true;

  OutgoingConnectedClasses.forEach(({ target }) => {
    if(!target){return ;}
      const nodeId = target.value;
      const textlink = svg.selectAll(`.link-text[nodeId="${nodeId}"][startId="${classId}"]`);
      if (textlink.empty()) {
          relationExists = false;
          return; // Terminate the loop
      }
  });

  return relationExists;
}
function checkOutgoingRelationHide(classId) {
  const OutgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(classId));
  let relationHide = false;

  OutgoingConnectedClasses.forEach(({ target }) => {
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

function hideOutgoingRelations(classId) {
  const hiddenNodes = {}; // Used to store hidden node IDs
  hideRelatedOutgoing(classId);

  function hideRelatedOutgoing(nodeId) {
      // Get the connection line information related to the current node
      const OutgoingClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
      OutgoingClasses.forEach(({ target }) => {
          if (!target) {
              return;
          }

          const connectedNodeId = target.value;

          // If the node is already hidden, skip
          if (hiddenNodes[connectedNodeId]) {
              return;
          }

          if (hasOtherConnectionsExcept(connectedNodeId, nodeId)) {
            // hide the link
            svg.selectAll(`.link[startId="${nodeId}"][nodeId="${connectedNodeId}"]`).style('display', 'none');
            // hide the text on the link
            svg.selectAll(`.link-text[startId="${nodeId}"][nodeId="${connectedNodeId}"]`).style('display', 'none');
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
      });
  }

  function hasOtherConnectionsExcept(nodeId, excludeNodeId) {
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



  // extended relationship
  function expandIncomingRelations(svg, newNode: $rdf.NamedNode, store: $rdf.Store) {
    try {
      console.log('Expanding relation for:', newNode.value);
      const selectedCircle = svg.select(`circle[nodeId="${newNode.value}"]`);
      const circleCX = +selectedCircle.attr('cx');
      const circleCY = +selectedCircle.attr('cy');

console.log('圆圈的位置:', circleCX, circleCY);

      if (!newNode.value || !store) {
        console.error('No node selected or RDF store is not available.');
        return;
      }
    
      const clickedNode = $rdf.namedNode(newNode.value);
      console.log(clickedNode);
      const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, clickedNode);
      console.log(incomingConnectedClasses);
      let count =0;


      incomingConnectedClasses.forEach(({ target, propertyUri }) => {
        createDiskAndLink(svg, target, propertyUri, 'incoming', target.value,{ x: circleCX, y: circleCY },  store,mainClassRef,nodeId,count,setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal,setResetBottomPanel);
        count=count+1;
      });
    } catch (error) {
      console.error('Error expanding relations:', error);
    }
  }
  function expandOutgoingRelations(svg, newNode: $rdf.NamedNode, store: $rdf.Store) {
    try {
      console.log('Expanding relation for:', newNode.value);
      const selectedCircle = svg.select(`circle[nodeId="${newNode.value}"]`);
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
        createDiskAndLink(svg, target, propertyUri, 'outgoing', target.value,{ x: circleCX, y: circleCY },  store,mainClassRef,nodeId,count,setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal,setResetBottomPanel);
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
        const selectedCircle = svg.select(`circle[nodeId="${newNode.value}"]`);
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
                createDiskAndLink(svg,  $rdf.namedNode(subClass), prope, 'subclass', subClass, { x: circleCX, y: circleCY }, store, mainClassRef, nodeId, count,setStore,setSelectedClassDetails,setAttributeDetails,setShowDataTypeModal,setCurrentClassId,setOutgoingClassId,setOutgoingDetails,setShowOutgoingModal,setIncomingClassId,setIncomingDetails,setShowIncomingModal,setResetBottomPanel);
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
  rdfHelpers.createClass(store, newClassUri,classId, setStore); // 假设这个函数正确处理创建类和设置其超类
  expandSubclasses(svg,$rdf.namedNode(classId),store);
}
function addNewOutgoingRelation(classId) {
       
  const relationInput = prompt("Enter the relationship between the new subclass and the original class:");
  const relationUri = `https://schemaForge.net/pattern/${relationInput.replace(/\s+/g, '-')}`;
   setOutgoingClassId(classId);
   setOutgoingDetails({ relation:relationUri });
   setShowOutgoingModal(true);
}


function addNewIncomingRelation(classId) {
  const relationInput = prompt("Enter the relationship between the new subclass and the original class:");
  const relationUri = `https://schemaForge.net/pattern/${relationInput.replace(/\s+/g, '-')}`;
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

  setCurrentClassId(classId);
  setAttributeDetails({ label: attributeLabel, comment: attributeComment }); 
  setShowDataTypeModal(true);
}


};

export default { createDiskAndLink };