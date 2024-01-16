// More details about patterns types are available from the ChatGPT chat: https://chat.openai.com/share/70c7f834-5934-4140-9391-88d3fd2596d4

import React, { useEffect, useState, useRef } from 'react';
import DropdownComponent from '@/components/navigation';
import Diagram from '@/components/diagram';
import DataLoading from '@/components/dataLoading';
import TableComponent from '@/components/tableComponent';
import SchemaContext from '@/SchemaContext';
import Schema from '@/components/schema';
import ClassListComponent from '@/components/classList';

const baseURI = process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com/'   // replace with your production domain
    : 'http://localhost:3000/';

function Browser() {
  const workspaceRef = useRef(null);
  const [selectedClass, setSelectedClass] = useState<any | undefined>();
  const [tableData, setTableData] = useState<{ [key: string]: string }>({});
  const [schema, setSchema] = useState<Schema | null>(null);


  return (
    <SchemaContext.Provider value={{ schema, setSchema }}>
    <div className="browser-container bg-white text-gray-900 h-screen flex flex-row">
      <div className="left-container flex flex-col w-1/5">
        <div className="left-header w-full h-20 bg-white shadow-md flex items-center pl-4 border-b border-gray-300">
          <img src="/logo.png" alt="Schema Forge Logo" className="h-12 w-12 mr-4" />
          <h1 className="text-xl font-semibold">Schema Forge</h1>
        </div>
        <div className="left-pane bg-gray-100 h-full w-full border-r border-gray-300 p-8">
          <div className="data-loader w-full mb-4">
            <DataLoading/>
          </div>
          <br />
          <div className="browser w-full h-[50%] mb-4">
            <ClassListComponent
              setSelectedClass={setSelectedClass}
              selectedClass={selectedClass}/>
          </div>
          <br />
        </div>
      </div>
      <div className="separator"></div>
      <div className="central-pane w-4/5 h-full p-8">
        <div id="paper" className="w-full h-full overflow-hidden rounded-lg shadow">
                  <Diagram selectedClass={selectedClass} setTableData={setTableData}/>
        </div>
    </div>
    </div>
    </SchemaContext.Provider>
  );
}

export default Browser;