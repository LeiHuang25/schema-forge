import React, { FC, useState, useEffect } from 'react';
import * as $rdf from 'rdflib';
import { getLabelFromURI } from '@/components/rdfHelpers';

type DropdownComponentProps = {
  store?: $rdf.IndexedFormula | null;
  selectedClass: string | undefined;
  setSelectedClass: React.Dispatch<React.SetStateAction<string | undefined>>;
};

const DropdownComponent: FC<DropdownComponentProps> = ({ store, selectedClass, setSelectedClass }) => {
  const [filter1, setFilter1] = useState<string>('');
  const [filter2, setFilter2] = useState<string>('');

  let classes: $rdf.NamedNode[] = [];
  let classLabels: { [uri: string]: string } = {};
  let relations: $rdf.NamedNode[] = [];
  let relationLabels: { [uri: string]: string } = {};

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

    relations = store
      .each(null, $rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), $rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"))
      .map((relationTerm) => relationTerm as $rdf.NamedNode);
    relations.forEach((relationNode) => {
      const labelTerm = store.any(relationNode, $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#label"));
      if (labelTerm && labelTerm.value) {
        relationLabels[relationNode.value] = labelTerm.value;
      }
    });
  }

  const filteredClasses = classes.filter((classNode) =>
    classLabels[classNode.value]?.toLowerCase().includes(filter1.toLowerCase())
  );

  const filteredRelations = relations.filter((relationNode) =>
    relationLabels[relationNode.value]?.toLowerCase().includes(filter2.toLowerCase())
  );

  return (
    <div>
      <span>CLASSES:</span>
      <input
        type="text"
        placeholder="Search classes..."
        value={filter1}
        onChange={(e) => setFilter1(e.target.value)}
        style={{ marginBottom: '5px', padding: '5px', width: '100%', boxSizing: 'border-box' }}
      />
      <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '5px' }}>
        {filteredClasses.map((classNode, index) => (
          <div
            key={index}
            style={{ padding: '5px', cursor: 'pointer', backgroundColor: selectedClass === classNode.value ? '#eee' : 'transparent' }}
            onClick={() => setSelectedClass(classNode.value)}
          >
            {classLabels[classNode.value] || classNode.value}
          </div>
        ))}
      </div>
      <br />
      <span>RELATIONS:</span>
      <input
        type="text"
        placeholder="Search relations..."
        value={filter2}
        onChange={(e) => setFilter2(e.target.value)}
        style={{ marginBottom: '5px', padding: '5px', width: '100%', boxSizing: 'border-box' }}
      />
      <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '5px' }}>
        {filteredRelations.map((relationNode, index) => (
          <div
            key={index}
            style={{ padding: '5px', cursor: 'pointer', backgroundColor: selectedClass === relationNode.value ? '#eee' : 'transparent' }}
          >
            {getLabelFromURI(store, relationNode.value)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DropdownComponent;
