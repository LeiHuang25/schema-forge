import {   createLens } from "ldkit";
import { dbo, rdfs, xsd } from "ldkit/namespaces";
import { stringify, parse } from 'flatted';

class Schema {
  private engine: any;
  private source: any;
  private context: any;
  private ClassesLens: any;
  private classMap: Map<string, any> = new Map();
  private subclasses: { [key: string]: Set<string> };
  private incomingProps: { [key: string]: Set<string>};
  private outgoingProps: { [key: string]: Set<string>};
  public ClassSchema: any
  private loadingStates: { [key: string]: "loaded" | "loading" | "notLoaded" } = {};

  private onInitialized: () => void;

  constructor(onInitialized: () => void, skipInitialization: boolean = false) {
    this.onInitialized = onInitialized;

    //this.source = { type: 'file', value: 'http://localhost:3000/schemas/wine-ontology.owl'}; 
    //this.source = { type:'file', value: 'https://schema.org/version/latest/schemaorg-current-https.jsonld' };
    this.source = { type:'file', value: 'http://localhost:3000/schemas/schemaorg-current-https.ttl' };
    //this.source = { type:'file', value: 'http://localhost:3000/schemas/schemaorg-short.ttl' };
    this.context = {
      sources: [this.source],
    };

    this.subclasses = {}
    this.incomingProps = {}
    this.outgoingProps = {}
    
    this.ClassSchema = {
      "@type": rdfs.Class,
      name: rdfs.label,
      superclasses: {
        "@id": rdfs.subClassOf,
        "array": true
      },
      description: rdfs.comment,
    } as const;

    if (!skipInitialization) {
      console.time("create Lens");
      this.ClassesLens = createLens(this.ClassSchema, this.context);
      console.timeEnd("end lens creations");

      console.time("initialize");
      this.initialize()
      console.timeEnd("end initialize");
    }
  }

  private initialize() {
    this.ClassesLens.find()
        .then((classes:any) => {
            classes.forEach((cls:any) => {
                this.classMap.set(cls.$id, cls);
            });
            return this.ClassesLens.count();
        })
        .then((count:any) => {
            console.log('Number of classes in schema: ', count);
        })
        .then(() => {
            this.onInitialized();
            console.log('Initialization complete');
        })
        .catch((error:any) => {
            console.error('Error occurred:', error);
        });
}


private async fetchSubclasses(classId: string) {
    // console.log(`${classId}`)
    const classBindings = await this.engine.queryBindings(`
    SELECT distinct ?subclass WHERE {
      <${classId}> ^rdfs:subClassOf ?subclass.
    } `, {
    sources: [this.source],
    });
  // const classBindings = await bindingsStream.toArray();
  classBindings.on('data', (b:any) => {
    const subclassValue = b.get('subclass').value;
    if (!this.subclasses[classId]) {
      this.subclasses[classId] = new Set();
    }
    this.subclasses[classId].add(subclassValue);
  });
  classBindings.on('end', () => {
    //console.log(`subclasses: `, this.subclasses[classId]);
  });
  classBindings.on('error', (error:any) => {
    console.error(error);
  });
 
  }

  private async fetchIncomingProperties(classId: string) {
    const incomingPropsBindingsStream = await this.engine.queryBindings(`
        PREFIX schema: <https://schema.org/>
        SELECT distinct ?property WHERE {
            ?property (rdfs:range|schema:rangeIncludes) <${classId}> .
            ?property rdfs:domain ?domain .
            ?domain a rdfs:Class .
        }
    `, {
        sources: [this.source],
    });
    incomingPropsBindingsStream.on('data', (b:any) => {
      const property = b.get('property').value;
      if (!this.incomingProps[classId]) {
        this.incomingProps[classId] = new Set();
      }
      this.incomingProps[classId].add(property);
    });
    incomingPropsBindingsStream.on('end', () => {
      //console.log(`Direct properties: `,this.incomingProps[classId]);
    });
    incomingPropsBindingsStream.on('error', (error:any) => {
      console.error(error);
    });
}
  private async fetchOutgoingProperties(classId: string) {
    // getting properties
    // Direct props
    const outgoingPropsBindingsStream = await this.engine.queryBindings(`
    PREFIX schema: <https://schema.org/>
    SELECT distinct ?property WHERE {
      ?property (rdfs:domain|schema:domainIncludes) <${classId}>
    }`, {
    sources: [this.source],
    });
    
    outgoingPropsBindingsStream.on('data', (b:any) => {
      const property = b.get('property').value;
      if (!this.outgoingProps[classId]) {
        this.outgoingProps[classId] = new Set();
      }
      this.outgoingProps[classId].add(property);
    });
    outgoingPropsBindingsStream.on('end', () => {
      //console.log(`Direct properties: `,this.directProps[classId]);
    });
    outgoingPropsBindingsStream.on('error', (error:any) => {
      console.error(error);
    });
  }
  
  public getSubclassesForClass(classId: string): Set<string> {
    return this.subclasses[classId] || new Set();
  }

  public getIncomingPropertiesForClass(classId: string): Set<string> {
    return this.incomingProps[classId] || new Set();
  }

  public getOutgoingPropertiesForClass(classId: string): Set<string>  {
    return this.outgoingProps[classId] || new Set();
  }

  public getClassById(classId: string): any {
    return this.classMap.get(classId);
  }
  public getClasses(): Array<any> {
    return Array.from(this.classMap.values());
  }
  public async lazyLoadData(classId: string) {
    switch (this.loadingStates[classId]) {
      case "loaded":
        return Promise.resolve();
      case "loading":
        return new Promise<void>((resolve, reject) => {
          const checkLoadingState = () => {
            if (this.loadingStates[classId] === "loaded") {
              resolve();
            } else if (this.loadingStates[classId] === "notLoaded") {
              // This case shouldn't happen, but it's here for completeness
              reject(new Error(`Loading was not completed for class ${classId}`));
            } else {
              // Check again after a short delay
              setTimeout(checkLoadingState, 100);
            }
          };
          checkLoadingState();
        });
      case "notLoaded":
        default:
          // Otherwise, initiate the loading task
        this.loadingStates[classId] = "loading";
        return Promise.all([
          this.fetchSubclasses(classId),
          this.fetchIncomingProperties(classId),
          this.fetchOutgoingProperties(classId)
        ]).then(() => {
          // Once the loading is complete, update the loading state
          this.loadingStates[classId] = "loaded";
        }).catch(error => {
          console.error(`Error loading data for class ${classId}:`, error);
          // Reset the loading state to allow retrying
          this.loadingStates[classId] = "notLoaded";
        });
    }
  }

  public getLoadingState(classId: string): "loaded" | "loading" | "notLoaded" {
    return this.loadingStates[classId] || "notLoaded";
  }

  public async getRelationDetails(relationIRI: string): Promise<{ sourceClass: any, targetClass: any, propertyLabel: string }> {
    try {
        const query = `
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX schema: <https://schema.org/>
            SELECT ?sourceClass ?targetClass ?propertyLabel WHERE {
                <${relationIRI}> (rdfs:domain|schema:domainIncludes) ?sourceClass .
                <${relationIRI}> (rdfs:range|schema:rangeIncludes) ?targetClass .
                <${relationIRI}> rdfs:label ?propertyLabel .
            }
        `;

        const bindings = await this.engine.queryBindings(query, { sources: [this.source] });
        const binding = await new Promise<any>((resolve, reject) => {
            bindings.on('data', resolve);
            bindings.on('error', reject);
        });

        if (binding) {
            console.log('Target class: ', binding.get('targetClass').value)
            return {
                sourceClass: await this.getClassById(binding.get('sourceClass').value),
                targetClass: await this.getClassById(binding.get('targetClass').value),
                propertyLabel: binding.get('propertyLabel').value,
            };
        } else {
            throw new Error('No data found for the provided relation IRI.');
        }
    } catch (error) {
        console.error('Error fetching relation details:', error);
        throw error;
    }
  }
  public serializeState(): string {
    return stringify({
      classMap: Array.from(this.classMap.entries()),
      subclasses: this.subclasses,
      incomingProps: this.incomingProps,
      outgoingProps: this.outgoingProps,
      engine: this.engine,
      source: this.source,
      context: this.context,
      ClassesLens: this.ClassesLens,
      ClassSchema: this.ClassSchema,
      loadingStates: this.loadingStates
    });
  }
  public deserializeState(json: string): void {
    const state = parse(json);
    this.classMap = new Map(state.classMap);
    this.subclasses = state.subclasses;
    this.incomingProps = state.incomingProps;
    this.outgoingProps = state.outgoingProps;
    this.engine = state.engine;
    this.source = state.source;
    this.context = state.context;
    this.ClassesLens = state.ClassesLens;
    this.ClassSchema = state.ClassSchema;
    this.loadingStates = state.loadingStates
   
  }
  public saveStateToLocalStorage(): void {
    localStorage.setItem('schemaState', this.serializeState());
  }
  
  public loadStateFromLocalStorage(): void {
    const json = localStorage.getItem('schemaState');
    if (json) {
      this.deserializeState(json);
    }
  }

}
export default Schema;
