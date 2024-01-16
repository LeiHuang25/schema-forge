import * as joint from 'jointjs';
import { dia, ui, shapes } from '@clientio/rappid';
import SchemaPrototype from "@comunica/query-sparql";
import Schema from '@/components/schema';
import { ClassDisk } from '@/components/shapes/ClassDisk';


type Direction = 'incoming' | 'outgoing';

export const createDiskAndLink = (
    graph: joint.dia.Graph,
    newClass: SchemaPrototype,
    property: string,
    direction: Direction,
    cellView: joint.dia.CellView,
    index: number,
    clickedDiskId: any
): void => {

  console.log("Create disk and link for new class:", newClass.$id)
  console.log(property)
  console.log(direction)
  console.log(cellView)
  console.log(index)
  console.log(clickedDiskId)
  const relatedDisk = new ClassDisk({
    position: {
        x: cellView.model.attributes.position.x + 150,
        y: cellView.model.attributes.position.y + (index * 150)
    },
    size: { width: 100, height: 100 },
    attrs: {
      label: {
          text: newClass.name,
          fontSize: 14
      }
    }
  });
  relatedDisk.prop('classData', newClass);
  graph.addCell(relatedDisk);

  let linkAttributes = {
      line: {
        stroke: '#333333',
        strokeWidth: 2,
        targetMarker: direction === 'outgoing' ? { 'type': 'path', 'd': 'M 10 -5 0 0 10 5 z' } : null,
        sourceMarker: direction === 'incoming' ? { 'type': 'path', 'd': 'M 10 -5 0 0 10 5 z' } : null,
      }
  };

  const link = new joint.shapes.standard.Link({
    source: { id: clickedDiskId },
    target: { id: relatedDisk.id },
    attrs: linkAttributes,
    labels: [
      {
        attrs: { text: { text: property } },
        position: {
          distance: 0.5,
          offset: 10
        }
      }
    ]
  });
  graph.addCell(link);
};





