import React, { useEffect, useRef, useContext } from 'react';
import { dia, ui, shapes } from '@clientio/rappid';
import Schema from '@/components/schema';
import SchemaContext from '@/SchemaContext';
import SchemaPrototype from "@comunica/query-sparql";
import { ClassDisk } from '@/components/shapes/ClassDisk';
import { createDiskAndLink } from '@/components/graph';
import { forEach } from 'lodash';

export function displayContextMenu(paper: dia.Paper, clickedDisk: ClassDisk, evt: any, schema: any, expandedClasses: Set<string>) {  
  // Get the bounding box of the clicked disk in the paper coordinate system
  const bbox = clickedDisk.getBBox();
  // Get the paper client rect
  const paperRect = paper.el.getBoundingClientRect();
  // Calculate the position of the context toolbar
  const toolbarPosition = {
      x: paperRect.left + bbox.x + bbox.width,
      y: paperRect.top + bbox.y
  };

  var ct = new ui.ContextToolbar({
    tools: [
      { action: 'expandSubclasses', content: 'Expand/Hide Subclasses' },
      { action: 'expandRelations', content: 'Expand/Hide Relations' },
      { action: 'removeClass', content: 'Remove Class' }
    ],
    target: toolbarPosition,  // Positioning the toolbar based on event coordinates
    position: 'right',  // Adjust as needed to position the toolbar to the right of the clicked ClassDisk
    anchor: 'left',  // Adjust as needed to anchor the toolbar to the left side
    vertical: true  // This should stack the toolbar items vertically
  });

  ct.on('action:expandSubclasses', function() {
    const clickedClass = clickedDisk.prop('classData');
    if (clickedClass && !expandedClasses.has(clickedClass.$id)) {
      expandedClasses.add(clickedClass.$id);
      const clickedDiskId = clickedDisk.id;  // Get id from clickedDisk
      const subclasses = schema?.getSubclassesForClass(clickedClass.$id)
      console.log(subclasses)
      Array.from(subclasses || new Set())?.forEach((subclass, index) => {
        const propertyLabel = "rdfs:subClassOf"
        const newClass = schema?.getClassById(subclass)
        createDiskAndLink(
            paper.model,
            newClass,
            propertyLabel,
            'incoming',
            clickedDisk.findView(paper),
            index,
            clickedDiskId
        );
        schema.lazyLoadData(subclass)
        .then(() => {
            // update loading state
            schema.loadingStates[subclass] = "loaded";
        })
        .catch(error => {
            console.error('Error lazy loading data:', error);
        });
      });
    }
  });

  ct.on('action:expandRelations', function() {
    const clickedClass = clickedDisk.prop('classData');
    if (clickedClass) {
        const outgoingRelations = schema.getOutgoingPropertiesForClass(clickedClass.$id);
        console.log('Outgoing relations: ', outgoingRelations)
        const incomingRelations = schema.getIncomingPropertiesForClass(clickedClass.$id);
        console.log('Incoming relations: ',incomingRelations)
        let index = 0;
        outgoingRelations.forEach((relationIRI:string) => {
            schema.getRelationDetails(relationIRI)
                .then(relationDetails => {
                  if (relationDetails.targetClass) {
                    createDiskAndLink(
                        paper.model,
                        relationDetails.targetClass,
                        relationDetails.propertyLabel,
                        'outgoing',
                        clickedDisk.findView(paper),
                        index,
                        clickedDisk.id
                    );
                    index++;
                    schema.lazyLoadData(relationDetails.targetClass.$id)
                    .then(() => {
                        // update loading state
                        schema.loadingStates[relationDetails.targetClass.$id] = "loaded";
                    })
                    .catch(error => {
                        console.error('Error lazy loading data:', error);
                    });
                  }
                  else {
                    console.error(`Relation target class for ${relationDetails.propertyLabel} not present in the schema`)
                  }
                });
        });

        incomingRelations.forEach((relationIRI:string) => {
            schema.getRelationDetails(relationIRI)
                .then(relationDetails => {
                  if (relationDetails.sourceClass) {
                    createDiskAndLink(
                        paper.model,
                        relationDetails.sourceClass,
                        relationDetails.propertyLabel,
                        'incoming',
                        clickedDisk.findView(paper),
                        index,
                        clickedDisk.id
                    );
                    index++;
                    schema.lazyLoadData(relationDetails.sourceClass.$id)
                    .then(() => {
                        // update loading state
                        schema.loadingStates[relationDetails.sourceClass.$id] = "loaded";
                    })
                    .catch(error => {
                        console.error('Error lazy loading data:', error);
                    });
                  }
                  else {
                    console.error(`Relation target class for ${relationDetails.propertyLabel} not present in the schema`)
                  }
                });
        });
    }
});


  ct.on('action:removeClass', function() {
    // Your logic for removing class
    clickedDisk.remove();  // This is a simplistic removal logic, replace with your actual logic
  });

  ct.render();
}

type DiagramProps = {
  selectedClass?: SchemaPrototype;
  setTableData: (data: { [key: string]: string }) => void;
}

const Diagram: React.FC<DiagramProps> = ({ selectedClass, setTableData }) => {
  let currentDisk: ClassDisk | null = null;
  let createdRelatedDisks: any[] = [];
  let createdClassByIRI: string[] = []
  let lastClickedClass: SchemaPrototype | null = null;
  const {schema} = useContext(SchemaContext);
  const expandedClasses = useRef(new Set<string>()).current;
  const canvas = useRef(null);

  useEffect(() => {
    const graph = new dia.Graph();
    const paper = new dia.Paper({
      model: graph,
      gridSize: 1,
      frozen: true,
      async: true,
      sorting: dia.Paper.sorting.APPROX,
      cellViewNamespace: shapes
    });

    const scroller = new ui.PaperScroller({
      paper,
      autoResizePaper: true,
      cursor: 'grab',
    });

    canvas.current.appendChild(scroller.el);
    scroller.lock();
    scroller.render().center();

    paper.on('blank:mousewheel', (evt, ox, oy, delta) => {
      evt.preventDefault();
      scroller.zoom(delta * 0.2, { min: 0.4, max: 3, grid: 0.2, ox, oy });
    });

    paper.on('blank:pointerdown', (event, x, y) => {
      scroller.startPanning(event);
    });

    graph.clear();

    if (selectedClass) {
      schema?.lazyLoadData(selectedClass);
      const classData = schema?.getClassById(selectedClass)
      if (classData) {
        console.log(classData);
        const disk = new ClassDisk({
          size: { width: 100, height: 100 },
          attrs: {
            label: {
              text: classData.name,
              fontSize: 14
            }
          }
        });
        disk.prop('classData', classData);
        graph.addCell(disk);
        paper.unfreeze();
        currentDisk = disk;
        createdClassByIRI.push(classData.$id);

        const paperWidth = paper.options.width as number;
        const paperHeight = paper.options.height as number;
        disk.position((paperWidth - disk.attributes.size.width) / 2, (paperHeight - disk.attributes.size.height) / 2);
      } else {
          console.error('No class data found for selected class:', selectedClass);
      }
    }

    paper.on('cell:pointerdown', async function(cellView, evt) {
      const clickedDisk = cellView.model as ClassDisk;
      if (clickedDisk instanceof ClassDisk) {
        displayContextMenu(paper, clickedDisk, evt, schema, expandedClasses);
      }
    });

return () => {
  scroller.remove();
  paper.remove();
};
}, [selectedClass, setTableData]);

return (
  <div id="paper" ref={canvas}/>
);
}
export default Diagram;