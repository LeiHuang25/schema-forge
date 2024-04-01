import * as $rdf from 'rdflib';


export function getLabelFromURI(store, uri) {
    const node = $rdf.namedNode(uri);
    const labelTerm = store.any(node, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label'));
    return labelTerm ? labelTerm.value : uri;
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
    const queue = [clickedNode]; // 使用队列来存储待处理节点

    while (queue.length > 0) {
        const currentNode = queue.shift(); // 取出队首节点

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
                    queue.push(target); // 将符合条件的节点加入待处理队列
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
    const directlyConnectedSuperClasses = getIncomingConnectedClasses(store, clickedNode);
    directlyConnectedSuperClasses.forEach(classItem => {
        inferredSuperClasses.delete(classItem.target);
    });

    return Array.from(inferredSuperClasses); // Return the list of inferred superclasses
}



  export function getInferredRelation(store, clickedNode) {
    const directlyIncomingClasses = getIncomingConnectedClasses(store, clickedNode);
    const indirectlyIncomingClasses = new Set();
  
    function findIndirectlyIncomingClasses(node) {
        const incomingClasses = getIncomingConnectedClasses(store, node);
        incomingClasses.forEach(({ target }) => {
            // 添加这一行代码来检查节点是否与 clickedNode 相同
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

    const label = store.match(st.subject, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), null);
    if(propertyRange.length>0 && propertyRange[0].object) {
      dataProperties[label[0]? label[0].object.value : st.subject.uri] = propertyRange[0].object.value.split("#").pop();
    }
  })
  
  return dataProperties;
};

export function getInferredDataProperties(store, clickedNode) {
  const InferredSubClass = getInferredSubclasses(store, clickedNode);
  const InferredRelation = getInferredRelation(store, clickedNode);
  const allInferredNodes = [...InferredSubClass, ...InferredRelation];
  const combinedProperties = {};

  // 遍历所有推断出的节点，收集它们的数据属性
  allInferredNodes.forEach(node => {
      const classNode = $rdf.namedNode(node);
      const properties = getDataProperties(store, classNode);

      // 将当前节点的数据属性合并到总的属性对象中
      Object.keys(properties).forEach(propertyKey => {
          combinedProperties[propertyKey] = properties[propertyKey];
      });
  });
  return combinedProperties;
}

export function createClass(store, classLabel, relationUri,superClassUri = 'http://www.w3.org/2000/01/rdf-schema#Resource', setStore) {
    console.log("Creating new class:", classLabel);
    // 创建新类节点
    const classNode = $rdf.namedNode(classLabel);
    const relationNode = $rdf.namedNode(relationUri);
    // 将新类标记为 RDF 类型的一个实例
    store.add(classNode, $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#Class'));
    const label = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
    const lastSlashIndex = classLabel.lastIndexOf('/');
  const propertyName = lastSlashIndex !== -1 ? classLabel.substring(lastSlashIndex + 1) : classLabel;
    store.add(classNode, label, propertyName);

    // 如果指定了超类，则创建 subClassOf 关系
    if (superClassUri) {
        const superClassNode = $rdf.namedNode(superClassUri);
        store.add(classNode, $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#subClassOf'), superClassNode);
        const exampleProperty = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#domain');
        const examplePropert = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#range');
        store.add(relationNode, exampleProperty, superClassNode); // 将新类作为 domain
        store.add(relationNode, examplePropert, classNode);

    }

    console.log("Updated store after adding new class and relationships:", store);

    // 更新状态来触发画布的重新渲染
    if (typeof setStore === 'function') {
        setStore(store);
    }
    store.match(null, null, null).forEach(triple => {
      console.log(triple.subject.value, triple.predicate.value, triple.object.value);
  });
}

