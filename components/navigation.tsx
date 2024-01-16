import React, { FC, useState, useEffect, useContext } from 'react';
import Schema from '@/components/schema';
import SchemaContext from '@/SchemaContext';
import SchemaPrototype from "@comunica/query-sparql";

type DropdownComponentProps = {
    selectedClass: string | undefined;
    setSelectedClass: React.Dispatch<React.SetStateAction<string | undefined>>;
  };

const DropdownComponent: FC<DropdownComponentProps> = ({selectedClass, setSelectedClass}) => {

  const [classes, setClasses] = useState<SchemaPrototype[]>([]);
  const {schema} = useContext(SchemaContext);

  useEffect(() => {
    let classes: SchemaPrototype[] = [];
    if (schema instanceof Schema) {
      setClasses(schema.getClasses());
    }
}, [schema]);

      return (
        <div>
          <div>
            <label>Classes:</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Select a class...</option>
              {classes.map((cls, index) => (
                <option key={index} value={cls.$id}>
                  {cls.name || cls.$id}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    };

export default DropdownComponent;