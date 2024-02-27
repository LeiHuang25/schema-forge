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
            .attr('width', '100%')
            .attr('height', '100%');


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
                .attr('nodeId',selectedClass)
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
                updateMainClassRelatedLines(newX, newY,selectedClass);
            }
        }
    }, [selectedClass]);

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
    
            // 使用 Set 来存储已经出现过的 target.value
            const seenValues = new Set();
            seenValues.add(selectedClass)
    
            const clickedNode = $rdf.namedNode(classId);
            console.log(clickedNode);
            const incomingConnectedClasses = rdfHelpers.getIncomingConnectedClasses(store, clickedNode);
            console.log(incomingConnectedClasses);
    
            incomingConnectedClasses.forEach(({ target, propertyUri }) => {
                const selectedCircle = d3.select(`circle[classId="${classId}"]`);
                console.log(selectedCircle);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
                console.log(cxValue, cyValue);
    
                // 检查目标值是否已经存在于 Set 中，如果不存在，则创建连接线
                if (!seenValues.has(target.value)) {
                    seenValues.add(target.value);
                    createDiskAndLink(
                        d3.select(svgRef.current),
                        target,
                        propertyUri,
                        'incoming',
                        target.value,
                        { x: cxValue, y: cyValue },
                        store,
                        mainClassRef,
                        classId,
                        seenValues
                    );
                    // 将目标值添加到 Set 中
                    
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
            
            // 创建一个集合来跟踪已经展开的子类的目标值
            const expandedValues = new Set();
            expandedValues.add(selectedClass);
    
            outgoingConnectedClasses.forEach(({ target, propertyUri }) => {
                const targetValue = target.value;
                
                // 检查目标值是否已经存在于集合中，如果是，则不展开子类
                if (expandedValues.has(targetValue)) {
                    console.log(`Subclass with target value ${targetValue} has already been expanded.`);
                    return; // 跳过当前循环
                }
    
                const selectedCircle = d3.select(`circle[classId="${classId}"]`);
                const cxValue = +selectedCircle.attr('cx');
                const cyValue = +selectedCircle.attr('cy');
                expandedValues.add(targetValue);
    
                createDiskAndLink(
                    d3.select(svgRef.current),
                    target,
                    propertyUri,
                    'outgoing',
                    targetValue,
                    { x: cxValue, y: cyValue },
                    store,
                    mainClassRef,
                    classId,
                    expandedValues

                );
    
                // 将目标值添加到已展开的子类集合中
                
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