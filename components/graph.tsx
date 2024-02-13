import * as d3 from 'd3';
import * as $rdf from 'rdflib';
import * as rdfHelpers from '@/components/rdfHelpers';

// 定义链接方向
type Direction = 'incoming' | 'outgoing';

// 创建一个全局变量，用于跟踪已创建的圆圈数量
let numDisksCreated = 0;

// 导出创建圆圈和连接的函数
export const createDiskAndLink = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  newNode: $rdf.NamedNode,
  property: string,
  direction: Direction,
  nodeId: string,
  mainClassPosition: { x: number, y: number },
  store: $rdf.Store,
  mainClassRef: React.MutableRefObject<SVGElement | null>
): void => {
  console.log(nodeId);
  console.log(newNode.value);

  // 计算新圆圈的位置
  const center = { x: 200, y: 200 }; // 中心点坐标
  const radius = 150; // 半径
  const angle = (numDisksCreated / 5) * Math.PI; // 角度，这里可以调整分布密度

  // 根据极坐标计算圆圈的位置
  const diskX = center.x + radius * Math.cos(angle);
  const diskY = center.y + radius * Math.sin(angle);

  const diskRadius = 50;
  const diskSpacing = 20; // 可以调整圆圈之间的间距

  // 更新已创建的圆圈数量
  numDisksCreated++;

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
  const link = svg.append('path').attr('class', 'link').style('stroke', '#333333').style('stroke-width', 2).attr('nodeId', nodeId);

  // 创建连接线上的文字
  const text = svg
    .append('text')
    .attr('class', 'link-text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .text(` ${propertyName}`)
    .attr('nodeId', nodeId)
    .style('font-size', '14px');

  // 更新连接线的位置和连接线上文字的位置
  updateLink();

  // 创建箭头元素
  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-outgoing') // 定义箭头的ID
    .attr('viewBox', '-5 -5 10 10') // 定义箭头的视窗
    .attr('refX', 0) // 箭头相对于终点的偏移量
    .attr('refY', 0)
    .attr('orient', 'auto') // 箭头方向自动调整
    .attr('markerWidth', 6) // 箭头的宽度
    .attr('markerHeight', 6) // 箭头的高度
    .append('path')
    .attr('nodeId', nodeId)
    .attr('d', 'M10,-5L0,0L10,5') // 箭头的路径，从终点到起点
    .style('fill', 'blue'); // 设置箭头的颜色

  svg
    .append('defs')
    .append('marker')
    .attr('id', 'arrowhead-incoming') // 定义箭头的ID
    .attr('viewBox', '-5 -5 10 10') // 定义箭头的视窗
    .attr('refX', 0) // 箭头相对于终点的偏移量
    .attr('refY', 0)
    .attr('orient', 'auto') // 箭头方向自动调整
    .attr('markerWidth', 4) // 箭头的宽度
    .attr('markerHeight', 100) // 箭头的高度
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

    // 更新圆圈的位置
    relatedDisk.select('circle').attr('cx', newX).attr('cy', newY);

    // 更新连接线的位置和连接线上文字的位置
    updateLink();

    // 更新相关文本的位置
    labelText.attr('x', newX - 25).attr('y', newY);

    // 更新newNode的位置
    newNode.value = `${newNode.value.substring(0, newNode.value.lastIndexOf('/') + 1)}${newX},${newY}`;
  }

  // 更新连接线的位置
  function updateLink() {
    const sourceX = mainClassPosition.x ;
    const sourceY = mainClassPosition.y;
    const targetX = +relatedDisk.select('circle').attr('cx');
    const targetY = +relatedDisk.select('circle').attr('cy');
    const linkPath = `M${sourceX},${sourceY} L${targetX - 50},${targetY}`;
    link.attr('d', linkPath);

    // 更新连接线上文字的位置
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    text.attr('x', midX).attr('y', midY);
  }

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
          console.log('Expanding subclasses...');
          expandSubclasses(svg, newNode, store);
          console.log('Subclasses expanded successfully.');
        } else {
          console.error('RDF store is not available.');
        }
      } else if (action === 'expandRelations') {
        if (store) {
          console.log('Expanding relations...');
          expandRelations(svg, newNode, store);
          console.log('Relations expanded successfully.');
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


      incomingConnectedClasses.forEach(({ target, propertyUri }) => {
        console.log(target, propertyUri);
        const mainClassPosition = mainClassRef.current.getBoundingClientRect();
        createDiskAndLink(svg, target, propertyUri, 'incoming', target.value,{ x: mainClassPosition.x, y: mainClassPosition.y },  store,mainClassRef);
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

console.log('圆圈的位置:', circleCX, circleCY);
      if (!newNode || !store) {
        console.error('No node selected or RDF store is not available.');
        return;
      }
      const clickedNode = $rdf.namedNode(newNode.value);
      console.log(clickedNode);
      const outgoingConnectedClasses = rdfHelpers.getOutgoingConnectedClasses(store, clickedNode);
      console.log(outgoingConnectedClasses);
      outgoingConnectedClasses.forEach(({ target, propertyUri }) => {
        const mainClassPosition = mainClassRef.current.getBoundingClientRect();
        createDiskAndLink(svg, target, propertyUri, 'outgoing', target.value,{ x: circleCX, y: circleCY},  store,mainClassRef);
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
  const relatedLinks = svg.selectAll(`.link[nodeId="${nodeId}"], .link[nodeId="${nodeId}"]`);
  const relatedTexts = svg.selectAll(`.link-text[nodeId="${nodeId}"], .link-text[nodeId="${nodeId}"]`);

  // 移除选定的圆圈、文本、连接线和连接线上的文字
  selectedCircle.remove();
  selectedText.remove();
  relatedLinks.remove();
  relatedTexts.remove();

  // 如果需要，可以添加过渡效果
  svg.transition().duration(100);
}

};

export default { createDiskAndLink };
