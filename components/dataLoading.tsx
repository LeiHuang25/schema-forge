import React, { FC, useState, useContext } from 'react';
import Schema from '@/components/schema';
import SchemaContext from '@/SchemaContext';

type DataLoaderProps = {};

const DataLoader: FC<DataLoaderProps> = () => {
  const [loading, setLoading] = useState(false);
  const {schema, setSchema} = useContext(SchemaContext);

  const handleLoadSchema = async () => {
    setLoading(true);
    const schemaInstance = new Schema(() => {
      setLoading(false);
      setSchema(schemaInstance);

    });
  };
  const handleSaveProject = () => {
    schema?.saveStateToLocalStorage();
  };
  const handleLoadProject = () => {
    const schemaInstance = new Schema(() => {}, true);
    schemaInstance.loadStateFromLocalStorage();
    setSchema(schemaInstance);
  };

  return (
    <div className="border border-gray-300 p-5 w-52">
      <p className="mb-4">Project</p>
      <button 
        className="project-button bg-gray-300 px-4 py-2 mb-2 w-full" 
        onClick={handleLoadSchema} 
        disabled={loading}
      >
        Load Schema
      </button>
      <button 
        className="project-button bg-gray-300 px-4 py-2 mb-2 w-full" 
        onClick={handleSaveProject} 
        disabled={loading || !schema}
      >
        Save Schema Project
      </button>
      <button 
        className="project-button bg-gray-300 px-4 py-2 w-full" 
        onClick={handleLoadProject} 
        disabled={loading}
      >
        Load Schema Project
      </button>
      {loading && <div>Loading...</div>}
    </div>
  );
};


export default DataLoader;
