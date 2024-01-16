import React, { FC, useState, useEffect, useContext } from 'react';
import Schema from '@/components/schema';
import SchemaContext from '@/SchemaContext';
import SchemaPrototype from "@comunica/query-sparql";

type ClassListComponentProps = {
    selectedClass: string | undefined;
    setSelectedClass: React.Dispatch<React.SetStateAction<string | undefined>>;
};

const ClassListComponent: FC<ClassListComponentProps> = ({ selectedClass, setSelectedClass }) => {
  const [classes, setClasses] = useState<SchemaPrototype[]>([]);
  const [filter, setFilter] = useState<string>('');
  const { schema } = useContext(SchemaContext);

  useEffect(() => {
    if (schema instanceof Schema) {
      const sortedClasses = schema.getClasses().sort((a, b) => a.name.localeCompare(b.name));
      setClasses(sortedClasses);
    }
  }, [schema]);

  const filteredClasses = classes.filter((cls) => cls.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <label htmlFor="class-search" className="block text-sm font-medium text-gray-700">Search Classes:</label>
        <input
          id="class-search"
          type="text"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Type to search..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <ul className="flex-1 overflow-y-auto h-full">
        {filteredClasses.map((cls) => (
          <li
            key={cls.$id}
            className={`px-3 py-2 ${selectedClass === cls.$id ? 'bg-gray-100' : ''} cursor-pointer hover:bg-gray-200`}
            onClick={() => setSelectedClass(cls.$id)}
          >
            {cls.name || cls.$id}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClassListComponent;
