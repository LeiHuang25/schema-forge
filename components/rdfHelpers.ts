import * as $rdf from 'rdflib';

export function getLabelFromURI(store, uri) {
    const node = $rdf.namedNode(uri);
    const labelTerm = store.any(node, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label'));
    return labelTerm ? labelTerm.value : uri;
}

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

  export function getIndirectlyConnectedClasses(store, clickedNode) {
    const classTypeNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class");
    const connectedClasses = new Set();
    const queue = [clickedNode]; // Use a queue to store pending nodes

    while (queue.length > 0) {
        const currentNode = queue.shift(); // Remove the first node of the team

        const properties = store.match(
            null,
            $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
            currentNode
        );

        properties.forEach(stmt => {
            const target = store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range'));
            if (target) {
                const typeStatements = store.match(
                    target,
                    $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                    null
                );
                if (typeStatements.some(typeStmt => typeStmt.object.equals(classTypeNode)) && !target.equals(clickedNode) && !connectedClasses.has(target)) {
                    connectedClasses.add(target);
                    queue.push(target); // Add qualified nodes to the pending queue
                }
            }
        });
    }
    const outgoingConnectedClasses=getOutgoingConnectedClasses(store,clickedNode);
    outgoingConnectedClasses.forEach(classItem => {
      connectedClasses.delete(classItem.target);
  });
    

    return Array.from(connectedClasses);
}




  export function getSuperClasses(store, clickedNode) {
    const superClassNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf");
    const superClasses = store.match(
      clickedNode,
      superClassNode,
      null
    );

    return superClasses.map(stmt => ({
      superClass: stmt.object.value,
      propertyUri: stmt.predicate.uri
    }));
}

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
  export function getIndirectlyIncomingClasses(store, clickedNode) {
    const directlyIncomingClasses = getIncomingConnectedClasses(store, clickedNode);
    const indirectlyIncomingClasses = new Set();
  
    function findIndirectlyIncomingClasses(node) {
        const incomingClasses = getIncomingConnectedClasses(store, node);
        incomingClasses.forEach(({ target }) => {
            // Add this line of code to check if the node is the same as clickedNode
            if (!target.equals(clickedNode) &&
                !directlyIncomingClasses.some(({ target: directTarget }) => directTarget.equals(target)) &&
                !indirectlyIncomingClasses.has(target)) {
                indirectlyIncomingClasses.add(target);
                findIndirectlyIncomingClasses(target);
            }
        });
    }
  
    directlyIncomingClasses.forEach(({ target }) => findIndirectlyIncomingClasses(target));
  
    return Array.from(indirectlyIncomingClasses);
}

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
    if(propertyRange.length>0 && propertyRange[0].object) {
      dataProperties[label[0]? label[0].object.value : st.subject.uri] = propertyRange[0].object.value.split("#").pop();
    }
  })
  
  return dataProperties;
};

export function getInferredSuperClasses(store, clickedNode) {
  const inferredClasses = new Set();

    // Find all subclasses related to clickedNode
    const subClasses = store.match(null, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), clickedNode);
    subClasses.forEach(subClass => {
        inferredClasses.add(subClass.subject.value); // Add a subclass to the inferred class collection
    });

    // Find all parent classes related to clickedNode
    const superClasses = store.match(clickedNode, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), null);
    superClasses.forEach(superClass => {
        inferredClasses.add(superClass.object.value); // Add the parent class to the inferred class collection
    });

    return Array.from(inferredClasses);
}


export function getInferredSubClasses(store, clickedNode) {
  const inferredClasses = new Set();

    // Find all subclasses related to clickedNode
    const subClasses = store.match(null, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), clickedNode);
    subClasses.forEach(subClass => {
        inferredClasses.add(subClass.subject.value); // Add a subclass to the inferred class collection
    });

    // Find all parent classes related to clickedNode
    const superClasses = store.match(clickedNode, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), null);
    superClasses.forEach(superClass => {
        inferredClasses.add(superClass.object.value); // Add the parent class to the inferred class collection
    });

    return Array.from(inferredClasses);
}
