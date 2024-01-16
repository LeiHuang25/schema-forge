import { shapes, dia } from '@clientio/rappid';
import SchemaPrototype from "@comunica/query-sparql";

export class ClassDisk extends shapes.standard.Circle {
  constructor(attributes?: dia.Element.Attributes, options?: dia.Cell.Options) {
    super(attributes, options);
    this.prop('classData', null);
  }

  defaults(): any {
    return {
      ...super.defaults,
      type: 'ClassDisk',
      classData: null,
    };
  }
}
