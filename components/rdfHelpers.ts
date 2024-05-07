import * as $rdf from 'rdflib';


export function getLabelFromURI(store: any, uri: any) {
  const lastSlashIndex = uri.lastIndexOf('/');
  const lastHashIndex = uri.lastIndexOf('#');
  const lastIndex = Math.max(lastSlashIndex, lastHashIndex);
  return lastIndex !== -1 ? uri.substring(lastIndex + 1) : uri;
}


//getSubClasses
export function getOutgoingConnectedClasses(store:any, clickedNode:any) {
  const classTypeNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class");
  const properties = store.match(
    null,
    $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
    clickedNode
  );

  return properties.filter((stmt:any) => {
    const target = store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range'));
    const typeStatements = store.match(
      target,
      $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      classTypeNode
    );
    return typeStatements.some((typeStmt :any)=> typeStmt.object.equals(classTypeNode));
  }).map((stmt:any) => {
    const target = store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range'));
    const comment = store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#comment'));
    return {
      target: target,
      propertyUri: stmt.subject.uri,
      comment: comment ? comment.value : ''
    };
  });
}

 /* export function getInferredSubclasses(store, clickedNode) {
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
*/

/* export function getInferredSuperClasses(store, clickedNode) {
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
*/

  export function getSubClasses(store:any, clickedNode:any) {
    const subClassNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf");
    const subClasses = store.match(
      null,
      subClassNode,
      clickedNode
    );
    return subClasses.map((stmt:any) => ({
      subClass: stmt.subject.value,
      propertyUri: stmt.predicate.uri
    }));
}

export function getSuperClasses(store:any, clickedNode:any) {
  const superClassNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf");
  const superClass = store.match(
    clickedNode,
    superClassNode,
    null
  );

  if (superClass.length > 0) {
    return {
      superClass: superClass[0].object.value,
      propertyUri: superClass[0].predicate.uri
    };
  } else {
    return null; 
  }
}

export function getAllSuperClasses(store:any, clickedNode:any) {
  const superClassNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf");
  const superClasses = new Set();

  function findSuperClasses(node:any) {
      const superClassTriples = store.match(node, superClassNode, null);
      superClassTriples.forEach((triple:any) => {
          const superClass = triple.object;
          if (!superClass.equals(clickedNode) && !superClasses.has(superClass.value)) {
              const superClassDetail = {
                  superClass: superClass.value,
                  propertyUri: superClassNode.value
              };
              superClasses.add(superClassDetail);  // Add detail object instead of just the node
              findSuperClasses(superClass);  // Recursively find further superclasses
          }
      });
  }

  findSuperClasses(clickedNode);
  return Array.from(superClasses);
}


export function getIncomingConnectedClasses(store:any, clickedNode:any) {
    const classTypeNode = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class");
    const properties = store.match(
      null,
      $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range'),
      clickedNode
    );
    return properties.filter((stmt:any) => {
      const target = store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'));
      const typeStatements = store.match(
        target,
        $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        null
      );
      return typeStatements.some((typeStmt:any) => typeStmt.object.equals(classTypeNode));
    }).map((stmt:any) => {
      const target = store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'));
      const comment = store.any(stmt.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#comment'));
      return {
        target: target,
        propertyUri: stmt.subject.uri,
        comment: comment ? comment.value : ''
      };

    });
  }




  export function getInferredIncoming(store:any, clickedNode:any) {
    const inferredIncoming = new Set();

    const superClasses = getAllSuperClasses(store, clickedNode);

    superClasses.forEach((superClass:any) => {
        const directIncoming = getIncomingConnectedClasses(store, $rdf.namedNode(superClass.superClass));
        directIncoming.forEach((incoming:any) => {
            inferredIncoming.add(incoming);
        });
    });

    return Array.from(inferredIncoming);
}


export function getInferredOutgoing(store:any, clickedNode:any) {
  const inferredOutgoing = new Set();

  const superClasses = getAllSuperClasses(store, clickedNode);

  superClasses.forEach((superClass:any) => {
      const directOutgoing = getOutgoingConnectedClasses(store, $rdf.namedNode(superClass.superClass));
      directOutgoing.forEach((Outgoing:any) => {
          inferredOutgoing.add(Outgoing);
      });
  });

  return Array.from(inferredOutgoing);
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

  interface CombinedProperties {
    [key: string]: any; 
}

export function getInferredObjectProperties(store: any, clickedNode: any): CombinedProperties {
    const list = getAllSuperClasses(store, clickedNode);
    const combinedProperties: CombinedProperties = {}; 

    list.forEach((node: any) => {
        const classNode = $rdf.namedNode(node);
        const properties = getDirectProperties(store, classNode);

        Object.keys(properties).forEach(propertyKey => {
            combinedProperties[propertyKey] = properties[propertyKey];
        });
    });

    return combinedProperties;
}

  // this function returns key, value for each data property that has the node as domain and a literal as range
  export function getDataProperties(store: $rdf.IndexedFormula, node: $rdf.NamedNode): { [key: string]: { type: string, comment: string } } {
    const dataProperties: { [key: string]: { type: string, comment: string } } = {};

    // Find all triples where the node is the domain
    const triples = store.match(null, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain'), node);
    triples.forEach(st => {
        const propertyRange = store.match(st.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range'), null);
        const isXMLSchemaType = propertyRange.some(rangeStatement => {
          const object = rangeStatement.object as $rdf.NamedNode;
          return object.uri.startsWith("http://www.w3.org/2001/XMLSchema");
      });
      
        const label = store.match(st.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), null).map(l => l.object.value);
        const comment = store.match(st.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#comment'), null).map(c => c.object.value);

        if (propertyRange.length > 0 && propertyRange[0].object && isXMLSchemaType) {
          const propName = label.length > 0 ? label[0] : (st.subject.value.split('#').pop() ?? "");
          const propType = (propertyRange[0].object as $rdf.NamedNode).uri.split('#').pop();          
            const propComment = comment.length > 0 ? comment[0] : '';

            if (propName !== undefined&&propType!==undefined) {
              dataProperties[propName] = {
                  type: propType,
                  comment: propComment
              };
          }
          
          
        }
    });

    return dataProperties;
}



export function getInferredDataProperties(store:any, clickedNode:any) {
  const list = getAllSuperClasses(store, clickedNode);
  const combinedProperties: { [key: string]: { type: any; comment: any } } = {};
  list.forEach((item :any)=> {
      if (item && item.superClass) {
          const classNode = $rdf.namedNode(item.superClass);  // Ensuring that superClass is a valid RDF Node
          const properties = getDataProperties(store, classNode);

          // Merge current node's data properties into the overall properties object
          Object.keys(properties).forEach(propertyKey => {
              const incomingProp = properties[propertyKey];
              if (combinedProperties.hasOwnProperty(propertyKey)) {
                  // If property already exists, merge type and comments
                  combinedProperties[propertyKey].type = incomingProp.type;  // Assuming you want the latest type
                  combinedProperties[propertyKey].comment += ' | ' + incomingProp.comment;  // Concatenate comments
              } else {
                  // Otherwise, simply add the new property
                  combinedProperties[propertyKey] = {
                      type: incomingProp.type,
                      comment: incomingProp.comment
                  };
              }
          });
      }
  });
  return combinedProperties;
}


export function createClass(store:any, classLabel:any,superClassUri = 'http://www.w3.org/2000/01/rdf-schema#Resource', setStore:any) {
    const classNode = $rdf.namedNode(classLabel);
    if (superClassUri) {
        const superClassNode = $rdf.namedNode(superClassUri);
        console.log(superClassNode)
        store.add(classNode, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), superClassNode);
    }

    console.log("Updated store after adding new class and relationships:", store);

    if (typeof setStore === 'function') {
        setStore(store);
    }
    //store.match(null, null, null).forEach(triple => {
      //console.log(triple.subject.value, triple.predicate.value, triple.object.value);
 // });
}
export function createIncomingRelation(store:any, classLabel:any, relationUri:any, superClassUri = 'http://www.w3.org/2000/01/rdf-schema#Resource', setStore:any, comment:any) {
    console.log("Creating new class:", classLabel, relationUri, superClassUri);

    const classNode = $rdf.namedNode(classLabel);
    const relationNode = $rdf.namedNode(relationUri);
    const commentNode = $rdf.literal(comment);
    

    store.add(classNode, $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'));
    const labelNode = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
    const propertyName = classLabel.lastIndexOf('/') !== -1 ? classLabel.substring(classLabel.lastIndexOf('/') + 1) : classLabel;
    store.add(classNode, labelNode, propertyName);

    store.add(classNode, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#comment'), commentNode);

    if (superClassUri) {
        const superClassNode = $rdf.namedNode(superClassUri);
        const domainNode = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
        const rangeNode = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range');

        store.add(relationNode, domainNode, classNode);
        store.add(relationNode, rangeNode, superClassNode);

        store.add(relationNode, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#comment'), commentNode);
    }

    console.log("Updated store after adding new class and relationships:", store);

    if (typeof setStore === 'function') {
        setStore(store);
    }

    //store.match(null, null, null).forEach(triple => {
        //console.log(triple.subject.value, triple.predicate.value, triple.object.value);
    //});
}

export function createOutgoingRelation(store:any, classLabel:any, relationUri:any, superClassUri = 'http://www.w3.org/2000/01/rdf-schema#Resource', setStore:any, comment:any) {
    console.log("Creating new class:", classLabel, relationUri, superClassUri);
    
    const classNode = $rdf.namedNode(classLabel);
    const relationNode = $rdf.namedNode(relationUri);
    console.log(comment)
    const commentNode = $rdf.literal(comment);  
    const lastSlashIndex = classLabel.lastIndexOf('/');
    
    store.add(classNode, $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'));
    const labelNode = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
    const propertyName = lastSlashIndex !== -1 ? classLabel.substring(lastSlashIndex + 1) : classLabel;
    store.add(classNode, labelNode, propertyName);

    if (superClassUri) {
        const superClassNode = $rdf.namedNode(superClassUri);
        const domainNode = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
        const rangeNode = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range');
        
        store.add(relationNode, domainNode, superClassNode); 
        store.add(relationNode, rangeNode, classNode); 
        store.add(relationNode, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#comment'), commentNode);
    }

    console.log("Updated store after adding new class and relationships:", store);

    if (typeof setStore === 'function') {
        setStore(store);
    }

    // store.match(null, null, null).forEach(triple => {
    //     console.log(triple.subject.value, triple.predicate.value, triple.object.value);
    // });
}

export function createDataProperty(store:any, classUri:any, label:any, comment:any, domainUri:any, rangeUri:any) {
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
export function getAllClasses(store:any) {
  const RDF_TYPE = $rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
  const RDFS_CLASS = $rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#Class");

  const classStatements = store.match(null, RDF_TYPE, RDFS_CLASS);
  const classURIs = classStatements.map((stmt :any)=> stmt.subject.value); 
  classURIs.unshift("Choose Class");
  return classURIs;
}

