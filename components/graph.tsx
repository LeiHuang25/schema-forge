import * as d3 from 'd3';
import * as $rdf from 'rdflib';
import * as rdfHelpers from '@/components/rdfHelpers';
import { start } from 'repl';
import { has } from 'lodash';

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

    // add the drag event to the circle and the text
    relatedDisk.call(d3.drag().on('drag', dragged));
    labelText.call(d3.drag().on('drag', dragged));


    // define the drag event
    function dragged(event) {
      const newX = event.x;
      const newY = event.y;
      const nodeId = d3.select(this).attr('nodeId');
      const selectedLines = d3.selectAll('.link[nodeId="' + nodeId + '"]');
  
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
       labelText.attr('x', newX-25).attr('y', newY);
  
    });
    
      };

      function updateMainClassRelatedLines(newX, newY, nodeId) {
        // iterate over all the link
        d3.selectAll('.link-text').each(function() {
          const text = d3.select(this);
          const textNodeId = text.attr('nodeId');
          const textStartId = text.attr('startId');
      
        d3.selectAll('.link').each(function() {
            const line = d3.select(this);
            const startId = line.attr('startId');
            const endId = line.attr('nodeId');
    
            // 检查连接线的起点或终点是否与所选圆圈相匹配
            if (startId === nodeId) {
                // 获取连接线的路径属性
                const linkPath = line.attr('d');
    
                // 使用正则表达式提取终点坐标
                const [, targetX, targetY] = linkPath.match(/L([^,]+),([^Z]+)/);
                // 更新连接线的路径
                const updatedLinkPath = `M${newX},${newY} L${targetX},${targetY}`;
                line.attr('d', updatedLinkPath);
    
                // 更新连接线上文字的位置
                if (endId === textNodeId && startId === textStartId) {
                  const midX = (parseInt(newX) + parseInt(targetX)) / 2;
                  const midY = (parseInt(newY) + parseInt(targetY)) / 2;
                  line.attr('d', updatedLinkPath);
                  text.attr('x', midX).attr('y', midY);
              }
            }
            else if (endId === nodeId) {
              // 获取连接线的路径属性
              const linkPath = line.attr('d');
  
              // 使用正则表达式提取终点坐标
              const [, startX, startY] = linkPath.match(/M([^,]+),([^Z]+)/);
              const updatedLinkPath = `M${startX},${startY} L${newX},${newY}`;
              line.attr('d', updatedLinkPath);
  
              // 更新连接线上文字的位置
              if (endId === textNodeId && startId === textStartId) {
                const midX = (parseInt(startX) + parseInt(newX)) / 2;
                const midY = (parseInt(startY) + parseInt(newY)) / 2;
                line.attr('d', updatedLinkPath);
                text.attr('x', midX).attr('y', midY);
            }
          }
        });
    })}
      
      
  // 更新连接线的位置
  function updateLink(startX, startY, endX, endY, line,linkText) {
    const linkPath = `M${startX},${startY} L${endX},${endY}`;
    line.attr('d', linkPath);
    // 更新连接线上文字的位置
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    linkText.attr('x', midX).attr('y', midY);
  }}

  



  // 计算新圆圈的位置
  else{
  const select=svg.select(`circle[nodeId="${classId}"]`)
  console.log(select.attr('cx'),select.attr('cy'))
  
  // 根据极坐标计算圆圈的位置
  const diskX = +select.attr('cx')+150;
  const diskY =+select.attr('cy')+120*count;
  const diskRadius = 50;


  // 创建新的圆圈
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
    // 添加拖拽功能
    .call(d3.drag().on('drag', dragged))
    // 右键点击事件
    .on('contextmenu', (event) => displayContextMenu(event, newNode, store)); // 将 classId 改为 newNode，并传入 store

  // 在圆圈附近添加文本
  const labelText = relatedDisk
    .append('text')
    .attr('class', 'node-label')
    .attr('x', diskX - 25)
    .attr('y', diskY)
    .attr('nodeId', nodeId)
    .text(newNode.value.substring(newNode.value.lastIndexOf('/') + 1))
    .style('font-size', '14px');

  // 设置链接的源点和目标点
  const sourceX = mainClassPosition.x;
  const sourceY = mainClassPosition.y;
  console.log(sourceX)
  const targetX = +relatedDisk.select('circle').attr('cx');
  const targetY = +relatedDisk.select('circle').attr('cy');

  // 计算链接路径的中点坐标
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // 提取路径中最后一个斜杠后的部分作为属性
  const lastSlashIndex = property.lastIndexOf('/');
  const propertyName = lastSlashIndex !== -1 ? property.substring(lastSlashIndex + 1) : property;

  // 创建连接线条
  const link = svg.append('path').attr('class', 'link').style('stroke', '#333333').style('stroke-width', 2).attr('nodeId', nodeId).attr('startId',classId);

  // 创建连接线上的文字
  const text = svg
    .append('text')
    .attr('class', 'link-text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .text(` ${propertyName}`)
    .attr('nodeId', nodeId)
    .attr('startId',classId)
    .style('font-size', '14px');

  // 更新连接线的位置和连接线上文字的位置
  updateLink(sourceX,sourceY);
  

  // 创建箭头元素
  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-outgoing') // 定义箭头的ID
    .attr('viewBox', '-20 -20 40 40') // 定义箭头的视窗
    .attr('refX', 0) // 箭头相对于终点的偏移量
    .attr('refY', 0)
    .attr('orient', 'auto') // 箭头方向自动调整
    .attr('markerWidth', 30) // 箭头的宽度
    .attr('markerHeight', 30) // 箭头的高度
    .append('path')
    .attr('nodeId', nodeId)
    .attr('d', 'M-10,-5L0,0L-10,5') // 箭头的路径，从终点到起点、
    .style('fill', 'blue'); // 设置箭头的颜色
    

  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-incoming') // 定义箭头的ID
    .attr('viewBox', '-20 -20 40 40') // 定义箭头的视窗
    .attr('refX', 0) // 箭头相对于终点的偏移量
    .attr('refY', 0)
    .attr('orient', 'auto') // 箭头方向自动调整
    .attr('markerWidth', 30) // 箭头的宽度
    .attr('markerHeight', 30) // 箭头的高度
    .append('path')
    .attr('nodeId', nodeId)
    .attr('d', 'M10,5L0,0L10,-5') // 定义箭头的路径
    .style('fill', 'red'); // 设置箭头的颜色

  // 根据方向设置箭头

if (direction === 'outgoing') {
  link.attr('marker-end', 'url(#arrowhead-outgoing)');
} else if (direction === 'incoming') {
  link.attr('marker-start', 'url(#arrowhead-incoming)').attr('marker-end', 'url(#arrowhead-outgoing)');
}

  // 拖拽事件处理函数
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

    updateMainClassRelatedLines(newX, newY,nodeId);

    // 更新圆圈的位置
    relatedDisk.select('circle').attr('cx', newX).attr('cy', newY);

    // 更新连接线的位置和连接线上文字的位置
    updateLink(circleX,circleY);

    // 更新相关文本的位置
    labelText.attr('x', newX - 25).attr('y', newY);
    
    
  }
  
  function updateMainClassRelatedLines(newX, newY, nodeId) {
    // 遍历所有连接线
    d3.selectAll('.link-text').each(function() {
      const text = d3.select(this);
      const textNodeId = text.attr('nodeId');
      const textStartId = text.attr('startId');

    
    d3.selectAll('.link').each(function() {
        const line = d3.select(this);
        const startId = line.attr('startId');
        const endId = line.attr('nodeId');

        // 检查连接线的起点或终点是否与所选圆圈相匹配
        if (startId === nodeId || endId === nodeId) {
            // 获取连接线的路径属性
            const linkPath = line.attr('d');

            // 使用正则表达式提取终点坐标
            const [, targetX, targetY] = linkPath.match(/L([^,]+),([^Z]+)/);
            // 更新连接线的路径
            const updatedLinkPath = `M${newX},${newY} L${targetX},${targetY}`;
            line.attr('d', updatedLinkPath);

            // 更新连接线上文字的位置
            if (endId === textNodeId && startId === textStartId) {
              const midX = (parseInt(newX) + parseInt(targetX)) / 2;
              const midY = (parseInt(newY) + parseInt(targetY)) / 2;
              line.attr('d', updatedLinkPath);
              text.attr('x', midX).attr('y', midY);
          }
        }
    });
})}
  



  

  // 更新连接线的位置
  function updateLink(startx,starty) {
    const sourceX = startx;
    const sourceY = starty;
    const targetX = +relatedDisk.select('circle').attr('cx');
    const targetY = +relatedDisk.select('circle').attr('cy');
    const linkPath = `M${sourceX},${sourceY} L${targetX},${targetY}`;
    link.attr('d', linkPath);

    // 更新连接线上文字的位置
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    text.attr('x', midX).attr('y', midY);
    const markerEnd = 'url(#arrowhead-outgoing)';
    link.attr('marker-end', markerEnd);
  }}

  // 右键点击事件处理函数
  function displayContextMenu(event, newNode: $rdf.NamedNode, store: $rdf.Store) {
    event.preventDefault();
    const x = event.clientX;
    const y = event.clientY;
    
    // 创建一个右键菜单
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.backgroundColor = '#f9f9f9';
    contextMenu.style.border = '1px solid #ccc';
    contextMenu.style.padding = '5px';

    // 定义菜单项
    const menuItems = [
      { action: 'expandSubclasses', content: 'Expand/Hide Subclasses' },
      { action: 'expandRelations', content: 'Expand/Hide Relations' },
      { action: 'removeClass', content: 'Remove Class' },
    ];

    // 添加菜单项
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

  // 菜单项点击处理函数
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
        removeSelectedClass(nodeId); // 传入 nodeId
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
    const hiddenNodes = {}; // 用于存储已经隐藏的节点ID
    hideRelatedSubs(classId);

    function hideRelatedSubs(classId) {
        // 获取与当前节点相关的连接线信息
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
            // 如果该节点已经被隐藏，则跳过
            if (hiddenNodes[x]) {
                return;
            }
            const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
            // 隐藏连接线和相关元素
            if (!hasOtherConnections && x !== newNode.value) {
                hideElement(x);
            }
            if (hasOtherConnections && x !== newNode.value) {
              svg.selectAll(`.link[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
              svg.selectAll(`.link-text[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
              }
            // 将当前节点标记为已隐藏
            hiddenNodes[x] = true;
            // 获取与当前节点相关的子节点并递归隐藏它们
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
            // 如果该节点已经被隐藏，则跳过
            if (hiddenNodes[x]) {
                return;
            }
            // 判断是否存在除了与指定节点相关的其他连线
            const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
            // 隐藏连接线和相关元素
            if (!hasOtherConnections && x !== newNode.value) {
                hideElement(x);
            }
            if (hasOtherConnections && x !== newNode.value) {
              console.log(hasOtherConnections)
              svg.selectAll(`.link[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
              svg.selectAll(`.link-text[startId="${newNode.value}"][nodeId="${x}"]`).style('display', 'none');
              }
            // 将当前节点标记为已隐藏
            hiddenNodes[x] = true;
            // 获取与当前节点相关的子节点并递归隐藏它们
            hideRelatedElements(x, newNode);
        }});
    }

    function hasOtherConnectionsExcept(nodeId, newNode) {
        // 获取所有的线元素
        const lines = svg.selectAll('.link').filter(function() {
            return d3.select(this).style('display') !== 'none';
        });

        let otherConnectionsExist = false;

        // 遍历所有线元素
        lines.each(function() {
            const line = d3.select(this);
            const lineNodeId = line.attr('nodeId');
            const lineStartId = line.attr('startId');

            // 判断线的起始节点或者结束节点是否为给定的 nodeId
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
              return true; // 找到了匹配的直线
          }
      }
      return false; // 未找到匹配的直线
  }

    function hideElement(nodeId) {
        // 隐藏连接线
        svg.selectAll(`.link[nodeId="${nodeId}"]`).style('display', 'none');
        // 隐藏连接线上的文字
        svg.selectAll(`.link-text[nodeId="${nodeId}"]`).style('display', 'none');
        // 隐藏圆圈
        svg.selectAll(`circle[nodeId="${nodeId}"]`).style('display', 'none');
        svg.selectAll(`text[nodeId="${nodeId}"]`).style('display', 'none');
    }
}

function ExpandHavingSubs(classId) {
  const expandedNodes = {}; // 用于存储已经展开的节点ID
  expandRelatedSubs(classId);
  
  function expandRelatedSubs(nodeId) {
      // 获取与当前节点相关的连接线信息
      const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
      
      connectedClasses.forEach(({ target }) => {
        if (!target) {
          return;
      }
          const connectedNodeId = target.value; 
          // 如果该节点已经展开，则跳过
          if (expandedNodes[connectedNodeId]) {
              return;
          }
          // 展开连接线
          svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // 展开连接线上的文字
          svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // 展开圆圈
          svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
          svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // 将当前节点标记为已展开
          expandedNodes[connectedNodeId] = true;
          // 获取与当前节点相关的子节点并递归展开它们
          expandRelatedSubs(connectedNodeId);
          expandRelatedElements(connectedNodeId);
      });
  }
  
  function expandRelatedElements(nodeId) {
      // 获取与当前节点相关的连接线信息
      const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
      
      connectedClasses.forEach(({ target }) => {
        if (!target) {
          return;
      }
          const connectedNodeId = target.value; // 修改变量名为 connectedNodeId
          // 如果该节点已经展开，则跳过
          if (expandedNodes[connectedNodeId]) {
              return;
          }
          // 展开连接线
          svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // 展开连接线上的文字
          svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // 展开圆圈
          svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
          svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // 将当前节点标记为已展开
          expandedNodes[connectedNodeId] = true;
          // 获取与当前节点相关的子节点并递归展开它们
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
  const hiddenNodes = {}; // 用于存储已经隐藏的节点ID
  hideRelatedElements(classId);

  function hideRelatedElements(classId) {
      // 获取与当前节点相关的连接线信息
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
              // 如果该节点已经被隐藏，则跳过
              if (hiddenNodes[x]) {
                  return;
              }
              const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
              // 隐藏连接线和相关元素
              if (!hasOtherConnections && x !== newNode.value) {
                  hideElement(x);
              }
              if (hasOtherConnections && x !== newNode.value) {
                svg.selectAll(`.link[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
                svg.selectAll(`.link-text[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
                }
              hiddenNodes[x] = true;
              // 获取与当前节点相关的子节点并递归隐藏它们
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
              // 如果该节点已经被隐藏，则跳过
              if (hiddenNodes[x]) {
                  return;
              }
              const hasOtherConnections = hasOtherConnectionsExcept(x, newNode);
              // 隐藏连接线和相关元素
              if (!hasOtherConnections && x !== newNode.value) {
                console.log(x)
                  hideElement(x);
              }
              if (hasOtherConnections && x !== newNode.value) {
              svg.selectAll(`.link[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
              svg.selectAll(`.link-text[nodeId="${x}"][startId="${newNode.value}"]`).style('display', 'none');
              }
              hiddenNodes[x] = true;
              // 获取与当前节点相关的子节点并递归隐藏它们
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
            return true; // 找到了匹配的直线
        }
    }
    return false; // 未找到匹配的直线
}

  function hasOtherConnectionsExcept(nodeId, newNode) {
      // 获取所有的线元素
      const lines = svg.selectAll('.link').filter(function() {
          return d3.select(this).style('display') !== 'none';
      });

      let otherConnectionsExist = false;

      // 遍历所有线元素
      lines.each(function() {
          const line = d3.select(this);
          const lineNodeId = line.attr('nodeId');
          const lineStartId = line.attr('startId');

          // 判断线的起始节点或者结束节点是否为给定的 nodeId
          if ((lineNodeId === nodeId || lineStartId === nodeId) && 
              lineNodeId !== newNode.value && lineStartId !== newNode.value) {
              otherConnectionsExist = true;
          }
      });

      return otherConnectionsExist;
  }

  function hideElement(nodeId) {
      // 隐藏连接线
      svg.selectAll(`.link[nodeId="${nodeId}"]`).style('display', 'none');
      // 隐藏连接线上的文字
      svg.selectAll(`.link-text[nodeId="${nodeId}"]`).style('display', 'none');
      // 隐藏圆圈
      svg.selectAll(`circle[nodeId="${nodeId}"]`).style('display', 'none');
      svg.selectAll(`text[nodeId="${nodeId}"]`).style('display', 'none');
  }
}



function ExpandHavingRelations(classId) {
  const expandedNodes = {}; // 用于存储已经展开的节点ID
  expandRelatedElements(classId);
  function expandRelatedElements(nodeId) {
      // 获取与当前节点相关的连接线信息
      const connectedClasses = rdfHelpers.getIncomingConnectedClasses(store, $rdf.namedNode(nodeId));
      connectedClasses.forEach(({ target }) => {
        if (!target) {
          return;
      }
          const connectedNodeId = target.value;
          // 如果该节点已经展开，则跳过
          if (expandedNodes[connectedNodeId]) {
              return;
          }
          // 展开连接线
          svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // 展开连接线上的文字
          svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
          // 展开圆圈
          svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
          svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
              // 将当前节点标记为已展开
          expandedNodes[connectedNodeId] = true;
          // 获取与当前节点相关的子节点并递归展开它们
          expandRelatedElements(connectedNodeId);
          expandRelatedSubs(connectedNodeId);
      });
  }
  function expandRelatedSubs(nodeId) {
    // 获取与当前节点相关的连接线信息
    const connectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, $rdf.namedNode(nodeId));
    connectedClasses.forEach(({ target }) => {
      if (!target) {
        return;
    }
        const connectedNodeId = target.value;
        // 如果该节点已经展开，则跳过
        if (expandedNodes[connectedNodeId]) {
            return;
        }
        // 展开连接线
        svg.selectAll(`.link[nodeId="${connectedNodeId}"]`).style('display', 'block');
        // 展开连接线上的文字
        svg.selectAll(`.link-text[nodeId="${connectedNodeId}"]`).style('display', 'block');
        // 展开圆圈
        svg.selectAll(`circle[nodeId="${connectedNodeId}"]`).style('display', 'block');
        svg.selectAll(`text[nodeId="${connectedNodeId}"]`).style('display', 'block');
            // 将当前节点标记为已展开
        expandedNodes[connectedNodeId] = true;
        // 获取与当前节点相关的子节点并递归展开它们
        expandRelatedElements(connectedNodeId);
    });
}
}

  // 扩展关系
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
        createDiskAndLink(svg, target, propertyUri, 'incoming', target.value,{ x: circleCX, y: circleCY },  store,mainClassRef,nodeId,count);
        count=count+1;
      });
    } catch (error) {
      console.error('Error expanding relations:', error);
    }
  }

  // 扩展子类
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
      let count=0;
      outgoingConnectedClasses.forEach(({ target, propertyUri }) => {
        console.log(target, propertyUri);
        const mainClassPosition = mainClassRef.current.getBoundingClientRect();
        createDiskAndLink(svg, target, propertyUri, 'outgoing', target.value,{ x: circleCX, y: circleCY},  store,mainClassRef,nodeId,count);
        count=count+1;
 
      });
    } catch (error) {
      console.error('Error expanding subclasses:', error);
    }
  }

  // 删除选定的类
  // 删除选定的类
function removeSelectedClass(nodeId: string) {
  // 选择要删除的圆圈、文本、连接线和连接线上的文字
  const selectedCircle = svg.select(`circle[nodeId="${nodeId}"]`);
  const selectedText = svg.select(`text[nodeId="${nodeId}"]`);
  const relatedLinks = svg.selectAll(`.link[nodeId="${nodeId}"], .link[startId="${nodeId}"]`);
  const relatedTexts = svg.selectAll(`.link-text[nodeId="${nodeId}"], .link-text[startId="${nodeId}"]`);
  const Links = svg.selectAll(`.link[startId="${nodeId}"]`);
  Links.each(function() {
    const line = d3.select(this);
    const lineNodeId = line.attr('nodeId');
    removeSelectedClass(lineNodeId);})

  // 移除选定的圆圈、文本、连接线和连接线上的文字
  selectedCircle.remove();
  selectedText.remove();
  relatedLinks.remove();
  relatedTexts.remove();

}

};

export default { createDiskAndLink };