import * as $rdf from 'rdflib';


export function getLabelFromURI(store,uri) {
  const lastSlashIndex = uri.lastIndexOf('/');
  return lastSlashIndex !== -1 ? uri.substring(lastSlashIndex + 1) : uri;
}

//getSubClasses
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

  export function getInferredSubclasses(store, clickedNode) {
    const classTypeNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class");
    const connectedClasses = new Set();
    const queue = [clickedNode]; // Use a queue to store pending nodes

    while (queue.length > 0) {
        const currentNode = queue.shift(); // take the first node of the team

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




  export function getSubClasses(store, clickedNode) {
    const subClassNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf");
    const subClasses = store.match(
      clickedNode,
      subClassNode,
      null
    );

    return subClasses.map(stmt => ({
      subClass: stmt.object.value,
      propertyUri: stmt.predicate.uri
    }));
}

export function getSuperClasses(store, clickedNode) {
  const superClassNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf");
  const superClasses = store.match(
    null,
    superClassNode,
    clickedNode
  );

  return superClasses.map(stmt => ({
    superClass: stmt.subject.value,
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

 export function getInferredSuperClasses(store, clickedNode) {
    // Define a node for the RDF Schema class type
    const classTypeNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class");
    const inferredSuperClasses = new Set();
    const queue = [clickedNode]; // Use a queue to store nodes to be processed

    while (queue.length > 0) {
        const currentNode = queue.shift(); // Dequeue the first node

        // Retrieve all superClass relationships pointing to the current node
        const superClasses = store.match(
            null,
            $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'),
            currentNode
        );

        superClasses.forEach(stmt => {
            const superClass = stmt.subject;
            // Check if this superClass is declared as an rdfs:Class
            const isClass = store.match(
                superClass,
                $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
                classTypeNode
            ).length > 0;

            if (isClass && !superClass.equals(clickedNode) && !inferredSuperClasses.has(superClass)) {
                inferredSuperClasses.add(superClass);
                queue.push(superClass); // Add the node to the queue for further processing
            }
        });
    }

    // Remove classes that are directly connected through getIncomingConnectedClasses
    const directlyConnectedSuperClasses = getSubClasses(store, clickedNode);
    directlyConnectedSuperClasses.forEach(classItem => {
        inferredSuperClasses.delete(classItem.target);
    });

    return Array.from(inferredSuperClasses); // Return the list of inferred superclasses
}


export function getInferredIncoming(store, clickedNode) {
  const directlyIncomingClasses = getIncomingConnectedClasses(store, clickedNode);
  const indirectlyIncomingClasses = new Set();

  function findIndirectlyIncomingClasses(node, propertyUri) {
      const incomingClasses = getIncomingConnectedClasses(store, node);
      incomingClasses.forEach(({ target, propertyUri: incomingPropertyUri }) => {
        if (target){
          if (!target.equals(clickedNode) &&
              !directlyIncomingClasses.some(({ target: directTarget }) => directTarget && directTarget.equals(target)) &&
              !Array.from(indirectlyIncomingClasses).some(incoming => incoming.target.equals(target))) {
              indirectlyIncomingClasses.add({ target, propertyUri: incomingPropertyUri });
              findIndirectlyIncomingClasses(target, incomingPropertyUri);
          }
      }});
  }

  directlyIncomingClasses.forEach(({ target, propertyUri }) => {
    if (target) { 
        findIndirectlyIncomingClasses(target, propertyUri);
    }
});
  return Array.from(indirectlyIncomingClasses);
}

export function getInferredOutgoing(store, clickedNode) {
  const directlyOutgoingClasses = getOutgoingConnectedClasses(store, clickedNode);
  const indirectlyOutgoingClasses = new Set();

  function findIndirectlyOutgoingClasses(node, propertyUri) {
      const OutgoingClasses = getOutgoingConnectedClasses(store, node);
      OutgoingClasses.forEach(({ target, propertyUri: OutgoingPropertyUri }) => {
        if (target){
          if (!target.equals(clickedNode) &&
              !directlyOutgoingClasses.some(({ target: directTarget }) => directTarget && directTarget.equals(target)) &&
              !Array.from(indirectlyOutgoingClasses).some(Outgoing => Outgoing.target && Outgoing.target.equals(target))) {
              indirectlyOutgoingClasses.add({ target, propertyUri: OutgoingPropertyUri });
              findIndirectlyOutgoingClasses(target, OutgoingPropertyUri);
          }
      }});
  }

  directlyOutgoingClasses.forEach(({ target, propertyUri }) => {
      if (target) { 
          findIndirectlyOutgoingClasses(target, propertyUri);
      }
  });

  return Array.from(indirectlyOutgoingClasses);
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

  export function getInferredObjectProperties(store, clickedNode) {
    const InferredSubClass = getInferredSubclasses(store, clickedNode);
    const InferredRelation = getInferredRelation(store, clickedNode);
    const allInferredNodes = [...InferredSubClass, ...InferredRelation];
    const combinedProperties = {};
  
    // 遍历所有推断出的节点，收集它们的数据属性
    allInferredNodes.forEach(node => {
        const classNode = $rdf.namedNode(node);
        const properties = getDirectProperties(store, classNode);
  
        // 将当前节点的数据属性合并到总的属性对象中
        Object.keys(properties).forEach(propertyKey => {
            combinedProperties[propertyKey] = properties[propertyKey];
        });
    });
    return combinedProperties;
  }

  // this function returns key, value for each data property that has the node as domain and a literal as range
  export function getDataProperties(store: $rdf.IndexedFormula, node: $rdf.NamedNode): { [key: string]: string | number } {
    const dataProperties: { [key: string]: string | number } = {};

  // Find all triples where the node is the domain
  const triples = store.match(null, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'), node);
  triples.forEach(st => {
    const propertyRange = store.match(st.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range'), null);
    const isXMLSchemaType = propertyRange.some(rangeStatement => rangeStatement.object.value.startsWith("http://www.w3.org/2001/XMLSchema"));

    const label = store.match(st.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), null);
    if(propertyRange.length>0 && propertyRange[0].object&&isXMLSchemaType) {
      dataProperties[label[0]? label[0].object.value : st.subject.uri] = propertyRange[0].object.value.split("#").pop();
    }
  })
  return dataProperties;
};

/*
export function getInferredDataProperties(store, clickedNode) {
  const InferredSubClass = getInferredSubclasses(store, clickedNode);
  const InferredOutgoing = getInferredOutgoing(store, clickedNode);
  const InferredIncoming = getInferredIncoming(store, clickedNode);
  console.log(InferredIncoming, InferredOutgoing);
  const allInferredNodes = [...InferredSubClass, ...InferredOutgoing, ...InferredIncoming];
  console.log(allInferredNodes);
  const combinedProperties = {};

  // 遍历所有推断出的节点，收集它们的数据属性
  allInferredNodes.forEach(item => {
      let classNode;
      if (item instanceof $rdf.NamedNode) {
          // 处理情况，当item是一个NamedNode对象
          classNode = item;
      } else if (item.target instanceof $rdf.NamedNode) {
          // 处理情况，当item是一个包含target属性的对象
          classNode = item.target;
      }

      if (classNode) {
          const properties = getDataProperties(store, classNode);
          // 将当前节点的数据属性合并到总的属性对象中
          Object.keys(properties).forEach(propertyKey => {
              combinedProperties[propertyKey] = properties[propertyKey];
          });
      } else {
          console.log('Invalid node or IRI:', item);
      }
  });

  return combinedProperties;
}
*/
export function getInferredDataProperties(store, clickedNode) {
  const list=getInferredIncoming(store,clickedNode);
  const combinedProperties = {};
  list.forEach(item=>{
    const classNode = item.target;
    const properties = getDataProperties(store, classNode);
          // 将当前节点的数据属性合并到总的属性对象中
          Object.keys(properties).forEach(propertyKey => {
              combinedProperties[propertyKey] = properties[propertyKey];
          });
    
  })
  return combinedProperties;
}
export function createClass(store, classLabel,superClassUri = 'http://www.w3.org/2000/01/rdf-schema#Resource', setStore) {
    const classNode = $rdf.namedNode(classLabel);
    if (superClassUri) {
        const superClassNode = $rdf.namedNode(superClassUri);
        console.log(superClassNode)
        store.add(superClassNode, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), classNode);
    }

    console.log("Updated store after adding new class and relationships:", store);

    if (typeof setStore === 'function') {
        setStore(store);
    }
    //store.match(null, null, null).forEach(triple => {
      //console.log(triple.subject.value, triple.predicate.value, triple.object.value);
 // });
}
export function createIncomingRelation(store, classLabel, relationUri,superClassUri = 'http://www.w3.org/2000/01/rdf-schema#Resource', setStore) {
    console.log("Creating new class:", classLabel,relationUri,superClassUri);
   // Create new class node
    const classNode = $rdf.namedNode(classLabel);
    const relationNode = $rdf.namedNode(relationUri);
    // Mark the new class as an instance of the RDF type
    store.add(classNode, $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'));
    const label = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
    const lastSlashIndex = classLabel.lastIndexOf('/');
  const propertyName = lastSlashIndex !== -1 ? classLabel.substring(lastSlashIndex + 1) : classLabel;
    store.add(classNode, label, propertyName);

    // If a superclass is specified, creates a subClassOf relationship
    if (superClassUri) {
        const superClassNode = $rdf.namedNode(superClassUri);
        const exampleProperty = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
        const examplePropert = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range');
        store.add(relationNode, exampleProperty, classNode);
        store.add(relationNode, examplePropert, superClassNode);  // Set new class as domain

    }

    console.log("Updated store after adding new class and relationships:", store);

    // Update state to trigger re-rendering of the canvas
    if (typeof setStore === 'function') {
        setStore(store);
    }
    store.match(null, null, null).forEach(triple => {
     //console.log(triple.subject.value, triple.predicate.value, triple.object.value);
  });
}
export function createOutgoingRelation(store, classLabel, relationUri,superClassUri = 'http://www.w3.org/2000/01/rdf-schema#Resource', setStore) {
    console.log("Creating new class:", classLabel,relationUri,superClassUri);
    const classNode = $rdf.namedNode(classLabel);
    const relationNode = $rdf.namedNode(relationUri);
    store.add(classNode, $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'));
    const label = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
    const lastSlashIndex = classLabel.lastIndexOf('/');
  const propertyName = lastSlashIndex !== -1 ? classLabel.substring(lastSlashIndex + 1) : classLabel;
    store.add(classNode, label, propertyName);
    if (superClassUri) {
        const superClassNode = $rdf.namedNode(superClassUri);
        const exampleProperty = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
        const examplePropert = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range');
        store.add(relationNode, exampleProperty, superClassNode);
        store.add(relationNode, examplePropert, classNode); // 将新类作为 domain

    }
    console.log("Updated store after adding new class and relationships:", store);

    if (typeof setStore === 'function') {
        setStore(store);
    }
    //store.match(null, null, null).forEach(triple => {
      //console.log(triple.subject.value, triple.predicate.value, triple.object.value);
  //});
}
export function createDataProperty(store, classUri, label, comment, domainUri, rangeUri) {
  const classNode = $rdf.namedNode(classUri);
  const typePred = $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
  const propertyType = $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#Property');
  const labelPred = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
  const commentPred = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#comment');
  const domainPred = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
  const rangePred = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range');

  // set the type of Property 
  store.add(classNode, typePred, propertyType);
  console.log(`${classUri} – ${typePred.uri} – "${propertyType.uri}"`);

  // add label
  store.add(classNode, labelPred, $rdf.literal(label));
  console.log(`${classUri} – ${labelPred.uri} – "${label}"`);

  // add comment
  store.add(classNode, commentPred, $rdf.literal(comment));
  console.log(`${classUri} – ${commentPred.uri} – "${comment}"`);

  // set domain
  store.add(classNode, domainPred, $rdf.namedNode(domainUri));
  console.log(`${classUri} – ${domainPred.uri} – "${domainUri}"`);

  // set range
  store.add(classNode, rangePred, $rdf.namedNode(rangeUri));
  console.log(`${classUri} – ${rangePred.uri} – "${rangeUri}"`);
}


export const dataTypes = [
  { label: 'dataTypes', value: 'http://www.w3.org/2001/XMLSchema#string' },
  { label: 'String', value: 'http://www.w3.org/2001/XMLSchema#string' },
  { label: 'Boolean', value: 'http://www.w3.org/2001/XMLSchema#boolean' },
  { label: 'Float', value: 'http://www.w3.org/2001/XMLSchema#float' },
  { label: 'Double', value: 'http://www.w3.org/2001/XMLSchema#double' },
  { label: 'Decimal', value: 'http://www.w3.org/2001/XMLSchema#decimal' },
  { label: 'DateTime', value: 'http://www.w3.org/2001/XMLSchema#dateTime' },
  { label: 'Duration', value: 'http://www.w3.org/2001/XMLSchema#duration' },
  { label: 'HexBinary', value: 'http://www.w3.org/2001/XMLSchema#hexBinary' },
  { label: 'Base64Binary', value: 'http://www.w3.org/2001/XMLSchema#base64Binary' },
  { label: 'AnyURI', value: 'http://www.w3.org/2001/XMLSchema#anyURI' },
  { label: 'ID', value: 'http://www.w3.org/2001/XMLSchema#ID' },
  { label: 'IDREF', value: 'http://www.w3.org/2001/XMLSchema#IDREF' },
  { label: 'ENTITY', value: 'http://www.w3.org/2001/XMLSchema#ENTITY' },
  { label: 'NOTATION', value: 'http://www.w3.org/2001/XMLSchema#NOTATION' },
  { label: 'NormalizedString', value: 'http://www.w3.org/2001/XMLSchema#normalizedString' },
  { label: 'Token', value: 'http://www.w3.org/2001/XMLSchema#token' },
  { label: 'Language', value: 'http://www.w3.org/2001/XMLSchema#language' },
  { label: 'IDREFS', value: 'http://www.w3.org/2001/XMLSchema#IDREFS' },
  { label: 'ENTITIES', value: 'http://www.w3.org/2001/XMLSchema#ENTITIES' },
  { label: 'NMTOKEN', value: 'http://www.w3.org/2001/XMLSchema#NMTOKEN' },
  { label: 'NMTOKENS', value: 'http://www.w3.org/2001/XMLSchema#NMTOKENS' },
  { label: 'Name', value: 'http://www.w3.org/2001/XMLSchema#Name' },
  { label: 'QName', value: 'http://www.w3.org/2001/XMLSchema#QName' },
  { label: 'NCName', value: 'http://www.w3.org/2001/XMLSchema#NCName' },
  { label: 'Integer', value: 'http://www.w3.org/2001/XMLSchema#integer' },
  { label: 'NonNegativeInteger', value: 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger' },
  { label: 'PositiveInteger', value: 'http://www.w3.org/2001/XMLSchema#positiveInteger' },
  { label: 'NonPositiveInteger', value: 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger' },
  { label: 'NegativeInteger', value: 'http://www.w3.org/2001/XMLSchema#negativeInteger' },
  { label: 'Byte', value: 'http://www.w3.org/2001/XMLSchema#byte' },
  { label: 'Int', value: 'http://www.w3.org/2001/XMLSchema#int' },
  { label: 'Long', value: 'http://www.w3.org/2001/XMLSchema#long' },
  { label: 'Short', value: 'http://www.w3.org/2001/XMLSchema#short' },
  { label: 'UnsignedByte', value: 'http://www.w3.org/2001/XMLSchema#unsignedByte' },
  { label: 'UnsignedInt', value: 'http://www.w3.org/2001/XMLSchema#unsignedInt' },
  { label: 'UnsignedLong', value: 'http://www.w3.org/2001/XMLSchema#unsignedLong' },
  { label: 'UnsignedShort', value:'http://www.w3.org/2001/XMLSchema#unsignedShort' },
  { label: 'Date', value: 'http://www.w3.org/2001/XMLSchema#date' },
  { label: 'Time', value: 'http://www.w3.org/2001/XMLSchema#time' },
  { label: 'GYearMonth', value: 'http://www.w3.org/2001/XMLSchema#gYearMonth' },
  { label: 'GYear', value: 'http://www.w3.org/2001/XMLSchema#gYear' },
  { label: 'GMonthDay', value: 'http://www.w3.org/2001/XMLSchema#gMonthDay' },
  { label: 'GDay', value: 'http://www.w3.org/2001/XMLSchema#gDay' },
  { label: 'GMonth', value: 'http://www.w3.org/2001/XMLSchema#gMonth' }
];
export function getAllClasses(store) {
  const RDF_TYPE = $rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
  const RDFS_CLASS = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class");

  const classStatements = store.match(null, RDF_TYPE, RDFS_CLASS);
  const classURIs = classStatements.map(stmt => stmt.subject.value); 
  classURIs.unshift("Choose Class");
  return classURIs;
}

