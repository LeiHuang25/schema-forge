import React, { FC, useState, useEffect } from 'react';
import * as $rdf from 'rdflib';

type DropdownComponentProps = {
    store?: $rdf.IndexedFormula;
    selectedClass: string | undefined;
    setSelectedClass: React.Dispatch<React.SetStateAction<string | undefined>>;
  };

const DropdownComponent: FC<DropdownComponentProps> = ({store, selectedClass, setSelectedClass}) => {

    let classes: $rdf.NamedNode[] = [];
    let classLabels: {[uri: string]: string} = {};

  if (store) {
    classes = store
      .each(null, $rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class"))
      .map((classTerm) => classTerm as $rdf.NamedNode);
    classes.forEach((classNode) => {
        const labelTerm = store.any(classNode, $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#label"));
        if (labelTerm && labelTerm.value) {
            classLabels[classNode.value] = labelTerm.value;
        }
    });
  }

      return (
        <div>
          <div>
            <label>Classes:</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Select a class...</option>
              {classes.map((classNode, index) => (
                <option key={index} value={classNode.value}>
                  {classLabels[classNode.value] || classNode.value}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    };

export default DropdownComponent;