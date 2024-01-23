import * as $rdf from 'rdflib';

//stocker le label d'un uri dans rdf 'store' par rdfs:label
export function getLabelFromURI(store, uri) {
    const node = $rdf.namedNode(uri);
    const labelTerm = store.any(node, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label'));
    return labelTerm ? labelTerm.value : uri;
}

// retourner toutes les attributes d'un targetmarker clickedNode
export function getOutgoingConnectedClasses(store, clickedNode) {
    const classTypeNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class");
    const properties = store.match(
      null,
      $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
      clickedNode
    );

    return properties.filter((stmt) => {
      const target = store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range'));
      const typeStatements = store.match(
        target,
        $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        null
      );
      return typeStatements.some(typeStmt => typeStmt.object.equals(classTypeNode));
    }).map((stmt) => ({
      target: store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range')),
      propertyUri: stmt.subject.uri
    }));
  }

// retourner toutes les attributes d'un sourcemarker clickedNode
export function getIncomingConnectedClasses(store, clickedNode) {
    const classTypeNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class");
    const properties = store.match(
      null,
      $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range'),
      clickedNode
    );

    return properties.filter((stmt) => {
      const target = store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'));
      const typeStatements = store.match(
        target,
        $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        null
      );
      return typeStatements.some(typeStmt => typeStmt.object.equals(classTypeNode));
    }).map((stmt) => ({
      target: store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain')),
      propertyUri: stmt.subject.uri
    }));
  }

//retourner les attributs direct pour chaque propriete
  export function getDirectProperties(store: $rdf.IndexedFormula, node: $rdf.NamedNode): { [key: string]: string | number } {
    const directProperties: { [key: string]: string | number } = {};

    // Fetch all statements where the subject is the selected node
    const statements = store.statementsMatching(node, undefined, undefined);

    statements.forEach(st => {
      // Check if the object is a literal
      if (st.object.termType === 'Literal') {
        // Use local name of predicate as key, if available, otherwise use full URI
        const key = st.predicate.uri.split("#").pop() || st.predicate.uri;
            directProperties[key] = st.object.value;
      }
    });

    return directProperties;
  }

  // this function returns key, value for each data property that has the node as domain and a literal as range
  export function getDataProperties(store: $rdf.IndexedFormula, node: $rdf.NamedNode): { [key: string]: string | number } {
    const dataProperties: { [key: string]: string | number } = {};

  // Find all triples where the node is the domain
  const triples = store.match(null, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'), node);
  triples.forEach(st => {
    const propertyRange = store.match(st.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range'), null);

    const label = store.match(st.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), null);
    console.log("label: ", label)
    if(propertyRange.length>0 && propertyRange[0].object) {
      dataProperties[label[0]? label[0].object.value : st.subject.uri] = propertyRange[0].object.value.split("#").pop();
    }
  })

  return dataProperties;
};